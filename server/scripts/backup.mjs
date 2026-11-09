// Pravi konzistentnu kopiju lokalne SQLite baze dok aplikacija radi (VACUUM INTO).
// Baza sadrzi i slike. Za Turso bazu backup se radi preko Turso (vidi DEPLOY-RENDER.md).
// Upotreba: node scripts/backup.mjs <putanja-izlaznog-fajla>
import "dotenv/config";
import fs from "node:fs";
import { prisma } from "../dist/db.js";
import { isRemoteDatabase } from "../dist/config.js";

if (isRemoteDatabase()) {
  console.error("Baza nije lokalni fajl (Turso). Backup napravi preko Turso CLI: turso db shell <baza> .dump > backup.sql");
  process.exit(1);
}
const out = process.argv[2] || "/app/server/data/backup.db";
fs.rmSync(out, { force: true });
try {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
  console.log(`Backup baze: ${out}`);
} finally {
  await prisma.$disconnect();
}
