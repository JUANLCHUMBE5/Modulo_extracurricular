import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { AuthenticatedRequest } from "../../../common/middlewares/auth.js";

const authService = new AuthService();

export class AuthController {
  async validatePadre(req: Request, res: Response): Promise<void> {
    try {
      const { dni, fecha_nacimiento } = req.body;
      if (!dni || !fecha_nacimiento) {
        res.status(400).json({ success: false, message: "DNI y fecha de nacimiento son requeridos." });
        return;
      }
      const data = await authService.validatePadre(dni, fecha_nacimiento, req.ip || "");
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async loginOperator(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ success: false, message: "Usuario y contraseña son requeridos." });
        return;
      }
      const data = await authService.loginOperator(username, password, req.ip || "");
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message });
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await authService.getMe(req.user.username, req.user.role);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message });
    }
  }

  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await authService.getAuditLogs();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getDbBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await authService.getDbBackup();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async resetDb(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await authService.resetDb(req.user.username, req.user.role, req.ip || "");
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async listUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await authService.listUsers();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await authService.createUser(req.user.username, req.user.role, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const superadminKey = String(req.headers["x-superadmin-key"] || req.body?.superadminKey || "");
      const data = await authService.updateUser(req.user.username, req.user.role, req.params.id as string, req.body, superadminKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const superadminKey = String(req.headers["x-superadmin-key"] || req.body?.superadminKey || "");
      const data = await authService.updateUserStatus(req.user.username, req.user.role, req.params.id as string, req.body.estado, superadminKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async resetUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const superadminKey = String(req.headers["x-superadmin-key"] || req.body?.superadminKey || "");
      const data = await authService.resetUserPassword(req.user.username, req.user.role, req.params.id as string, superadminKey);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const superadminKey = String(req.headers["x-superadmin-key"] || req.body?.superadminKey || "");
      await authService.deleteUser(req.user.username, req.user.role, req.params.id as string, superadminKey);
      res.json({ success: true, data: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
