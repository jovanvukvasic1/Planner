import type { Folder, Priority } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const PRIORITY_LABELS: Record<Priority, string> = {
  0: "Nizak",
  1: "Srednji",
  2: "Visok",
};

export const FOLDER_COLORS = [
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
  "#eab308", "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#64748b",
];

export type Urgency = "overdue" | "today" | "soon" | "week" | "later" | "none";

/** Koliko je hitna aktivnost s obzirom na rok. */
export function deadlineUrgency(deadline: string | null, completed = false): Urgency {
  if (!deadline || completed) return "none";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (isSameDay(new Date(deadline), new Date())) return "today";
  if (diff < 3 * DAY) return "soon";
  if (diff < 7 * DAY) return "week";
  return "later";
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "danas", "sutra", "za 3 dana", "kasni 2 dana"... */
export function relativeDeadline(deadline: string): string {
  const d = new Date(deadline);
  const days = Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
  if (days === 0) return d.getTime() < Date.now() ? "rok je istekao danas" : "danas";
  if (days === 1) return "sutra";
  if (days === -1) return "kasni 1 dan";
  if (days < 0) return `kasni ${-days} ${daysWord(-days)}`;
  return `za ${days} ${daysWord(days)}`;
}

function daysWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 === 1 && mod100 !== 11 ? "dan" : "dana";
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("sr-Latn", { day: "numeric", month: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

/** Trajanje tajmera: 1:05:09 ili 05:09 */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Ukupno odradjeno vrijeme aktivnosti u sekundama, ukljucujuci tekuci period. */
export function liveWorkedSeconds(a: { workedSeconds: number; runningSince: string | null }, now: number): number {
  return a.workedSeconds + (a.runningSince ? Math.max(0, (now - new Date(a.runningSince).getTime()) / 1000) : 0);
}

/** Trajanje u sekundama -> "1h 20min" (najmanje "1min" ako je bilo rada). */
export function formatWorked(seconds: number): string {
  if (seconds <= 0) return "0min";
  return formatDuration(Math.max(1, Math.round(seconds / 60)));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

/** ISO string -> vrijednost za <input type="datetime-local"> (lokalno vrijeme). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
  depth: number;
}

/** Pretvara ravnu listu foldera u stablo. */
export function buildFolderTree(folders: Folder[]): FolderNode[] {
  const byParent = new Map<number | null, Folder[]>();
  for (const f of folders) {
    const list = byParent.get(f.parentId) ?? [];
    list.push(f);
    byParent.set(f.parentId, list);
  }
  const build = (parentId: number | null, depth: number): FolderNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name, "sr"))
      .map((f) => ({ ...f, depth, children: build(f.id, depth + 1) }));
  return build(null, 0);
}

/** Stablo -> ravna lista u redoslijedu prikaza (za <select>). */
export function flattenTree(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

/** ID-jevi foldera i svih njegovih potomaka. */
export function descendantIds(folders: Folder[], rootId: number): Set<number> {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentId !== null && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        added = true;
      }
    }
  }
  return ids;
}
