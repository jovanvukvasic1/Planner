import { MONTHS, WEEKDAYS_SHORT, addDays, addMonths, startOfDay, startOfWeek, weekdayIndex } from "./dates";
import type { Folder } from "./types";

export interface StatsActivity {
  id: number;
  title: string;
  folderId: number | null;
  deadline: string | null;
  status: string;
  completedAt: string | null;
  estimatedMinutes: number | null;
  hasWorkLogs: boolean;
}

export interface StatsRaw {
  workLogs: { activityId: number; start: string; end: string | null }[];
  sessions: { activityId: number; start: string; end: string; done: boolean }[];
  folders: Folder[];
  activities: StatsActivity[];
}

export type Period = "week" | "month" | "year";

export interface Bucket {
  start: Date;
  end: Date;
  /** kratka oznaka za osu */
  label: string;
  /** puna oznaka za tooltip i tabelu */
  title: string;
}

export interface BucketStats extends Bucket {
  tracked: number;
  estimated: number;
  completed: number;
  planned: number;
}

export interface FolderShare {
  id: number | null;
  name: string;
  color: string;
  seconds: number;
}

export interface DeadlineItem {
  id: number;
  title: string;
  deadline: Date;
  completedAt: Date | null;
}

export interface TopActivity {
  id: number;
  title: string;
  folder: Folder | null;
  seconds: number;
  estimatedOnly: boolean;
  estimatedMinutes: number | null;
}

export interface Stats {
  buckets: BucketStats[];
  totals: { tracked: number; estimated: number; completed: number; planned: number; plannedDone: number };
  folders: FolderShare[];
  deadlines: { onTime: DeadlineItem[]; late: DeadlineItem[]; missed: DeadlineItem[]; upcoming: number };
  top: TopActivity[];
}

/** Interval i podjela perioda (dani za sedmicu/mjesec, mjeseci za godinu). */
export function periodRange(period: Period, anchor: Date): { from: Date; to: Date; buckets: Bucket[] } {
  if (period === "week") {
    const from = startOfWeek(anchor);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(from, i);
      return { start: d, end: addDays(d, 1), label: WEEKDAYS_SHORT[i], title: `${WEEKDAYS_SHORT[i]} ${d.getDate()}.${d.getMonth() + 1}.` };
    });
    return { from, to: addDays(from, 7), buckets };
  }
  if (period === "month") {
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const to = addMonths(from, 1);
    const buckets: Bucket[] = [];
    for (let d = from; d < to; d = addDays(d, 1)) {
      buckets.push({ start: d, end: addDays(d, 1), label: String(d.getDate()), title: `${WEEKDAYS_SHORT[weekdayIndex(d)]} ${d.getDate()}. ${MONTHS[d.getMonth()]}` });
    }
    return { from, to, buckets };
  }
  const from = new Date(anchor.getFullYear(), 0, 1);
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const s = new Date(anchor.getFullYear(), i, 1);
    return { start: s, end: addMonths(s, 1), label: MONTHS[i].slice(0, 3), title: `${MONTHS[i]} ${s.getFullYear()}.` };
  });
  return { from, to: new Date(anchor.getFullYear() + 1, 0, 1), buckets };
}

export function shiftPeriod(period: Period, anchor: Date, dir: 1 | -1): Date {
  if (period === "week") return addDays(startOfDay(anchor), 7 * dir);
  if (period === "month") return addMonths(anchor, dir);
  return new Date(anchor.getFullYear() + dir, 0, 1);
}

