import type {
  Activity,
  ActivityDetail,
  ActivityInput,
  ActivityStatus,
  Folder,
  FolderInput,
  RunningTimer,
  Session,
  SessionInput,
  User,
  WorkLog,
} from "./types";
import type { StatsRaw } from "./stats";

const TOKEN_KEY = "planer_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage nedostupan */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Poziva se kad server vrati 401 (npr. istekao token). */
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // Blob (npr. slika) se salje kakav jeste, sve ostalo kao JSON.
  const isBlob = body instanceof Blob;
  if (body !== undefined) headers["Content-Type"] = isBlob ? body.type : "application/json";

  const res = await fetch(`/api${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : isBlob ? body : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error || "Greska u komunikaciji sa serverom");
  }
  return data as T;
}

type AuthResponse = { token: string; user: User };

export const api = {
  auth: {
    status: () => request<{ registrationOpen: boolean }>("GET", "/auth/status"),
    login: (username: string, password: string) =>
      request<AuthResponse>("POST", "/auth/login", { username, password }),
    register: (username: string, password: string) =>
      request<AuthResponse>("POST", "/auth/register", { username, password }),
    me: () => request<User>("GET", "/auth/me"),
  },
  folders: {
    list: () => request<Folder[]>("GET", "/folders"),
    create: (data: FolderInput) => request<Folder>("POST", "/folders", data),
    update: (id: number, data: Partial<FolderInput>) => request<Folder>("PATCH", `/folders/${id}`, data),
    remove: (id: number) => request<void>("DELETE", `/folders/${id}`),
  },
  activities: {
    list: (
      params: {
        folderId?: number | "none";
        recursive?: boolean;
        completed?: boolean;
        status?: ActivityStatus;
        search?: string;
        deadlineFrom?: Date;
        deadlineTo?: Date;
      } = {}
    ) => {
      const q = new URLSearchParams();
      if (params.folderId !== undefined) q.set("folderId", String(params.folderId));
      if (params.recursive) q.set("recursive", "true");
      if (params.completed !== undefined) q.set("completed", String(params.completed));
      if (params.status) q.set("status", params.status);
      if (params.search) q.set("search", params.search);
      if (params.deadlineFrom) q.set("deadlineFrom", params.deadlineFrom.toISOString());
      if (params.deadlineTo) q.set("deadlineTo", params.deadlineTo.toISOString());
      const qs = q.toString();
      return request<Activity[]>("GET", `/activities${qs ? `?${qs}` : ""}`);
    },
    upcoming: () => request<Activity[]>("GET", "/activities/upcoming"),
    get: (id: number) => request<ActivityDetail>("GET", `/activities/${id}`),
    start: (id: number) => request<Activity>("POST", `/activities/${id}/start`),
    pause: (id: number) => request<Activity>("POST", `/activities/${id}/pause`),
    finish: (id: number) => request<Activity>("POST", `/activities/${id}/finish`),
    setCover: (id: number, image: Blob) => request<Activity>("PUT", `/activities/${id}/cover`, image),
    removeCover: (id: number) => request<Activity>("DELETE", `/activities/${id}/cover`),
    create: (data: ActivityInput) => request<Activity>("POST", "/activities", data),
    update: (id: number, data: Partial<ActivityInput>) => request<Activity>("PATCH", `/activities/${id}`, data),
    remove: (id: number) => request<void>("DELETE", `/activities/${id}`),
  },
  sessions: {
    list: (from: Date, to: Date) =>
      request<Session[]>("GET", `/sessions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
    create: (data: SessionInput) => request<Session>("POST", "/sessions", data),
    update: (id: number, data: Partial<Omit<SessionInput, "activityId">> & { done?: boolean }) =>
      request<Session>("PATCH", `/sessions/${id}`, data),
    remove: (id: number) => request<void>("DELETE", `/sessions/${id}`),
  },
  stats: (from: Date, to: Date) =>
    request<StatsRaw>("GET", `/stats?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
  worklogs: {
    current: () => request<RunningTimer | null>("GET", "/worklogs/current"),
    create: (data: { activityId: number; start: string; end: string }) => request<WorkLog>("POST", "/worklogs", data),
    update: (id: number, data: { start?: string; end?: string }) => request<WorkLog>("PATCH", `/worklogs/${id}`, data),
    remove: (id: number) => request<void>("DELETE", `/worklogs/${id}`),
  },
};
