import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../errors.js";
import { requireAuth, signToken } from "../auth.js";

const router = Router();

const credentials = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(6).max(200),
});

/**
 * Registracija je dozvoljena samo za prvog korisnika (vlasnika),
 * osim ako je ALLOW_REGISTRATION=true.
 */
async function registrationOpen() {
  if (process.env.ALLOW_REGISTRATION === "true") return true;
  return (await prisma.user.count()) === 0;
}

router.get("/status", async (_req, res) => {
  res.json({ registrationOpen: await registrationOpen() });
});

router.post("/register", async (req, res) => {
  if (!(await registrationOpen())) throw new HttpError(403, "Registracija je zatvorena");
  const { username, password } = credentials.parse(req.body);
  if (await prisma.user.findUnique({ where: { username } })) {
    throw new HttpError(409, "Korisnicko ime je zauzeto");
  }
  const user = await prisma.user.create({
    data: { username, passwordHash: await bcrypt.hash(password, 10) },
  });
  res.status(201).json({ token: signToken(user.id), user: { id: user.id, username } });
});

router.post("/login", async (req, res) => {
  const { username, password } = credentials.parse(req.body);
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Pogresno korisnicko ime ili lozinka");
  }
  res.json({ token: signToken(user.id), user: { id: user.id, username } });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(401, "Korisnik ne postoji");
  res.json({ id: user.id, username: user.username });
});

export default router;
