import { normalizarFecha, formatearFechaPeru } from "../../../services/dateService";
import { apiDb } from "../../../services/dbApi";
import { adaptarAsistencia } from "../../../services/adapters";
import {
  normalizarTexto,
  normalizarEstadoPago,
  coincideEstadoPago,
  construirDetalleFinanciero,
  descargarBlob,
  agregarHoja,
} from "./direccionExcelHelpers";

export async function descargarReportePersonalizadoExcel({ panel, tipoDatos, filtros = {}, columnas = [], periodo = "todos" }: any) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  let rawData: any[] = [];
  if (tipoDatos === "inscripciones") {
    rawData = panel.reportes.inscripciones;
  } else if (tipoDatos === "programas") {
    const list = panel.reportes.programas || [];
    rawData = filtros.incluirInactivos ? list : list.filter((p: any) => String(p.estado || "").toLowerCase() === "habilitado");
  } else if (tipoDatos === "pagos") {
    rawData = (panel.reportes.pagos || []).map((pago: any) => ({
      ...pago,
      ...construirDetalleFinanciero(pago),
    }));
  } else if (tipoDatos === "direccion_alumnos_pagos") {
    const inscripciones = panel.reportes.inscripciones || [];
    const pagos = panel.reportes.pagos || [];
    rawData = inscripciones.map((ins: any) => {
      const pago = pagos.find((p: any) =>
        (ins.id && p.inscripcionId === ins.id) ||
        (ins.pagoId && p.id === ins.pagoId) ||
        ((p.dni || p.dniEstudiante) === ins.dni &&
         normalizarTexto(p.programa || p.programaNombre) === normalizarTexto(ins.programa))
      ) || null;

      const costo = Number(ins.costo || 0);
      const montoPagado = pago ? Number(pago.monto || 0) : 0;
      const pendiente = Math.max(0, costo - montoPagado);
      const detalleFinanciero = construirDetalleFinanciero(ins, pago);

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
        ...detalleFinanciero,
        pendiente: detalleFinanciero.anulado === "SI" ? costo : pendiente,
        estadoPago: detalleFinanciero.estadoFinanciero,
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
    rawData = (panel.reportes.inscripciones || []).map((ins: any) => ({
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

  const listProgramas = panel.reportes.programas || [];
  const findProgram = (progNameOrId: any) => {
    if (!progNameOrId) return null;
    const nameOrId = String(progNameOrId).toLowerCase().trim();
    return listProgramas.find((p: any) =>
      String(p.id).toLowerCase() === nameOrId ||
      String(p.nombre).toLowerCase().trim() === nameOrId
    );
  };

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

  if (filtros.programa && filtros.programa !== "todos") {
    const progObj = findProgram(filtros.programa);
    const progNombreFiltrado = progObj ? String(progObj.nombre).toLowerCase().trim() : "";
    const progIdFiltrado = progObj ? String(progObj.id).toLowerCase().trim() : String(filtros.programa).toLowerCase().trim();

    filteredData = filteredData.filter((item) => {
      if (tipoDatos === "programas") {
        return String(item.id).toLowerCase() === progIdFiltrado ||
               String(item.nombre).toLowerCase().trim() === progNombreFiltrado;
      }
      if (tipoDatos === "inscripciones" || tipoDatos === "pagos" || tipoDatos === "direccion_alumnos_pagos" || tipoDatos === "direccion_alumnos_asistencias") {
        const itemProgId = String(item.programaId || "").toLowerCase().trim();
        const itemProgNombre = String(item.programa || "").toLowerCase().trim();
        return (itemProgId && itemProgId === progIdFiltrado) ||
               (itemProgNombre && (itemProgNombre === progNombreFiltrado || itemProgNombre === progIdFiltrado));
      }
      return true;
    });
  }

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

  if (filtros.grados && filtros.grados.length > 0 && !filtros.grados.includes("todos")) {
    const gradosSet = new Set(filtros.grados.map((g: any) => g.toLowerCase().trim()));
    filteredData = filteredData.filter((item) => {
      const itemGrado = String(item.grado || item.gradoEstudiante || "").toLowerCase().trim();
      return gradosSet.has(itemGrado);
    });
  }

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

  if (filtros.meses && filtros.meses.length > 0) {
    const mesesSet = new Set(filtros.meses.map((m: any) => parseInt(m)));
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

      const month = itemDate.getMonth() + 1;
      return mesesSet.has(month);
    });
  }

  if (filtros.semanas && filtros.semanas.length > 0) {
    const semanasSet = new Set(filtros.semanas.map((s: any) => parseInt(s)));
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

  let columnasTiempo: any[] = [];
  if (tipoDatos === "direccion_alumnos_asistencias") {
    let start = filtros.fechaInicio ? normalizarFecha(filtros.fechaInicio) : null;
    let end = filtros.fechaFin ? normalizarFecha(filtros.fechaFin) : null;

    if (!start || !end) {
      const rawAsistencias = panel.reportes.asistencias || apiDb.asistencias || [];
      const asistencias = rawAsistencias.map((a: any) => a.asistencia_id ? adaptarAsistencia(a) : a);

      const asistenciasProg = asistencias.filter((a: any) => {
        if (!filtros.programa || filtros.programa === "todos") return true;
        return String(a.programaId) === String(filtros.programa) ||
               String(a.programa).toLowerCase().trim() === String(filtros.programa).toLowerCase().trim();
      });

      const fechasValidas = asistenciasProg
        .map((a: any) => normalizarFecha(a.fechaRegistro || a.fecha))
        .filter(Boolean);

      if (fechasValidas.length > 0) {
        const tiempos = fechasValidas.map((d: any) => d.getTime());
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
      const formatDDMMYY = (d: any) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

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
      const getMonday = (d: any) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
      };

      let currWeek = getMonday(start);
      const lastWeekMonday = getMonday(end);
      const formatDDMM = (d: any) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

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

  const headersMap: any = {
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
    beca: { header: "BECA", width: 10 },
    descuento: { header: "DESCUENTO", width: 18 },
    anulado: { header: "ANULADO", width: 12 },
    estadoFinanciero: { header: "ESTADO", width: 16 },
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
    montoAnulado: { header: "Monto Anulado", width: 15 },
    pendiente: { header: "Monto Pendiente", width: 15 },
    medioPago: { header: "Medio de Pago", width: 18 },
    fechaPago: { header: "FECHA", width: 15 },
    nroOperacion: { header: "N° Operación", width: 16 },
    nroRecibo: { header: "N° de comprobante", width: 18 },
    observaciones: { header: "Observaciones / Motivo Anulación", width: 30 },
  };

  let sheetColumns: any[] = [];
  let finalRows: any[] = [];

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

    const rawAsistencias = panel.reportes.asistencias || apiDb.asistencias || [];
    const asistencias = rawAsistencias.map((a: any) => a.asistencia_id ? adaptarAsistencia(a) : a);

    finalRows = filteredData.map((ins) => {
      const rowData = { ...ins };

      const studentAsistencias = asistencias.filter((a: any) => {
        const aDni = String(a.dniEstudiante || a.codigoEstudiante || "").trim();
        const insDni = String(ins.dni || "").trim();
        const dniMatch = aDni && insDni && aDni === insDni;
        const progMatch = String(a.programaId) === String(ins.programaId) ||
          normalizarTexto(a.programa) === normalizarTexto(ins.programa);
        return dniMatch && progMatch;
      });

      columnasTiempo.forEach((col) => {
        const count = studentAsistencias.filter((a: any) => {
          const date = normalizarFecha(a.fechaRegistro || a.fecha);
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

  agregarHoja(workbook, sheetName, finalRows, sheetColumns, filtros);

  const hoja = workbook.getWorksheet(sheetName);
  if (hoja) {
    const startRow = hoja.views?.[0]?.ySplit || 1;

    if (tipoDatos === "direccion_alumnos_asistencias") {
      hoja.eachRow((row, rowNum) => {
        if (rowNum > startRow) {
          row.eachCell((cell, colNum) => {
            const colKey = sheetColumns[colNum - 1]?.key;
            if (colKey && (colKey.startsWith("W_") || colKey.startsWith("D_") || /^\d{4}-\d{2}$/.test(colKey))) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }
          });
        }
      });
    } else if (tipoDatos === "direccion_alumnos_pagos") {
      const formatGradoExcel = (gradoStr: any) => {
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

      const formatFechaExcel = (fechaStr: any) => {
        if (!fechaStr || fechaStr === "—") return "—";
        return formatearFechaPeru(fechaStr, fechaStr);
      };

      const headerRow = hoja.getRow(startRow);
      headerRow.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1F4E78" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8E4BC" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 25;

      hoja.eachRow((row, rowNum) => {
        if (rowNum < startRow) return;

        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
          cell.alignment = { vertical: "middle", horizontal: "left" };
        });

        if (rowNum > startRow) {
          row.eachCell((cell, colNum) => {
            const colKey = sheetColumns[colNum - 1]?.key;
            if (["index", "grado", "seccion", "fechaPago", "fecha", "fechaRegistro", "nroRecibo"].includes(colKey)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }

            if (colKey === "grado") {
              cell.value = formatGradoExcel(cell.value);
            } else if (["fechaPago", "fecha", "fechaRegistro"].includes(colKey)) {
              cell.value = formatFechaExcel(cell.value);
            } else if (colKey === "costo" || colKey === "costoOriginal" || colKey === "montoPagado" || colKey === "montoAnulado" || colKey === "pendiente" || colKey === "descuentoMonto") {
              cell.value = Number(cell.value || 0);
              cell.numFmt = '"S/"#,##0.00';
              cell.alignment = { vertical: "middle", horizontal: "right" };
            } else if (["descuentoAprobado", "descuentoTipo", "descuentoValor", "beca", "descuento", "anulado", "estadoFinanciero"].includes(colKey)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            }
          });
        }
      });
    } else if (tipoDatos === "programas") {
      hoja.eachRow((row, rowNum) => {
        if (rowNum > startRow) {
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
