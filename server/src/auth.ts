import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./errors.js";

const SECRET = process.env.JWT_SECRET || "promijeni-me";
const TOKEN_TTL = "30d";

declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, SECRET, { expiresIn: TOKEN_TTL });
}

/** Zahtijeva validan "Authorization: Bearer <token>" header. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Niste prijavljeni");
  try {
    const payload = jwt.verify(token, SECRET) as jwt.JwtPayload;
    req.userId = Number(payload.sub);
    next();
  } catch {
    throw new HttpError(401, "Sesija je istekla, prijavite se ponovo");
  }
};
