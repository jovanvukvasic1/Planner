import crypto from "node:crypto";
import { prisma } from "./db.js";
import { HttpError } from "./errors.js";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FORMATS: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Prepoznaje format slike po prvim bajtovima (ne vjerujemo samo Content-Type zaglavlju). */
function detectExtension(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/** Cuva sliku u bazi pod nasumicnim imenom i vraca naziv (npr. "3f2a...c1.jpg"). */
export async function saveImage(buf: unknown): Promise<string> {
  if (!Buffer.isBuffer(buf) || buf.length === 0) throw new HttpError(400, "Slika nije poslana");
  const ext = detectExtension(buf);
  if (!ext) throw new HttpError(400, "Podrzani formati slike su JPEG, PNG i WebP");
  const id = crypto.randomBytes(16).toString("hex");
  await prisma.image.create({ data: { id, mime: FORMATS[ext], data: new Uint8Array(buf), size: buf.length } });
  return `${id}.${ext}`;
}

const idOf = (name: string) => name.split(".")[0];

export async function loadImage(name: string) {
  const id = idOf(name);
  if (!/^[0-9a-f]{32}$/.test(id)) return null;
  return prisma.image.findUnique({ where: { id } });
}

export async function removeImage(name: string | null | undefined) {
  if (!name) return;
  await prisma.image.deleteMany({ where: { id: idOf(name) } });
}
