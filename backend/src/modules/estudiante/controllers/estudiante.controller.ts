import { Request, Response } from "express";
import { EstudianteService } from "../services/estudiante.service.js";

const service = new EstudianteService();

export class EstudianteController {
  async getEstudiantes(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : null;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const data = await service.getEstudiantes(page, limit);
      if (page !== null && !isNaN(page)) {
        res.json({ success: true, ...data });
      } else {
        res.json(data);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "No se pudieron listar los estudiantes." });
    }
  }

  async getEstudianteByDni(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getEstudianteByDni(req.params.dni as string);
      res.json(data);
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || "No se pudo consultar el estudiante." });
    }
  }

  async getEstudianteSecretaria(req: Request, res: Response): Promise<void> {
    try {
      const { dni } = req.params;
      const { periodo } = req.query as any;
      const data = await service.getEstudianteSecretaria(dni as string, periodo as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async searchEstudiantesSecretaria(req: Request, res: Response): Promise<void> {
    try {
      const { nombre, periodo } = req.query as any;
      const data = await service.searchEstudiantesSecretaria(nombre, periodo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
