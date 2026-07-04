import { prepararLogsAcceso, registrarAuditoria } from "../../../common/audit/audit.service.js";
import { AuthRepository } from "../repositories/auth.repository.js";

const authRepository = new AuthRepository();

export class AuthSystemService {
  async getAuditLogs() {
    const db = await authRepository.getDb();
    return prepararLogsAcceso(db.auditLogs || []);
  }

  async getDbBackup() {
    return await authRepository.getDb();
  }

  async resetDb(operatorUsername: string, operatorRole: string, ip: string) {
    const db = await authRepository.resetDb();
    await registrarAuditoria(operatorUsername, operatorRole, "DB_RESET", { ip });
    return db;
  }
}

