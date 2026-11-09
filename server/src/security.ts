import type { RequestHandler } from "express";
import { HttpError } from "./errors.js";

/** Osnovna sigurnosna zaglavlja za sve odgovore. */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=()");
  next();
};

/**
 * Jednostavno ogranicenje broja zahtjeva po IP adresi (u memoriji).
 * Koristi se za prijavu/registraciju, da bi se otezalo pogadjanje lozinke.
 */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.reset <= now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || h.reset <= now) {
      h = { count: 0, reset: now + windowMs };
      hits.set(ip, h);
    }
    h.count++;
    if (h.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((h.reset - now) / 1000)));
      throw new HttpError(429, "Previse pokusaja, pokusaj ponovo za nekoliko minuta");
    }
    next();
  };
}
