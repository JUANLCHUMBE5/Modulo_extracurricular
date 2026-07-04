import {
  enviarCorreoGenerico,
  generarCorreoConfirmacionPago,
  resolverPlantillaTexto,
  generarComunicadoPdf,
  generarWordResuelto
} from "../../../infrastructure/mail/mail.service.js";
import { convertirWordAPdf } from "../../../infrastructure/files/file.service.js";

/**
 * Genera el documento de matrícula (Word/PDF) y envía el correo electrónico de confirmación al apoderado.
 */
export async function enviarCorreoConfirmacionConAdjuntos(inscrip: any, db: any, pagoMonto: any, nroRecibo: string): Promise<void> {
  const deseaCorreo = inscrip && (inscrip.enviarPdfCorreo || String(inscrip.origenRegistro || "").includes("enviar_correo"));
  const apoderadoEmail = inscrip && (db.estudiantes?.[inscrip.dniEstudiante]?.correoApoderado || inscrip.correo || "");

  if (!deseaCorreo || !apoderadoEmail) return;

  const studentName = inscrip.nombresEstudiante || (db.estudiantes?.[inscrip.dniEstudiante] ? `${(db.estudiantes[inscrip.dniEstudiante] as any).nombres} ${(db.estudiantes[inscrip.dniEstudiante] as any).apellidos || ""}`.trim() : "");
  const progName = inscrip.programa || "";
  const amount = pagoMonto || "";

  const adjuntos: any[] = [];
  const programaObj = (db.programas?.find((p: any) => p.id === inscrip.programaId) || {}) as any;
  const plantillaBase64 = programaObj.plantillaBase64 || inscrip.plantillaBase64;

  if (plantillaBase64) {
    try {
      const estudianteObj = db.estudiantes?.[inscrip.dniEstudiante] || {};
      const wordBuffer = generarWordResuelto(plantillaBase64, estudianteObj, inscrip, programaObj);
      
      if (wordBuffer) {
        adjuntos.push({
          filename: `Ficha_Matricula_${inscrip.id}.docx`,
          content: wordBuffer
        });
        
        try {
          const pdfBuffer = await convertirWordAPdf(wordBuffer);
          if (pdfBuffer) {
            adjuntos.push({
              filename: `Ficha_Inscripcion_${inscrip.id}.pdf`,
              content: pdfBuffer
            });
          }
        } catch (errorWordPdf: any) {
          console.error("[WORD TO PDF ERROR] No se pudo convertir el Word resuelto a PDF, intentando generar PDF desde texto plano:", errorWordPdf.message);
          
          const textoPlantilla = programaObj.comunicadoCompleto || programaObj.comunicado || "";
          if (textoPlantilla) {
            try {
              const textoResuelto = resolverPlantillaTexto(textoPlantilla, estudianteObj, inscrip, programaObj);
              const pdfBuffer = generarComunicadoPdf(textoResuelto, progName);
              adjuntos.push({
                filename: `Ficha_Inscripcion_${inscrip.id}.pdf`,
                content: pdfBuffer
              });
            } catch (errorTextPdf: any) {
              console.error("[TEXT TO PDF ERROR] Fallo al generar PDF desde texto plano:", errorTextPdf.message);
            }
          }
        }
      }
    } catch (errorWord: any) {
      console.error("[WORD GENERATION ERROR] Error al generar el Word resuelto, enviando Word original:", errorWord.message);
      adjuntos.push({
        filename: `Ficha_Matricula_${inscrip.id}.docx`,
        content: Buffer.from(plantillaBase64, "base64")
      });
    }
  }

  const { asunto, html } = generarCorreoConfirmacionPago(studentName, progName, amount, nroRecibo);
  await enviarCorreoGenerico({
    para: apoderadoEmail,
    asunto,
    html,
    adjuntos
  }).catch(err => console.error("[MAIL EXCEPTION] No se pudo enviar el correo de confirmación de pago:", err.message));
}