export function periodTitle(period: Period, anchor: Date): string {
  if (period === "year") return `${anchor.getFullYear()}.`;
  if (period === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}.`;
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  return `${from.getDate()}. ${MONTHS[from.getMonth()]} – ${to.getDate()}. ${MONTHS[to.getMonth()]} ${to.getFullYear()}.`;
}

/** Preklapanje dva intervala u sekundama. */
function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)) / 1000;
}

const NO_FOLDER: Omit<FolderShare, "seconds"> = { id: null, name: "Bez foldera", color: "#9b9b94" };

/**
 * Racuna statistiku za dati period.
 * folderId: ako je zadan, uzimaju se samo aktivnosti iz tog foldera i njegovih podfoldera,
 * a raspodjela je po njegovim direktnim podfolderima; inace po glavnim folderima.
 */
export function computeStats(raw: StatsRaw, from: Date, to: Date, buckets: Bucket[], folderId: number | null, nowMs = Date.now()): Stats {
  const folderById = new Map(raw.folders.map((f) => [f.id, f]));

  // Folder za raspodjelu: predak koji je direktno ispod "korijena" (zadanog foldera ili vrha stabla).
  const groupOf = (fid: number | null): number | null | undefined => {
    let id = fid;
    let guard = 0;
    while (id !== null && guard++ < 100) {
      const f = folderById.get(id);
      if (!f) return null;
      if (folderId !== null && f.id === folderId) return folderId;
      if (f.parentId === folderId) return f.id;
      id = f.parentId;
    }
    // aktivnost nije u zadanom folderu -> izostavlja se (undefined)
    return folderId === null ? null : undefined;
  };

  const activities = new Map(raw.activities.filter((a) => groupOf(a.folderId) !== undefined).map((a) => [a.id, a]));
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const result: BucketStats[] = buckets.map((b) => ({ ...b, tracked: 0, estimated: 0, completed: 0, planned: 0 }));
  const perActivity = new Map<number, number>();
  let plannedDone = 0;

  const addToBuckets = (s: number, e: number, key: "tracked" | "planned") => {
    for (const b of result) b[key] += overlap(s, e, b.start.getTime(), b.end.getTime());
  };

  for (const log of raw.workLogs) {
    if (!activities.has(log.activityId)) continue;
    const s = new Date(log.start).getTime();
    const e = log.end ? new Date(log.end).getTime() : Math.min(nowMs, toMs);
    addToBuckets(s, e, "tracked");
    perActivity.set(log.activityId, (perActivity.get(log.activityId) ?? 0) + overlap(s, e, fromMs, toMs));
  }

  for (const s of raw.sessions) {
    if (!activities.has(s.activityId)) continue;
    const st = new Date(s.start).getTime();
    const en = new Date(s.end).getTime();
    addToBuckets(st, en, "planned");
    if (s.done) plannedDone += overlap(st, en, fromMs, toMs);
  }

  const estimatedOnly = new Set<number>();
  const onTime: DeadlineItem[] = [];
  const late: DeadlineItem[] = [];
  const missed: DeadlineItem[] = [];
  let upcoming = 0;

  for (const a of activities.values()) {
    const completedAt = a.status === "done" && a.completedAt ? new Date(a.completedAt) : null;
    const cMs = completedAt?.getTime();
    if (cMs !== undefined && cMs >= fromMs && cMs < toMs) {
      const bucket = result.find((b) => cMs >= b.start.getTime() && cMs < b.end.getTime());
      if (bucket) {
        bucket.completed++;
        // Zavrseno bez mjerenja: racuna se procijenjeno trajanje, na dan zavrsetka.
        if (!a.hasWorkLogs && a.estimatedMinutes) {
          bucket.estimated += a.estimatedMinutes * 60;
          perActivity.set(a.id, a.estimatedMinutes * 60);
          estimatedOnly.add(a.id);
        }
      }
    }
    if (a.deadline) {
      const d = new Date(a.deadline);
      const dMs = d.getTime();
      if (dMs >= fromMs && dMs < toMs) {
        const item = { id: a.id, title: a.title, deadline: d, completedAt };
        if (completedAt) (completedAt <= d ? onTime : late).push(item);
        else if (dMs < nowMs) missed.push(item);
        else upcoming++;
      }
    }
  }

  const folderTotals = new Map<number | null, number>();
  for (const [id, seconds] of perActivity) {
    const g = groupOf(activities.get(id)!.folderId) ?? null;
    folderTotals.set(g, (folderTotals.get(g) ?? 0) + seconds);
  }
  const folders: FolderShare[] = [...folderTotals]
    .filter(([, s]) => s >= 1)
    .map(([id, seconds]) => {
      const f = id === null ? null : folderById.get(id);
      return f ? { id: f.id, name: f.name, color: f.color, seconds } : { ...NO_FOLDER, seconds };
    })
    .sort((a, b) => b.seconds - a.seconds);

  const top: TopActivity[] = [...perActivity]
    .filter(([, s]) => s >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, seconds]) => {
      const a = activities.get(id)!;
      return {
        id,
        title: a.title,
        folder: a.folderId ? folderById.get(a.folderId) ?? null : null,
        seconds,
        estimatedOnly: estimatedOnly.has(id),
        estimatedMinutes: a.estimatedMinutes,
      };
    });

  const sum = (k: "tracked" | "estimated" | "completed" | "planned") => result.reduce((t, b) => t + b[k], 0);
  return {
    buckets: result,
    totals: { tracked: sum("tracked"), estimated: sum("estimated"), completed: sum("completed"), planned: sum("planned"), plannedDone },
    folders,
    deadlines: { onTime, late, missed: missed.sort((a, b) => a.deadline.getTime() - b.deadline.getTime()), upcoming },
    top,
  };
}
