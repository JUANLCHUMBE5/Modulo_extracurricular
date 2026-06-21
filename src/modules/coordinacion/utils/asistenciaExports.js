import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { apiDb } from "../../../services/dbApi";
import {
  calcularEdad,
  claveFechaAsistencia,
  formatearFechaAsistencia,
  formatearHoraAsistencia,
  normalizarNombreArchivoPdf,
  obtenerDniAsistencia,
  obtenerEstadoAccesoAsistencia,
  obtenerFechaAsistencia,
  obtenerNombreAsistencia,
} from "./asistenciasFormatters";

// Excel Export Handler (Daily View)
export async function exportExcelDaily({
  programaSeleccionado,
  grupoActivo,
  matriculadosOrdenados,
  hasMatriculados,
  asistencias,
}) {
  if (!programaSeleccionado || (!grupoActivo && asistencias.length > 0)) return;
  if (asistencias.length === 0 && !hasMatriculados) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Asistencia");

  // Columns
  worksheet.columns = [
    { header: "N°", key: "nro", width: 6 },
    { header: "Hora", key: "hora", width: 12 },
    { header: "DNI", key: "dni", width: 15 },
    { header: "Código", key: "codigo", width: 15 },
    { header: "Estudiante", key: "nombres", width: 35 },
    { header: "Pago", key: "pago", width: 15 },
    { header: "Acceso", key: "acceso", width: 15 },
    { header: "Observación", key: "observacion", width: 30 },
  ];

  // Rows
  let rows;
  if (grupoActivo) {
    rows = grupoActivo.filas.map((asist, idx) => {
      const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
      const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
      const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));

      return {
        nro: idx + 1,
        hora: formatearHoraAsistencia(obtenerFechaAsistencia(asist)),
        dni: obtenerDniAsistencia(asist) || "Sin DNI",
        codigo: asist.codigoEstudiante || "—",
        nombres: obtenerNombreAsistencia(asist) || "—",
        pago: asist.estadoPago || "Pendiente",
        acceso: textoAcceso,
        observacion: asist.observacion || "—",
      };
    });
  } else {
    // Template mode
    rows = matriculadosOrdenados.map((alumno, idx) => {
      const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
      const textoAcceso = esAccesoPermitido ? "Permitido" : (String(alumno.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");

      return {
        nro: idx + 1,
        hora: "—",
        dni: alumno.dni || alumno.dniEstudiante || "Sin DNI",
        codigo: alumno.codigoEstudiante || "—",
        nombres: alumno.nombres || alumno.nombresEstudiante || "—",
        pago: alumno.estadoPago || "Pendiente",
        acceso: textoAcceso,
        observacion: "", // Blank for physical writing/signature
      };
    });
  }

  worksheet.addRows(rows);

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF176C60" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;

  worksheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.height = 20;
    }
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.alignment = { vertical: "middle" };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const dateSuffix = grupoActivo ? grupoActivo.clave : "PLANTILLA";
  link.download = `Asistencia_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}_${dateSuffix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// PDF Export Handler (Daily View)
export function exportPdfDaily({
  programaSeleccionado,
  grupoActivo,
  matriculadosOrdenados,
  matriculados,
  hasMatriculados,
  asistencias,
}) {
  if (!programaSeleccionado || (!grupoActivo && asistencias.length > 0)) return;
  if (asistencias.length === 0 && !hasMatriculados) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 14;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  let y = 16;

  const isTemplate = !grupoActivo;
  const subtitle = isTemplate
    ? "Plantilla de Control Físico (Sin asistencias registradas)"
    : `Fecha de asistencia: ${grupoActivo.titulo}`;

  doc.setTextColor(23, 108, 96);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("REPORTE DE ASISTENCIA DIARIA", anchoPagina / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(82, 97, 115);
  doc.text(subtitle, anchoPagina / 2, y, { align: "center" });
  y += 10;

  // Box details (Calculated dynamically)
  const colLeftItemsDaily = [
    ["Taller", programaSeleccionado.nombre || "Sin nombre"],
    ["Código", programaSeleccionado.id || "Sin código"],
  ];

  const colRightItemsDaily = [
    ["Docente", programaSeleccionado.responsable || "No asignado"],
    ["Horario", programaSeleccionado.horario || "Por definir"],
  ];

  let cardContentHeightDaily = 10; // padding top/bottom
  const rowHeightsDaily = [];
  const processedLeftLinesDaily = [];
  const processedRightLinesDaily = [];

  for (let i = 0; i < 2; i++) {
    const leftVal = String(colLeftItemsDaily[i][1] || "—");
    const rightVal = String(colRightItemsDaily[i][1] || "—");

    const leftLines = doc.splitTextToSize(leftVal, 82);
    const rightLines = doc.splitTextToSize(rightVal, 82);

    processedLeftLinesDaily.push(leftLines);
    processedRightLinesDaily.push(rightLines);

    const leftHeight = leftLines.length * 4.2 + 5;
    const rightHeight = rightLines.length * 4.2 + 5;
    const rowHeight = Math.max(leftHeight, rightHeight);

    rowHeightsDaily.push(rowHeight);
    cardContentHeightDaily += rowHeight;
  }

  doc.setDrawColor(216, 229, 226);
  doc.setFillColor(248, 252, 251);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, cardContentHeightDaily, 3, 3, "FD");

  let yyDaily = y + 5; // Start drawing text inside the box

  for (let i = 0; i < 2; i++) {
    const leftLabel = colLeftItemsDaily[i][0].toUpperCase();
    const rightLabel = colRightItemsDaily[i][0].toUpperCase();
    const leftLinesVal = processedLeftLinesDaily[i];
    const rightLinesVal = processedRightLinesDaily[i];

    // Render left column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 97, 115);
    doc.text(leftLabel, margen + 5, yyDaily);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 33, 47);
    doc.setFontSize(9);
    doc.text(leftLinesVal, margen + 5, yyDaily + 3.8);

    // Render right column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 97, 115);
    doc.text(rightLabel, margen + 91, yyDaily);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 33, 47);
    doc.setFontSize(9);
    doc.text(rightLinesVal, margen + 91, yyDaily + 3.8);

    yyDaily += rowHeightsDaily[i];
  }

  y += cardContentHeightDaily + 6;

  // Grid header
  doc.setFillColor(234, 246, 242);
  doc.setDrawColor(216, 229, 226);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, 8, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(23, 108, 96);
  doc.text("#", margen + 2, y + 5.3);
  doc.text("HORA", margen + 8, y + 5.3);
  doc.text("DNI", margen + 22, y + 5.3);
  doc.text("ESTUDIANTE", margen + 45, y + 5.3);
  doc.text("PAGO", margen + 115, y + 5.3);
  doc.text("ACCESO", margen + 140, y + 5.3);
  doc.text(isTemplate ? "FIRMA / NOTAS" : "OBSERVACIÓN", margen + 165, y + 5.3);
  y += 12;

  const itemsToExport = grupoActivo ? grupoActivo.filas : matriculadosOrdenados;

  itemsToExport.forEach((item, idx) => {
    if (y > altoPagina - 18) {
      doc.addPage();
      y = 16;
      doc.setFillColor(234, 246, 242);
      doc.setDrawColor(216, 229, 226);
      doc.roundedRect(margen, y, anchoPagina - margen * 2, 8, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(23, 108, 96);
      doc.text("#", margen + 2, y + 5.3);
      doc.text("HORA", margen + 8, y + 5.3);
      doc.text("DNI", margen + 22, y + 5.3);
      doc.text("ESTUDIANTE", margen + 45, y + 5.3);
      doc.text("PAGO", margen + 115, y + 5.3);
      doc.text("ACCESO", margen + 140, y + 5.3);
      doc.text(isTemplate ? "FIRMA / NOTAS" : "OBSERVACIÓN", margen + 165, y + 5.3);
      y += 12;
    }

    let hora, dni, nombre, pago, acceso, obs;

    if (grupoActivo) {
      hora = formatearHoraAsistencia(obtenerFechaAsistencia(item));
      dni = obtenerDniAsistencia(item) || "Sin DNI";
      nombre = obtenerNombreAsistencia(item) || "—";
      pago = item.estadoPago || "Pendiente";
      const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(item);
      const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
      acceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");
      obs = item.observacion || "—";
    } else {
      hora = "—";
      dni = item.dni || item.dniEstudiante || "Sin DNI";
      nombre = item.nombres || item.nombresEstudiante || "—";
      pago = item.estadoPago || "Pendiente";
      const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(item.estadoPago).toLowerCase());
      acceso = esAccesoPermitido ? "Permitido" : (String(item.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");
      obs = "_________________";
    }

    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 33, 47);

    doc.text(String(idx + 1), margen + 2, y + 3);
    doc.text(hora, margen + 8, y + 3);
    doc.text(dni, margen + 22, y + 3);
    doc.text(doc.splitTextToSize(nombre, 65), margen + 45, y + 3);
    doc.text(pago, margen + 115, y + 3);
    doc.text(acceso, margen + 140, y + 3);
    doc.text(doc.splitTextToSize(obs, 25), margen + 165, y + 3);

    const altoFila = Math.max(8, doc.splitTextToSize(nombre, 65).length * 4.2 + 4);
    y += altoFila;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(82, 97, 115);
  const countLabel = isTemplate
    ? `Total de alumnos matriculados: ${matriculados.length}`
    : `Total de alumnos registrados hoy: ${grupoActivo.filas.length}`;
  doc.text(countLabel, margen, altoPagina - 10);
  const fileSuffix = isTemplate ? "plantilla" : grupoActivo.clave;
  doc.save(`asistencia_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}_${fileSuffix}.pdf`);
}

// Excel Export Handler (Monthly Matrix View)
export async function exportExcelMonthly({
  programaSeleccionado,
  matriculados,
  matriculadosOrdenados,
  fechasColumnas,
  checkMap,
}) {
  if (!programaSeleccionado || !matriculados.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Registro Mensual");

  // Setup static columns
  const cols = [
    { header: "N°", key: "nro", width: 6 },
    { header: "DNI", key: "dni", width: 15 },
    { header: "Apellidos y Nombres", key: "nombres", width: 35 },
    { header: "N° Teléfono", key: "telefono", width: 18 },
  ];

  // Add dynamic or template date columns
  if (fechasColumnas.length > 0) {
    fechasColumnas.forEach((fechaCol) => {
      cols.push({ header: fechaCol.labelDDMM, key: fechaCol.clave, width: 10 });
    });
  } else {
    for (let i = 1; i <= 5; i++) {
      cols.push({ header: `Clase ${i}`, key: `clase_${i}`, width: 12 });
    }
  }

  worksheet.columns = cols;

  // Add student data rows
  const rows = matriculadosOrdenados.map((alumno, idx) => {
    const rowData = {
      nro: idx + 1,
      dni: alumno.dni || alumno.dniEstudiante || "—",
      nombres: alumno.nombres || alumno.nombresEstudiante || "—",
      telefono: alumno.telefono || alumno.telefonoApoderado || "—",
    };
    if (fechasColumnas.length > 0) {
      fechasColumnas.forEach((fechaCol) => {
        rowData[fechaCol.clave] = checkMap.has(`${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`) ? "✓" : "—";
      });
    } else {
      for (let i = 1; i <= 5; i++) {
        rowData[`clase_${i}`] = "—";
      }
    }
    return rowData;
  });

  worksheet.addRows(rows);

  // Styles
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF176C60" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;

  worksheet.eachRow((row, rowNum) => {
    if (rowNum > 1) {
      row.height = 20;
    }
    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.alignment = { vertical: "middle", horizontal: colNum > 4 ? "center" : "left" };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileSuffix = fechasColumnas.length > 0 ? "" : "_Plantilla";
  link.download = `Consolidado_Asistencias_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}${fileSuffix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// PDF Export Handler (Monthly Matrix View - Landscape)
export function exportPdfMonthly({
  programaSeleccionado,
  matriculados,
  matriculadosOrdenados,
  fechasColumnas,
  checkMap,
}) {
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

  // Workshop details header block
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(24, 33, 47);
  doc.text(programaSeleccionado.nombre || "—", margen + 20, y);
  doc.text(programaSeleccionado.responsable || "—", margen + 122, y);
  doc.text(programaSeleccionado.horario || "—", margen + 222, y);

  y += 15;

  // Horizontal spacing widths
  const colWidths = {
    nro: 10,
    dni: 25,
    nombres: 80,
    telefono: 32,
    fecha: 12,
  };

  const dibujarEncabezadoMatriz = (yy) => {
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
      fechasColumnas.forEach((fechaCol) => {
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

  // Draw checkmark vector helper
  const dibujarCheck = (pdfDoc, xCheck, yCheck) => {
    pdfDoc.setLineWidth(0.35);
    pdfDoc.setDrawColor(18, 184, 134); // Teal/green color
    pdfDoc.line(xCheck, yCheck + 1.2, xCheck + 1.2, yCheck + 2.5);
    pdfDoc.line(xCheck + 1.2, yCheck + 2.5, xCheck + 3.2, yCheck - 0.5);
    pdfDoc.setLineWidth(0.1); // Restore standard thickness
  };

  y = dibujarEncabezadoMatriz(y);

  matriculadosOrdenados.forEach((alumno, idx) => {
    if (y > altoPagina - 18) {
      doc.addPage();
      y = 16;
      y = dibujarEncabezadoMatriz(y);
    }

    const dni = alumno.dni || alumno.dniEstudiante || "—";
    const telefono = alumno.telefono || alumno.telefonoApoderado || "—";

    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 33, 47);

    let cx = margen + 2;
    doc.text(String(idx + 1), cx, y + 3);
    cx += colWidths.nro;
    doc.text(dni, cx, y + 3);
    cx += colWidths.dni;
    doc.text(doc.splitTextToSize(alumno.nombres || alumno.nombresEstudiante || "", 75), cx, y + 3);
    cx += colWidths.nombres;
    doc.text(telefono, cx, y + 3);
    cx += colWidths.telefono;

    if (fechasColumnas.length > 0) {
      fechasColumnas.forEach((fechaCol) => {
        const asistio = checkMap.has(`${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`);
        if (asistio) {
          dibujarCheck(doc, cx + 2, y + 1);
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

    const altoFila = Math.max(8, doc.splitTextToSize(alumno.nombres || alumno.nombresEstudiante || "", 75).length * 4.2 + 4);
    y += altoFila;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(82, 97, 115);
  doc.text(`Matriculados: ${matriculados.length} alumnos`, margen, altoPagina - 10);
  const fileSuffix = fechasColumnas.length > 0 ? "" : "_plantilla";
  doc.save(`consolidado_asistencias_${normalizarNombreArchivoPdf(programaSeleccionado.nombre)}${fileSuffix}.pdf`);
}

// PDF Export Handler (Individual Attendance Report)
export function exportPdfIndividual({
  programaSeleccionado,
  alumno,
  fechasColumnas,
  checkMap,
}) {
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

  // Box details (Calculated dynamically)
  const colLeftItems = [
    ["Taller", programaSeleccionado.nombre || "Sin nombre"],
    ["Alumno", alumno.nombres || alumno.nombresEstudiante || "—"],
    ["DNI / Código", `${alumno.dni || alumno.dniEstudiante || "—"} / ${alumno.codigoEstudiante || "—"}`],
  ];

  const colRightItems = [
    ["Docente", programaSeleccionado.responsable || "No asignado"],
    ["Horario", programaSeleccionado.horario || "Por definir"],
    ["Contacto", alumno.telefono || alumno.telefonoApoderado || "—"],
  ];

  let cardContentHeight = 10; // padding top/bottom
  const rowHeights = [];
  const processedLeftLines = [];
  const processedRightLines = [];

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

  let yy = y + 5; // Start drawing text inside the box

  for (let i = 0; i < 3; i++) {
    const leftLabel = colLeftItems[i][0].toUpperCase();
    const rightLabel = colRightItems[i][0].toUpperCase();
    const leftLinesVal = processedLeftLines[i];
    const rightLinesVal = processedRightLines[i];

    // Render left column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 97, 115);
    doc.text(leftLabel, margen + 5, yy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 33, 47);
    doc.setFontSize(9);
    doc.text(leftLinesVal, margen + 5, yy + 3.8);

    // Render right column
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

  y += cardContentHeight + 8;

  // Grid header for dates
  doc.setFillColor(234, 246, 242);
  doc.setDrawColor(216, 229, 226);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, 8, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(23, 108, 96);
  doc.text("#", margen + 5, y + 5.3);
  doc.text("FECHA DE CLASE", margen + 20, y + 5.3);
  doc.text("ESTADO DE ASISTENCIA", margen + 90, y + 5.3);
  y += 12;

  let totalClases = 0;
  let totalAsistencias = 0;

  if (fechasColumnas.length > 0) {
    fechasColumnas.forEach((fechaCol, idx) => {
      if (y > altoPagina - 18) {
        doc.addPage();
        y = 16;
        doc.setFillColor(234, 246, 242);
        doc.setDrawColor(216, 229, 226);
        doc.roundedRect(margen, y, anchoPagina - margen * 2, 8, 2, 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(23, 108, 96);
        doc.text("#", margen + 5, y + 5.3);
        doc.text("FECHA DE CLASE", margen + 20, y + 5.3);
        doc.text("ESTADO DE ASISTENCIA", margen + 90, y + 5.3);
        y += 12;
      }

      const asistio = checkMap.has(`${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`);
      totalClases++;
      if (asistio) totalAsistencias++;

      doc.setDrawColor(237, 242, 245);
      doc.line(margen, y - 2, anchoPagina - margen, y - 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(24, 33, 47);

      doc.text(String(idx + 1), margen + 5, y + 3);
      doc.text(fechaCol.titulo || fechaCol.clave, margen + 20, y + 3);
      doc.setFont("helvetica", "bold");
      if (asistio) {
        doc.setTextColor(18, 184, 134); // Green
        doc.text("ASISTIÓ (✓)", margen + 90, y + 3);
      } else {
        doc.setTextColor(239, 68, 68); // Red
        doc.text("FALTÓ (—)", margen + 90, y + 3);
      }
      doc.setTextColor(24, 33, 47);
      doc.setFont("helvetica", "normal");
      y += 8;
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("No se han registrado clases ni asistencias en el sistema para este taller.", margen + 5, y + 3);
    y += 10;
  }

  // Summary box at bottom
  if (totalClases > 0) {
    const porcentaje = Math.round((totalAsistencias / totalClases) * 100);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Resumen: ${totalAsistencias} asistencias de ${totalClases} clases (${porcentaje}% de asistencia).`, margen, y);
  }

  doc.save(`asistencia_individual_${normalizarNombreArchivoPdf(alumno.nombres || alumno.nombresEstudiante || "alumno")}.pdf`);
}
