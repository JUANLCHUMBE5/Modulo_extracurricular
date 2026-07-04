import express from "express";
import { PadresInscripcionController } from "../controllers/padres_inscripcion.controller.js";
import { requireAuth, requireRole } from "../../../common/middlewares/auth.js";

const router = express.Router();
const controller = new PadresInscripcionController();

// --- RUTAS LEGACY (COMPATIBILIDAD) ---
router.get("/api/inscripciones", (req, res) => controller.getInscripcionesLegacy(req, res));
router.get("/api/documentos", (req, res) => controller.getDocumentosLegacy(req, res));
router.get("/api/padres/:dni/resumen", (req, res) => controller.getResumenPadresLegacy(req, res));

// --- RUTAS PORTALES ---

// Acciones de matrícula comunes
router.post("/api/v1/extracurricular/inscripciones", requireAuth, requireRole(["secretaria", "coordinacion", "padres"]), (req, res) => controller.crearInscripcion(req, res));
router.post("/api/v1/extracurricular/inscripciones/:id/documento", requireAuth, requireRole(["secretaria", "coordinacion"]), (req, res) => controller.registrarDocumento(req, res));

// Derivaciones y reservas de pago
router.put("/api/v1/extracurricular/inscripciones/:inscripcionId/derivar-caja", requireAuth, requireRole(["secretaria"]), (req, res) => controller.derivarCaja(req, res));
router.put("/api/v1/extracurricular/inscripciones/:inscripcionId/reservar-caja", requireAuth, requireRole(["padres"]), (req, res) => controller.reservarCaja(req, res));

// Búsqueda de inscripciones
router.get("/api/v1/extracurricular/secretaria/inscripciones/buscar", requireAuth, requireRole(["secretaria"]), (req, res) => controller.buscarInscripcionesSecretaria(req, res));
router.get("/api/v1/extracurricular/secretaria/inscripciones", requireAuth, requireRole(["secretaria"]), (req, res) => controller.listarInscripcionesSecretaria(req, res));

// Portal Padres
router.get("/api/v1/extracurricular/padres/resumen/:dni", requireAuth, requireRole(["padres", "secretaria"]), (req, res) => controller.getResumenPadres(req, res));
router.put("/api/v1/extracurricular/padres/:dni/apoderado", requireAuth, requireRole(["padres", "secretaria"]), (req, res) => controller.updateApoderado(req, res));

export default router;
