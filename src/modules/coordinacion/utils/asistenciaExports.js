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
  limpiarHorarioSinAlmuerzo,
} from "./asistenciasFormatters";
import { resolverHorarioPorGrado, resolverDocentePorGrado } from "../../secretaria/services/secretariaServiceUtils";

// Helper functions for grade labels and Excel sheet naming
function formatGradoLabel(g) {
  if (!g) return "Sin Grado";
  const parts = String(g || "").split(":");
  if (parts.length === 2) {
    const nivel = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    return `${parts[1]}° ${nivel}`;
  }
  const match = String(g).match(/(\d+)\s+(\w+)/);
  if (match) {
    const nivel = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
    return `${match[1]}° ${nivel}`;
  }
  return g;
}

function obtenerNombreHojaSeguro(name) {
  let clean = String(name || "Hoja")
    .replace(/[\\/?*\[\]:]/g, "")
    .trim();
  if (clean.length > 31) {
    clean = clean.substring(0, 31);
  }
  return clean || "Hoja";
}

// Excel Export Handler (Daily View)
export async function exportExcelDaily({
  programaSeleccionado,
  grupoActivo,
  matriculadosOrdenados,
  hasMatriculados,
  asistencias,
  programas = [],
}) {
  const ExcelJS = (await import("exceljs")).default;
  if (!programaSeleccionado || (!grupoActivo && asistencias.length > 0)) return;
  if (asistencias.length === 0 && !hasMatriculados) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const isAllWorkshops = programaSeleccionado.id === "TODOS_TALLERES";

  if (isAllWorkshops) {
    // Group matriculados by workshop (tallerId)
    const alumnosPorTaller = {};
    matriculadosOrdenados.forEach((alumno) => {
      const tId = alumno.tallerId || "Sin Taller";
      if (!alumnosPorTaller[tId]) {
        alumnosPorTaller[tId] = [];
      }
      alumnosPorTaller[tId].push(alumno);
    });

    // Group daily attendance rows by workshop (tallerId)
    const filasPorTaller = {};
    if (grupoActivo) {
      grupoActivo.filas.forEach((asist) => {
        const tId = asist.tallerId || "Sin Taller";
        if (!filasPorTaller[tId]) {
          filasPorTaller[tId] = [];
        }
        filasPorTaller[tId].push(asist);
      });
    }

    // Get union of all workshops
    const setTalleres = new Set([
      ...Object.keys(alumnosPorTaller),
      ...Object.keys(filasPorTaller),
    ]);
    let talleresPresentes = Array.from(setTalleres).sort();

    if (talleresPresentes.length === 0) {
      talleresPresentes.push("Sin Taller");
    }

    // Write a sheet for each workshop
    talleresPresentes.forEach((tId) => {
      const actualTaller = programas.find((p) => p.id === tId) || {
        nombre: "Taller " + tId,
        responsable: "No asignado",
        horario: "Por definir"
      };

      const labelTaller = actualTaller.nombre;
      const sheetName = obtenerNombreHojaSeguro(labelTaller);
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = [
        { key: "nro", width: 6 },
        { key: "hora", width: 12 },
        { key: "dni", width: 15 },
        { key: "codigo", width: 15 },
        { key: "nombres", width: 35 },
        { key: "grado", width: 18 }, // Extra column when all workshops
        { key: "pago", width: 15 },
        { key: "acceso", width: 15 },
        { key: "observacion", width: 30 },
      ];

      // Header Metadata
      worksheet.mergeCells("A1:I1");
      worksheet.getCell("A1").value = "COLEGIO SAN RAFAEL - REPORTE DE ASISTENCIA DIARIA";
      worksheet.getCell("A1").font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF176C60" } };
      worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("A2").value = "Taller:";
      worksheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B2").value = labelTaller || "—";
      worksheet.getCell("B2").font = { size: 10, bold: true };

      worksheet.getCell("A3").value = "Docente:";
      worksheet.getCell("A3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B3").value = actualTaller.responsable || "No asignado";
      worksheet.getCell("B3").font = { size: 10 };

      worksheet.getCell("A4").value = "Horario:";
      worksheet.getCell("A4").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B4").value = limpiarHorarioSinAlmuerzo(actualTaller.horario) || "Por definir";
      worksheet.getCell("B4").font = { size: 10 };

      worksheet.getCell("D2").value = "Fecha:";
      worksheet.getCell("D2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E2").value = grupoActivo ? grupoActivo.titulo : "PLANTILLA";
      worksheet.getCell("E2").font = { size: 10 };

      worksheet.getCell("D3").value = "Grado:";
      worksheet.getCell("D3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E3").value = "Todos los grados";
      worksheet.getCell("E3").font = { size: 10, bold: true };

      worksheet.getRow(1).height = 25;
      worksheet.getRow(2).height = 18;
      worksheet.getRow(3).height = 18;
      worksheet.getRow(4).height = 18;
      worksheet.getRow(5).height = 10; // Spacing

      // Write table header at Row 6
      const headerRow = worksheet.getRow(6);
      headerRow.values = [
        "N°",
        "Hora",
        "DNI",
        "Código",
        "Estudiante",
        "Grado",
        "Pago",
        "Acceso",
        grupoActivo ? "Observación" : "FIRMA / NOTAS"
      ];
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176C60" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      const dataRows = [];
      const targetAlumnos = alumnosPorTaller[tId] || [];
      const targetFilas = filasPorTaller[tId] || [];

      if (grupoActivo) {
        targetFilas.forEach((asist, idx) => {
          const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));

          const matchingAlumno = targetAlumnos.find((m) => String(m.dni || m.dniEstudiante || "").trim() === String(obtenerDniAsistencia(asist) || "").trim());
          const gLabel = matchingAlumno ? formatGradoLabel(matchingAlumno.grado || matchingAlumno.gradoEstudiante) : "—";

          dataRows.push({
            nro: idx + 1,
            hora: formatearHoraAsistencia(obtenerFechaAsistencia(asist)),
            dni: obtenerDniAsistencia(asist) || "Sin DNI",
            codigo: asist.codigoEstudiante || "—",
            nombres: obtenerNombreAsistencia(asist) || "—",
            grado: gLabel,
            pago: asist.estadoPago || "Pendiente",
            acceso: textoAcceso,
            observacion: asist.observacion || "—",
          });
        });
      } else {
        // Template mode
        targetAlumnos.forEach((alumno, idx) => {
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(alumno.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");

          dataRows.push({
            nro: idx + 1,
            hora: "—",
            dni: alumno.dni || alumno.dniEstudiante || "Sin DNI",
            codigo: alumno.codigoEstudiante || "—",
            nombres: alumno.nombres || alumno.nombresEstudiante || "—",
            grado: formatGradoLabel(alumno.grado || alumno.gradoEstudiante),
            pago: alumno.estadoPago || "Pendiente",
            acceso: textoAcceso,
            observacion: "",
          });
        });
      }

      worksheet.addRows(dataRows);

      // Styling table cells
      worksheet.eachRow((row, rowNum) => {
        if (rowNum > 6) {
          row.height = 20;
        }
        if (rowNum >= 6) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
            if (rowNum > 6) {
              cell.alignment = { vertical: "middle" };
            }
          });
        }
      });
    });
  } else {
    // Create a map of matriculados by DNI
    const alumnoPorDni = {};
    matriculadosOrdenados.forEach((m) => {
      const dni = String(m.dni || m.dniEstudiante || "").trim();
      if (dni) {
        alumnoPorDni[dni] = m;
      }
    });

    // Group matriculados by grade
    const alumnosPorGrado = {};
    matriculadosOrdenados.forEach((alumno) => {
      const g = alumno.grado || alumno.gradoEstudiante || "Sin Grado";
      if (!alumnosPorGrado[g]) {
        alumnosPorGrado[g] = [];
      }
      alumnosPorGrado[g].push(alumno);
    });

    // Group daily attendance rows by grade
    const filasPorGrado = {};
    if (grupoActivo) {
      grupoActivo.filas.forEach((asist) => {
        const dniAsist = String(obtenerDniAsistencia(asist) || "").trim();
        const alumno = alumnoPorDni[dniAsist];
        const gAsist = alumno ? (alumno.grado || alumno.gradoEstudiante || "Sin Grado") : "Sin Grado";
        if (!filasPorGrado[gAsist]) {
          filasPorGrado[gAsist] = [];
        }
        filasPorGrado[gAsist].push(asist);
      });
    }

    // Get union of all grades
    const setGrados = new Set([
      ...Object.keys(alumnosPorGrado),
      ...Object.keys(filasPorGrado),
    ]);
    let gradosPresentes = Array.from(setGrados).sort();

    if (gradosPresentes.length === 0) {
      gradosPresentes.push("Sin Grado");
    }

    // Write a sheet for each grade
    gradosPresentes.forEach((g) => {
      const labelGrado = formatGradoLabel(g);
      const sheetName = obtenerNombreHojaSeguro(labelGrado);
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.columns = [
        { key: "nro", width: 6 },
        { key: "hora", width: 12 },
        { key: "dni", width: 15 },
        { key: "codigo", width: 15 },
        { key: "nombres", width: 35 },
        { key: "grado", width: 18 }, // Include Grado column in single taller as well
        { key: "pago", width: 15 },
        { key: "acceso", width: 15 },
        { key: "observacion", width: 30 },
      ];

      // Header Metadata
      worksheet.mergeCells("A1:I1");
      worksheet.getCell("A1").value = "COLEGIO SAN RAFAEL - REPORTE DE ASISTENCIA DIARIA";
      worksheet.getCell("A1").font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF176C60" } };
      worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("A2").value = "Taller:";
      worksheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B2").value = (programaSeleccionado.nombre || "").split(" - Todos")[0] || "—";
      worksheet.getCell("B2").font = { size: 10, bold: true };

      worksheet.getCell("A3").value = "Docente:";
      worksheet.getCell("A3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B3").value = resolverDocentePorGrado(programaSeleccionado, g) || programaSeleccionado.responsable || "No asignado";
      worksheet.getCell("B3").font = { size: 10 };

      worksheet.getCell("A4").value = "Horario:";
      worksheet.getCell("A4").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B4").value = limpiarHorarioSinAlmuerzo(resolverHorarioPorGrado(programaSeleccionado, g) || programaSeleccionado.horario) || "Por definir";
      worksheet.getCell("B4").font = { size: 10 };

      worksheet.getCell("D2").value = "Fecha:";
      worksheet.getCell("D2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E2").value = grupoActivo ? grupoActivo.titulo : "PLANTILLA";
      worksheet.getCell("E2").font = { size: 10 };

      worksheet.getCell("D3").value = "Grado:";
      worksheet.getCell("D3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E3").value = labelGrado;
      worksheet.getCell("E3").font = { size: 10, bold: true };

      worksheet.getRow(1).height = 25;
      worksheet.getRow(2).height = 18;
      worksheet.getRow(3).height = 18;
      worksheet.getRow(4).height = 18;
      worksheet.getRow(5).height = 10; // Spacing

      // Write table header at Row 6
      const headerRow = worksheet.getRow(6);
      headerRow.values = [
        "N°",
        "Hora",
        "DNI",
        "Código",
        "Estudiante",
        "Grado",
        "Pago",
        "Acceso",
        grupoActivo ? "Observación" : "FIRMA / NOTAS"
      ];
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176C60" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      // Table rows
      const dataRows = [];
      const targetAlumnos = alumnosPorGrado[g] || [];
      const targetFilas = filasPorGrado[g] || [];

      if (grupoActivo) {
        targetFilas.forEach((asist, idx) => {
          const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : (estadoAccesoRaw || "Sin validar"));

          dataRows.push({
            nro: idx + 1,
            hora: formatearHoraAsistencia(obtenerFechaAsistencia(asist)),
            dni: obtenerDniAsistencia(asist) || "Sin DNI",
            codigo: asist.codigoEstudiante || "—",
            nombres: obtenerNombreAsistencia(asist) || "—",
            grado: labelGrado,
            pago: asist.estadoPago || "Pendiente",
            acceso: textoAcceso,
            observacion: asist.observacion || "—",
          });
        });
      } else {
        // Template mode
        targetAlumnos.forEach((alumno, idx) => {
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
          const textoAcceso = esAccesoPermitido ? "Permitido" : (String(alumno.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");

          dataRows.push({
            nro: idx + 1,
            hora: "—",
            dni: alumno.dni || alumno.dniEstudiante || "Sin DNI",
            codigo: alumno.codigoEstudiante || "—",
            nombres: alumno.nombres || alumno.nombresEstudiante || "—",
            grado: labelGrado,
            pago: alumno.estadoPago || "Pendiente",
            acceso: textoAcceso,
            observacion: "",
          });
        });
      }

      worksheet.addRows(dataRows);

      // Styling table cells
      worksheet.eachRow((row, rowNum) => {
        if (rowNum > 6) {
          row.height = 20;
        }
        if (rowNum >= 6) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
            if (rowNum > 6) {
              cell.alignment = { vertical: "middle" };
            }
          });
        }
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const dateSuffix = grupoActivo ? grupoActivo.clave : "PLANTILLA";
  const cleanName = (programaSeleccionado.nombre || "").split(" - Todos")[0];
  link.download = `Asistencia_${normalizarNombreArchivoPdf(cleanName)}_${dateSuffix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// PDF Export Handler (Daily View)
export async function exportPdfDaily({
  programaSeleccionado,
  grupoActivo,
  matriculadosOrdenados,
  matriculados,
  hasMatriculados,
  asistencias,
  programas = [],
}) {
  const { jsPDF } = await import("jspdf");
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
  const cleanName = (programaSeleccionado.nombre || "").split(" - Todos")[0];
  const colLeftItemsDaily = [
    ["Taller", cleanName || "Sin nombre"],
    ["Código", programaSeleccionado.id || "Sin código"],
  ];

  const colRightItemsDaily = [
    ["Docente", programaSeleccionado.responsable || "No asignado"],
    ["Horario", limpiarHorarioSinAlmuerzo(programaSeleccionado.horario) || "Por definir"],
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

  const dibujarCabeceraTabla = (yy) => {
    // Grid header
    doc.setFillColor(234, 246, 242);
    doc.setDrawColor(216, 229, 226);
    doc.roundedRect(margen, yy, anchoPagina - margen * 2, 8, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(23, 108, 96);
    doc.text("#", margen + 2, yy + 5.3);
    doc.text("HORA", margen + 8, yy + 5.3);
    doc.text("DNI", margen + 22, yy + 5.3);
    doc.text("ESTUDIANTE", margen + 45, yy + 5.3);
    doc.text("PAGO", margen + 115, yy + 5.3);
    doc.text("ACCESO", margen + 140, yy + 5.3);
    doc.text(isTemplate ? "FIRMA / NOTAS" : "OBSERVACIÓN", margen + 165, yy + 5.3);
  };

  dibujarCabeceraTabla(y);
  y += 12;

  // DNI-to-Student Map for fast grade resolution
  const alumnoPorDni = {};
  matriculados.forEach((m) => {
    const dni = String(m.dni || m.dniEstudiante || "").trim();
    if (dni) {
      alumnoPorDni[dni] = m;
    }
  });

  const itemsToExport = grupoActivo ? grupoActivo.filas : matriculadosOrdenados;

  itemsToExport.forEach((item, idx) => {
    if (y > altoPagina - 18) {
      doc.addPage();
      y = 16;
      dibujarCabeceraTabla(y);
      y += 12;
    }

    let hora, dni, nombre, pago, acceso, obs;
    let gLabel = "";

    if (grupoActivo) {
      hora = formatearHoraAsistencia(obtenerFechaAsistencia(item));
      dni = obtenerDniAsistencia(item) || "Sin DNI";
      nombre = obtenerNombreAsistencia(item) || "—";
      pago = item.estadoPago || "Pendiente";
      const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(item);
      const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
      acceso = esAccesoPermitido ? "Permitido" : (String(estadoAccesoRaw).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");
      obs = item.observacion || "—";

      const matchedAlumno = alumnoPorDni[dni];
      if (matchedAlumno) {
        const gradeStr = formatGradoLabel(matchedAlumno.grado || matchedAlumno.gradoEstudiante);
        if (programaSeleccionado.id === "TODOS_TALLERES") {
          const tallerNameObj = programas.find((p) => p.id === matchedAlumno.tallerId);
          const tallerShortName = tallerNameObj ? (tallerNameObj.nombre.split(" - ")[1] || tallerNameObj.nombre) : matchedAlumno.tallerId || "";
          gLabel = `${tallerShortName} - ${gradeStr}`;
        } else {
          gLabel = gradeStr;
        }
      }
    } else {
      hora = "—";
      dni = item.dni || item.dniEstudiante || "Sin DNI";
      nombre = item.nombres || item.nombresEstudiante || "—";
      pago = item.estadoPago || "Pendiente";
      const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(item.estadoPago).toLowerCase());
      acceso = esAccesoPermitido ? "Permitido" : (String(item.estadoPago).toLowerCase() === "pendiente" ? "Pendiente" : "Sin validar");
      obs = "_________________";
      
      const gradeStr = formatGradoLabel(item.grado || item.gradoEstudiante);
      if (programaSeleccionado.id === "TODOS_TALLERES") {
        const tallerNameObj = programas.find((p) => p.id === item.tallerId);
        const tallerShortName = tallerNameObj ? (tallerNameObj.nombre.split(" - ")[1] || tallerNameObj.nombre) : item.tallerId || "";
        gLabel = `${tallerShortName} - ${gradeStr}`;
      } else {
        gLabel = gradeStr;
      }
    }

    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 33, 47);

    doc.text(String(idx + 1), margen + 2, y + 3);
    doc.text(hora, margen + 8, y + 3);
    doc.text(dni, margen + 22, y + 3);

    const nameLines = doc.splitTextToSize(nombre, 65);
    doc.text(nameLines, margen + 45, y + 3);

    if (gLabel) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // Slate-500
      const gradeY = y + 3 + (nameLines.length * 4.2);
      doc.text(gLabel, margen + 45, gradeY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(24, 33, 47);
    }

    doc.text(pago, margen + 115, y + 3);
    doc.text(acceso, margen + 140, y + 3);
    doc.text(doc.splitTextToSize(obs, 25), margen + 165, y + 3);

    const nameLinesCount = nameLines.length;
    const altoFila = gLabel
      ? Math.max(11, nameLinesCount * 4.2 + 7.5)
      : Math.max(8, nameLinesCount * 4.2 + 4);
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
  doc.save(`asistencia_${normalizarNombreArchivoPdf(cleanName)}_${fileSuffix}.pdf`);
}

// Excel Export Handler (Monthly Matrix View)
export async function exportExcelMonthly({
  programaSeleccionado,
  matriculados,
  matriculadosOrdenados,
  fechasColumnas,
  checkMap,
  programas = [],
}) {
  const ExcelJS = (await import("exceljs")).default;
  if (!programaSeleccionado || !matriculados.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const isAllWorkshops = programaSeleccionado.id === "TODOS_TALLERES";

  if (isAllWorkshops) {
    // Group matriculados by workshop (tallerId)
    const alumnosPorTaller = {};
    matriculadosOrdenados.forEach((alumno) => {
      const tId = alumno.tallerId || "Sin Taller";
      if (!alumnosPorTaller[tId]) {
        alumnosPorTaller[tId] = [];
      }
      alumnosPorTaller[tId].push(alumno);
    });

    let talleresPresentes = Object.keys(alumnosPorTaller).sort();
    if (talleresPresentes.length === 0) {
      talleresPresentes.push("Sin Taller");
    }

    // Create a sheet for each workshop
    talleresPresentes.forEach((tId) => {
      const actualTaller = programas.find((p) => p.id === tId) || {
        nombre: "Taller " + tId,
        responsable: "No asignado",
        horario: "Por definir"
      };

      const labelTaller = actualTaller.nombre;
      const sheetName = obtenerNombreHojaSeguro(labelTaller);
      const worksheet = workbook.addWorksheet(sheetName);

      const cols = [
        { key: "nro", width: 6 },
        { key: "nombres", width: 35 },
        { key: "grado", width: 18 },
        { key: "telefono", width: 18 },
      ];

      if (fechasColumnas.length > 0) {
        fechasColumnas.forEach((fechaCol) => {
          cols.push({ key: fechaCol.clave, width: 10 });
        });
      } else {
        for (let i = 1; i <= 5; i++) {
          cols.push({ key: `clase_${i}`, width: 12 });
        }
      }

      worksheet.columns = cols;

      // Header Metadata
      worksheet.mergeCells("A1:L1");
      worksheet.getCell("A1").value = "COLEGIO SAN RAFAEL - REPORTE DE ASISTENCIA MENSUAL";
      worksheet.getCell("A1").font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF176C60" } };
      worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("A2").value = "Taller:";
      worksheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B2").value = labelTaller || "—";
      worksheet.getCell("B2").font = { size: 10, bold: true };

      worksheet.getCell("A3").value = "Docente:";
      worksheet.getCell("A3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B3").value = actualTaller.responsable || "No asignado";
      worksheet.getCell("B3").font = { size: 10 };

      worksheet.getCell("A4").value = "Horario:";
      worksheet.getCell("A4").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B4").value = limpiarHorarioSinAlmuerzo(actualTaller.horario) || "Por definir";
      worksheet.getCell("B4").font = { size: 10 };

      worksheet.getCell("D2").value = "Reporte:";
      worksheet.getCell("D2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E2").value = "CONSOLIDADO MENSUAL (MATRIZ)";
      worksheet.getCell("E2").font = { size: 10 };

      worksheet.getCell("D3").value = "Grado:";
      worksheet.getCell("D3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E3").value = "Todos los grados";
      worksheet.getCell("E3").font = { size: 10, bold: true };

      worksheet.getRow(1).height = 25;
      worksheet.getRow(2).height = 18;
      worksheet.getRow(3).height = 18;
      worksheet.getRow(4).height = 18;
      worksheet.getRow(5).height = 10;

      // Header row
      const headerRow = worksheet.getRow(6);
      const headers = ["N°", "Apellidos y Nombres", "Grado", "N° Teléfono"];
      if (fechasColumnas.length > 0) {
        fechasColumnas.forEach((fechaCol) => {
          headers.push(fechaCol.labelDDMM);
        });
      } else {
        for (let i = 1; i <= 5; i++) {
          headers.push(`Clase ${i}`);
        }
      }
      headerRow.values = headers;
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176C60" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      const targetAlumnos = alumnosPorTaller[tId] || [];
      const rows = targetAlumnos.map((alumno, idx) => {
        const rowData = {
          nro: idx + 1,
          nombres: alumno.nombres || alumno.nombresEstudiante || "—",
          grado: formatGradoLabel(alumno.grado || alumno.gradoEstudiante),
          telefono: alumno.telefono || alumno.telefonoApoderado || "—",
        };
        if (fechasColumnas.length > 0) {
          fechasColumnas.forEach((fechaCol) => {
            const hora = checkMap.get(`${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`);
            rowData[fechaCol.clave] = hora ? `✓ ${hora}` : "—";
          });
        } else {
          for (let i = 1; i <= 5; i++) {
            rowData[`clase_${i}`] = "—";
          }
        }
        return rowData;
      });

      worksheet.addRows(rows);

      // Style table cells
      worksheet.eachRow((row, rowNum) => {
        if (rowNum > 6) {
          row.height = 20;
        }
        if (rowNum >= 6) {
          row.eachCell((cell, colNum) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
            if (rowNum > 6) {
              cell.alignment = { vertical: "middle", horizontal: colNum > 5 ? "center" : "left" };
            }
          });
        }
      });
    });
  } else {
    // Group matriculados by grade
    const alumnosPorGrado = {};
    matriculadosOrdenados.forEach((alumno) => {
      const g = alumno.grado || alumno.gradoEstudiante || "Sin Grado";
      if (!alumnosPorGrado[g]) {
        alumnosPorGrado[g] = [];
      }
      alumnosPorGrado[g].push(alumno);
    });

    let gradosPresentes = Object.keys(alumnosPorGrado).sort();
    if (gradosPresentes.length === 0) {
      gradosPresentes.push("Sin Grado");
    }

    // Create a sheet for each grade
    gradosPresentes.forEach((g) => {
      const labelGrado = formatGradoLabel(g);
      const sheetName = obtenerNombreHojaSeguro(labelGrado);
      const worksheet = workbook.addWorksheet(sheetName);

      const cols = [
        { key: "nro", width: 6 },
        { key: "nombres", width: 35 },
        { key: "grado", width: 18 },
        { key: "telefono", width: 18 },
      ];

      if (fechasColumnas.length > 0) {
        fechasColumnas.forEach((fechaCol) => {
          cols.push({ key: fechaCol.clave, width: 10 });
        });
      } else {
        for (let i = 1; i <= 5; i++) {
          cols.push({ key: `clase_${i}`, width: 12 });
        }
      }

      worksheet.columns = cols;

      // Header Metadata
      worksheet.mergeCells("A1:L1");
      worksheet.getCell("A1").value = "COLEGIO SAN RAFAEL - REPORTE DE ASISTENCIA MENSUAL";
      worksheet.getCell("A1").font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF176C60" } };
      worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

      worksheet.getCell("A2").value = "Taller:";
      worksheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B2").value = (programaSeleccionado.nombre || "").split(" - Todos")[0] || "—";
      worksheet.getCell("B2").font = { size: 10, bold: true };

      worksheet.getCell("A3").value = "Docente:";
      worksheet.getCell("A3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B3").value = resolverDocentePorGrado(programaSeleccionado, g) || programaSeleccionado.responsable || "No asignado";
      worksheet.getCell("B3").font = { size: 10 };

      worksheet.getCell("A4").value = "Horario:";
      worksheet.getCell("A4").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("B4").value = limpiarHorarioSinAlmuerzo(resolverHorarioPorGrado(programaSeleccionado, g) || programaSeleccionado.horario) || "Por definir";
      worksheet.getCell("B4").font = { size: 10 };

      worksheet.getCell("D2").value = "Reporte:";
      worksheet.getCell("D2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E2").value = "CONSOLIDADO MENSUAL (MATRIZ)";
      worksheet.getCell("E2").font = { size: 10 };

      worksheet.getCell("D3").value = "Grado:";
      worksheet.getCell("D3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
      worksheet.getCell("E3").value = labelGrado;
      worksheet.getCell("E3").font = { size: 10, bold: true };

      worksheet.getRow(1).height = 25;
      worksheet.getRow(2).height = 18;
      worksheet.getRow(3).height = 18;
      worksheet.getRow(4).height = 18;
      worksheet.getRow(5).height = 10;

      // Header row
      const headerRow = worksheet.getRow(6);
      const headers = ["N°", "Apellidos y Nombres", "Grado", "N° Teléfono"];
      if (fechasColumnas.length > 0) {
        fechasColumnas.forEach((fechaCol) => {
          headers.push(fechaCol.labelDDMM);
        });
      } else {
        for (let i = 1; i <= 5; i++) {
          headers.push(`Clase ${i}`);
        }
      }
      headerRow.values = headers;
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF176C60" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      const targetAlumnos = alumnosPorGrado[g] || [];
      const rows = targetAlumnos.map((alumno, idx) => {
        const rowData = {
          nro: idx + 1,
          nombres: alumno.nombres || alumno.nombresEstudiante || "—",
          grado: labelGrado,
          telefono: alumno.telefono || alumno.telefonoApoderado || "—",
        };
        if (fechasColumnas.length > 0) {
          fechasColumnas.forEach((fechaCol) => {
            const hora = checkMap.get(`${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`);
            rowData[fechaCol.clave] = hora ? `✓ ${hora}` : "—";
          });
        } else {
          for (let i = 1; i <= 5; i++) {
            rowData[`clase_${i}`] = "—";
          }
        }
        return rowData;
      });

      worksheet.addRows(rows);

      // Style table cells
      worksheet.eachRow((row, rowNum) => {
        if (rowNum > 6) {
          row.height = 20;
        }
        if (rowNum >= 6) {
          row.eachCell((cell, colNum) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE2E8F0" } },
              left: { style: "thin", color: { argb: "FFE2E8F0" } },
              bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
              right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
            if (rowNum > 6) {
              cell.alignment = { vertical: "middle", horizontal: colNum > 4 ? "center" : "left" };
            }
          });
        }
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const fileSuffix = fechasColumnas.length > 0 ? "" : "_Plantilla";
  const cleanName = (programaSeleccionado.nombre || "").split(" - Todos")[0];
  link.download = `Consolidado_Asistencias_${normalizarNombreArchivoPdf(cleanName)}${fileSuffix}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// PDF Export Handler (Monthly Matrix View - Landscape)
export async function exportPdfMonthly({
  programaSeleccionado,
  matriculados,
  matriculadosOrdenados,
  fechasColumnas,
  checkMap,
  programas = [],
}) {
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

  const cleanName = (programaSeleccionado.nombre || "").split(" - Todos")[0];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(24, 33, 47);
  doc.text(cleanName || "—", margen + 20, y);
  doc.text(programaSeleccionado.responsable || "—", margen + 122, y);
  doc.text(limpiarHorarioSinAlmuerzo(programaSeleccionado.horario) || "—", margen + 222, y);

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
    
    const gradeStr = formatGradoLabel(alumno.grado || alumno.gradoEstudiante);
    let gLabel = gradeStr;
    if (programaSeleccionado.id === "TODOS_TALLERES") {
      const tallerNameObj = programas.find((p) => p.id === alumno.tallerId);
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
    doc.text(dni, cx, y + 3);
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
      fechasColumnas.forEach((fechaCol) => {
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

// PDF Export Handler (Individual Attendance Report)
export async function exportPdfIndividual({
  programaSeleccionado,
  alumno,
  fechasColumnas,
  checkMap,
}) {
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

  // Box details (Calculated dynamically)
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

      const hora = checkMap.get(`${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`);
      const asistio = hora !== undefined;
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
        doc.text(`ASISTIÓ (✓) ${hora}`, margen + 90, y + 3);
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
