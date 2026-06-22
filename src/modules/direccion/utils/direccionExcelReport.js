import { normalizarFecha, formatearFechaPeru } from "../../../services/dateService";
import { apiDb } from "../../../services/dbApi";

function normalizarTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}

function normalizarPeriodo(periodo) {
  const texto = String(periodo || "").toLowerCase();
  if (texto.includes("verano")) return "verano";
  if (texto.includes("todos") || texto.includes("ambos")) return "todos";
  return "escolar";
}

function normalizarEstadoPago(estado) {
  const texto = String(estado || "").toLowerCase();
  if (texto.includes("pag") || texto === "completado") return "Pagado";
  if (texto.includes("anul") || texto === "cancelado") return "Anulado";
  return "Pendiente";
}

function coincideEstadoPago(estado, filtro, excluirAnulados) {
  const valor = String(estado || "").toLowerCase();
  if (filtro === "Pagado") {
    return valor.includes("pag") || valor === "completado" || valor === "aprobado";
  }
  if (filtro === "Pendiente") {
    return !valor.includes("pag") && valor !== "completado" && valor !== "aprobado" && (!excluirAnulados || !valor.includes("anul"));
  }
  return true;
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function agregarHoja(workbook, nombre, filas, columnas) {
  const hoja = workbook.addWorksheet(nombre);
  hoja.columns = columnas;
  hoja.addRows(filas);
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176C60" } };
  hoja.getRow(1).alignment = { vertical: "middle" };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.eachRow((row, rowNum) => {
    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (rowNum > 1) {
        const colKey = columnas[colNum - 1]?.key;
        if (colKey && ["fechaPago", "fecha", "fechaRegistro"].includes(colKey)) {
          if (cell.value && cell.value !== "—") {
            cell.value = formatearFechaPeru(cell.value, cell.value);
          }
        }
      }
    });
  });
}

