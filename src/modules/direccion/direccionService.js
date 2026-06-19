
import ExcelJS from "exceljs";
import { apiDb, syncApiDb, saveApiDb } from "../../services/dbApi";
import { isApiMode, apiClient } from "../../services/apiClient";
import { normalizarFecha } from "../../services/dateService";

const esperar = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerPanelDireccion(filtros = {}) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/reportes/resumen", {
      params: filtros
    });
    if (!res.success) throw new Error(res.message || "Error al obtener panel de dirección");
    return res.data;
  }

  await esperar();
  await syncApiDb();

  const periodo = normalizarPeriodo(filtros.periodo || "todos");
  const programas = filtrarPorPeriodo(apiDb.programas || [], periodo);
  const inscripciones = filtrarPorPeriodo(apiDb.inscripciones || [], periodo)
    .filter((item) => item.estadoInscripcion !== "Anulada");
  const pagos = filtrarPorPeriodo(apiDb.pagos || [], periodo);

  const filasProgramas = programas.map((programa) => {
    const inscripcionesPrograma = inscripciones.filter((item) =>
      item.programaId === programa.id || normalizarTexto(item.programa) === normalizarTexto(programa.nombre)
    );
    const pagosPrograma = pagos.filter((item) =>
      item.programaId === programa.id || normalizarTexto(item.programa || item.programaNombre) === normalizarTexto(programa.nombre)
    );
    const inscritos = inscripcionesPrograma.length;
    const cupos = Number(programa.cupos || programa.cuposDisponibles || 0);
    const ocupados = Math.max(Number(programa.cuposOcupados || 0), inscritos);
    const proyectado = inscripcionesPrograma.reduce((sum, item) => sum + Number(item.costo ?? programa.costo ?? 0), 0);
    const recaudado = pagosPrograma
      .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);

    return {
      id: programa.id,
      nombre: programa.nombre || "Programa sin nombre",
      periodo: normalizarPeriodo(programa.periodo || "escolar"),
      estado: programa.estado || "Sin estado",
      categoria: programa.categoria || "Sin categoria",
      responsable: programa.responsable || programa.docente || programa.tutora || "Sin responsable",
      cupos,
      ocupados,
      inscritos,
      costo: Number(programa.costo || 0),
      proyectado,
      recaudado,
      avance: cupos > 0 ? Math.round((ocupados / cupos) * 100) : 0,
    };
  }).sort((a, b) => b.inscritos - a.inscritos);

  const totalRecaudado = pagos
    .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
    .reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const totalProyectado = inscripciones.reduce((sum, item) => sum + Number(item.costo || 0), 0);
  const pendientesPago = inscripciones.filter((item) => normalizarEstadoPago(item.estadoPago) !== "Pagado");
  const familias = new Set(inscripciones.map((item) => item.telefono || item.apoderado || item.dniEstudiante).filter(Boolean));

  // --- Procesamiento de Asistencia ---
  const asistencias = apiDb.asistencias || [];
  
  const obtenerFechaPeru = (fechaStr) => {
    if (!fechaStr) return "";
    const str = String(fechaStr);
    if (str.includes("T") || str.length > 10) {
      try {
        const d = new Date(str);
        const dPeru = new Date(d.getTime() - 5 * 60 * 60 * 1000);
        return dPeru.toISOString().slice(0, 10);
      } catch {
        return str.slice(0, 10);
      }
    }
    return str.slice(0, 10);
  };

  const hoyStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD local
  
  const asistenciasHoy = asistencias.filter(item => {
    if (!item.fechaRegistro) return false;
    return obtenerFechaPeru(item.fechaRegistro) === hoyStr;
  });

  const asistidosHoyUnicos = new Set(
    asistenciasHoy.map(item => item.dniEstudiante || item.codigoEstudiante || item.nombresEstudiante).filter(Boolean)
  ).size;

  const asistenciaPorPrograma = filasProgramas.slice(0, 8).map((prog) => {
    const asistidosHoy = new Set(
      asistenciasHoy
        .filter(item => {
          const idCoincide = item.programaId && prog.id && String(item.programaId) === String(prog.id);
          const nombreCoincide = item.programa && prog.nombre && normalizarTexto(item.programa) === normalizarTexto(prog.nombre);
          return idCoincide || nombreCoincide;
        })
        .map(item => item.dniEstudiante || item.codigoEstudiante || item.nombresEstudiante).filter(Boolean)
    ).size;

    return {
      programa: abreviar(prog.nombre),
      matriculados: prog.inscritos,
      asistidos: asistidosHoy,
    };
  });

  const ultimosIngresos = [...asistencias]
    .sort((a, b) => new Date(b.fechaRegistro || 0).getTime() - new Date(a.fechaRegistro || 0).getTime())
    .slice(0, 15)
    .map(item => {
      let horaFormateada = "—";
      if (item.fechaRegistro) {
        try {
          const date = new Date(item.fechaRegistro);
          horaFormateada = date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: true });
        } catch {
          horaFormateada = String(item.fechaRegistro).slice(11, 16);
        }
      }
      return {
        id: item.id || "",
        hora: horaFormateada,
        estudiante: item.nombresEstudiante || "Estudiante",
        dni: item.dniEstudiante || "",
        programa: item.programa || "Sin programa",
        estadoPago: item.estadoPago || "Pendiente",
        estadoAcceso: item.estadoAcceso || "no_registrado",
        observacion: item.observacion || "",
      };
    });

  return {
    resumen: {
      programas: programas.length,
      programasHabilitados: programas.filter((item) => item.estado === "Habilitado").length,
      inscripciones: inscripciones.length,
      familias: familias.size,
      totalRecaudado,
      totalProyectado,
      totalPendiente: pendientesPago.reduce((sum, item) => sum + Number(item.costo || 0), 0),
      cupos: filasProgramas.reduce((sum, item) => sum + Number(item.cupos || 0), 0),
      ocupados: filasProgramas.reduce((sum, item) => sum + Number(item.ocupados || 0), 0),
      asistidosHoy: asistidosHoyUnicos,
    },
    filasProgramas,
    ultimosIngresos,
    graficos: {
      inscripcionesPorPrograma: filasProgramas.slice(0, 8).map((item) => ({
        programa: abreviar(item.nombre),
        inscripciones: item.inscritos,
      })),
      ingresosPorPrograma: filasProgramas.slice(0, 8).map((item) => ({
        programa: abreviar(item.nombre),
        proyectado: item.proyectado,
        recaudado: item.recaudado,
      })),
      estadoPago: contarPor(inscripciones, (item) => normalizarEstadoPago(item.estadoPago)),
      origen: contarPor(inscripciones, (item) => item.origenRegistro || "Sin origen"),
      asistenciaPorPrograma,
    },
    reportes: {
      programas: filasProgramas,
      inscripciones: inscripciones.map(crearFilaInscripcion),
      pagos: pagos.map(crearFilaPago),
    },
  };
}

