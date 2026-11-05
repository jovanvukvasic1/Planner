import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError, notFound, parseId } from "../errors.js";

const router = Router();

const createSchema = z.object({
  activityId: z.number().int(),
  start: z.coerce.date(),
  end: z.coerce.date(),
});
const updateSchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  done: z.boolean().optional(),
});
const rangeQuery = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const include = {
  activity: {
    select: {
      id: true,
      title: true,
      deadline: true,
      priority: true,
      completed: true,
      status: true,
      folder: { select: { id: true, name: true, color: true } },
    },
  },
};

function assertRange(start: Date, end: Date) {
  if (end <= start) throw new HttpError(400, "Kraj termina mora biti poslije pocetka");
}

async function getOwnSession(userId: number, id: number) {
  const s = await prisma.session.findFirst({ where: { id, userId } });
  if (!s) throw notFound("Termin");
  return s;
}

// Termini koji se preklapaju s intervalom [from, to) - za dnevni/sedmicni/mjesecni prikaz.
router.get("/", async (req, res) => {
  const { from, to } = rangeQuery.parse(req.query);
  const sessions = await prisma.session.findMany({
    where: { userId: req.userId, start: { lt: to }, end: { gt: from } },
    include,
    orderBy: { start: "asc" },
  });
  res.json(sessions);
});

router.post("/", async (req, res) => {
  const data = createSchema.parse(req.body);
  assertRange(data.start, data.end);
  const activity = await prisma.activity.findFirst({ where: { id: data.activityId, userId: req.userId } });
  if (!activity) throw notFound("Aktivnost");
  const session = await prisma.session.create({ data: { ...data, userId: req.userId }, include });
  res.status(201).json(session);
});

router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await getOwnSession(req.userId, id);
  const data = updateSchema.parse(req.body);
  assertRange(data.start ?? existing.start, data.end ?? existing.end);
  const session = await prisma.session.update({ where: { id }, data, include });
  res.json(session);
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  await getOwnSession(req.userId, id);
  await prisma.session.delete({ where: { id } });
  res.status(204).end();
});

export default router;
