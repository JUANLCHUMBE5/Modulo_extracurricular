import {
  limpiarHorarioSinAlmuerzo,
  normalizarNombreArchivoPdf,
  formatGradoLabel,
} from "./asistenciasFormatters";

// PDF Export Handler (Individual Attendance Report)
export async function exportPdfIndividual({
  programaSeleccionado,
  alumno,
  fechasColumnas,
  checkMap,
}: any) {
  const { jsPDF } = await import("jspdf");
  if (!programaSeleccionado || !alumno) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 14;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  let y = 16;

  doc.setTextColor(23, 108, 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("REPORTE DE ASISTENCIA INDIVIDUAL", anchoPagina / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(82, 97, 115);
  doc.text("IEP SAN RAFAEL - IEP San Rafael S.A.C.", anchoPagina / 2, y, { align: "center" });
  y += 10;

  const cleanName = (programaSeleccionado.nombre || "").split(" - Todos")[0];
  const colLeftItems = [
    ["Taller", cleanName || "Sin nombre"],
    ["Alumno", alumno.nombres || alumno.nombresEstudiante || "—"],
    ["DNI / Código", `${alumno.dni || alumno.dniEstudiante || "—"} / ${alumno.codigoEstudiante || "—"}`],
  ];

  const colRightItems = [
    ["Docente", programaSeleccionado.responsable || "No asignado"],
    ["Horario", limpiarHorarioSinAlmuerzo(programaSeleccionado.horario) || "Por definir"],
    ["Contacto", alumno.telefono || alumno.telefonoApoderado || "—"],
  ];

  let cardContentHeight = 10;
  const rowHeights: number[] = [];
  const processedLeftLines: any[] = [];
  const processedRightLines: any[] = [];

  for (let i = 0; i < 3; i++) {
    const leftVal = String(colLeftItems[i][1] || "—");
    const rightVal = String(colRightItems[i][1] || "—");

    const leftLines = doc.splitTextToSize(leftVal, 82);
    const rightLines = doc.splitTextToSize(rightVal, 82);

    processedLeftLines.push(leftLines);
    processedRightLines.push(rightLines);

    const leftHeight = leftLines.length * 4.2 + 5;
    const rightHeight = rightLines.length * 4.2 + 5;
    const rowHeight = Math.max(leftHeight, rightHeight);

    rowHeights.push(rowHeight);
    cardContentHeight += rowHeight;
  }

  doc.setDrawColor(216, 229, 226);
  doc.setFillColor(248, 252, 251);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, cardContentHeight, 3, 3, "FD");

  let yy = y + 5;

  for (let i = 0; i < 3; i++) {
    const leftLabel = colLeftItems[i][0].toUpperCase();
    const rightLabel = colRightItems[i][0].toUpperCase();
    const leftLinesVal = processedLeftLines[i];
    const rightLinesVal = processedRightLines[i];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 97, 115);
    doc.text(leftLabel, margen + 5, yy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 33, 47);
    doc.setFontSize(9);
    doc.text(leftLinesVal, margen + 5, yy + 3.8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 97, 115);
    doc.text(rightLabel, margen + 91, yy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 33, 47);
    doc.setFontSize(9);
    doc.text(rightLinesVal, margen + 91, yy + 3.8);

    yy += rowHeights[i];
  }

  y += cardContentHeight + 10;

  const dibujarCabeceraTablaInd = (yyy: number) => {
    doc.setFillColor(234, 246, 242);
    doc.setDrawColor(216, 229, 226);
    doc.roundedRect(margen, yyy, anchoPagina - margen * 2, 8, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(23, 108, 96);
    doc.text("#", margen + 5, yyy + 5.5);
    doc.text("FECHA DE CLASE", margen + 20, yyy + 5.5);
    doc.text("ESTADO", margen + 65, yyy + 5.5);
    doc.text("HORA REGISTRO", margen + 100, yyy + 5.5);
    doc.text("MÉTODO", margen + 140, yyy + 5.5);
  };

  dibujarCabeceraTablaInd(y);
  y += 12;

  let totalAsistidas = 0;
  let totalFaltas = 0;

  fechasColumnas.forEach((fechaCol: any, idx: number) => {
    if (y > altoPagina - 20) {
      doc.addPage();
      y = 16;
      dibujarCabeceraTablaInd(y);
      y += 12;
    }

    const mapKey = `${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`;
    const hora = checkMap.get(mapKey);
    const asistio = Boolean(hora);

    if (asistio) totalAsistidas++;
    else totalFaltas++;

    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(24, 33, 47);

    doc.text(String(idx + 1), margen + 5, y + 3);
    doc.text(fechaCol.labelDDMMYYYY || fechaCol.titulo || "—", margen + 20, y + 3);

    if (asistio) {
      doc.setTextColor(9, 121, 105);
      doc.setFont("helvetica", "bold");
      doc.text("PRESENTE", margen + 65, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(24, 33, 47);
      doc.text(hora, margen + 100, y + 3);
      doc.text("QR / Lector", margen + 140, y + 3);
    } else {
      doc.setTextColor(185, 28, 28);
      doc.setFont("helvetica", "bold");
      doc.text("FALTA", margen + 65, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(24, 33, 47);
      doc.text("—", margen + 100, y + 3);
      doc.text("—", margen + 140, y + 3);
    }

    y += 8;
  });

  doc.setDrawColor(216, 229, 226);
  doc.line(margen, y - 2, anchoPagina - margen, y - 2);
  y += 6;

  if (y > altoPagina - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(248, 252, 251);
  doc.setDrawColor(216, 229, 226);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(23, 108, 96);
  doc.text("RESUMEN DE ASISTENCIAS", margen + 5, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(82, 97, 115);
  const clasesProgramadas = fechasColumnas.length;
  doc.text(`Clases Programadas: ${clasesProgramadas}`, margen + 5, y + 10);
  doc.text(`Asistencias registradas: ${totalAsistidas}`, margen + 80, y + 10);
  doc.text(`Faltas: ${totalFaltas}`, margen + 150, y + 10);

  const porcentaje = clasesProgramadas > 0 ? Math.round((totalAsistidas / clasesProgramadas) * 100) : 0;
  doc.setFont("helvetica", "bold");
  doc.text(`Puntuación: ${porcentaje}%`, margen + 200, y + 10);

  doc.save(`asistencia_individual_${normalizarNombreArchivoPdf(alumno.nombres || alumno.nombresEstudiante || "alumno")}.pdf`);
}
