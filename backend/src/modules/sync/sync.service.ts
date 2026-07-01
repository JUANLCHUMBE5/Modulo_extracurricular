import { getDb } from "../../database/dbLocal.js";

export class SyncService {
  async getEvents(since: string): Promise<any[]> {
    const db = await getDb();
    const events = Array.isArray(db.syncEvents) ? db.syncEvents : [];
    if (since) {
      return events.filter((event) => String(event.createdAt || "") > since || String(event.id || "") === since);
    }
    return events.slice(-20);
  }
}
