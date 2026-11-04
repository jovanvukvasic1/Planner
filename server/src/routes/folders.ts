import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError, notFound, parseId } from "../errors.js";

const router = Router();

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Boja mora biti u formatu #rrggbb");

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: color.optional(),
  parentId: z.number().int().nullable().optional(),
});
const updateSchema = createSchema.partial();

async function getOwnFolder(userId: number, id: number) {
  const folder = await prisma.folder.findFirst({ where: { id, userId } });
  if (!folder) throw notFound("Folder");
  return folder;
}

/** Sprjecava da folder postane sam sebi predak (ciklus u stablu). */
async function assertNoCycle(userId: number, folderId: number, newParentId: number) {
  let current: number | null = newParentId;
  while (current !== null) {
    if (current === folderId) throw new HttpError(400, "Folder ne moze biti unutar samog sebe");
    const f: { parentId: number | null } = await getOwnFolder(userId, current);
    current = f.parentId;
  }
}

// Vraca ravnu listu foldera (s parentId); stablo gradi klijent.
router.get("/", async (req, res) => {
  const folders = await prisma.folder.findMany({
    where: { userId: req.userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { activities: true } } },
  });
  res.json(folders);
});

router.post("/", async (req, res) => {
  const data = createSchema.parse(req.body);
  if (data.parentId) await getOwnFolder(req.userId, data.parentId);
  const folder = await prisma.folder.create({ data: { ...data, userId: req.userId } });
  res.status(201).json(folder);
});

router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  await getOwnFolder(req.userId, id);
  const data = updateSchema.parse(req.body);
  if (data.parentId) await assertNoCycle(req.userId, id, data.parentId);
  const folder = await prisma.folder.update({ where: { id }, data });
  res.json(folder);
});

// Brisanje foldera brise i podfoldere; aktivnosti ostaju (bez foldera).
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  await getOwnFolder(req.userId, id);
  await prisma.folder.delete({ where: { id } });
  res.status(204).end();
});

export default router;
