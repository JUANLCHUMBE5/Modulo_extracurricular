import { SyncRepository } from "../repositories/sync.repository.js";

const syncRepository = new SyncRepository();

export class SyncService {
  /**
   * Obtiene los eventos de sincronización ocurridos a partir de una fecha/ID específico.
   */
  async getEvents(since: string): Promise<any[]> {
    const db = await syncRepository.getDb();
    const events = Array.isArray(db.syncEvents) ? db.syncEvents : [];
    if (since) {
      return events.filter((event) => String(event.createdAt || "") > since || String(event.id || "") === since);
    }
    return events.slice(-20);
  }
}