export async function descargarReporteDireccionExcel(panel, tipoReporte, filtros = {}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  if (tipoReporte === "completo" || tipoReporte === "resumen") {
    const resumen = Object.entries(panel.resumen).map(([indicador, valor]) => ({ indicador, valor }));
    agregarHoja(workbook, "Resumen", resumen, [
      { header: "Indicador", key: "indicador", width: 28 },
      { header: "Valor", key: "valor", width: 18 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "programas") {
    agregarHoja(workbook, "Programas", panel.reportes.programas, [
      { header: "Codigo", key: "id", width: 14 },
      { header: "Programa", key: "nombre", width: 32 },
      { header: "Periodo", key: "periodo", width: 14 },
      { header: "Estado", key: "estado", width: 16 },
      { header: "Categoria", key: "categoria", width: 18 },
      { header: "Responsable", key: "responsable", width: 24 },
      { header: "Inscritos", key: "inscritos", width: 12 },
      { header: "Cupos", key: "cupos", width: 10 },
      { header: "Avance %", key: "avance", width: 12 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Proyectado", key: "proyectado", width: 14 },
      { header: "Recaudado", key: "recaudado", width: 14 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "inscripciones") {
    agregarHoja(workbook, "Inscripciones", panel.reportes.inscripciones, [
      { header: "Codigo", key: "id", width: 16 },
      { header: "DNI", key: "dni", width: 12 },
      { header: "Estudiante", key: "estudiante", width: 32 },
      { header: "Grado", key: "grado", width: 18 },
      { header: "Programa", key: "programa", width: 32 },
      { header: "Estado inscripcion", key: "estadoInscripcion", width: 20 },
      { header: "Estado pago", key: "estadoPago", width: 16 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Origen", key: "origen", width: 24 },
      { header: "Fecha registro", key: "fechaRegistro", width: 22 },
      { header: "Apoderado", key: "apoderado", width: 24 },
      { header: "Telefono", key: "telefono", width: 16 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "pagos") {
    agregarHoja(workbook, "Pagos", panel.reportes.pagos, [
      { header: "Codigo", key: "id", width: 16 },
      { header: "DNI", key: "dni", width: 12 },
      { header: "Estudiante", key: "estudiante", width: 32 },
      { header: "Programa", key: "programa", width: 32 },
      { header: "Monto", key: "monto", width: 12 },
      { header: "Estado", key: "estado", width: 16 },
      { header: "Medio", key: "medio", width: 18 },
      { header: "Fecha", key: "fecha", width: 22 },
      { header: "Recibo SIADED", key: "nroRecibo", width: 18 },
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const nombre = `direccion-${tipoReporte}-${filtros.periodo || "todos"}.xlsx`;
  descargarBlob(blob, nombre);
  return nombre;
}

export async function descargarReportePersonalizadoExcel({ panel, tipoDatos, filtros = {}, columnas = [], periodo = "todos" }) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  let rawData = [];
  if (tipoDatos === "inscripciones") {
    rawData = panel.reportes.inscripciones;
  } else if (tipoDatos === "programas") {
    const list = panel.reportes.programas || [];
    rawData = filtros.incluirInactivos ? list : list.filter(p => String(p.estado || "").toLowerCase() === "habilitado");
  } else if (tipoDatos === "pagos") {
    rawData = panel.reportes.pagos;
  } else if (tipoDatos === "direccion_alumnos_pagos") {
    const inscripciones = panel.reportes.inscripciones || [];
    const pagos = panel.reportes.pagos || [];
    rawData = inscripciones.map(ins => {
      const pago = pagos.find(p =>
        (ins.id && p.inscripcionId === ins.id) ||
        (ins.pagoId && p.id === ins.pagoId) ||
        ((p.dni || p.dniEstudiante) === ins.dni &&
         normalizarTexto(p.programa || p.programaNombre) === normalizarTexto(ins.programa))
      ) || null;

      const costo = Number(ins.costo || 0);
      const montoPagado = pago ? Number(pago.monto || 0) : 0;
      const pendiente = Math.max(0, costo - montoPagado);

      return {
        dni: ins.dni || "",
        estudiante: ins.estudiante || "",
        grado: ins.grado || "",
        seccion: ins.seccion || "",
        apoderado: ins.apoderado || "",
        telefono: ins.telefono || "",
        programa: ins.programa || "",
        programaId: ins.programaId || ins.programa_id || "",
        costoOriginal: ins.costoOriginal ?? costo,
        descuentoAprobado: ins.descuentoAprobado ? "Sí" : "No",
        descuentoTipo: ins.descuentoTipo || "Ninguno",
        descuentoValor: ins.descuentoValor || 0,
        descuentoMonto: ins.descuentoMonto || 0,
        costo,
        montoPagado,
        pendiente,
        estadoPago: pago ? (pago.estado || "Pagado") : "Pendiente",
        medioPago: pago ? (pago.medio || "—") : "—",
        fechaPago: pago ? (pago.fecha || "—") : "—",
        nroOperacion: pago ? (pago.id || "—") : "—",
        nroRecibo: pago ? (pago.nroRecibo || "—") : "—",
        origen: ins.origen || "",
        fechaRegistro: ins.fechaRegistro || "",
        observaciones: pago ? (pago.observaciones || "—") : "—",
      };
    });
  } else if (tipoDatos === "direccion_alumnos_asistencias") {
    rawData = (panel.reportes.inscripciones || []).map(ins => ({
      dni: ins.dni || "",
      estudiante: ins.estudiante || "",
      grado: ins.grado || "",
      seccion: ins.seccion || "",
      programa: ins.programa || "",
      programaId: ins.programaId || ins.programa_id || "",
      telefono: ins.telefono || "",
      fechaRegistro: ins.fechaRegistro || "",
    }));
  }

  let filteredData = [...rawData];

  // Helper para buscar información de un programa
  const listProgramas = panel.reportes.programas || [];
  const findProgram = (progNameOrId) => {
    if (!progNameOrId) return null;
    const nameOrId = String(progNameOrId).toLowerCase().trim();
    return listProgramas.find(p =>
      String(p.id).toLowerCase() === nameOrId ||
      String(p.nombre).toLowerCase().trim() === nameOrId
    );
  };

  // 1. Filtrar por Categoría
  if (filtros.categoria && filtros.categoria !== "todos") {
    filteredData = filteredData.filter((item) => {
      if (tipoDatos === "programas") {
        return String(item.categoria || "").toLowerCase() === String(filtros.categoria).toLowerCase();
      }
      if (tipoDatos === "inscripciones" || tipoDatos === "direccion_alumnos_pagos" || tipoDatos === "direccion_alumnos_asistencias") {
        if (item.categoria) {
          return String(item.categoria).toLowerCase() === String(filtros.categoria).toLowerCase();
        }
        const p = findProgram(item.programaId || item.programa);
        return p && String(p.categoria || "").toLowerCase() === String(filtros.categoria).toLowerCase();
      }
      if (tipoDatos === "pagos") {
        const p = findProgram(item.programaId || item.programa);
        return p && String(p.categoria || "").toLowerCase() === String(filtros.categoria).toLowerCase();
      }
      return true;
    });
  }

  // 2. Filtrar por Taller
  if (filtros.programa && filtros.programa !== "todos") {
    filteredData = filteredData.filter((item) => {
      if (tipoDatos === "programas") {
        return String(item.id).toLowerCase() === String(filtros.programa).toLowerCase() ||
               String(item.nombre).toLowerCase().trim() === String(filtros.programa).toLowerCase().trim();
      }
      if (tipoDatos === "inscripciones" || tipoDatos === "pagos" || tipoDatos === "direccion_alumnos_pagos" || tipoDatos === "direccion_alumnos_asistencias") {
        return String(item.programaId || item.programa).toLowerCase() === String(filtros.programa).toLowerCase() ||
               String(item.programa).toLowerCase().trim() === String(filtros.programa).toLowerCase().trim();
      }
      return true;
    });
  }

  // 3. Filtrar por Origen y Pago
  if (tipoDatos === "inscripciones") {
    if (filtros.origen && filtros.origen !== "todos") {
      filteredData = filteredData.filter((item) => {
        const itemOrigen = String(item.origen || "").toLowerCase();
        if (filtros.origen === "web") {
          return itemOrigen.includes("web") || itemOrigen.includes("padres");
        }
        if (filtros.origen === "secretaria") {
          return itemOrigen.includes("sec") || itemOrigen.includes("presencial") || itemOrigen.includes("carga") || itemOrigen.includes("excel") || itemOrigen === "";
        }
        return true;
      });
    }
    if (filtros.estadoPago && filtros.estadoPago !== "todos") {
      filteredData = filteredData.filter((item) => normalizarEstadoPago(item.estadoPago) === filtros.estadoPago);
    }
  } else if (tipoDatos === "pagos") {
    if (filtros.estadoPago && filtros.estadoPago !== "todos") {
      filteredData = filteredData.filter((item) => normalizarEstadoPago(item.estado) === filtros.estadoPago);
    }
  } else if (tipoDatos === "direccion_alumnos_pagos") {
    if (filtros.estadoPago && filtros.estadoPago !== "todos") {
      filteredData = filteredData.filter((item) => coincideEstadoPago(item.estadoPago, filtros.estadoPago, true));
    }
  }

  // 4. Filtrar por Grado(s)
  if (filtros.grados && filtros.grados.length > 0 && !filtros.grados.includes("todos")) {
    const gradosSet = new Set(filtros.grados.map(g => g.toLowerCase().trim()));
    filteredData = filteredData.filter((item) => {
      const itemGrado = String(item.grado || item.gradoEstudiante || "").toLowerCase().trim();
      return gradosSet.has(itemGrado);
    });
  }

  // 5. Filtrar por Rango de Fechas
  if (filtros.fechaInicio || filtros.fechaFin) {
    const startFilter = filtros.fechaInicio ? normalizarFecha(filtros.fechaInicio) : null;
    const endFilter = filtros.fechaFin ? normalizarFecha(filtros.fechaFin) : null;

    if (startFilter) startFilter.setHours(0, 0, 0, 0);
    if (endFilter) endFilter.setHours(23, 59, 59, 999);

    filteredData = filteredData.filter((item) => {
      let itemDateRaw = null;
      if (tipoDatos === "inscripciones") {
        itemDateRaw = item.fechaRegistro;
      } else if (tipoDatos === "pagos") {
        itemDateRaw = item.fecha || item.fechaPago;
      } else if (tipoDatos === "direccion_alumnos_pagos") {
        itemDateRaw = (item.fechaPago && item.fechaPago !== "—") ? item.fechaPago : item.fechaRegistro;
      } else if (tipoDatos === "direccion_alumnos_asistencias") {
        itemDateRaw = item.fechaRegistro;
      }

      if (!itemDateRaw) return true;
      const itemDate = normalizarFecha(itemDateRaw);
      if (!itemDate) return true;

      if (startFilter && itemDate < startFilter) return false;
      if (endFilter && itemDate > endFilter) return false;
      return true;
    });
  }

  // 6. Filtrar por Meses
  if (filtros.meses && filtros.meses.length > 0) {
    const mesesSet = new Set(filtros.meses.map(m => parseInt(m)));
    filteredData = filteredData.filter((item) => {
      let itemDateRaw = null;
      if (tipoDatos === "inscripciones") {
        itemDateRaw = item.fechaRegistro;
      } else if (tipoDatos === "pagos") {
        itemDateRaw = item.fecha || item.fechaPago;
      } else if (tipoDatos === "direccion_alumnos_pagos") {
        itemDateRaw = (item.fechaPago && item.fechaPago !== "—") ? item.fechaPago : item.fechaRegistro;
      } else if (tipoDatos === "direccion_alumnos_asistencias") {
        itemDateRaw = item.fechaRegistro;
      }

      if (!itemDateRaw) return true;
      const itemDate = normalizarFecha(itemDateRaw);
      if (!itemDate) return true;

      const month = itemDate.getMonth() + 1; // 1-indexed
      return mesesSet.has(month);
    });
  }

  // 7. Filtrar por Semanas del Mes
  if (filtros.semanas && filtros.semanas.length > 0) {
    const semanasSet = new Set(filtros.semanas.map(s => parseInt(s)));
    filteredData = filteredData.filter((item) => {
      let itemDateRaw = null;
      if (tipoDatos === "inscripciones") {
        itemDateRaw = item.fechaRegistro;
      } else if (tipoDatos === "pagos") {
        itemDateRaw = item.fecha || item.fechaPago;
      } else if (tipoDatos === "direccion_alumnos_pagos") {
        itemDateRaw = (item.fechaPago && item.fechaPago !== "—") ? item.fechaPago : item.fechaRegistro;
      } else if (tipoDatos === "direccion_alumnos_asistencias") {
        itemDateRaw = item.fechaRegistro;
      }

      if (!itemDateRaw) return true;
      const itemDate = normalizarFecha(itemDateRaw);
      if (!itemDate) return true;

      const day = itemDate.getDate();
      let weekNum = 1;
      if (day > 28) weekNum = 5;
      else if (day > 21) weekNum = 4;
      else if (day > 14) weekNum = 3;
      else if (day > 7) weekNum = 2;
      return semanasSet.has(weekNum);
    });
  }

  // 5. Determinar Columnas Temporales Dinámicas (para reporte de asistencias)
  let columnasTiempo = [];
  if (tipoDatos === "direccion_alumnos_asistencias") {
    let start = filtros.fechaInicio ? normalizarFecha(filtros.fechaInicio) : null;
    let end = filtros.fechaFin ? normalizarFecha(filtros.fechaFin) : null;

    if (!start || !end) {
      const asistenciasProg = (apiDb.asistencias || []).filter(a => {
        if (!filtros.programa || filtros.programa === "todos") return true;
        return String(a.programaId) === String(filtros.programa) ||
               String(a.programa).toLowerCase().trim() === String(filtros.programa).toLowerCase().trim();
      });

      const fechasValidas = asistenciasProg
        .map(a => normalizarFecha(a.fechaRegistro))
        .filter(Boolean);

      if (fechasValidas.length > 0) {
        const tiempos = fechasValidas.map(d => d.getTime());
        if (!start) start = new Date(Math.min(...tiempos));
        if (!end) end = new Date(Math.max(...tiempos));
      } else {
        const hoy = new Date();
        if (!start) start = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        if (!end) end = hoy;
      }
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (filtros.consolidacionAsistencia === "mes") {
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const finMes = new Date(end.getFullYear(), end.getMonth(), 1);
      const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

      while (curr <= finMes) {
        const y = curr.getFullYear();
        const m = curr.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, "0")}`;
        const label = `${mesesNombres[m]} ${y}`;

        const mStart = new Date(y, m, 1, 0, 0, 0, 0);
        const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

        columnasTiempo.push({ key, label, start: mStart, end: mEnd });
        curr.setMonth(curr.getMonth() + 1);
      }
    } else if (filtros.consolidacionAsistencia === "dia") {
      let currDay = new Date(start);
      const formatDDMMYY = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

      while (currDay <= end) {
        const dStart = new Date(currDay);
        const dEnd = new Date(currDay);
        dEnd.setHours(23, 59, 59, 999);

        const label = formatDDMMYY(dStart);
        const key = `D_${dStart.getFullYear()}_${String(dStart.getMonth() + 1).padStart(2, "0")}_${String(dStart.getDate()).padStart(2, "0")}`;

        columnasTiempo.push({ key, label, start: dStart, end: dEnd });
        currDay.setDate(currDay.getDate() + 1);
      }
    } else {
      // Por Semana (Default)
      const getMonday = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
      };

      let currWeek = getMonday(start);
      const lastWeekMonday = getMonday(end);
      const formatDDMM = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

      let weekNum = 1;
      while (currWeek <= lastWeekMonday) {
        const wStart = new Date(currWeek);
        const wEnd = new Date(currWeek);
        wEnd.setDate(wEnd.getDate() + 6);
        wEnd.setHours(23, 59, 59, 999);

        const label = `Semana ${weekNum} (${formatDDMM(wStart)} - ${formatDDMM(wEnd)})`;
        const key = `W_${wStart.getFullYear()}_${formatDDMM(wStart).replace("/", "_")}`;

        columnasTiempo.push({ key, label, start: wStart, end: wEnd });
        currWeek.setDate(currWeek.getDate() + 7);
        weekNum++;
      }
    }
  }

  const headersMap = {
    index: { header: "N", width: 6 },
    id: { header: "Código", width: 16 },
    dni: { header: "DNI", width: 12 },
    estudiante: { header: "NOMBRES Y APELLIDOS", width: 35 },
    grado: { header: "GRADO", width: 15 },
    seccion: { header: "SECCIÓN", width: 15 },
    programa: { header: "Programa", width: 32 },
    estadoInscripcion: { header: "Estado Inscripción", width: 20 },
    estadoPago: { header: "Estado Pago", width: 16 },
    costoOriginal: { header: "Precio Lista (S/)", width: 16 },
    descuentoAprobado: { header: "¿Descuento/Beca?", width: 18 },
    descuentoTipo: { header: "Tipo Descuento", width: 18 },
    descuentoValor: { header: "Valor Descuento", width: 16 },
    descuentoMonto: { header: "Monto Descuento (S/)", width: 18 },
    costo: { header: "COSTO", width: 15 },
    origen: { header: "Origen / Canal", width: 24 },
    fechaRegistro: { header: "Fecha Registro", width: 22 },
    apoderado: { header: "Apoderado", width: 24 },
    telefono: { header: "Teléfono", width: 16 },
    periodo: { header: "Periodo", width: 14 },
    estado: { header: "Estado", width: 16 },
    categoria: { header: "Categoría", width: 18 },
    responsable: { header: "Responsable", width: 24 },
    inscritos: { header: "Total Alumnos", width: 15 },
    conBeca: { header: "Alumnos con Beca", width: 18 },
    cupos: { header: "Cupos", width: 10 },
    avance: { header: "Avance %", width: 12 },
    proyectado: { header: "Total Esperado (S/)", width: 18 },
    recaudado: { header: "Monto Recaudado (S/)", width: 20 },
    porCobrar: { header: "Por Cobrar (S/)", width: 16 },
    nombre: { header: "Taller / Programa", width: 32 },
    monto: { header: "Monto", width: 12 },
    medio: { header: "Medio", width: 18 },
    fecha: { header: "Fecha", width: 22 },
    montoPagado: { header: "Monto Pagado", width: 15 },
    pendiente: { header: "Monto Pendiente", width: 15 },
    medioPago: { header: "Medio de Pago", width: 18 },
    fechaPago: { header: "FECHA", width: 15 },
    nroOperacion: { header: "N° Operación", width: 16 },
    nroRecibo: { header: "RECIBO", width: 15 },
  };

  let sheetColumns = [];
  let finalRows = [];

  if (tipoDatos === "direccion_alumnos_asistencias") {
    const baseColumns = columnas.length > 0 ? columnas : ["dni", "estudiante", "grado", "programa", "telefono"];
    sheetColumns = baseColumns.map((colKey) => {
      const colInfo = headersMap[colKey];
      return {
        header: colInfo?.header || colKey,
        key: colKey,
        width: colInfo?.width || 16,
      };
    });

    columnasTiempo.forEach((col) => {
      sheetColumns.push({
        header: col.label,
        key: col.key,
        width: 18,
      });
    });

    const asistencias = apiDb.asistencias || [];

    finalRows = filteredData.map((ins) => {
      const rowData = { ...ins };

      const studentAsistencias = asistencias.filter((a) => {
        const aDni = String(a.dniEstudiante || a.codigoEstudiante || "").trim();
        const insDni = String(ins.dni || "").trim();
        const dniMatch = aDni && insDni && aDni === insDni;
        const progMatch = String(a.programaId) === String(ins.programaId) ||
          normalizarTexto(a.programa) === normalizarTexto(ins.programa);
        return dniMatch && progMatch;
      });

      columnasTiempo.forEach((col) => {
        const count = studentAsistencias.filter((a) => {
          const date = normalizarFecha(a.fechaRegistro);
          return date && date >= col.start && date <= col.end;
        }).length;

        if (filtros.consolidacionAsistencia === "dia") {
          rowData[col.key] = count > 0 ? "✓" : "—";
        } else {
          rowData[col.key] = count > 0 ? count : "—";
        }
      });

      return rowData;
    });
  } else {
    sheetColumns = columnas.map((colKey) => {
      const colInfo = headersMap[colKey];
      return {
        header: colInfo?.header || colKey,
        key: colKey,
        width: colInfo?.width || 16,
      };
    });
    finalRows = filteredData.map((row, idx) => ({
      ...row,
      index: idx + 1,
    }));
  }

  const sheetName = tipoDatos === "direccion_alumnos_asistencias"
    ? "Asistencias Consolidadas"
    : tipoDatos === "direccion_alumnos_pagos"
    ? "Alumnos y Pagos"
    : "Reporte Personalizado";

  agregarHoja(workbook, sheetName, finalRows, sheetColumns);

  // Aplicar alineaciones y formatos premium
  const hoja = workbook.getWorksheet(sheetName);
  if (hoja) {
    if (tipoDatos === "direccion_alumnos_asistencias") {
      hoja.eachRow((row, rowNum) => {
        if (rowNum > 1) {
          row.eachCell((cell, colNum) => {
            const colKey = sheetColumns[colNum - 1]?.key;
            if (colKey && (colKey.startsWith("W_") || colKey.startsWith("D_") || /^\d{4}-\d{2}$/.test(colKey))) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }
          });
        }
      });
    } else if (tipoDatos === "direccion_alumnos_pagos") {
      const formatGradoExcel = (gradoStr) => {
        if (!gradoStr) return "";
        const s = String(gradoStr).trim().toUpperCase();
        if (s.includes("SECUNDARIA")) {
          return s.replace("SECUNDARIA", "SEC").replace("1°", "1").replace("2°", "2").replace("3°", "3").replace("4°", "4").replace("5°", "5");
        }
        if (s.includes("PRIMARIA")) {
          return s.replace("PRIMARIA", "GRADO").replace("1°", "1").replace("2°", "2").replace("3°", "3").replace("4°", "4").replace("5°", "5").replace("6°", "6");
        }
        return s;
      };

      const formatFechaExcel = (fechaStr) => {
        if (!fechaStr || fechaStr === "—") return "—";
        return formatearFechaPeru(fechaStr, fechaStr);
      };

      const headerRow = hoja.getRow(1);
      headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1F4E78" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8E4BC" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      hoja.eachRow((row, rowNum) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
          cell.alignment = { vertical: "middle", horizontal: "left" };
        });

        if (rowNum > 1) {
          row.eachCell((cell, colNum) => {
            const colKey = sheetColumns[colNum - 1]?.key;
            if (["index", "grado", "seccion", "fechaPago", "fecha", "fechaRegistro", "nroRecibo"].includes(colKey)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }

            if (colKey === "grado") {
              cell.value = formatGradoExcel(cell.value);
            } else if (["fechaPago", "fecha", "fechaRegistro"].includes(colKey)) {
              cell.value = formatFechaExcel(cell.value);
            } else if (colKey === "costo" || colKey === "costoOriginal" || colKey === "montoPagado" || colKey === "pendiente" || colKey === "descuentoMonto") {
              cell.value = Number(cell.value || 0);
              cell.numFmt = '"S/"#,##0.00';
              cell.alignment = { vertical: "middle", horizontal: "right" };
            } else if (colKey === "descuentoAprobado" || colKey === "descuentoTipo" || colKey === "descuentoValor") {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }
          });
        }
      });
    } else if (tipoDatos === "programas") {
      hoja.eachRow((row, rowNum) => {
        if (rowNum > 1) {
          row.eachCell((cell, colNum) => {
            const colKey = sheetColumns[colNum - 1]?.key;
            if (colKey === "costo" || colKey === "proyectado" || colKey === "recaudado" || colKey === "porCobrar") {
              cell.value = Number(cell.value || 0);
              cell.numFmt = '"S/"#,##0.00';
              cell.alignment = { vertical: "middle", horizontal: "right" };
            } else if (colKey === "inscritos" || colKey === "conBeca" || colKey === "cupos" || colKey === "avance") {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }
          });
        }
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const nombre = `direccion-personalizado-${tipoDatos}-${periodo}.xlsx`;
  descargarBlob(blob, nombre);
  return nombre;
}
