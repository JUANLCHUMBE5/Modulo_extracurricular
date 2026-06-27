import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

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

/**
 * Resuelve las variables {{VARIABLE}} en el texto plano de la plantilla
 */
export function resolverPlantillaTexto(texto, estudiante, inscrip, prog) {
  if (!texto) return "";

  const costoNum = Number(inscrip.costoOriginal || inscrip.costo || prog.costo || 0).toFixed(2);
  const studentName = ((estudiante && estudiante.nombres) || inscrip.nombresEstudiante || "").trim();
  const programName = (prog.nombre || inscrip.programa || "").trim();
  const areaName = inscrip.areaTematica || prog.areaTematica || "Coordinación Académica de Actividades Extracurriculares";
  const start = inscrip.fechaInicio || prog.fechaInicio || "";
  const end = inscrip.fechaFin || prog.fechaFin || "";
  const durStr = inscrip.duracion || prog.duracion || "8 semanas";

  // Formatear fechas en letras españolas
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "";
    const f = new Date(fechaStr);
    if (isNaN(f.getTime())) return fechaStr.split("T")[0];
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${f.getDate()} de ${meses[f.getMonth()]} del ${f.getFullYear()}`;
  };

  const fechaHoy = formatearFecha(new Date());

  // Horarios
  const rawHorario = inscrip.horario || prog.horario || "";
  // Limpiar horario sin almuerzo
  const cleanHorario = rawHorario.replace(/almuerzo.*$/i, "").trim();

  const datos = {
    FECHA: fechaHoy,
    TITULO: `${inscrip.tipoDocumento || "Comunicado"} ${programName}`.toUpperCase(),
    AREA: areaName,
    PROG: programName,
    PROGRAMA: programName,
    CICLO: prog.periodo || inscrip.periodo || "Año Escolar",
    INI: start ? start.split("T")[0] : "",
    FIN: end ? end.split("T")[0] : "",
    DUR: durStr,
    COSTO: costoNum,
    ALUMNO: studentName,
    GRADO: `${(estudiante && estudiante.grado) || inscrip.grado || ""} ${(estudiante && estudiante.seccion) || inscrip.seccion || ""}`.trim(),
    HORARIO: cleanHorario || rawHorario,
    HOR_ALM: prog.horarioRecepcionAlmuerzo || "",
    // Horarios específicos para la tabla
    DIA: rawHorario.match(/Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo/i)?.[0] || "Sábado",
    CLASE: cleanHorario.replace(/^[^\d]*/, ""), // extrae la hora
    ALM: rawHorario.match(/almuerzo\s+([^,·/]+)/i)?.[1] || "No aplica",
    N1: `${(estudiante && estudiante.grado) || ""} ${(estudiante && estudiante.seccion) || ""}`.trim() || "Grado",
    N2: "",
    N3: "",
    N4: "",
    GR_SEC: `${(estudiante && estudiante.grado) || inscrip.grado || ""} ${(estudiante && estudiante.seccion) || inscrip.seccion || ""}`.trim(),
    APOD: (estudiante && estudiante.apoderado) || inscrip.apoderado || "",
    CEL: (estudiante && estudiante.telefonoApoderado) || inscrip.telefono || ""
  };

  let resultado = texto;
  for (const key in datos) {
    const valor = datos[key] || "";
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    resultado = resultado.replace(regex, valor);
  }
  return resultado;
}

/**
 * Genera el PDF a partir del texto resuelto del comunicado
 */
export function generarComunicadoPdf(textoResuelto, programaNombre) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - (margin * 2);
  let y = 25;

  // Franja verde superior
  doc.setFillColor(0, 107, 91); // Verde oscuro institucional
  doc.rect(0, 0, pageW, 12, "F");

  // Título de cabecera
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 107, 91);
  doc.text("FICHA INFORMATIVA Y CONSTANCIA", margin, y);
  y += 8;

  // Separador
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // Slate-800

  // Separar por saltos de línea
  const lineasTextoRaw = textoResuelto.split("\n");

  lineasTextoRaw.forEach(parrafo => {
    const pTexto = parrafo.trim();
    if (!pTexto) {
      y += 5; // Salto de línea vacío
      return;
    }

    const lineas = doc.splitTextToSize(pTexto, contentW);
    
    // Verificar salto de página
    if (y + (lineas.length * 6) > pageH - margin) {
      doc.addPage();
      y = 25;
      
      // Dibujar cabecera en nueva página
      doc.setFillColor(0, 107, 91);
      doc.rect(0, 0, pageW, 12, "F");
    }

    lineas.forEach(linea => {
      // Si la línea parece ser un título o sección resaltada, ponerla en negrita
      if (linea.startsWith("COMUNICADO:") || linea.startsWith("COSTO:") || linea.startsWith("EL ALMUERZO:") || linea.startsWith("REQUISITOS:")) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }
      doc.text(linea, margin, y);
      y += 6;
    });

    y += 2;
  });

  // Salida en formato binario compatible con nodemailer
  const pdfString = doc.output();
  return Buffer.from(pdfString, "binary");
}

/**
 * Carga la plantilla de Word, resuelve sus marcadores {{VARIABLE}} y retorna el buffer
 */
export function generarWordResuelto(plantillaBase64, estudiante, inscrip, prog) {
  if (!plantillaBase64) return null;

  const costoNum = Number(inscrip.costoOriginal || inscrip.costo || prog.costo || 0).toFixed(2);
  const studentName = ((estudiante && estudiante.nombres) || inscrip.nombresEstudiante || "").trim();
  const programName = (prog.nombre || inscrip.programa || "").trim();
  const areaName = inscrip.areaTematica || prog.areaTematica || "Coordinación Académica de Actividades Extracurriculares";
  const start = inscrip.fechaInicio || prog.fechaInicio || "";
  const end = inscrip.fechaFin || prog.fechaFin || "";
  const durStr = inscrip.duracion || prog.duracion || "8 semanas";

  // Helpers de fechas
  const normalizarFecha = (valor) => {
    if (!valor) return null;
    if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
    const texto = String(valor).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const f = new Date(texto + "T00:00:00");
      if (!isNaN(f.getTime())) return f;
    }
    const dmyMatch = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      const dia = parseInt(dmyMatch[1], 10);
      const mes = parseInt(dmyMatch[2], 10) - 1;
      const anio = parseInt(dmyMatch[3], 10);
      const f = new Date(anio, mes, dia);
      if (!isNaN(f.getTime())) return f;
    }
    const f = new Date(texto);
    return !isNaN(f.getTime()) ? f : null;
  };

  const formatearFechaLetras = (fecha, { incluirAnio = true, usarDeAnio = true } = {}) => {
    if (!fecha) return "";
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const base = `${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
    if (!incluirAnio) return base;
    return `${base}${usarDeAnio ? " de" : ""} ${fecha.getFullYear()}`;
  };

  const formatearFechaInicioRango = (inicio, fin) => {
    const fInicio = normalizarFecha(inicio);
    const fFin = normalizarFecha(fin);
    if (!fInicio) return "";
    const mismoAnio = fFin && fInicio.getFullYear() === fFin.getFullYear();
    return formatearFechaLetras(fInicio, { incluirAnio: !mismoAnio });
  };

  const formatearFechaFinRango = (inicio, fin) => {
    const fInicio = normalizarFecha(inicio);
    const fFin = normalizarFecha(fin);
    if (!fFin) return "";
    const mismoAnio = fInicio && fInicio.getFullYear() === fFin.getFullYear();
    return formatearFechaLetras(fFin, { incluirAnio: true, usarDeAnio: mismoAnio });
  };

  const formatearRangoFechasLetras = (inicio, fin) => {
    const fInicio = normalizarFecha(inicio);
    const fFin = normalizarFecha(fin);
    if (!fInicio && !fFin) return "";
    if (!fInicio) return formatearFechaLetras(fFin, { incluirAnio: true });
    if (!fFin) return formatearFechaLetras(fInicio, { incluirAnio: true });
    return `del ${formatearFechaInicioRango(inicio, fin)} al ${formatearFechaFinRango(inicio, fin)}`;
  };

  const fechaHoy = formatearFechaLetras(new Date());

  // Horarios y grupos (idéntico al frontend)
  const grupos = Array.isArray(prog.horariosPorGrupo) ? prog.horariosPorGrupo : [];
  const gradoAlumno = inscrip.gradoEstudiante || inscrip.grado || estudiante.grado || "";
  const seccionAlumno = inscrip.seccionEstudiante || inscrip.seccion || estudiante.seccion || "";
  const gradoSeccion = `${gradoAlumno} ${seccionAlumno}`.trim();

  const coincideGrado = (valorGrupo, gradoA) => {
    const cleanG = (val) => String(val || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(":", " ");
    const grupo = cleanG(valorGrupo);
    const alumno = cleanG(gradoA);
    const numG = grupo.match(/\d+/)?.[0];
    const numA = alumno.match(/\d+/)?.[0];
    if (!numG || !numA) return false;
    if (numG !== numA) return false;
    const nivelG = ["inicial", "primaria", "secundaria"].find(n => grupo.includes(n));
    const nivelA = ["inicial", "primaria", "secundaria"].find(n => alumno.includes(n));
    return !nivelG || !nivelA || nivelG === nivelA;
  };

  const grupo = grupos.find(item => (item.grados || []).some(g => coincideGrado(g, gradoAlumno)));
  const gradoDelTurno = grupo?.grados?.find(g => coincideGrado(g, gradoAlumno)) || gradoAlumno;
  
  const formatearGrado = (valor) => {
    const texto = String(valor || "").replace(/^(Inicial|Primaria|Secundaria):/i, "").trim();
    if (!texto) return "";
    const numero = texto.match(/\d+/)?.[0];
    if (String(valor).toLowerCase().includes("inicial") && numero) return `INICIAL ${numero} AÑOS`;
    if (!numero) return texto.toUpperCase();
    return `${numero}°GRADO`;
  };

  const nivelesTurno = gradoDelTurno ? [formatearGrado(gradoDelTurno)] : [];

  const formatRangoHora = (hInicio, hFin) => {
    if (!hInicio || !hFin) return "";
    const fmt = (val) => {
      const match = String(val).match(/^(\d{1,2}):(\d{2})/);
      if (!match) return val;
      const h = Number(match[1]);
      const m = match[2];
      const h12 = h > 12 ? h - 12 : h || 12;
      return `${h12}:${m}`;
    };
    return `${fmt(hInicio)} a ${fmt(hFin)}`;
  };

  const extraerDiasHorario = (horario) => {
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const texto = String(horario || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return dias.filter(d => texto.includes(d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))).join(", ");
  };

  const extraerAlmuerzoHorario = (horario) => {
    const match = String(horario || "").match(/almuerzo\s+([^,·/]+)/i);
    const valor = match?.[1]?.trim() || "";
    const horas = [...valor.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
      .map(m => {
        const hr = Number(m[1]);
        const min = m[2] || "00";
        const hr12 = hr > 12 ? hr - 12 : hr || 12;
        return `${hr12}:${min}`;
      });
    if (horas.length >= 2) return `${horas[0]} a ${horas[1]}`;
    return valor.replace(/\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\b/gi, "").trim();
  };

  const extraerHorasHorario = (horario) => {
    const clean = String(horario || "").replace(/almuerzo.*$/i, "").trim();
    const horas = [...clean.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
      .map(m => {
        const hr = Number(m[1]);
        const min = m[2] || "00";
        const hr12 = hr > 12 ? hr - 12 : hr || 12;
        return `${hr12}:${min}`;
      });
    if (horas.length >= 2) return `${horas[0]} a ${horas[1]}`;
    return clean.replace(/\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\b/gi, "").trim();
  };

  // Asignar dia, almuerzo, clase
  let diaDoc = "";
  let almuerzoDoc = "";
  let claseDoc = "";

  if (grupo) {
    diaDoc = grupo.dia || "";
    almuerzoDoc = formatRangoHora(grupo.almuerzoInicio, grupo.almuerzoFin);
    claseDoc = formatRangoHora(grupo.horaInicio, grupo.horaFin);
  } else {
    const rawH = inscrip.horario || prog.horario || "";
    diaDoc = rawH.match(/Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo/i)?.[0] || "";
    almuerzoDoc = extraerAlmuerzoHorario(rawH) || "No aplica";
    claseDoc = extraerHorasHorario(rawH);
  }

  // Filas para la tabla
  const gruposFiltrados = grupos.filter(item => 
    (item.grados || []).some(g => coincideGrado(g, gradoAlumno))
  );
  const gruposAMostrar = gruposFiltrados.length > 0 ? gruposFiltrados : grupos;

  const filas = gruposAMostrar.map(g => ({
    nivel: (g.grados || []).map(formatearGrado).filter(Boolean).join(", "),
    dia: g.dia || "",
    almuerzo: formatRangoHora(g.almuerzoInicio, g.almuerzoFin),
    clase: formatRangoHora(g.horaInicio, g.horaFin)
  })).filter(f => f.nivel || f.dia || f.almuerzo || f.clase);

  const n1 = filas[0]?.nivel || formatearGrado(gradoAlumno) || "";
  const n2 = filas[1]?.nivel || "";
  const n3 = filas[2]?.nivel || "";
  const n4 = filas[3]?.nivel || "";

  const diaVal = diaDoc || filas[0]?.dia || "";
  const almVal = almuerzoDoc || filas[0]?.almuerzo || "";
  const claseVal = claseDoc || filas[0]?.clase || "";

  const rawHorario = inscrip.horario || prog.horario || "";
  const cleanHorario = rawHorario.replace(/almuerzo.*$/i, "").trim();

  const datos = {
    FECHA: fechaHoy,
    TITULO: `${inscrip.tipoDocumento || "Comunicado"} ${programName}`.toUpperCase(),
    AREA: areaName,
    PROG: programName,
    PROGRAMA: programName,
    CICLO: prog.periodo || inscrip.periodo || "Año Escolar",
    INI: formatearFechaInicioRango(start, end),
    FIN: formatearFechaFinRango(start, end),
    RANGO: formatearRangoFechasLetras(start, end),
    VIGENCIA: formatearRangoFechasLetras(start, end),
    DUR: durStr,
    COSTO: costoNum,
    ALUMNO: studentName,
    GRADO: `${(estudiante && estudiante.grado) || inscrip.grado || ""} ${(estudiante && estudiante.seccion) || inscrip.seccion || ""}`.trim(),
    HORARIO: cleanHorario || rawHorario,
    HOR_ALM: prog.horarioRecepcionAlmuerzo || "",
    DIA: diaVal,
    CLASE: claseVal,
    ALM: almVal,
    N1: n1,
    N2: n2,
    N3: n3,
    N4: n4,
    GR_SEC: `${(estudiante && estudiante.grado) || inscrip.grado || ""} ${(estudiante && estudiante.seccion) || inscrip.seccion || ""}`.trim(),
    APOD: (estudiante && estudiante.apoderado) || inscrip.apoderado || "",
    CEL: (estudiante && estudiante.telefonoApoderado) || inscrip.telefono || ""
  };

  const zip = new PizZip(Buffer.from(plantillaBase64, "base64"));
  const archivosXml = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header|footer)\d*\.xml$/i.test(name)
  );

  const escaparXml = (valor) => {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const escaparRegExp = (valor) => {
    return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  archivosXml.forEach((name) => {
    const file = zip.file(name);
    if (!file) return;
    let xml = file.asText();
    
    for (const [variable, valor] of Object.entries(datos)) {
      const seguro = escaparXml(valor);
      const patrones = [
        new RegExp(`\\{\\{\\s*${escaparRegExp(variable)}\\s*\\}\\}`, "gi"),
        new RegExp(`\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
        new RegExp(`\\[\\[\\s*${escaparRegExp(variable)}\\s*\\]\\]`, "gi"),
        new RegExp(`\\$\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
        new RegExp(`&lt;&lt;\\s*${escaparRegExp(variable)}\\s*&gt;&gt;`, "gi"),
      ];
      xml = patrones.reduce((texto, patron) => texto.replace(patron, seguro), xml);
    }
    
    zip.file(name, xml);
  });

  return zip.generate({ type: "nodebuffer" });
}


