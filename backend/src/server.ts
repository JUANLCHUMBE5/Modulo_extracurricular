import cors from "cors";
import "./config/env.js";
import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { getDb, getDbSource, resetDb, saveDb } from "./database/dbLocal.js";
import { requireAuth, requireLocalDbAccess, AuthenticatedRequest } from "./middlewares/auth.js";

// Import modular routes (importados con extensión .js ya que se compilarán en JS)
// @ts-ignore
import authRouter from "./modules/auth/auth.routes.js";
// @ts-ignore
import coordinacionRouter from "./modules/coordinacion/coordinacion.routes.js";
// @ts-ignore
import inscripcionRouter from "./modules/inscripcion/inscripcion.routes.js";
// @ts-ignore
import cajaRouter from "./modules/caja/caja.routes.js";
// @ts-ignore
import direccionRouter from "./modules/direccion/direccion.routes.js";
// @ts-ignore
import syncRouter from "./modules/sync/sync.routes.js";
// @ts-ignore
import secretariaRouter from "./modules/secretaria/secretaria.routes.js";
// @ts-ignore
import estudianteRouter from "./modules/estudiante/estudiante.routes.js";

const app = express();
const PORT = Number(process.env.PORT || process.env.EXCEL_API_PORT || 5175);
const API_HOST = process.env.API_HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

const allowedOrigins = new Set<string>(
  [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
  ]
    .map((origin) => String(origin || "").trim().replace(/\/$/, ""))
    .filter(Boolean)
);

/**
 * Configuración de CORS dinámica.
 * Permite conexiones desde localhost/127.0.0.1 para desarrollo local
 * y restringe accesos externos en base a la lista blanca de orígenes configurada.
 */
app.use(cors({
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const cleanOrigin = String(origin || "").replace(/\/$/, "");
    if (!origin || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(cleanOrigin) || allowedOrigins.has(cleanOrigin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido por CORS."));
  },
}));

app.use(express.json({ limit: "30mb" }));

/**
 * Middleware de registro (logging) de solicitudes entrantes para diagnóstico
 * y seguimiento de tiempos de respuesta del servidor.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

/**
 * Middleware para deshabilitar la caché HTTP en los navegadores (Cache-Control: no-store).
 * Evita problemas de datos desactualizados (errores HTTP 304) al consultar la base de datos local.
 */
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

/**
 * Endpoint de estado y diagnóstico del servidor.
 * Retorna si el backend está activo y de dónde provienen sus datos.
 */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, dbSource: getDbSource() });
});

// --- CORE DATABASE ENDPOINTS (requieren acceso de base de datos local) ---

/**
 * Endpoint para obtener el volcado de la base de datos local completa.
 * Sanitiza los datos de los usuarios ocultando las contraseñas bcrypt para seguridad.
 */
app.get("/api/db", requireLocalDbAccess, async (_req: Request, res: Response) => {
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

/**
 * Endpoint para guardar cambios manuales o estructurales directamente en la base de datos JSON local.
 */
app.put("/api/db", requireLocalDbAccess, async (req: Request, res: Response) => {
  try {
    const db = await saveDb(req.body);
    res.json(db);
  } catch (error) {
    console.error("No se pudo guardar la base local:", error);
    res.status(500).json({ message: "No se pudo guardar la base local." });
  }
});

/**
 * Endpoint de emergencia para restablecer todos los archivos JSON locales a su estado inicial de semilla (default).
 */
app.post("/api/db/reset", requireLocalDbAccess, async (_req: Request, res: Response) => {
  try {
    res.json(await resetDb());
  } catch (error) {
    console.error("No se pudo reiniciar la base local:", error);
    res.status(500).json({ message: "No se pudo reiniciar la base local." });
  }
});

/**
 * Endpoint público y de solo lectura de la base de datos para consumo directo en portales.
 */
app.get("/api/modulo", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    // Sanitización crítica para producción: expone únicamente metadatos públicos de programas y categorías
    const publicDb = {
      programas: db.programas || [],
      categorias: db.categorias || [],
      configuracionInstitucional: db.configuracionInstitucional || {}
    };
    res.json(publicDb);
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

app.use("/", coordinacionRouter);
app.use("/", estudianteRouter);
app.use("/", inscripcionRouter);
app.use("/", cajaRouter);
app.use("/", secretariaRouter);
app.use("/api/v1/extracurricular", direccionRouter);

// Servir archivos estáticos del frontend de React en producción
const DIST_PATH = path.join(__dirname, "../../frontend/dist");
app.use(express.static(DIST_PATH));

// Redirigir cualquier otra ruta GET no-API al index.html de React (para soportar enrutamiento del lado del cliente)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.join(DIST_PATH, "index.html"));
    return;
  }
  next();
});

// --- MULTER & GLOBAL ERROR HANDLING ---
/**
 * Middleware centralizado de control de errores de Express.
 * Maneja excepciones del subidor Multer (excesos de peso de archivos) y errores generales HTTP 500.
 */
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    const mensajes: Record<string, string> = {
      LIMIT_FILE_SIZE: "El archivo Excel no debe superar 5 MB.",
      LIMIT_FIELD_VALUE: "La informacion enviada para validar el Excel es demasiado pesada. Actualice la pagina e intente nuevamente.",
      LIMIT_UNEXPECTED_FILE: "Solo se puede procesar un archivo Excel por validacion.",
    };
    res.status(400).json({ message: mensajes[error.code] || "El archivo no cumple las condiciones permitidas." });
    return;
  }
  res.status(500).json({ message: error.message || "No se pudo procesar la solicitud." });
});

// Inicialización de la escucha en el puerto e IP correspondientes
app.listen(PORT, API_HOST, () => {
  console.log(`Excel API listening on http://${API_HOST}:${PORT}`);
});
