import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "./common/middlewares/auth.js";
import systemRouter from "./common/system/system.routes.js";
import authRouter from "./modules/auth/routes/auth.routes.js";
import cajaRouter from "./modules/caja/routes/caja.routes.js";
import coordinacionRouter from "./modules/coordinacion/routes/coordinacion.routes.js";
import direccionRouter from "./modules/direccion/routes/direccion.routes.js";
import estudianteRouter from "./modules/estudiante/routes/estudiante.routes.js";
import padresInscripcionRouter from "./modules/padres_inscripcion/routes/padres_inscripcion.routes.js";
import secretariaRouter from "./modules/secretaria/routes/secretaria.routes.js";
import syncRouter from "./modules/sync/routes/sync.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  const allowedOrigins = new Set<string>(
    [
      process.env.FRONTEND_URL,
      process.env.PUBLIC_FRONTEND_URL,
      ...(process.env.ALLOWED_ORIGINS || "").split(","),
    ]
      .map((origin) => String(origin || "").trim().replace(/\/$/, ""))
      .filter(Boolean)
  );

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

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  });

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    next();
  });

  app.use("/", systemRouter);
  app.use("/", authRouter);
  app.use("/", syncRouter);
  app.use("/api/v1/extracurricular", requireAuth);
  app.use("/", coordinacionRouter);
  app.use("/", estudianteRouter);
  app.use("/", padresInscripcionRouter);
  app.use("/", cajaRouter);
  app.use("/", secretariaRouter);
  app.use("/api/v1/extracurricular", direccionRouter);

  const distPath = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(distPath));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      res.sendFile(path.join(distPath, "index.html"));
      return;
    }
    next();
  });

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

  return app;
}
