import cors from "cors";
import "./env.js";
import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { getDb, getDbSource, resetDb, saveDb } from "./dbLocal.js";
import { requireAuth, requireLocalDbAccess } from "./middleware/auth.js";

// Import modular routes
import authRouter from "./modules/auth/authRoutes.js";
import coordinacionRouter from "./modules/coordinacion/coordinacionRoutes.js";
import inscripcionRouter from "./modules/inscripcion/inscripcionRoutes.js";
import cajaRouter from "./modules/caja/cajaRoutes.js";
import direccionRouter from "./modules/direccion/direccionRoutes.js";
import syncRouter from "./modules/sync/syncRoutes.js";
import secretariaRouter from "./modules/secretaria/secretariaRoutes.js";

const app = express();
const PORT = Number(process.env.PORT || process.env.EXCEL_API_PORT || 5175);
const API_HOST = process.env.API_HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
  ]
    .map((origin) => String(origin || "").trim().replace(/\/$/, ""))
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    const cleanOrigin = String(origin || "").replace(/\/$/, "");
    if (!origin || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(cleanOrigin) || allowedOrigins.has(cleanOrigin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS."));
  },
}));
app.use(express.json({ limit: "30mb" }));

// Custom request logger for debugging timeouts
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbSource: getDbSource() });
});

// --- CORE DATABASE ENDPOINTS (require local DB access) ---
app.get("/api/db", requireLocalDbAccess, async (_req, res) => {
  try {
    const db = await getDb();
    const sanitizedDb = {
      ...db,
      usuarios: (db.usuarios || []).map(({ contrasena, ...u }) => u)
    };
    res.json(sanitizedDb);
  } catch (error) {
    console.error("No se pudo leer la base local:", error);
    res.status(500).json({ message: "No se pudo leer la base local." });
  }
});

app.put("/api/db", requireLocalDbAccess, async (req, res) => {
  try {
    const db = await saveDb(req.body);
    res.json(db);
  } catch (error) {
    console.error("No se pudo guardar la base local:", error);
    res.status(500).json({ message: "No se pudo guardar la base local." });
  }
});

app.post("/api/db/reset", requireLocalDbAccess, async (_req, res) => {
  try {
    res.json(await resetDb());
  } catch (error) {
    console.error("No se pudo reiniciar la base local:", error);
    res.status(500).json({ message: "No se pudo reiniciar la base local." });
  }
});

app.get("/api/modulo", async (_req, res) => {
  try {
    res.json(await getDb());
  } catch {
    res.status(500).json({ message: "No se pudo leer el modulo extracurricular." });
  }
});

// --- MOUNT ROUTERS ---

// 1. Authentication and Admin (Includes login and parent validation)
app.use("/", authRouter);
app.use("/", syncRouter);

// 2. Require Authentication for Extracurricular endpoints
app.use("/api/v1/extracurricular", requireAuth);

// 3. Mount Domain Sub-Routers
app.use("/", coordinacionRouter);
app.use("/", inscripcionRouter);
app.use("/", cajaRouter);
app.use("/", secretariaRouter);
app.use("/api/v1/extracurricular", direccionRouter);

// Servir archivos estáticos del frontend de React en producción
const DIST_PATH = path.join(__dirname, "../frontend/dist");
app.use(express.static(DIST_PATH));

// Redirigir cualquier otra ruta GET no-API al index.html de React (compatible con Express v5)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(DIST_PATH, "index.html"));
  }
  next();
});

// --- MULTER & GLOBAL ERROR HANDLING ---
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const mensajes = {
      LIMIT_FILE_SIZE: "El archivo Excel no debe superar 5 MB.",
      LIMIT_FIELD_VALUE: "La informacion enviada para validar el Excel es demasiado pesada. Actualice la pagina e intente nuevamente.",
      LIMIT_UNEXPECTED_FILE: "Solo se puede procesar un archivo Excel por validacion.",
    };
    return res.status(400).json({ message: mensajes[error.code] || "El archivo no cumple las condiciones permitidas." });
  }
  return res.status(500).json({ message: error.message || "No se pudo procesar la solicitud." });
});

app.listen(PORT, API_HOST, () => {
  console.log(`Excel API listening on http://${API_HOST}:${PORT}`);
});
