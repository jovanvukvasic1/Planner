import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";

const router = Router();

const query = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

/**
 * Sirovi podaci za statistiku u intervalu [from, to). Agregacija (po danima,
 * sedmicama, folderima) radi se na klijentu, u lokalnom vremenu korisnika.
 */
router.get("/", async (req, res) => {
  const { from, to } = query.parse(req.query);
  if (to <= from) throw new HttpError(400, "Neispravan period");
  if (to.getTime() - from.getTime() > 800 * 24 * 3600 * 1000) throw new HttpError(400, "Period je predug");
  const userId = req.userId;

  const [workLogs, sessions, folders] = await Promise.all([
    prisma.workLog.findMany({
      where: { userId, start: { lt: to }, OR: [{ end: null }, { end: { gt: from } }] },
      select: { activityId: true, start: true, end: true },
    }),
    prisma.session.findMany({
      where: { userId, start: { lt: to }, end: { gt: from } },
      select: { activityId: true, start: true, end: true, done: true },
    }),
    prisma.folder.findMany({ where: { userId }, select: { id: true, name: true, color: true, parentId: true } }),
  ]);

  // Aktivnosti koje se ticu perioda: zavrsene u periodu, s rokom u periodu,
  // ili one na kojima se radilo / koje su zakazane u periodu.
  const ids = [...new Set([...workLogs, ...sessions].map((x) => x.activityId))];
  const activities = await prisma.activity.findMany({
    where: {
      userId,
      OR: [{ completedAt: { gte: from, lt: to } }, { deadline: { gte: from, lt: to } }, { id: { in: ids } }],
    },
    select: {
      id: true,
      title: true,
      folderId: true,
      deadline: true,
      status: true,
      completedAt: true,
      estimatedMinutes: true,
      _count: { select: { workLogs: true } },
    },
  });

  res.json({
    workLogs,
    sessions,
    folders,
    activities: activities.map(({ _count, ...a }) => ({ ...a, hasWorkLogs: _count.workLogs > 0 })),
  });
});

export default router;
