import { convertirWordAPdf, validarArchivoWord, normalizarNombreDescarga } from "../../services/file.service.js";

export class SecretariaService {
  async convertDocToPdf(file: Express.Multer.File | undefined): Promise<{ pdfBuffer: Buffer; name: string }> {
    validarArchivoWord(file);

    if (!file) {
      throw new Error("No se proporcionó un archivo válido.");
    }

    const pdfBuffer = await convertirWordAPdf(file.buffer);
    const name = normalizarNombreDescarga(file.originalname).replace(/\.docx$/i, ".pdf");

    return { pdfBuffer, name };
  }
}