export async function descargarReporteDireccion(tipoReporte, filtros = {}) {
  const panel = await obtenerPanelDireccion(filtros);
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

function agregarHoja(workbook, nombre, filas, columnas) {
  const hoja = workbook.addWorksheet(nombre);
  hoja.columns = columnas;
  hoja.addRows(filas);
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176C60" } };
  hoja.getRow(1).alignment = { vertical: "middle" };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });
}

function crearFilaInscripcion(item) {
  return {
    id: item.id || "",
    dni: item.dniEstudiante || "",
    estudiante: item.nombresEstudiante || "",
    grado: item.gradoEstudiante || item.grado || "",
    programa: item.programa || "",
    estadoInscripcion: item.estadoInscripcion || "",
    estadoPago: normalizarEstadoPago(item.estadoPago),
    costo: Number(item.costo || 0),
    costoOriginal: Number(item.costoOriginal ?? item.costo ?? 0),
    origen: item.origenRegistro || "",
    fechaRegistro: item.fechaRegistro || "",
    apoderado: item.apoderado || "",
    telefono: item.telefono || "",
    descuentoAprobado: !!item.descuentoAprobado,
    descuentoTipo: item.descuentoTipo || "",
    descuentoValor: Number(item.descuentoValor || 0),
    descuentoMonto: Number(item.descuentoMonto || 0),
    descuentoJustificacion: item.descuentoJustificacion || "",
  };
}

