import express from "express";
import { DireccionController } from "./direccion.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";

const router = express.Router();
const controller = new DireccionController();

router.get("/reportes/resumen", requireAuth, requireRole(["direccion"]), (req, res) => controller.getReportesResumen(req, res));
router.get("/direccion/descuentos/buscar", requireAuth, requireRole(["direccion"]), (req, res) => controller.buscarDescuentos(req, res));
router.post("/direccion/descuentos/aplicar", requireAuth, requireRole(["direccion"]), (req, res) => controller.aplicarDescuento(req, res));
router.delete("/direccion/descuentos/remover/:inscripcionId", requireAuth, requireRole(["direccion"]), (req, res) => controller.removerDescuento(req, res));
router.get("/direccion/correlativos", requireAuth, requireRole(["direccion", "caja"]), (req, res) => controller.getCorrelativos(req, res));
router.put("/direccion/correlativos", requireAuth, requireRole(["direccion"]), (req, res) => controller.updateCorrelativos(req, res));

export default router;
