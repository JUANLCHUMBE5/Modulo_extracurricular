import express from "express";
import { EstudianteController } from "../controllers/estudiante.controller.js";
import { requireAuth, requireRole } from "../../../common/middlewares/auth.js";

const router = express.Router();
const controller = new EstudianteController();

// --- RUTAS LEGACY (COMPATIBILIDAD) ---
router.get("/api/estudiantes", (req, res) => controller.getEstudiantes(req, res));
router.get("/api/estudiantes/:dni", (req, res) => controller.getEstudianteByDni(req, res));

// --- RUTAS PORTALES ---
// Portal Secretaría
router.get("/api/v1/extracurricular/secretaria/estudiantes/:dni", requireAuth, requireRole(["secretaria", "coordinacion"]), (req, res) => controller.getEstudianteSecretaria(req, res));
router.get("/api/v1/extracurricular/secretaria/estudiantes", requireAuth, requireRole(["secretaria", "coordinacion"]), (req, res) => controller.searchEstudiantesSecretaria(req, res));

export default router;
