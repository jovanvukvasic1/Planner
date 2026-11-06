import crypto from "node:crypto";
import fs from "node:fs/promises";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError } from "./errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Folder za slike; podrazumijevano server/data/uploads (pored baze, isti Docker volumen). */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "../data/uploads"));
mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Prepoznaje format slike po prvim bajtovima (ne vjerujemo samo Content-Type zaglavlju). */
function detectExtension(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/** Cuva sliku pod nasumicnim imenom i vraca naziv fajla. */
export async function saveImage(buf: unknown): Promise<string> {
  if (!Buffer.isBuffer(buf) || buf.length === 0) throw new HttpError(400, "Slika nije poslana");
  const ext = detectExtension(buf);
  if (!ext) throw new HttpError(400, "Podrzani formati slike su JPEG, PNG i WebP");
  const name = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return name;
}

export async function removeImage(name: string | null | undefined) {
  if (!name || name !== path.basename(name)) return;
  await fs.rm(path.join(UPLOAD_DIR, name), { force: true });
}
