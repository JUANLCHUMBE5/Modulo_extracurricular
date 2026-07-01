import express from "express";
import multer from "multer";
import { CoordinacionController } from "./coordinacion.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { MAX_FILE_SIZE } from "../../services/file.service.js";

const router = express.Router();
const controller = new CoordinacionController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fieldSize: 5 * 1024 * 1024 },
});

// --- RUTAS LEGACY (COMPATIBILIDAD) ---
router.get("/api/programas", (req, res) => controller.getProgramas(req, res));
router.get("/api/categorias", (req, res) => controller.getCategorias(req, res));

// --- CATEGORÍAS ---
router.get("/api/v1/extracurricular/categorias", (req, res) => controller.getCategorias(req, res));
router.post("/api/v1/extracurricular/categorias", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.crearCategoria(req, res));
router.delete("/api/v1/extracurricular/categorias/:nombre", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.eliminarCategoria(req, res));

// --- CONFIGURACIÓN INSTITUCIONAL ---
router.get("/api/v1/extracurricular/coordinacion/configuracion-institucional", requireAuth, requireRole(["coordinacion", "direccion"]), (req, res) => controller.getConfiguracionInstitucional(req, res));
router.put("/api/v1/extracurricular/coordinacion/configuracion-institucional", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.updateConfiguracionInstitucional(req, res));

// --- PROGRAMAS / TALLERES ---
router.get("/api/v1/extracurricular/programas", (req, res) => controller.getProgramas(req, res));
router.get("/api/v1/extracurricular/programas/:id", (req, res) => controller.getProgramaById(req, res));
router.post("/api/v1/extracurricular/programas", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.crearPrograma(req, res));
router.put("/api/v1/extracurricular/programas/:id", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.updatePrograma(req, res));
router.put("/api/v1/extracurricular/programas/:id/estado", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.updateProgramaEstado(req, res));
router.delete("/api/v1/extracurricular/programas/:id", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.deletePrograma(req, res));

// Matrículas, invitados y asistencias de un programa
router.get("/api/v1/extracurricular/programas/:programaId/invitados", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.getInvitados(req, res));
router.get("/api/v1/extracurricular/programas/:programaId/matriculados", (req, res) => controller.getMatriculados(req, res));
router.get("/api/v1/extracurricular/programas/:programaId/asistencias", (req, res) => controller.getAsistencias(req, res));
router.get("/api/v1/extracurricular/programas/:programaId/actividad", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.getProgramaActividades(req, res));
router.get("/api/v1/extracurricular/programas/:programaId/lista-asistencia", requireAuth, requireRole(["auxiliar", "coordinacion"]), (req, res) => controller.getProgramaListaAsistencia(req, res));

// Subida de documento de matrícula del taller
router.post("/api/v1/extracurricular/programas/documento", requireAuth, requireRole(["secretaria", "coordinacion"]), (req, res) => controller.subirDocumentoPrograma(req, res));

// --- INVITACIONES ---
router.get("/api/v1/extracurricular/invitaciones/buscar", (req, res) => controller.buscarInvitaciones(req, res));
router.post("/api/v1/extracurricular/programas/:programaId/invitados", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.invitarEstudiante(req, res));

// --- CARGAS EXCEL (ROSTERS) ---
router.post("/api/v1/extracurricular/coordinacion/cargas/confirmar", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.confirmarCargaExcel(req, res));
router.get("/api/v1/extracurricular/coordinacion/cargas", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.getCargasHistory(req, res));
router.delete("/api/v1/extracurricular/coordinacion/cargas/:cargaId", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.deleteCargaHistory(req, res));
router.get("/api/v1/extracurricular/coordinacion/cargas/:cargaId/errores", requireAuth, requireRole(["coordinacion"]), (req, res) => controller.getCargaErrors(req, res));

// --- ASISTENCIA (AUXILIAR) ---
router.post("/api/v1/extracurricular/asistencia", requireAuth, requireRole(["auxiliar"]), (req, res) => controller.registrarAsistencia(req, res));
router.get("/api/v1/extracurricular/auxiliar/validar", requireAuth, requireRole(["auxiliar", "coordinacion"]), (req, res) => controller.validarIngresoAuxiliar(req, res));
router.get("/api/v1/extracurricular/auxiliar/validar-qr", requireAuth, requireRole(["auxiliar", "coordinacion"]), (req, res) => controller.validarIngresoQrAuxiliar(req, res));

export default router;
