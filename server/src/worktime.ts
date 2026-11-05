import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

type Tx = Prisma.TransactionClient;

/** Zaustavlja tajmer koji trenutno radi (ako postoji). Pravilo: samo jedan tajmer istovremeno. */
export async function stopRunning(tx: Tx, userId: number, now = new Date()) {
  await tx.workLog.updateMany({ where: { userId, end: null }, data: { end: now } });
}

/** Zaustavlja tajmer samo za datu aktivnost. */
export async function stopRunningFor(tx: Tx, activityId: number, now = new Date()) {
  await tx.workLog.updateMany({ where: { activityId, end: null }, data: { end: now } });
}

/** Pokrece tajmer za aktivnost; tajmer druge aktivnosti se pauzira. */
export async function startTimer(userId: number, activityId: number) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const running = await tx.workLog.findFirst({ where: { userId, end: null } });
    if (running?.activityId === activityId) return;
    await stopRunning(tx, userId, now);
    await tx.workLog.create({ data: { userId, activityId, start: now } });
    await tx.activity.update({
      where: { id: activityId },
      data: { status: "in_progress", completed: false, completedAt: null },
    });
  });
}

export async function pauseTimer(activityId: number) {
  await prisma.$transaction((tx) => stopRunningFor(tx, activityId));
}

/**
 * Postavlja status aktivnosti i odrzava ostala polja usklađenim:
 * - "done": zaustavlja tajmer, completed = true, biljezi datum zavrsetka
 * - "todo": zaustavlja tajmer, completed = false
 * - "in_progress": completed = false (tajmer se pokrece posebno, preko /start)
 */
export async function setStatus(activityId: number, status: Status) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.activity.findUniqueOrThrow({ where: { id: activityId } });
    if (status !== "in_progress") await stopRunningFor(tx, activityId);
    await tx.activity.update({
      where: { id: activityId },
      data: {
        status,
        completed: status === "done",
        completedAt: status === "done" ? (current.completedAt ?? new Date()) : null,
      },
    });
  });
}

export const workLogSelect = { select: { start: true, end: true } } as const;

interface WithLogs {
  status: string;
  estimatedMinutes: number | null;
  workLogs: { start: Date; end: Date | null }[];
}

/**
 * Racuna vrijeme rada na aktivnosti.
 * - workedSeconds: izmjereno vrijeme (zavrseni periodi; tekuci period racuna klijent od runningSince)
 * - creditedSeconds: vrijeme koje se racuna kao odradjeno; ako je aktivnost zavrsena bez
 *   mjerenja, uzima se procijenjeno trajanje
 * - timeSource: "tracked" (izmjereno), "estimated" (procijenjeno) ili "none"
 */
export function summarizeWork<T extends WithLogs>(a: T) {
  const { workLogs, ...rest } = a;
  let workedSeconds = 0;
  let runningSince: Date | null = null;
  for (const log of workLogs) {
    if (log.end) workedSeconds += Math.max(0, (log.end.getTime() - log.start.getTime()) / 1000);
    else runningSince = log.start;
  }
  workedSeconds = Math.round(workedSeconds);
  const hasTracked = workLogs.length > 0;
  const estimatedSeconds = (a.estimatedMinutes ?? 0) * 60;
  const timeSource = hasTracked ? "tracked" : a.status === "done" && estimatedSeconds > 0 ? "estimated" : "none";
  const creditedSeconds = timeSource === "estimated" ? estimatedSeconds : workedSeconds;
  return { ...rest, workedSeconds, runningSince, timeSource, creditedSeconds };
}
