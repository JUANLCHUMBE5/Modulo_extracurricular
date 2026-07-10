import {
  limpiarHorarioSinAlmuerzo,
  obtenerEstadoAccesoAsistencia,
  obtenerDniAsistencia,
  obtenerNombreAsistencia,
  obtenerFechaAsistencia,
  formatearHoraAsistencia,
  normalizarNombreArchivoPdf,
  formatGradoLabel,
  obtenerNombreHojaSeguro,
} from "./asistenciasFormatters";
import { resolverHorarioPorGrado, resolverDocentePorGrado } from "../../secretaria/services/secretariaServiceUtils";

// Excel Export Handler (Daily View)
export async function exportExcelDaily({
  programaSeleccionado,
  grupoActivo,
  matriculadosOrdenados,
  hasMatriculados,
  asistencias,
  programas = [],
}: any) {
  const ExcelJS = (await import("exceljs")).default;
  if (!programaSeleccionado || (!grupoActivo && asistencias.length > 0)) return;
  if (asistencias.length === 0 && !hasMatriculados) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const isAllWorkshops = programaSeleccionado.id === "TODOS_TALLERES";

  if (isAllWorkshops) {
    // Group matriculados by workshop (tallerId)
    const alumnosPorTaller: any = {};
    matriculadosOrdenados.forEach((alumno: any) => {
      const tId = alumno.tallerId || "Sin Taller";
      if (!alumnosPorTaller[tId]) {
        alumnosPorTaller[tId] = [];
      }
      alumnosPorTaller[tId].push(alumno);
    });

    // Group daily attendance rows by workshop (tallerId)
    const filasPorTaller: any = {};
    if (grupoActivo) {
      grupoActivo.filas.forEach((asist: any) => {
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
      const actualTaller = programas.find((p: any) => p.id === tId) || {
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
        { key: "grado", width: 18 },
        { key: "acceso", width: 15 },
        { key: "observacion", width: 30 },
      ];

      // Header Metadata
      worksheet.mergeCells("A1:H1");
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
      worksheet.getRow(5).height = 10;

      // Write table header at Row 6
      const headerRow = worksheet.getRow(6);
      headerRow.values = [
        "N°",
        "Hora",
        "DNI",
        "Código",
        "Estudiante",
        "Grado",
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

      const dataRows: any[] = [];
      const targetAlumnos = alumnosPorTaller[tId] || [];
      const targetFilas = filasPorTaller[tId] || [];

      if (grupoActivo) {
        targetFilas.forEach((asist: any, idx: number) => {
          const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
          const textoAcceso = esAccesoPermitido 
            ? "Permitido" 
            : (String(estadoAccesoRaw).toLowerCase() === "pendiente" 
              ? "Pendiente" 
              : (estadoAccesoRaw ? (estadoAccesoRaw.charAt(0).toUpperCase() + estadoAccesoRaw.slice(1).toLowerCase()) : "Sin validar"));

          const matchingAlumno = targetAlumnos.find((m: any) => String(m.dni || m.dniEstudiante || "").trim() === String(obtenerDniAsistencia(asist) || "").trim());
          const gLabel = matchingAlumno ? formatGradoLabel(matchingAlumno.grado || matchingAlumno.gradoEstudiante) : "—";

          dataRows.push({
            nro: idx + 1,
            hora: formatearHoraAsistencia(obtenerFechaAsistencia(asist)),
            dni: obtenerDniAsistencia(asist) || "Sin DNI",
            codigo: asist.codigoEstudiante || "—",
            nombres: obtenerNombreAsistencia(asist) || "—",
            grado: gLabel,
            acceso: textoAcceso,
            observacion: asist.observacion || "—",
          });
        });
      } else {
        // Template mode
        targetAlumnos.forEach((alumno: any, idx: number) => {
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
          const textoAcceso = esAccesoPermitido 
            ? "Permitido" 
            : (String(alumno.estadoPago).toLowerCase() === "pendiente" 
              ? "Pendiente" 
              : (alumno.estadoPago ? (String(alumno.estadoPago).charAt(0).toUpperCase() + String(alumno.estadoPago).slice(1).toLowerCase()) : "Sin validar"));

          dataRows.push({
            nro: idx + 1,
            hora: "—",
            dni: alumno.dni || alumno.dniEstudiante || "Sin DNI",
            codigo: alumno.codigoEstudiante || "—",
            nombres: alumno.nombres || alumno.nombresEstudiante || "—",
            grado: formatGradoLabel(alumno.grado || alumno.gradoEstudiante),
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
    const alumnoPorDni: any = {};
    matriculadosOrdenados.forEach((m: any) => {
      const dni = String(m.dni || m.dniEstudiante || "").trim();
      if (dni) {
        alumnoPorDni[dni] = m;
      }
    });

    // Group matriculados by grade
    const alumnosPorGrado: any = {};
    matriculadosOrdenados.forEach((alumno: any) => {
      const g = alumno.grado || alumno.gradoEstudiante || "Sin Grado";
      if (!alumnosPorGrado[g]) {
        alumnosPorGrado[g] = [];
      }
      alumnosPorGrado[g].push(alumno);
    });

    // Group daily attendance rows by grade
    const filasPorGrado: any = {};
    if (grupoActivo) {
      grupoActivo.filas.forEach((asist: any) => {
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
        { key: "grado", width: 18 },
        { key: "acceso", width: 15 },
        { key: "observacion", width: 30 },
      ];

      // Header Metadata
      worksheet.mergeCells("A1:H1");
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
      worksheet.getRow(5).height = 10;

      // Write table header at Row 6
      const headerRow = worksheet.getRow(6);
      headerRow.values = [
        "N°",
        "Hora",
        "DNI",
        "Código",
        "Estudiante",
        "Grado",
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
      const dataRows: any[] = [];
      const targetAlumnos = alumnosPorGrado[g] || [];
      const targetFilas = filasPorGrado[g] || [];

      if (grupoActivo) {
        targetFilas.forEach((asist: any, idx: number) => {
          const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
          const textoAcceso = esAccesoPermitido 
            ? "Permitido" 
            : (String(estadoAccesoRaw).toLowerCase() === "pendiente" 
              ? "Pendiente" 
              : (estadoAccesoRaw ? (estadoAccesoRaw.charAt(0).toUpperCase() + estadoAccesoRaw.slice(1).toLowerCase()) : "Sin validar"));

          dataRows.push({
            nro: idx + 1,
            hora: formatearHoraAsistencia(obtenerFechaAsistencia(asist)),
            dni: obtenerDniAsistencia(asist) || "Sin DNI",
            codigo: asist.codigoEstudiante || "—",
            nombres: obtenerNombreAsistencia(asist) || "—",
            grado: labelGrado,
            acceso: textoAcceso,
            observacion: asist.observacion || "—",
          });
        });
      } else {
        // Template mode
        targetAlumnos.forEach((alumno: any, idx: number) => {
          const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(alumno.estadoPago).toLowerCase());
          const textoAcceso = esAccesoPermitido 
            ? "Permitido" 
            : (String(alumno.estadoPago).toLowerCase() === "pendiente" 
              ? "Pendiente" 
              : (alumno.estadoPago ? (String(alumno.estadoPago).charAt(0).toUpperCase() + String(alumno.estadoPago).slice(1).toLowerCase()) : "Sin validar"));

          dataRows.push({
            nro: idx + 1,
            hora: "—",
            dni: alumno.dni || alumno.dniEstudiante || "Sin DNI",
            codigo: alumno.codigoEstudiante || "—",
            nombres: alumno.nombres || alumno.nombresEstudiante || "—",
            grado: labelGrado,
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

// Excel Export Handler (Monthly Matrix View)
export async function exportExcelMonthly({
  programaSeleccionado,
  matriculados,
  matriculadosOrdenados,
  fechasColumnas,
  checkMap,
  programas = [],
}: any) {
  const ExcelJS = (await import("exceljs")).default;
  if (!programaSeleccionado || !matriculados.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const isAllWorkshops = programaSeleccionado.id === "TODOS_TALLERES";

  if (isAllWorkshops) {
    // Group matriculados by workshop (tallerId)
    const alumnosPorTaller: any = {};
    matriculadosOrdenados.forEach((alumno: any) => {
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
      const actualTaller = programas.find((p: any) => p.id === tId) || {
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
        fechasColumnas.forEach((fechaCol: any) => {
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
        fechasColumnas.forEach((fechaCol: any) => {
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
      const rows = targetAlumnos.map((alumno: any, idx: number) => {
        const rowData: any = {
          nro: idx + 1,
          nombres: alumno.nombres || alumno.nombresEstudiante || "—",
          grado: formatGradoLabel(alumno.grado || alumno.gradoEstudiante),
          telefono: alumno.telefono || alumno.telefonoApoderado || "—",
        };
        if (fechasColumnas.length > 0) {
          fechasColumnas.forEach((fechaCol: any) => {
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
    const alumnosPorGrado: any = {};
    matriculadosOrdenados.forEach((alumno: any) => {
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
        fechasColumnas.forEach((fechaCol: any) => {
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
        fechasColumnas.forEach((fechaCol: any) => {
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
      const rows = targetAlumnos.map((alumno: any, idx: number) => {
        const rowData: any = {
          nro: idx + 1,
          nombres: alumno.nombres || alumno.nombresEstudiante || "—",
          grado: labelGrado,
          telefono: alumno.telefono || alumno.telefonoApoderado || "—",
        };
        if (fechasColumnas.length > 0) {
          fechasColumnas.forEach((fechaCol: any) => {
            const MathKey = `${(alumno.dni || alumno.dniEstudiante)}:${fechaCol.clave}`;
            const hora = checkMap.get(MathKey);
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

export async function exportExcelAllDays({
  programaSeleccionado,
  grupos,
  matriculados,
  invitados = [],
  programas = [],
}: any) {
  const ExcelJS = (await import("exceljs")).default;
  if (!programaSeleccionado || !grupos || grupos.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  // Create a map of matriculados + invitados by DNI to resolve grade, code, name and teacher
  const alumnoPorDni: any = {};
  const allStudents = [...matriculados, ...invitados];
  allStudents.forEach((m: any) => {
    const dni = String(m.dni || m.dniEstudiante || "").trim();
    if (dni) {
      alumnoPorDni[dni] = m;
    }
  });

  const resolverDocente = (dni: string, grado: any) => {
    const alumno = alumnoPorDni[dni] || {};
    const doc = resolverDocentePorGrado(programaSeleccionado, alumno.grado || alumno.gradoEstudiante || grado) 
      || programaSeleccionado.responsable 
      || "No asignado";
    return doc;
  };

  grupos.forEach((grupo: any) => {
    const sheetName = obtenerNombreHojaSeguro(grupo.titulo);
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = [
      { key: "nro", width: 6 },
      { key: "hora", width: 12 },
      { key: "dni", width: 15 },
      { key: "codigo", width: 15 },
      { key: "nombres", width: 35 },
      { key: "grado", width: 18 },
      { key: "docente", width: 25 },
      { key: "acceso", width: 15 },
      { key: "observacion", width: 30 },
    ];

    // Header Metadata
    worksheet.mergeCells("A1:I1");
    worksheet.getCell("A1").value = "COLEGIO SAN RAFAEL - REPORTE DE ASISTENCIA HISTÓRICA";
    worksheet.getCell("A1").font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF176C60" } };
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

    worksheet.getCell("A2").value = "Taller:";
    worksheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
    worksheet.getCell("B2").value = (programaSeleccionado.nombre || "").split(" - Todos")[0] || "—";
    worksheet.getCell("B2").font = { size: 10, bold: true };

    worksheet.getCell("A3").value = "Horario:";
    worksheet.getCell("A3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
    worksheet.getCell("B3").value = limpiarHorarioSinAlmuerzo(programaSeleccionado.horario) || "Por definir";
    worksheet.getCell("B3").font = { size: 10 };

    worksheet.getCell("E2").value = "Fecha:";
    worksheet.getCell("E2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
    worksheet.getCell("F2").value = grupo.titulo;
    worksheet.getCell("F2").font = { size: 10, bold: true };

    worksheet.getCell("E3").value = "Total Asist.:";
    worksheet.getCell("E3").font = { bold: true, size: 10, color: { argb: "FF475569" } };
    worksheet.getCell("F3").value = `${grupo.filas.length} alumnos`;
    worksheet.getCell("F3").font = { size: 10 };

    worksheet.getRow(1).height = 25;
    worksheet.getRow(2).height = 18;
    worksheet.getRow(3).height = 18;
    worksheet.getRow(4).height = 10;

    // Table Header
    const headerRow = worksheet.getRow(5);
    headerRow.values = [
      "N°",
      "Hora",
      "DNI",
      "Código",
      "Estudiante",
      "Grado",
      "Docente / Profesor",
      "Acceso",
      "Observación"
    ];
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF176C60" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    const dataRows: any[] = [];
    grupo.filas.forEach((asist: any, idx: number) => {
      const dniAsist = String(obtenerDniAsistencia(asist) || "").trim();
      const matchedAlumno = alumnoPorDni[dniAsist] || {};
      
      const estadoAccesoRaw = obtenerEstadoAccesoAsistencia(asist);
      const esAccesoPermitido = ["permitido", "pagado", "presente"].includes(String(estadoAccesoRaw).toLowerCase());
      const textoAcceso = esAccesoPermitido 
        ? "Permitido" 
        : (String(estadoAccesoRaw).toLowerCase() === "pendiente" 
          ? "Pendiente" 
          : (estadoAccesoRaw ? (estadoAccesoRaw.charAt(0).toUpperCase() + estadoAccesoRaw.slice(1).toLowerCase()) : "Sin validar"));

      const gLabel = formatGradoLabel(matchedAlumno.grado || matchedAlumno.gradoEstudiante || asist.grado || "");
      const docenteLabel = resolverDocente(dniAsist, matchedAlumno.grado || matchedAlumno.gradoEstudiante);

      dataRows.push({
        nro: idx + 1,
        hora: formatearHoraAsistencia(obtenerFechaAsistencia(asist)),
        dni: dniAsist || "Sin DNI",
        codigo: asist.codigoEstudiante || matchedAlumno.codigoEstudiante || "—",
        nombres: obtenerNombreAsistencia(asist) || "—",
        grado: gLabel,
        docente: docenteLabel,
        acceso: textoAcceso,
        observacion: asist.observacion || "—",
      });
    });

    worksheet.addRows(dataRows);

    // Styling table cells
    worksheet.eachRow((row, rowNum) => {
      if (rowNum > 5) {
        row.height = 20;
      }
      if (rowNum >= 5) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          if (rowNum > 5) {
            cell.alignment = { vertical: "middle" };
          }
        });
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const cleanName = (programaSeleccionado.nombre || "").split(" - Todos")[0];
  link.download = `Historial_Asistencias_${normalizarNombreArchivoPdf(cleanName)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
