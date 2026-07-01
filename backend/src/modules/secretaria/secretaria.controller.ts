import { Request, Response } from "express";
import { SecretariaService } from "./secretaria.service.js";

const secretariaService = new SecretariaService();

export class SecretariaController {
  async convertDocToPdf(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const { pdfBuffer, name } = await secretariaService.convertDocToPdf(file);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(400).json({
        message: error.publicMessage || error.message || "No se pudo convertir el Word a PDF.",
      });
    }
  }
}
