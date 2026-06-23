import cors from "cors";
import "./loadEnv.js";
import express from "express";
import multer from "multer";
import { generarPreviewCargaExcel } from "./excelPreviewService.js";
import {
  MAX_FILE_SIZE,
  MAX_WORD_FILE_SIZE,
  convertirWordAPdf,
  validarArchivoWord,
  normalizarNombreDescarga,
  normalizarPeriodo,
  parseJsonArray,
  parseJsonObject,
} from "./fileProcessing.js";
import { getDb, getDbSource, resetDb, saveDb } from "./localDb.js";
import { requireAuth, requireLocalDbAccess } from "./middleware/auth.js";

// Import modular routes
import authRouter from "./routes/authRoutes.js";
import programaRouter from "./routes/programaRoutes.js";
import inscripcionRouter from "./routes/inscripcionRoutes.js";
import pagoRouter from "./routes/pagoRoutes.js";
import direccionRouter from "./routes/direccionRoutes.js";

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fieldSize: 5 * 1024 * 1024 },
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_WORD_FILE_SIZE, files: 1 },
});

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

// --- BASE PATHS & HEALTH CHECKS ---
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "modulo-extracurricular-api", dbSource: getDbSource() });
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

// --- FILE UPLOAD AND CONVERSION PREVIEWS ---
app.post("/api/coordinacion/cargas/preview", upload.single("archivo"), async (req, res) => {
  try {
    const periodo = normalizarPeriodo(req.body.periodo);
    const archivo = req.file;
    const db = await getDb();
    const frontendProgramas = parseJsonArray(req.body.programas);
    const dbProgramasMap = new Map((db.programas || []).map(p => [p.id, p]));
    const programas = frontendProgramas.map(fp => {
      const dbProg = dbProgramasMap.get(fp.id);
      return {
        ...fp,
        gradosAplicables: fp.gradosAplicables || dbProg?.gradosAplicables || [],
        horariosPorGrupo: fp.horariosPorGrupo || dbProg?.horariosPorGrupo || []
      };
    });

    const existentes = parseJsonObject(req.body.existentes);
    const estudiantes = parseJsonObject(req.body.estudiantes);
    const programaId = req.body.programaId || req.body.programa_id || "";

    const preview = await generarPreviewCargaExcel({
      periodo,
      archivo,
      programas: programas.length ? programas : (db.programas || []),
      existentes: existentes && Object.keys(existentes).length ? existentes : (db.invitadosPorPrograma || {}),
      estudiantes: estudiantes && Object.keys(estudiantes).length ? estudiantes : (db.estudiantes || {}),
      programaId,
    });
    res.json(preview);
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo validar el archivo Excel.",
    });
  }
});

app.post("/api/secretaria/documentos/pdf", documentUpload.single("archivo"), async (req, res) => {
  try {
    const archivo = req.file;
    validarArchivoWord(archivo);

    const pdf = await convertirWordAPdf(archivo.buffer);
    const nombre = normalizarNombreDescarga(archivo.originalname).replace(/\.docx$/i, ".pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(pdf);
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo convertir el Word a PDF. Verifique que el servidor tenga Microsoft Word o LibreOffice instalado.",
    });
  }
});

// --- MOUNT ROUTERS ---

// 1. Authentication and Admin (Includes login and parent validation)
app.use("/", authRouter);

// 2. Require Authentication for Extracurricular endpoints
app.use("/api/v1/extracurricular", requireAuth);

// 3. Mount Domain Sub-Routers
app.use("/", programaRouter);
app.use("/", inscripcionRouter);
app.use("/", pagoRouter);
app.use("/api/v1/extracurricular", direccionRouter);

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
