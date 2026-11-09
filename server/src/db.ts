import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { databaseConfig } from "./config.js";

const config = databaseConfig();
if (config.url.startsWith("file:")) {
  fs.mkdirSync(path.dirname(config.url.slice("file:".length)), { recursive: true });
}

// libSQL adapter radi i s lokalnim SQLite fajlom i s Turso bazom u oblaku.
export const prisma = new PrismaClient({ adapter: new PrismaLibSQL(config) });
