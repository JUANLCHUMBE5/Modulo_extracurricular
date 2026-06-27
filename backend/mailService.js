import nodemailer from "nodemailer";

// 1. Crear el transporter una sola vez a nivel de módulo
// Si no están configuradas las variables, se crea en modo "mock" para imprimir en consola.
let transporter = null;
const isConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

if (isConfigured) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_PORT === "465", // true para 465, false para 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // Permite conexiones si el certificado es autofirmado
      }
    });
    console.log(`[MAIL] Transporter SMTP inicializado con el correo: ${process.env.SMTP_USER}`);
  } catch (error) {
    console.error("[MAIL ERROR] No se pudo inicializar el transporter SMTP:", error.message);
  }
} else {
  console.log("[MAIL WARNING] No se detectaron credenciales SMTP válidas en el archivo .env. Los correos se imprimirán en la consola del servidor para desarrollo.");
}

/**
 * Función genérica de envío (Responsabilidad Única)
 */
export async function enviarCorreoGenerico({ para, asunto, html, adjuntos = [] }) {
  if (!para || !para.trim()) {
    console.log("[MAIL WARNING] Intento de envío omitido: El destinatario está vacío.");
    return { success: false, reason: "Destinatario vacío" };
  }

  // Si está configurado el transporter real
  if (transporter) {
    try {
      const remitente = `"${process.env.SMTP_SENDER_NAME || 'Módulo Extracurricular'}" <${process.env.SMTP_USER}>`;
      const info = await transporter.sendMail({
        from: remitente,
        to: para.trim(),
        subject: asunto,
        html: html,
        attachments: adjuntos,
      });
      console.log(`[MAIL SUCCESS] Correo enviado a ${para} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[MAIL ERROR] Falló el envío de correo a ${para}:`, error.message);
      throw error;
    }
  }

  // Si está en modo desarrollo (Mock)
  console.log("==============================================================");
  console.log(`[MAIL MOCK] Correo para: ${para}`);
  console.log(`[MAIL MOCK] Asunto: ${asunto}`);
  console.log(`[MAIL MOCK] Adjuntos: ${adjuntos.length} archivos`);
  console.log("----------------------- CUERPO HTML --------------------------");
  console.log(html);
  console.log("==============================================================");
  return { success: true, mock: true };
}

/**
 * Función de contenido: Plantilla para Confirmación de Pago
 */
export function generarCorreoConfirmacionPago(estudianteNombre, programaNombre, costo, nroRecibo) {
  const asunto = `Confirmación de Matrícula - Recibo ${nroRecibo || 'Pendiente'}`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #006b5b; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">¡Matrícula Confirmada!</h1>
      </div>
      <div style="padding: 24px; background-color: #ffffff; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Estimado(a) Apoderado(a),</p>
        <p>Le informamos que el pago de la matrícula de su menor hijo(a) **${estudianteNombre}** ha sido verificado y validado con éxito.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #006b5b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px;">Resumen de Transacción:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #475467; font-weight: 600;">Taller/Programa:</td>
              <td style="padding: 4px 0; text-align: right; color: #0f172a;">${programaNombre}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475467; font-weight: 600;">Nro. de Recibo:</td>
              <td style="padding: 4px 0; text-align: right; color: #0f172a; font-family: monospace; font-weight: 700;">${nroRecibo || '---'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475467; font-weight: 600;">Monto Abonado:</td>
              <td style="padding: 4px 0; text-align: right; color: #006b5b; font-weight: 700;">S/ ${costo}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475467; font-weight: 600;">Estado de Pago:</td>
              <td style="padding: 4px 0; text-align: right;"><span style="background-color: #e8f7ef; color: #006b5b; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 12px;">VALIDADO</span></td>
            </tr>
          </table>
        </div>

        <p>Adjunto a este correo encontrará la Ficha de Matrícula correspondiente en formato Word para sus registros institucionales.</p>
        
        <p style="margin-bottom: 0;">Atentamente,<br/><strong>Dirección de Extracurriculares</strong></p>
      </div>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Este es un correo automático. Por favor no responda a este mensaje.
      </div>
    </div>
  `;
  return { asunto, html };
}

/**
 * Función de contenido: Plantilla para Invitación a Taller
 */
export function generarCorreoInvitacion(estudianteNombre, programaNombre, fechaInicio, costo) {
  const asunto = `Invitación Especial - Taller Extracurricular: ${programaNombre}`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #1e3a8a; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">Invitación a Taller Extracurricular</h1>
      </div>
      <div style="padding: 24px; background-color: #ffffff; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Estimado(a) Apoderado(a),</p>
        <p>Nos complace invitar al estudiante **${estudianteNombre}** a participar en nuestro prestigioso taller extracurricular de <strong>${programaNombre}</strong> para el presente ciclo.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #1e3a8a; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px;">Detalles del Programa:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #475467; font-weight: 600;">Taller:</td>
              <td style="padding: 4px 0; text-align: right; color: #0f172a; font-weight: 600;">${programaNombre}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475467; font-weight: 600;">Inicio de Clases:</td>
              <td style="padding: 4px 0; text-align: right; color: #0f172a;">${fechaInicio ? fechaInicio.split("T")[0] : 'Por programar'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475467; font-weight: 600;">Costo del Taller:</td>
              <td style="padding: 4px 0; text-align: right; color: #1e3a8a; font-weight: 700;">S/ ${costo || '0.00'}</td>
            </tr>
          </table>
        </div>

        <p>Para confirmar su inscripción y asegurar la vacante, ingrese al Portal de Matrícula para Padres y suba el comprobante de pago correspondiente.</p>
        
        <p>Adjunto a este correo compartimos el documento descriptivo oficial con los objetivos, horarios detallados y requerimientos del taller.</p>
        
        <p style="margin-bottom: 0;">Atentamente,<br/><strong>Coordinación Académica de Talleres</strong></p>
      </div>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Este es un correo automático. Por favor no responda a este mensaje.
      </div>
    </div>
  `;
  return { asunto, html };
}
