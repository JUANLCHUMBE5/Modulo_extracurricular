import express, { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../../dbLocal.js";
import { addSyncClient } from "../../syncBus.js";
import { AuthenticatedRequest } from "../../middleware/auth.js";

const router = express.Router();

/**
 * Middleware local para validar el token JWT enviado en la cabecera 'Authorization' o como parámetro query 'token'.
 * Si el token es válido, inyecta la información del usuario en `req.user` para autorizar la conexión.
 * 
 * @param req Solicitud HTTP con la información del token.
 * @param res Respuesta HTTP para devolver errores en caso de falta de autorización.
 * @param next Siguiente función middleware.
 */
function validarToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = (headerToken || req.query.token || "") as string;

  if (!token) {
    res.status(401).json({ success: false, message: "No autorizado. Token inexistente o invalido." });
    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ success: false, message: "Error de configuracion del servidor." });
      return;
    }
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Sesion invalida o expirada." });
    return;
  }
}

/**
 * GET /api/v1/sync/events
 * Endpoint para obtener el listado histórico de eventos de sincronización ocurridos.
 * Permite filtrar por fecha mediante la query 'since'.
 */
router.get("/api/v1/sync/events", validarToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const since = String(req.query.since || "");
    const db = await getDb();
    const events = Array.isArray(db.syncEvents) ? db.syncEvents : [];
    const data = since
      ? events.filter((event) => String(event.createdAt || "") > since || String(event.id || "") === since)
      : events.slice(-20);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/sync/events/stream
 * Endpoint SSE (Server-Sent Events) para establecer una conexión de flujo persistente en tiempo real.
 * Emite periódicamente pings de latido (heartbeat) cada 25 segundos para mantener la conexión activa.
 */
router.get("/api/v1/sync/events/stream", validarToken, (req: AuthenticatedRequest, res: Response): void => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`event: ready\n`);
  res.write(`data: ${JSON.stringify({ ok: true, createdAt: new Date().toISOString() })}\n\n`);

  const removeClient = addSyncClient(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\n`);
      res.write(`data: ${Date.now()}\n\n`);
    } catch {
      clearInterval(heartbeat);
      removeClient();
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient();
  });
});

export default router;
