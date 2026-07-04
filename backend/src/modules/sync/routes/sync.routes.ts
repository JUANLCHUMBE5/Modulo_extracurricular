import express, { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { SyncController } from "../controllers/sync.controller.js";
import { AuthenticatedRequest } from "../../../common/middlewares/auth.js";

const router = express.Router();
const controller = new SyncController();

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

function validarToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = (headerToken || req.query.token || "") as string;

  if (!token) {
    res.status(401).json({ success: false, message: "No autorizado. Token inexistente o invalido." });
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Sesion invalida o expirada." });
    return;
  }
}

router.get("/api/v1/sync/events", validarToken, (req, res) => controller.getEvents(req, res));
router.get("/api/v1/sync/events/stream", validarToken, (req, res) => controller.establishStream(req, res));

export default router;
