import { Request, Response } from "express";
import { DireccionService } from "../services/direccion.service.js";
import { AuthenticatedRequest } from "../../../common/middlewares/auth.js";

const direccionService = new DireccionService();

export class DireccionController {
  async getReportesResumen(req: Request, res: Response): Promise<void> {
    try {
      const data = await direccionService.getReportesResumen(req.query);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async buscarDescuentos(req: Request, res: Response): Promise<void> {
    try {
      const q = String(req.query.q || "");
      const data = await direccionService.buscarDescuentos(q);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async aplicarDescuento(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await direccionService.aplicarDescuento(
        req.user?.username || "Direccion",
        req.user?.role || "direccion",
        req.body
      );
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async removerDescuento(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { inscripcionId } = req.params;
      const data = await direccionService.removerDescuento(
        req.user?.username || "Direccion",
        req.user?.role || "direccion",
        inscripcionId as string
      );
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCorrelativos(req: Request, res: Response): Promise<void> {
    try {
      const data = await direccionService.getCorrelativos();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateCorrelativos(req: Request, res: Response): Promise<void> {
    try {
      await direccionService.updateCorrelativos(req.body);
      res.json({ success: true, message: "Correlativos actualizados correctamente" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
