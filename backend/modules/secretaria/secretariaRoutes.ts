import express, { Request, Response } from "express";
import multer from "multer";
import {
  MAX_WORD_FILE_SIZE,
  convertirWordAPdf,
  validarArchivoWord,
  normalizarNombreDescarga
} from "../../fileService.js";

const router = express.Router();

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_WORD_FILE_SIZE, files: 1 },
});

/**
 * POST /api/secretaria/documentos/pdf
 * Toma un documento Word (.docx) subido en el cuerpo de la solicitud ('archivo'),
 * valida su peso e integridad, lo convierte a PDF usando el motor local de documentos,
 * y devuelve el PDF binario directamente al navegador para su descarga o previsualización.
 */
router.post("/api/secretaria/documentos/pdf", documentUpload.single("archivo"), async (req: Request, res: Response): Promise<void> => {
  try {
    const archivo = req.file;
    validarArchivoWord(archivo);

    if (!archivo) {
      res.status(400).json({ message: "No se proporcionó un archivo válido." });
      return;
    }

    const pdf = await convertirWordAPdf(archivo.buffer);
    const nombre = normalizarNombreDescarga(archivo.originalname).replace(/\.docx$/i, ".pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(pdf);
  } catch (error: any) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo convertir el Word a PDF. Verifique que el servidor tenga Microsoft Word o LibreOffice instalado.",
    });
  }
});

export default router;
