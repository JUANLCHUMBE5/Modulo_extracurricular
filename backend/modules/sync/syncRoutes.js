import express from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../../dbLocal.js";
import { addSyncClient } from "../../syncBus.js";

const router = express.Router();

function validarToken(req, res, next) {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = headerToken || req.query.token || "";

  if (!token) {
    return res.status(401).json({ success: false, message: "No autorizado. Token inexistente o invalido." });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Error de configuracion del servidor." });
    }
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Sesion invalida o expirada." });
  }
}

router.get("/api/v1/sync/events", validarToken, async (req, res) => {
  try {
    const since = String(req.query.since || "");
    const db = await getDb();
    const events = Array.isArray(db.syncEvents) ? db.syncEvents : [];
    const data = since
      ? events.filter((event) => String(event.createdAt || "") > since || String(event.id || "") === since)
      : events.slice(-20);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/sync/events/stream", validarToken, (req, res) => {
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
