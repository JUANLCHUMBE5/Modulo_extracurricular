import express from "express";
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

// Convert Word document to PDF preview
router.post("/api/secretaria/documentos/pdf", documentUpload.single("archivo"), async (req, res) => {
  try {
    const archivo = req.file;
    validarArchivoWord(archivo);

    const pdf = await convertirWordAPdf(archivo.buffer);
    const nombre = normalizarNombreDescarga(archivo.originalname).replace(/\.docx$/i, ".pdf");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(pdf);
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || "No se pudo convertir el Word a PDF. Verifique que el servidor tenga Microsoft Word o LibreOffice instalado.",
    });
  }
});

export default router;
