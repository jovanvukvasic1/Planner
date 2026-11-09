import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { requireAuth } from "./auth.js";
import { errorHandler } from "./errors.js";
import { UPLOAD_DIR } from "./uploads.js";
import { rateLimit, securityHeaders } from "./security.js";
import authRoutes from "./routes/auth.js";
import folderRoutes from "./routes/folders.js";
import activityRoutes from "./routes/activities.js";
import sessionRoutes from "./routes/sessions.js";
import workLogRoutes from "./routes/worklogs.js";
import statsRoutes from "./routes/stats.js";

const isProduction = process.env.NODE_ENV === "production";
const secret = process.env.JWT_SECRET;
if (!secret || secret === "promijeni-me" || secret.length < 32) {
  if (isProduction) {
    console.error("GRESKA: JWT_SECRET mora biti postavljen na nasumican kljuc od najmanje 32 znaka (npr. openssl rand -hex 32).");
    process.exit(1);
  }
  console.warn("UPOZORENJE: JWT_SECRET nije postavljen na siguran kljuc (dozvoljeno samo u razvoju).");
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Iza reverse proxyja (Caddy) prava IP adresa klijenta stize u X-Forwarded-For.
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? (isProduction ? 1 : 0)));
app.disable("x-powered-by");
app.use(securityHeaders);
// U produkciji frontend i API su na istoj adresi, pa CORS treba samo u razvoju.
if (!isProduction) app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use(["/api/auth/login", "/api/auth/register"], rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use("/api/auth", authRoutes);
app.use("/api/folders", requireAuth, folderRoutes);
app.use("/api/activities", requireAuth, activityRoutes);
app.use("/api/sessions", requireAuth, sessionRoutes);
app.use("/api/worklogs", requireAuth, workLogRoutes);
app.use("/api/stats", requireAuth, statsRoutes);

// Slike aktivnosti. Imena fajlova su nasumicna (128 bita) i mijenjaju se pri svakoj
// zamjeni slike, pa se mogu kesirati bez ogranicenja.
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    immutable: true,
    maxAge: "365d",
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Nepostojeca ruta" });
});

// U produkciji server servira i izgradjeni frontend (client/dist).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  // Fajlovi s hash-om u imenu (/assets) se nikad ne mijenjaju; ostalo (index.html, sw.js) se uvijek provjerava.
  app.use("/assets", express.static(path.join(clientDist, "assets"), { immutable: true, maxAge: "365d" }));
  app.use(express.static(clientDist, { maxAge: 0 }));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Planner server radi na http://localhost:${PORT}`);
});

// Uredno gasenje (npr. docker compose stop / restart servera).
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
