import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../../../common/middlewares/auth.js";
import { loginLimiter } from "../../../common/middlewares/rateLimiter.js";

const router = express.Router();
const controller = new AuthController();

// --- RUTAS PÚBLICAS / PORTAL DE PADRES ---
router.post("/api/v1/extracurricular/padres/validar", loginLimiter, (req, res) => controller.validatePadre(req, res));
router.post("/api/v1/auth/login", loginLimiter, (req, res) => controller.loginOperator(req, res));

// --- RUTAS PROTEGIDAS GENERALES ---
router.get("/api/v1/auth/me", requireAuth, (req, res) => controller.getMe(req, res));

// --- RUTAS DE ADMINISTRADOR ---
router.get("/api/v1/administrador/audit-logs", requireAuth, requireRole(["administrador"]), (req, res) => controller.getAuditLogs(req, res));
router.get("/api/v1/administrador/db/backup", requireAuth, requireRole(["administrador"]), (req, res) => controller.getDbBackup(req, res));
router.post("/api/v1/administrador/db/reset", requireAuth, requireRole(["administrador"]), (req, res) => controller.resetDb(req, res));

// Gestión de usuarios operadores
router.get("/api/v1/usuarios", requireAuth, requireRole(["administrador"]), (req, res) => controller.listUsers(req, res));
router.post("/api/v1/usuarios", requireAuth, requireRole(["administrador"]), (req, res) => controller.createUser(req, res));
router.put("/api/v1/usuarios/:id", requireAuth, requireRole(["administrador"]), (req, res) => controller.updateUser(req, res));
router.put("/api/v1/usuarios/:id/estado", requireAuth, requireRole(["administrador"]), (req, res) => controller.updateUserStatus(req, res));
router.post("/api/v1/usuarios/:id/resetear-contrasena", requireAuth, requireRole(["administrador"]), (req, res) => controller.resetUserPassword(req, res));
router.delete("/api/v1/usuarios/:id", requireAuth, requireRole(["administrador"]), (req, res) => controller.deleteUser(req, res));

export default router;
