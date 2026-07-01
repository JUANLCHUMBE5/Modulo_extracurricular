import express from "express";
import multer from "multer";
import { CajaController } from "./caja.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { MAX_FILE_SIZE } from "../../services/file.service.js";

const router = express.Router();
const controller = new CajaController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fieldSize: 5 * 1024 * 1024 },
});

// --- RUTA LEGACY ---
router.get("/api/pagos", (req, res) => controller.getPagosLegacy(req, res));

// --- RUTAS CAJA ---
router.get("/api/v1/extracurricular/pagos", requireAuth, requireRole(["caja"]), (req, res) => controller.getPagos(req, res));
router.post("/api/v1/extracurricular/pagos", requireAuth, requireRole(["caja"]), (req, res) => controller.registrarPago(req, res));
router.put("/api/v1/extracurricular/pagos/:pagoId", requireAuth, requireRole(["caja", "padres"]), (req, res) => controller.updatePago(req, res));
router.get("/api/v1/extracurricular/pagos/:pagoId", requireAuth, requireRole(["caja", "padres"]), (req, res) => controller.getPagoById(req, res));

// Resumenes, Egresos y Bandeja
router.get("/api/v1/extracurricular/caja/resumen", requireAuth, requireRole(["caja"]), (req, res) => controller.getCajaResumen(req, res));
router.post("/api/v1/extracurricular/caja/egresos", requireAuth, requireRole(["caja"]), (req, res) => controller.registrarEgreso(req, res));
router.get("/api/v1/extracurricular/caja/estudiantes/:dni", requireAuth, requireRole(["caja"]), (req, res) => controller.getEstudianteCaja(req, res));
router.get("/api/v1/extracurricular/caja/bandeja-pagos-web", requireAuth, requireRole(["caja"]), (req, res) => controller.getBandejaPagosWeb(req, res));

// Acciones sobre pagos
router.put("/api/v1/extracurricular/pagos/:pagoId/validar", requireAuth, requireRole(["caja"]), (req, res) => controller.validarPago(req, res));
router.put("/api/v1/extracurricular/pagos/:pagoId/observar", requireAuth, requireRole(["caja"]), (req, res) => controller.observarPago(req, res));
router.put("/api/v1/extracurricular/pagos/:pagoId/rechazar", requireAuth, requireRole(["caja"]), (req, res) => controller.rechazarPago(req, res));
router.put("/api/v1/extracurricular/pagos/:pagoId/anular", requireAuth, requireRole(["caja", "direccion"]), (req, res) => controller.anularPago(req, res));

// Reportes e interactivos
router.get("/api/v1/extracurricular/caja/reporte", requireAuth, requireRole(["caja", "direccion"]), (req, res) => controller.getCajaReporte(req, res));
router.get("/api/v1/extracurricular/caja/estudiantes/buscar/query", requireAuth, requireRole(["caja"]), (req, res) => controller.buscarEstudiantesQuery(req, res));
router.post("/api/v1/extracurricular/caja/correlativos/cancelar", requireAuth, requireRole(["caja"]), (req, res) => controller.cancelarCorrelativo(req, res));

// Portal Padres: Subida de comprobante
router.post("/api/v1/extracurricular/pagos/comprobante", requireAuth, requireRole(["padres"]), upload.single("archivo"), (req, res) => controller.registrarComprobante(req, res));

export default router;
