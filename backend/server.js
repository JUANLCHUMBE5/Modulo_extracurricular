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

// Disable API caching to avoid browser HTTP 304 cache issues
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Endpoint de estado y diagnóstico del servidor. Retorna la procedencia de los datos (local/supabase).
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbSource: getDbSource() });
});

// --- CORE DATABASE ENDPOINTS (require local DB access) ---

// Obtiene la base de datos completa. Sanitiza los usuarios ocultando las contraseñas bcrypt.
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

// Guarda cambios manuales sobre la base de datos JSON local.
app.put("/api/db", requireLocalDbAccess, async (req, res) => {
  try {
    const db = await saveDb(req.body);
    res.json(db);
  } catch (error) {
    console.error("No se pudo guardar la base local:", error);
    res.status(500).json({ message: "No se pudo guardar la base local." });
  }
});

// Restablece la base de datos local a su estado semilla inicial predeterminado.
app.post("/api/db/reset", requireLocalDbAccess, async (_req, res) => {
  try {
    res.json(await resetDb());
  } catch (error) {
    console.error("No se pudo reiniciar la base local:", error);
    res.status(500).json({ message: "No se pudo reiniciar la base local." });
  }
});

// Endpoint público para obtener la base de datos.
app.get("/api/modulo", async (_req, res) => {
  try {
    res.json(await getDb());
  } catch {
    res.status(500).json({ message: "No se pudo leer el modulo extracurricular." });
  }
});

// --- MOUNT ROUTERS ---

// 1. Montaje de enrutadores de autenticación y sincronización SSE
app.use("/", authRouter);
app.use("/", syncRouter);

// 2. Interceptor de seguridad global: los endpoints de negocio /v1 requieren token JWT firmado
app.use("/api/v1/extracurricular", requireAuth);

// 3. Montaje de sub-enrutadores por dominios/roles funcionales
app.use("/", coordinacionRouter);
app.use("/", inscripcionRouter);
app.use("/", cajaRouter);
app.use("/", secretariaRouter);
app.use("/api/v1/extracurricular", direccionRouter);

// Servir archivos estáticos del frontend de React en producción
const DIST_PATH = path.join(__dirname, "../frontend/dist");
app.use(express.static(DIST_PATH));

// Redirigir cualquier otra ruta GET no-API al index.html de React (para soportar enrutamiento del lado del cliente)
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(path.join(DIST_PATH, "index.html"));
  }
  next();
});

// --- MULTER & GLOBAL ERROR HANDLING ---
// Middleware centralizado de control de errores. Maneja límites de peso de subidas en Multer y excepciones generales.
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

// Inicialización de la escucha en el puerto e IP correspondientes
app.listen(PORT, API_HOST, () => {
  console.log(`Excel API listening on http://${API_HOST}:${PORT}`);
});
