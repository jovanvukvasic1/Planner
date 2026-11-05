import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError, notFound, parseId } from "../errors.js";
import { summarizeWork, workLogSelect } from "../worktime.js";

const router = Router();

const createSchema = z.object({
  activityId: z.number().int(),
  start: z.coerce.date(),
  end: z.coerce.date(),
});
const updateSchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
});

/** Tajmer koji trenutno radi (ili null) - za prikaz u gornjoj traci. */
router.get("/current", async (req, res) => {
  const log = await prisma.workLog.findFirst({
    where: { userId: req.userId, end: null },
    include: {
      activity: {
        include: { folder: { select: { id: true, name: true, color: true } }, workLogs: workLogSelect },
      },
    },
  });
  if (!log) {
    res.json(null);
    return;
  }
  res.json({ id: log.id, start: log.start, activity: summarizeWork(log.activity) });
});

/** Rucni unos perioda rada (npr. ako je zaboravljeno pokretanje tajmera). */
router.post("/", async (req, res) => {
  const data = createSchema.parse(req.body);
  if (data.end <= data.start) throw new HttpError(400, "Kraj mora biti poslije pocetka");
  const activity = await prisma.activity.findFirst({ where: { id: data.activityId, userId: req.userId } });
  if (!activity) throw notFound("Aktivnost");
  const log = await prisma.workLog.create({ data: { ...data, userId: req.userId } });
  if (activity.status === "todo") {
    await prisma.activity.update({ where: { id: activity.id }, data: { status: "in_progress" } });
  }
  res.status(201).json(log);
});

/** Ispravka perioda rada (npr. zaboravljena pauza). */
router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const log = await prisma.workLog.findFirst({ where: { id, userId: req.userId } });
  if (!log) throw notFound("Period rada");
  const data = updateSchema.parse(req.body);
  const start = data.start ?? log.start;
  const end = data.end ?? log.end;
  if (end && end <= start) throw new HttpError(400, "Kraj mora biti poslije pocetka");
  res.json(await prisma.workLog.update({ where: { id }, data }));
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const log = await prisma.workLog.findFirst({ where: { id, userId: req.userId } });
  if (!log) throw notFound("Period rada");
  await prisma.workLog.delete({ where: { id } });
  res.status(204).end();
});

export default router;
