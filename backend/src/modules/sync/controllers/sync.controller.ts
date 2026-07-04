import { Response } from "express";
import { SyncService } from "../services/sync.service.js";
import { addSyncClient } from "../../../common/shared/syncBus.js";
import { AuthenticatedRequest } from "../../../common/middlewares/auth.js";

const syncService = new SyncService();

export class SyncController {
  async getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const since = String(req.query.since || "");
      const data = await syncService.getEvents(since);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  establishStream(req: AuthenticatedRequest, res: Response): void {
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
  }
}
