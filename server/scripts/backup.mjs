// Pravi konzistentnu kopiju SQLite baze dok aplikacija radi (VACUUM INTO).
// Upotreba: node scripts/backup.mjs <putanja-izlaznog-fajla>
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const out = process.argv[2] || "/app/server/data/backup.db";
fs.rmSync(out, { force: true });
const prisma = new PrismaClient();
try {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
  console.log(`Backup baze: ${out}`);
} finally {
  await prisma.$disconnect();
}
