import {
  limpiarHorarioSinAlmuerzo,
  normalizarNombreArchivoPdf,
  formatGradoLabel,
} from "./asistenciasFormatters";

// PDF Export Handler (Monthly Matrix View - Landscape)
export async function exportPdfMonthly({
  programaSeleccionado,
  matriculados,
  matriculadosOrdenados,
  fechasColumnas,
  checkMap,
  programas = [],
}: any) {
  const { jsPDF } = await import("jspdf");
  if (!programaSeleccionado || !matriculados.length) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margen = 14;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  let y = 16;

  doc.setTextColor(23, 108, 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CONTROL DE ASISTENCIA MENSUAL", anchoPagina / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(82, 97, 115);
  doc.text("IEP SAN RAFAEL - IEP San Rafael S.A.C.", anchoPagina / 2, y, { align: "center" });
  y += 8;

  doc.setDrawColor(216, 229, 226);
  doc.setFillColor(248, 252, 251);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, 14, 3, 3, "FD");
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(82, 97, 115);
  doc.text("TALLER:", margen + 5, y);
  doc.text("DOCENTE:", margen + 105, y);
  doc.text("HORARIO:", margen + 205, y);

  const cleanName = (programaSeleccionado.nombre || "").split(" - Todos")[0];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(24, 33, 47);
  doc.text(cleanName || "—", margen + 20, y);
  doc.text(programaSeleccionado.responsable || "—", margen + 122, y);
  doc.text(limpiarHorarioSinAlmuerzo(programaSeleccionado.horario) || "—", margen + 222, y);

  y += 15;

  const colWidths = {
    nro: 10,
    dni: 25,
    nombres: 80,
    telefono: 32,
    fecha: 12,
  };

  const dibujarEncabezadoMatriz = (yy: number) => {
    doc.setFillColor(234, 246, 242);
    doc.setDrawColor(216, 229, 226);
    doc.roundedRect(margen, yy, anchoPagina - margen * 2, 8, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(23, 108, 96);

    let cx = margen + 2;
    doc.text("#", cx, yy + 5.3);
    cx += colWidths.nro;
    doc.text("DNI", cx, yy + 5.3);
    cx += colWidths.dni;
    doc.text("APELLIDOS Y NOMBRES", cx, yy + 5.3);
    cx += colWidths.nombres;
    doc.text("TELÉFONO", cx, yy + 5.3);
    cx += colWidths.telefono;

    if (fechasColumnas.length > 0) {
      fechasColumnas.forEach((fechaCol: any) => {
        doc.text(fechaCol.labelDDMM, cx + 1, yy + 5.3);
        cx += colWidths.fecha;
      });
    } else {
      for (let i = 1; i <= 5; i++) {
        doc.text(`CLASE ${i}`, cx + 1, yy + 5.3);
        cx += colWidths.fecha;
      }
    }

    return yy + 12;
  };

  const dibujarCheck = (pdfDoc: any, xCheck: number, yCheck: number) => {
    pdfDoc.setLineWidth(0.35);
    pdfDoc.setDrawColor(18, 184, 134);
    pdfDoc.line(xCheck, yCheck + 1.2, xCheck + 1.2, yCheck + 2.5);
    pdfDoc.line(xCheck + 1.2, yCheck + 2.5, xCheck + 3.2, yCheck - 0.5);
    pdfDoc.setLineWidth(0.1);
  };

  y = dibujarEncabezadoMatriz(y);

  matriculadosOrdenados.forEach((alumno: any, idx: number) => {
    if (y > altoPagina - 18) {
      doc.addPage();
      y = 16;
      y = dibujarEncabezadoMatriz(y);
    }

    const DNI = alumno.dni || alumno.dniEstudiante || "—";
    const telefono = alumno.telefono || alumno.telefonoApoderado || "—";
    
    const gradeStr = formatGradoLabel(alumno.grado || alumno.gradoEstudiante);
    let gLabel = gradeStr;
    if (programaSeleccionado.id === "TODOS_TALLERES") {
      const tallerNameObj = programas.find((p: any) => p.id === alumno.tallerId);
      const tallerShortName = tallerNameObj ? (tallerNameObj.nombre.split(" - ")[1] || tallerNameObj.nombre) : alumno.tallerId || "";
      gLabel = `${tallerShortName} - ${gradeStr}`;
    }

    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 33, 47);

    let cx = margen + 2;
    doc.text(String(idx + 1), cx, y + 3);
    cx += colWidths.nro;
    doc.text(DNI, cx, y + 3);
    cx += colWidths.dni;

    const nameLines = doc.splitTextToSize(alumno.nombres || alumno.nombresEstudiante || "", 75);
    doc.text(nameLines, cx, y + 3);

    if (gLabel) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const gradeY = y + 3 + (nameLines.length * 4.2);
      doc.text(gLabel, cx, gradeY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(24, 33, 47);
    }

    cx += colWidths.nombres;
    doc.text(telefono, cx, y + 3);
    cx += colWidths.telefono;

    if (fechasColumnas.length > 0) {
      fechasColumnas.forEach((fechaCol: any) => {
        const mapKey = `${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`;
        const hora = checkMap.get(mapKey);
        if (hora) {
          dibujarCheck(doc, cx + 2, y + 1);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(hora, cx + 1, y + 5.5);
          doc.setFontSize(8.5);
          doc.setTextColor(24, 33, 47);
        } else {
          doc.text("—", cx + 3, y + 3);
        }
        cx += colWidths.fecha;
      });
    } else {
      for (let i = 1; i <= 5; i++) {
        doc.text("—", cx + 3, y + 3);
        cx += colWidths.fecha;
      }
    }

    const nameLinesCount = nameLines.length;
    const altoFila = gLabel
      ? Math.max(11, nameLinesCount * 4.2 + 7.5)
      : Math.max(8, nameLinesCount * 4.2 + 4);
    y += altoFila;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(82, 97, 115);
  doc.text(`Matriculados: ${matriculados.length} alumnos`, margen, altoPagina - 10);
  const fileSuffix = fechasColumnas.length > 0 ? "" : "_plantilla";
  doc.save(`consolidado_asistencias_${normalizarNombreArchivoPdf(cleanName)}${fileSuffix}.pdf`);
}
