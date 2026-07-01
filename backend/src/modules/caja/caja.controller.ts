import { Request, Response } from "express";
import { CajaService } from "./caja.service.js";
import { AuthenticatedRequest } from "../../middlewares/auth.js";

const service = new CajaService();

export class CajaController {
  async getPagosLegacy(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : null;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const data = await service.getPagosLegacy(page, limit);
      if (page !== null && !isNaN(page)) {
        res.json({ success: true, ...data });
      } else {
        res.json(data);
      }
    } catch {
      res.status(500).json({ message: "No se pudieron listar los pagos." });
    }
  }

  async getPagos(req: Request, res: Response): Promise<void> {
    try {
      const { periodo, estudianteDni } = req.query as any;
      const page = req.query.page ? Number(req.query.page) : null;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const data = await service.getPagos(periodo, estudianteDni, page, limit);
      if (page !== null && !isNaN(page)) {
        res.json({ success: true, ...data });
      } else {
        res.json({ success: true, data });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async registrarPago(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.registrarPago(req.user?.username || "Cajera", req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updatePago(req: Request, res: Response): Promise<void> {
    try {
      const { pagoId } = req.params;
      const data = await service.updatePago(pagoId as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCajaResumen(req: Request, res: Response): Promise<void> {
    try {
      const { periodo } = req.query as any;
      const data = await service.getCajaResumen(periodo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async registrarEgreso(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.registrarEgreso(req.user?.username || "Cajera", req.user?.role || "caja", req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getEstudianteCaja(req: Request, res: Response): Promise<void> {
    try {
      const { dni } = req.params;
      const { periodo } = req.query as any;
      const data = await service.getEstudianteCaja(dni as string, periodo as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBandejaPagosWeb(req: Request, res: Response): Promise<void> {
    try {
      const { periodo } = req.query as any;
      const data = await service.getBandejaPagosWeb(periodo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async validarPago(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pagoId } = req.params;
      const { observaciones } = req.body;
      const data = await service.validarPago(req.user?.username || "Cajera", req.user?.role || "caja", pagoId as string, observaciones);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async observarPago(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pagoId } = req.params;
      const { observaciones } = req.body;
      const data = await service.observarPago(req.user?.username || "Cajera", req.user?.role || "caja", pagoId as string, observaciones);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async rechazarPago(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pagoId } = req.params;
      const { observaciones } = req.body;
      const data = await service.rechazarPago(req.user?.username || "Cajera", req.user?.role || "caja", pagoId as string, observaciones);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async anularPago(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { pagoId } = req.params;
      const { observaciones } = req.body;
      const data = await service.anularPago(req.user?.username || "Cajera", req.user?.role || "caja", pagoId as string, observaciones);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCajaReporte(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getCajaReporte(req.query);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPagoById(req: Request, res: Response): Promise<void> {
    try {
      const { pagoId } = req.params;
      const data = await service.getPagoById(pagoId as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async registrarComprobante(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const data = await service.registrarComprobante(req.body, file);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async buscarEstudiantesQuery(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query as any;
      const data = await service.buscarEstudiantesQuery(q);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async cancelarCorrelativo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.cancelarCorrelativo(req.user?.username || "Cajera", req.user?.role || "caja", req.body);
      res.json({
        success: true,
        message: `Correlativo ${data.comprobanteAnulado} cancelado correctamente. El siguiente es ${data.siguienteComprobante}`,
        data
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
