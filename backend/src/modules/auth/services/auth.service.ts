import { AuthSessionService } from "./auth-session.service.js";
import { AuthSystemService } from "./auth-system.service.js";
import { AuthUserService } from "./auth-user.service.js";

const authSessionService = new AuthSessionService();
const authSystemService = new AuthSystemService();
const authUserService = new AuthUserService();

export class AuthService {
  async validatePadre(dni: string, fechaNacimiento: string, ip: string) {
    return authSessionService.validatePadre(dni, fechaNacimiento, ip);
  }

  async loginOperator(username: string, passwordPlana: string, ip: string) {
    return authSessionService.loginOperator(username, passwordPlana, ip);
  }

  async getMe(username: string, currentRole: string) {
    return authSessionService.getMe(username, currentRole);
  }

  async getAuditLogs() {
    return authSystemService.getAuditLogs();
  }

  async getDbBackup() {
    return authSystemService.getDbBackup();
  }

  async resetDb(operatorUsername: string, operatorRole: string, ip: string) {
    return authSystemService.resetDb(operatorUsername, operatorRole, ip);
  }

  async listUsers() {
    return authUserService.listUsers();
  }

  async createUser(operatorUsername: string, operatorRole: string, userData: any) {
    return authUserService.createUser(operatorUsername, operatorRole, userData);
  }

  async updateUser(operatorUsername: string, operatorRole: string, id: string, userData: any, superadminKey?: string) {
    return authUserService.updateUser(operatorUsername, operatorRole, id, userData, superadminKey);
  }

  async updateUserStatus(operatorUsername: string, operatorRole: string, id: string, estado: string, superadminKey?: string) {
    return authUserService.updateUserStatus(operatorUsername, operatorRole, id, estado, superadminKey);
  }

  async resetUserPassword(operatorUsername: string, operatorRole: string, id: string, superadminKey?: string) {
    return authUserService.resetUserPassword(operatorUsername, operatorRole, id, superadminKey);
  }

  async deleteUser(operatorUsername: string, operatorRole: string, id: string, superadminKey?: string) {
    return authUserService.deleteUser(operatorUsername, operatorRole, id, superadminKey);
  }
}
