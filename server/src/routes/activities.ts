import express, { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError, notFound, parseId } from "../errors.js";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, removeImage, saveImage } from "../uploads.js";
import { STATUSES, pauseTimer, setStatus, startTimer, summarizeWork, workLogSelect } from "../worktime.js";

const router = Router();

const baseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  deadline: z.coerce.date().nullable().optional(),
  priority: z.number().int().min(0).max(2).optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  folderId: z.number().int().nullable().optional(),
});
const createSchema = baseSchema;
const updateSchema = baseSchema.partial().extend({
  completed: z.boolean().optional(),
  status: z.enum(STATUSES).optional(),
});

const listQuery = z.object({
  // broj = konkretan folder, "none" = aktivnosti bez foldera
  folderId: z.union([z.literal("none"), z.coerce.number().int()]).optional(),
  // ukljuci i aktivnosti iz podfoldera
  recursive: z.enum(["true", "false"]).optional(),
  completed: z.enum(["true", "false"]).optional(),
  status: z.enum(STATUSES).optional(),
  search: z.string().optional(),
  // aktivnosti ciji rok pada u interval [deadlineFrom, deadlineTo)
  deadlineFrom: z.coerce.date().optional(),
  deadlineTo: z.coerce.date().optional(),
});

const include = {
  folder: { select: { id: true, name: true, color: true } },
  _count: { select: { sessions: true } },
  workLogs: workLogSelect,
} satisfies Prisma.ActivityInclude;

async function loadActivity(id: number) {
  const a = await prisma.activity.findUniqueOrThrow({ where: { id }, include });
  return summarizeWork(a);
}

async function assertOwnFolder(userId: number, folderId: number | null | undefined) {
  if (folderId == null) return;
  const f = await prisma.folder.findFirst({ where: { id: folderId, userId } });
  if (!f) throw notFound("Folder");
}

async function getOwnActivity(userId: number, id: number) {
  const a = await prisma.activity.findFirst({ where: { id, userId } });
  if (!a) throw notFound("Aktivnost");
  return a;
}

async function descendantFolderIds(userId: number, rootId: number): Promise<number[]> {
  const all = await prisma.folder.findMany({ where: { userId }, select: { id: true, parentId: true } });
  const result = [rootId];
  for (let i = 0; i < result.length; i++) {
    for (const f of all) if (f.parentId === result[i]) result.push(f.id);
  }
  return result;
}

router.get("/", async (req, res) => {
  const q = listQuery.parse(req.query);
  const where: Prisma.ActivityWhereInput = { userId: req.userId };
  if (q.folderId === "none") {
    where.folderId = null;
  } else if (q.folderId !== undefined) {
    where.folderId =
      q.recursive === "true" ? { in: await descendantFolderIds(req.userId, q.folderId) } : q.folderId;
  }
  if (q.completed) where.completed = q.completed === "true";
  if (q.status) where.status = q.status;
  if (q.search) where.title = { contains: q.search };
  if (q.deadlineFrom || q.deadlineTo) {
    where.deadline = { not: null, gte: q.deadlineFrom, lt: q.deadlineTo };
  }
  const activities = await prisma.activity.findMany({
    where,
    include,
    orderBy: [{ completed: "asc" }, { deadline: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
  });
  res.json(activities.map(summarizeWork));
});

/**
 * Nezavrsene aktivnosti s rokom, sortirane po hitnosti (najblizi rok, pa prioritet).
 * Koristi se za bocni panel prilikom planiranja.
 */
router.get("/upcoming", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const activities = await prisma.activity.findMany({
    where: { userId: req.userId, completed: false, deadline: { not: null } },
    include,
    orderBy: [{ deadline: "asc" }, { priority: "desc" }],
    take: limit,
  });
  res.json(activities.map(summarizeWork));
});

router.get("/:id", async (req, res) => {
  const activity = await prisma.activity.findFirst({
    where: { id: parseId(req.params.id), userId: req.userId },
    include: {
      ...include,
      sessions: { orderBy: { start: "asc" } },
      workLogs: { select: { id: true, start: true, end: true }, orderBy: { start: "desc" } },
    },
  });
  if (!activity) throw notFound("Aktivnost");
  res.json({ ...summarizeWork(activity), workLogs: activity.workLogs });
});

router.post("/", async (req, res) => {
  const data = createSchema.parse(req.body);
  await assertOwnFolder(req.userId, data.folderId);
  const activity = await prisma.activity.create({ data: { ...data, userId: req.userId }, include });
  res.status(201).json(summarizeWork(activity));
});

router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await getOwnActivity(req.userId, id);
  const { completed, status, ...data } = updateSchema.parse(req.body);
  await assertOwnFolder(req.userId, data.folderId);
  await prisma.activity.update({ where: { id }, data });

  // "completed" je zadrzan radi jednostavnog oznacavanja (kvacica); prevodi se u status.
  let newStatus = status;
  if (!newStatus && completed !== undefined && completed !== existing.completed) {
    const hasWork = (await prisma.workLog.count({ where: { activityId: id } })) > 0;
    newStatus = completed ? "done" : hasWork ? "in_progress" : "todo";
  }
  if (newStatus && newStatus !== existing.status) await setStatus(id, newStatus);
  res.json(await loadActivity(id));
});

// Tajmer: start / pauza / zavrsetak aktivnosti.
router.post("/:id/start", async (req, res) => {
  const id = parseId(req.params.id);
  await getOwnActivity(req.userId, id);
  await startTimer(req.userId, id);
  res.json(await loadActivity(id));
});

router.post("/:id/pause", async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await getOwnActivity(req.userId, id);
  if (existing.status === "done") throw new HttpError(400, "Aktivnost je vec zavrsena");
  await pauseTimer(id);
  res.json(await loadActivity(id));
});

router.post("/:id/finish", async (req, res) => {
  const id = parseId(req.params.id);
  await getOwnActivity(req.userId, id);
  await setStatus(id, "done");
  res.json(await loadActivity(id));
});

// Naslovna slika: tijelo zahtjeva je sama slika (image/jpeg, image/png ili image/webp).
router.put(
  "/:id/cover",
  express.raw({ type: IMAGE_TYPES, limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await getOwnActivity(req.userId, id);
    const name = await saveImage(req.body);
    await prisma.activity.update({ where: { id }, data: { coverImage: name } });
    await removeImage(existing.coverImage);
    res.json(await loadActivity(id));
  }
);

router.delete("/:id/cover", async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await getOwnActivity(req.userId, id);
  await prisma.activity.update({ where: { id }, data: { coverImage: null } });
  await removeImage(existing.coverImage);
  res.json(await loadActivity(id));
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await getOwnActivity(req.userId, id);
  await prisma.activity.delete({ where: { id } });
  await removeImage(existing.coverImage);
  res.status(204).end();
});

export default router;
