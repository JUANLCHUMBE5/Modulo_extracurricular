import { jsPDF } from "jspdf";

/**
 * Genera y descarga un PDF de ficha de inscripción cuando el pago ha sido aprobado.
 *
 * @param {Object} params
 * @param {Object} params.estudiante - Datos del estudiante
 * @param {Object} params.inscripcion - Datos de la inscripción
 * @param {Object} params.programa - Datos del programa
 * @param {Object} params.pagoConfirmado - Datos del pago confirmado
 * @param {Object} params.form - Formulario del apoderado (apoderado, telefono, correo)
 */
export default function generarFichaPdf({ estudiante, inscripcion, programa, pagoConfirmado, form }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  const nombreEstudiante = estudiante?.nombres || "Estudiante";
  const dniEstudiante = estudiante?.dni || "";
  const grado = estudiante?.grado || "";
  const nivel = estudiante?.nivel || estudiante?.nivelEducativo || "";
  const nombrePrograma = programa?.programa || programa?.nombre || inscripcion?.programa || "Programa";
  const montoRaw = Number(inscripcion?.costo ?? programa?.costo ?? 0);
  const monto = `S/ ${montoRaw.toFixed(2)}`;
  const apoderado = form?.apoderado || inscripcion?.apoderado || "";
  const telefono = form?.telefono || inscripcion?.telefono || "";
  const correo = form?.correo || inscripcion?.correo || "";
  const fechaPago = pagoConfirmado?.fecha || pagoConfirmado?.createdAt || pagoConfirmado?.fechaPago || "";
  const estadoPago = "Aprobado";
  const codigoInscripcion = inscripcion?.id || inscripcion?.codigoInscripcion || "";

  // ── Franja superior decorativa ──
  doc.setFillColor(20, 83, 45); // verde oscuro
  doc.rect(0, 0, pageW, 38, "F");

  // Línea decorativa más clara
  doc.setFillColor(22, 101, 52);
  doc.rect(0, 38, pageW, 3, "F");

  // ── Logo/Título ──
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE INSCRIPCION", pageW / 2, 18, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Programa Extracurricular - Pago Aprobado", pageW / 2, 27, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Fecha de emision: ${formatearFechaCompleta(new Date())}`, pageW / 2, 34, { align: "center" });

  y = 50;

  // ── Código de inscripción ──
  if (codigoInscripcion) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(marginL, y - 5, contentW, 14, 3, 3, "F");
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(marginL, y - 5, contentW, 14, 3, 3, "S");
    doc.setTextColor(20, 83, 45);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Codigo de Inscripcion: ${codigoInscripcion}`, pageW / 2, y + 3, { align: "center" });
    y += 18;
  }

  // ── Sección: Datos del estudiante ──
  y = renderSeccion(doc, "DATOS DEL ESTUDIANTE", marginL, y, contentW);
  y = renderCampo(doc, "Nombre completo", nombreEstudiante, marginL, y, contentW);
  if (dniEstudiante) y = renderCampo(doc, "DNI", dniEstudiante, marginL, y, contentW);
  if (grado || nivel) {
    const gradoLabel = formatearGradoNivel(grado, nivel);
    y = renderCampo(doc, "Grado / Nivel", gradoLabel, marginL, y, contentW);
  }
  y += 4;

  // ── Sección: Datos del programa ──
  y = renderSeccion(doc, "DATOS DEL PROGRAMA", marginL, y, contentW);
  y = renderCampo(doc, "Programa", nombrePrograma, marginL, y, contentW);
  y = renderCampo(doc, "Monto pagado", monto, marginL, y, contentW);
  y = renderCampo(doc, "Estado de pago", estadoPago, marginL, y, contentW);
  if (fechaPago) y = renderCampo(doc, "Fecha de pago", formatearFechaCompleta(new Date(fechaPago)), marginL, y, contentW);

  // Horarios del programa
  const horarios = programa?.horarios || programa?.bloques || [];
  if (horarios.length > 0) {
    y += 2;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(75, 85, 99);
    doc.text("Horarios:", marginL + 4, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    horarios.forEach((h) => {
      const textoHorario = `${h.dia || ""}: ${h.deporte || h.taller || ""} ${h.horaInicio || ""}-${h.horaFin || ""}`.trim();
      if (textoHorario.length > 3) {
        doc.text(`  • ${textoHorario}`, marginL + 6, y);
        y += 4.5;
      }
    });
  }
  y += 4;

  // ── Sección: Datos del apoderado ──
  y = renderSeccion(doc, "DATOS DEL APODERADO", marginL, y, contentW);
  if (apoderado) y = renderCampo(doc, "Padre / Apoderado", apoderado, marginL, y, contentW);
  if (telefono) y = renderCampo(doc, "Telefono", telefono, marginL, y, contentW);
  if (correo) y = renderCampo(doc, "Correo electronico", correo, marginL, y, contentW);
  y += 4;

  // ── Estado final ──
  doc.setFillColor(22, 101, 52);
  doc.roundedRect(marginL, y, contentW, 16, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INSCRIPCION CONFIRMADA - PAGO APROBADO", pageW / 2, y + 10, { align: "center" });
  y += 24;

  // ── Nota al pie ──
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const nota = "Este documento es una constancia digital generada automaticamente. Conserve este PDF como comprobante de inscripcion.";
  doc.text(nota, pageW / 2, y, { align: "center", maxWidth: contentW });

  // ── Pie de página ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 245, 245);
  doc.rect(0, pageH - 12, pageW, 12, "F");
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Modulo Extracurricular - Sistema de Gestion Escolar", pageW / 2, pageH - 5, { align: "center" });

  // ── Descargar ──
  const nombreArchivo = `Ficha_Inscripcion_${limpiarNombreArchivo(nombreEstudiante)}_${limpiarNombreArchivo(nombrePrograma)}.pdf`;
  doc.save(nombreArchivo);
}


// ── Helpers ──

function renderSeccion(doc, titulo, x, y, w) {
  doc.setFillColor(20, 83, 45);
  doc.roundedRect(x, y, w, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, x + 5, y + 6.5);
  return y + 13;
}

function renderCampo(doc, label, valor, x, y, w) {
  const bg = y % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
  doc.setFillColor(...bg);
  doc.rect(x, y - 3.5, w, 8, "F");

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${label}:`, x + 4, y + 1.5);

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  const labelWidth = doc.getTextWidth(`${label}:  `);
  doc.text(String(valor || "—"), x + 4 + labelWidth, y + 1.5);
  return y + 8;
}

function formatearGradoNivel(grado, nivel) {
  const g = String(grado).trim();
  if (!g) return nivel || "";
  if (/^\d+$/.test(g) && nivel) {
    const num = parseInt(g, 10);
    const nivelL = nivel.toLowerCase();
    if (nivelL.includes("inicial")) return `${num} años Inicial`;
    const sufijos = { 1: "1er", 2: "2do", 3: "3er", 4: "4to", 5: "5to", 6: "6to" };
    return `${sufijos[num] || `${num}°`} de ${nivel}`;
  }
  if (nivel && !g.toLowerCase().includes(nivel.toLowerCase())) return `${g} de ${nivel}`;
  return g;
}

function formatearFechaCompleta(fecha) {
  try {
    return fecha.toLocaleDateString("es-PE", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return String(fecha || "");
  }
}

function limpiarNombreArchivo(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
}
