import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what = "Resurs") => new HttpError(404, `${what} nije pronadjen`);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Neispravni podaci", details: err.flatten() });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Greske pri citanju tijela zahtjeva (npr. prevelik fajl, neispravan JSON)
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Fajl je prevelik (najvise 10 MB)" });
    return;
  }
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: "Neispravan zahtjev" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Greska na serveru" });
};

/** Parsira ID iz URL parametra; vraca 400 ako nije pozitivan cijeli broj. */
export function parseId(value: string | string[] | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Neispravan ID");
  return id;
}
