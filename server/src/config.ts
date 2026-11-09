import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** server/ folder (radi i iz src/ i iz dist/) */
export const SERVER_ROOT = path.resolve(__dirname, "..");

/**
 * Adresa baze:
 * - lokalni SQLite fajl: DATABASE_URL="file:../data/planner.db" (relativno u odnosu na server/prisma, kao kod Prisme)
 * - Turso (libSQL u oblaku): DATABASE_URL="libsql://<baza>.turso.io" i DATABASE_AUTH_TOKEN="<token>"
 */
export function databaseConfig(): { url: string; authToken?: string } {
  let url = process.env.DATABASE_URL || "file:../data/planner.db";
  if (url.startsWith("file:")) {
    const file = url.slice("file:".length);
    if (!path.isAbsolute(file)) url = "file:" + path.resolve(SERVER_ROOT, "prisma", file);
  }
  return { url, authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined };
}

export const isRemoteDatabase = () => !databaseConfig().url.startsWith("file:");
