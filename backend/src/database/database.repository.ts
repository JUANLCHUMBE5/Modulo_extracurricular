import { getDb, resetDb, saveDb, updateDb } from "./local/dbLocal.js";
import { LocalDatabase } from "./types.js";

export class DatabaseRepository {
  getDb(): Promise<LocalDatabase> {
    return getDb();
  }

  saveDb(db: LocalDatabase): Promise<LocalDatabase> {
    return saveDb(db);
  }

  updateDb(mutator: (db: LocalDatabase) => any): Promise<LocalDatabase> {
    return updateDb(mutator);
  }

  resetDb(): Promise<LocalDatabase> {
    return resetDb();
  }
}
