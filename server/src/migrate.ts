import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { SERVER_ROOT, databaseConfig } from "./config.js";

const MIGRATIONS_DIR = path.join(SERVER_ROOT, "prisma", "migrations");

/**
 * Primjenjuje migracije iz prisma/migrations koje jos nisu primijenjene.
 * (Prisma migrate ne radi s Turso bazom, pa se SQL migracija izvrsava ovdje.)
 * Baze napravljene ranije preko "prisma migrate" se prepoznaju po tabeli _prisma_migrations.
 */
export async function runMigrations() {
  const client = createClient(databaseConfig());
  try {
    await client.execute(
      `CREATE TABLE IF NOT EXISTS "_planer_migrations" ("name" TEXT PRIMARY KEY, "applied_at" TEXT NOT NULL)`
    );
    let applied = new Set((await client.execute(`SELECT name FROM "_planer_migrations"`)).rows.map((r) => String(r.name)));

    if (applied.size === 0) {
      const prismaTable = await client.execute(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'`
      );
      if (prismaTable.rows.length) {
        const done = await client.execute(
          `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
        );
        for (const r of done.rows) {
          await client.execute({
            sql: `INSERT OR IGNORE INTO "_planer_migrations" (name, applied_at) VALUES (?, ?)`,
            args: [String(r.migration_name), new Date().toISOString()],
          });
        }
        applied = new Set(done.rows.map((r) => String(r.migration_name)));
      }
    }

    const pending = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !applied.has(d.name))
      .map((d) => d.name)
      .sort();

    for (const name of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
      await client.executeMultiple(sql);
      await client.execute({
        sql: `INSERT INTO "_planer_migrations" (name, applied_at) VALUES (?, ?)`,
        args: [name, new Date().toISOString()],
      });
      console.log(`Migracija primijenjena: ${name}`);
    }
  } finally {
    client.close();
  }
}
