import { Request, Response } from "express";
import { PadresInscripcionService } from "../services/padres_inscripcion.service.js";
import { AuthenticatedRequest } from "../../../common/middlewares/auth.js";

const service = new PadresInscripcionService();

export class PadresInscripcionController {

  async getInscripcionesLegacy(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : null;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const data = await service.getInscripcionesLegacy(page, limit);
      if (page !== null && !isNaN(page)) {
        res.json({ success: true, ...data });
      } else {
        res.json(data);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "No se pudieron listar las inscripciones." });
    }
  }

  async getDocumentosLegacy(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getDocumentosLegacy();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "No se pudieron listar los documentos." });
    }
  }

  async getResumenPadresLegacy(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getResumenPadresLegacy(req.params.dni as string);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "No se pudo consultar el resumen del padre." });
    }
  }



  async crearInscripcion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.crearInscripcion(req.user.username, req.user.role, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async registrarDocumento(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = await service.registrarDocumento(id as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async derivarCaja(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { inscripcionId } = req.params;
      const data = await service.derivarCaja(req.user?.username || "Asistente", req.user?.role || "secretaria", inscripcionId as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async reservarCaja(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { inscripcionId } = req.params;
      const data = await service.reservarCaja(req.user?.username || "", req.user?.role || "padres", inscripcionId as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async buscarInscripcionesSecretaria(req: Request, res: Response): Promise<void> {
    try {
      const { dni, periodo } = req.query as any;
      const data = await service.buscarInscripcionesSecretaria(dni, periodo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async listarInscripcionesSecretaria(req: Request, res: Response): Promise<void> {
    try {
      const { dni, periodo } = req.query as any;
      const data = await service.listarInscripcionesSecretaria(dni, periodo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getResumenPadres(req: Request, res: Response): Promise<void> {
    try {
      const { dni } = req.params;
      const data = await service.getResumenPadres(dni as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateApoderado(req: Request, res: Response): Promise<void> {
    try {
      const { dni } = req.params;
      const data = await service.updateApoderado(dni as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
