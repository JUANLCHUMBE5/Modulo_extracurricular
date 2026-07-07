import {
  limpiarHorarioSinAlmuerzo,
  obtenerEstadoAccesoAsistencia,
  obtenerDniAsistencia,
  obtenerNombreAsistencia,
  obtenerFechaAsistencia,
  formatearHoraAsistencia,
  normalizarNombreArchivoPdf,
  formatGradoLabel,
} from "./asistenciasFormatters";

// PDF Export Handler (Daily View)
export async function exportPdfDaily({
  programaSeleccionado,
  grupoActivo,
  matriculadosOrdenados,
  matriculados,
  hasMatriculados,
  asistencias,
  programas = [],
}: any) {
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

  let cardContentHeightDaily = 10;
  const rowHeightsDaily: number[] = [];
  const processedLeftLinesDaily: any[] = [];
  const processedRightLinesDaily: any[] = [];

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

  let yyDaily = y + 5;

  for (let i = 0; i < 2; i++) {
    const leftLabel = colLeftItemsDaily[i][0].toUpperCase();
    const rightLabel = colRightItemsDaily[i][0].toUpperCase();
    const leftLinesVal = processedLeftLinesDaily[i];
    const rightLinesVal = processedRightLinesDaily[i];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 97, 115);
    doc.text(leftLabel, margen + 5, yyDaily);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 33, 47);
    doc.setFontSize(9);
    doc.text(leftLinesVal, margen + 5, yyDaily + 3.8);

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

  const dibujarCabeceraTabla = (yy: number) => {
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
    doc.text("ACCESO", margen + 135, yy + 5.3);
    doc.text(isTemplate ? "FIRMA / NOTAS" : "OBSERVACIÓN", margen + 160, yy + 5.3);
  };

  dibujarCabeceraTabla(y);
  y += 12;

  const alumnoPorDni: any = {};
  matriculados.forEach((m: any) => {
    const dni = String(m.dni || m.dniEstudiante || "").trim();
    if (dni) {
      alumnoPorDni[dni] = m;
    }
  });

  const itemsToExport = grupoActivo ? grupoActivo.filas : matriculadosOrdenados;

  itemsToExport.forEach((item: any, idx: number) => {
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
          const tallerNameObj = programas.find((p: any) => p.id === matchedAlumno.tallerId);
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
        const tallerNameObj = programas.find((p: any) => p.id === item.tallerId);
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

    const nameLines = doc.splitTextToSize(nombre, 85);
    doc.text(nameLines, margen + 45, y + 3);

    if (gLabel) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const gradeY = y + 3 + (nameLines.length * 4.2);
      doc.text(gLabel, margen + 45, gradeY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(24, 33, 47);
    }

    doc.text(acceso, margen + 135, y + 3);
    doc.text(doc.splitTextToSize(obs, 32), margen + 160, y + 3);

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