function crearFilaPago(item) {
  return {
    id: item.id || "",
    dni: item.dniEstudiante || item.estudianteDni || "",
    estudiante: item.nombresEstudiante || item.estudianteNombre || "",
    programa: item.programa || item.programaNombre || "",
    monto: Number(item.monto || 0),
    estado: normalizarEstadoPago(item.estado),
    medio: item.formaPago || item.medioPago || "",
    fecha: item.fechaPago || item.fecha || "",
  };
}

function filtrarPorPeriodo(items, periodo) {
  if (periodo === "todos") return [...items];
  return [...items].filter((item) => normalizarPeriodo(item.periodo || "escolar") === periodo);
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

function contarPor(items, resolver) {
  const conteo = new Map();
  items.forEach((item) => {
    const key = resolver(item) || "Sin dato";
    conteo.set(key, (conteo.get(key) || 0) + 1);
  });
  const colores = ["teal.6", "orange.6", "blue.6", "grape.6", "yellow.6", "red.6"];
  return [...conteo.entries()].map(([name, value], index) => ({
    name,
    value,
    color: colores[index % colores.length],
  }));
}

function normalizarTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}

function abreviar(valor) {
  const texto = String(valor || "Sin nombre").trim();
  return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
}

export async function descargarReportePersonalizado({ tipoDatos, filtros = {}, columnas = [], periodo = "todos" }) {
  const panel = await obtenerPanelDireccion({ periodo });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  let rawData = [];
  if (tipoDatos === "inscripciones") {
    rawData = panel.reportes.inscripciones;
  } else if (tipoDatos === "programas") {
    rawData = panel.reportes.programas;
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
        apoderado: ins.apoderado || "",
        telefono: ins.telefono || "",
        programa: ins.programa || "",
        costo,
        montoPagado,
        pendiente,
        estadoPago: pago ? (pago.estado || "Pagado") : "Pendiente",
        medioPago: pago ? (pago.medio || "—") : "—",
        fechaPago: pago ? (pago.fecha || "—") : "—",
        nroOperacion: pago ? (pago.id || "—") : "—",
        fechaRegistro: ins.fechaRegistro || "",
      };
    });
  } else if (tipoDatos === "direccion_alumnos_asistencias") {
    rawData = (panel.reportes.inscripciones || []).map(ins => ({
      dni: ins.dni || "",
      estudiante: ins.estudiante || "",
      grado: ins.grado || "",
      programa: ins.programa || "",
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

  // 2. Filtrar por Programa/Taller
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

  // 4. Filtrar por Rango de Fechas
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
    id: { header: "Código", width: 16 },
    dni: { header: "DNI", width: 12 },
    estudiante: { header: "Estudiante", width: 32 },
    grado: { header: "Grado", width: 18 },
    programa: { header: "Programa", width: 32 },
    estadoInscripcion: { header: "Estado Inscripción", width: 20 },
    estadoPago: { header: "Estado Pago", width: 16 },
    costo: { header: "Costo / Monto Taller", width: 16 },
    origen: { header: "Origen / Canal", width: 24 },
    fechaRegistro: { header: "Fecha Registro", width: 22 },
    apoderado: { header: "Apoderado", width: 24 },
    telefono: { header: "Teléfono", width: 16 },
    periodo: { header: "Periodo", width: 14 },
    estado: { header: "Estado", width: 16 },
    categoria: { header: "Categoría", width: 18 },
    responsable: { header: "Responsable", width: 24 },
    inscritos: { header: "Inscritos", width: 12 },
    cupos: { header: "Cupos", width: 10 },
    avance: { header: "Avance %", width: 12 },
    proyectado: { header: "Proyectado", width: 14 },
    recaudado: { header: "Recaudado", width: 14 },
    nombre: { header: "Programa", width: 32 },
    monto: { header: "Monto", width: 12 },
    medio: { header: "Medio", width: 18 },
    fecha: { header: "Fecha", width: 22 },
    montoPagado: { header: "Monto Pagado", width: 15 },
    pendiente: { header: "Monto Pendiente", width: 15 },
    medioPago: { header: "Medio de Pago", width: 18 },
    fechaPago: { header: "Fecha de Pago", width: 16 },
    nroOperacion: { header: "N° Operación", width: 16 },
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
        const dniMatch = (a.dniEstudiante || a.codigoEstudiante) === ins.dni;
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
    finalRows = filteredData;
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
      hoja.eachRow((row, rowNum) => {
        if (rowNum > 1) {
          row.eachCell((cell, colNum) => {
            const colKey = sheetColumns[colNum - 1]?.key;
            if (colKey === "costo" || colKey === "montoPagado" || colKey === "pendiente") {
              cell.value = Number(cell.value || 0);
              cell.numFmt = '"S/"#,##0.00';
              cell.alignment = { vertical: "middle", horizontal: "right" };
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

export async function buscarInscripcionesParaDescuento(busqueda) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/direccion/descuentos/buscar", {
      params: { q: busqueda }
    });
    if (!res.success) throw new Error(res.message || "Error al buscar inscripciones");
    return res.data;
  }

  await esperar(200);
  await syncApiDb();
  const term = String(busqueda || "").toLowerCase().trim();
  if (!term) return [];

  const realEnrollments = (apiDb.inscripciones || []).filter(ins => {
    if (ins.estadoInscripcion === "Anulada" || ins.estadoInscripcion === "anulada") return false;
    const dniCoincide = String(ins.dni || ins.dniEstudiante || "").includes(term);
    const nombreCoincide = String(ins.estudiante || ins.nombresEstudiante || "").toLowerCase().includes(term);
    return dniCoincide || nombreCoincide;
  });

  const virtualEnrollments = [];
  const programas = apiDb.programas || [];
  programas.forEach(programa => {
    const invitados = apiDb.invitadosPorPrograma?.[programa.id] || [];
    invitados.forEach(invitado => {
      const dni = String(invitado.dni || "").replace(/\D/g, "");
      const name = String(invitado.nombres || "").toLowerCase();
      const matchesDni = dni.includes(term);
      const matchesName = name.includes(term);
      
      if (matchesDni || matchesName) {
        const existeReal = (apiDb.inscripciones || []).some(ins => 
          ins.dniEstudiante === invitado.dni && 
          ins.programaId === programa.id && 
          ins.estadoInscripcion !== "Anulada" &&
          ins.estadoInscripcion !== "anulada"
        );
        
        if (!existeReal) {
          const student = apiDb.estudiantes?.[invitado.dni] || {};
          virtualEnrollments.push({
            id: `INV-${programa.id}-${invitado.dni}`,
            inscripcion_id: `INV-${programa.id}-${invitado.dni}`,
            estudiante_id: invitado.dni,
            programa_id: programa.id,
            creado_en: new Date().toISOString(),
            origen_inscripcion: "Invitación",
            estado_inscripcion: "Pendiente de pago",
            dni_estudiante: invitado.dni,
            codigo_estudiante: student.codigoEstudiante || invitado.codigoEstudiante || "",
            nombres_estudiante: invitado.nombres,
            grado_estudiante: invitado.grado || "",
            seccion: invitado.seccion || "",
            nombre_programa: programa.nombre,
            categoria: programa.categoria || "",
            horario: programa.horario || "",
            docente: programa.responsable || programa.docente || "No definido",
            monto: programa.costo || 0,
            costoOriginal: programa.costo || 0,
            apoderado: student.apoderado || "",
            telefono_apoderado: student.telefonoApoderado || student.telefono || "",
            correo_apoderado: student.correoApoderado || student.correo || "",
            estado_pago: "pendiente",
            pago_id: "",
            derivado_caja: false,
            estado_caja: "",
            descuentoAprobado: false,
            esVirtual: true
          });
        }
      }
    });
  });

  return [
    ...realEnrollments,
    ...virtualEnrollments
  ];
}

export async function aplicarDescuentoInscripcion(inscripcionId, datosDescuento) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/direccion/descuentos/aplicar`, {
      inscripcionId,
      ...datosDescuento
    });
    if (!res.success) throw new Error(res.message || "Error al aplicar descuento");
    return res.data;
  }

  await esperar(300);
  await syncApiDb();
  
  let ins = null;
  let index = -1;

  if (String(inscripcionId).startsWith("INV-")) {
    const parts = String(inscripcionId).split("-");
    const progId = parts[1];
    const dni = parts[2];
    
    const prog = (apiDb.programas || []).find(p => p.id === progId);
    if (!prog) throw new Error("Taller no encontrado para la invitación");

    const invitados = apiDb.invitadosPorPrograma?.[progId] || [];
    const invitado = invitados.find(i => i.dni === dni);
    if (!invitado) throw new Error("Invitación de estudiante no encontrada");

    const student = apiDb.estudiantes?.[dni] || {};

    const newInscripcion = {
      id: "INS-" + Date.now(),
      dniEstudiante: dni,
      codigoEstudiante: student.codigoEstudiante || invitado.codigoEstudiante || "",
      nombresEstudiante: invitado.nombres,
      gradoEstudiante: invitado.grado || student.grado || "",
      seccion: invitado.seccion || student.seccion || "",
      programaId: progId,
      programa: prog.nombre,
      categoria: prog.categoria || "",
      costo: prog.costo || 0,
      estadoInscripcion: "pendiente_pago", // Pre-inscrito
      estadoPago: "pendiente",
      derivadoCaja: true, // Manda a caja
      fechaRegistro: new Date().toISOString(),
      apoderado: student.apoderado || "",
      telefono: student.telefonoApoderado || student.telefono || "",
      correo: student.correoApoderado || student.correo || "",
      origenRegistro: "Dirección / Descuento"
    };

    apiDb.inscripciones = apiDb.inscripciones || [];
    apiDb.inscripciones.push(newInscripcion);
    index = apiDb.inscripciones.length - 1;
    ins = apiDb.inscripciones[index];
  } else {
    index = (apiDb.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
    if (index === -1) throw new Error("Inscripción no encontrada");
    ins = apiDb.inscripciones[index];
  }

  // Validar si ya está pagado
  const payments = apiDb.pagos || [];
  const pagoAsociado = payments.find(pay => pay.inscripcionId === ins.id) || payments.find(pay => pay.dniEstudiante === ins.dniEstudiante && (pay.programaId === ins.programaId || String(pay.programa || "").toLowerCase() === String(ins.programa || "").toLowerCase()));
  if (pagoAsociado && ["completado", "validado", "pagado"].includes(String(pagoAsociado.estado).toLowerCase())) {
    throw new Error("No se puede aplicar descuento a una inscripción que ya ha sido pagada.");
  }

  const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);
  let descuentoMonto = 0;
  let nuevoCosto = costoOriginal;

  if (datosDescuento.tipo === "beca") {
    descuentoMonto = costoOriginal;
    nuevoCosto = 0;
  } else if (datosDescuento.tipo === "porcentaje") {
    const pct = Number(datosDescuento.valor || 0);
    descuentoMonto = Math.round((costoOriginal * pct) / 100);
    nuevoCosto = Math.max(0, costoOriginal - descuentoMonto);
  } else if (datosDescuento.tipo === "monto") {
    descuentoMonto = Number(datosDescuento.valor || 0);
    nuevoCosto = Math.max(0, costoOriginal - descuentoMonto);
  }

  apiDb.inscripciones[index] = {
    ...ins,
    costo: nuevoCosto,
    costoOriginal,
    descuentoMonto,
    descuentoTipo: datosDescuento.tipo,
    descuentoValor: Number(datosDescuento.valor || 0),
    descuentoJustificacion: datosDescuento.justificacion || "",
    descuentoAprobado: true,
    descuentoAprobadoPor: "Dirección",
    descuentoFechaAprobacion: new Date().toISOString(),
    derivadoCaja: true
  };

  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));
  return apiDb.inscripciones[index];
}

export async function removerDescuentoInscripcion(inscripcionId) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/direccion/descuentos/remover/${inscripcionId}`);
    if (!res.success) throw new Error(res.message || "Error al remover descuento");
    return res.data;
  }

  await esperar(200);
  await syncApiDb();
  const index = (apiDb.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
  if (index === -1) throw new Error("Inscripción no encontrada");

  const ins = apiDb.inscripciones[index];
  const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);

  apiDb.inscripciones[index] = {
    ...ins,
    costo: costoOriginal,
    costoOriginal: undefined,
    descuentoMonto: undefined,
    descuentoTipo: undefined,
    descuentoValor: undefined,
    descuentoJustificacion: undefined,
    descuentoAprobado: false,
    descuentoAprobadoPor: undefined,
    descuentoFechaAprobacion: undefined,
  };

  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));
  return apiDb.inscripciones[index];
}
