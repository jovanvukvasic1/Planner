import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { notFound, parseId } from "../errors.js";

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
const updateSchema = baseSchema.partial().extend({ completed: z.boolean().optional() });

const listQuery = z.object({
  // broj = konkretan folder, "none" = aktivnosti bez foldera
  folderId: z.union([z.literal("none"), z.coerce.number().int()]).optional(),
  // ukljuci i aktivnosti iz podfoldera
  recursive: z.enum(["true", "false"]).optional(),
  completed: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  // aktivnosti ciji rok pada u interval [deadlineFrom, deadlineTo)
  deadlineFrom: z.coerce.date().optional(),
  deadlineTo: z.coerce.date().optional(),
});

const include = {
  folder: { select: { id: true, name: true, color: true } },
  _count: { select: { sessions: true } },
} satisfies Prisma.ActivityInclude;

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
  if (q.search) where.title = { contains: q.search };
  if (q.deadlineFrom || q.deadlineTo) {
    where.deadline = { not: null, gte: q.deadlineFrom, lt: q.deadlineTo };
  }
  const activities = await prisma.activity.findMany({
    where,
    include,
    orderBy: [{ completed: "asc" }, { deadline: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
  });
  res.json(activities);
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
  res.json(activities);
});

router.get("/:id", async (req, res) => {
  const activity = await prisma.activity.findFirst({
    where: { id: parseId(req.params.id), userId: req.userId },
    include: { ...include, sessions: { orderBy: { start: "asc" } } },
  });
  if (!activity) throw notFound("Aktivnost");
  res.json(activity);
});

router.post("/", async (req, res) => {
  const data = createSchema.parse(req.body);
  await assertOwnFolder(req.userId, data.folderId);
  const activity = await prisma.activity.create({ data: { ...data, userId: req.userId }, include });
  res.status(201).json(activity);
});

router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await getOwnActivity(req.userId, id);
  const data = updateSchema.parse(req.body);
  await assertOwnFolder(req.userId, data.folderId);
  const extra: { completedAt?: Date | null } = {};
  if (data.completed !== undefined && data.completed !== existing.completed) {
    extra.completedAt = data.completed ? new Date() : null;
  }
  const activity = await prisma.activity.update({ where: { id }, data: { ...data, ...extra }, include });
  res.json(activity);
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  await getOwnActivity(req.userId, id);
  await prisma.activity.delete({ where: { id } });
  res.status(204).end();
});

export default router;
