import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { requireAuth } from "./auth.js";
import { errorHandler } from "./errors.js";
import authRoutes from "./routes/auth.js";
import folderRoutes from "./routes/folders.js";
import activityRoutes from "./routes/activities.js";
import sessionRoutes from "./routes/sessions.js";

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "promijeni-me")) {
  console.warn("UPOZORENJE: postavi JWT_SECRET na dug, tajan kljuc!");
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/folders", requireAuth, folderRoutes);
app.use("/api/activities", requireAuth, activityRoutes);
app.use("/api/sessions", requireAuth, sessionRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Nepostojeca ruta" });
});

// U produkciji server servira i izgradjeni frontend (client/dist).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Planner server radi na http://localhost:${PORT}`);
});
