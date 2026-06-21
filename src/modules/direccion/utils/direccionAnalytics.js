import { normalizarFecha } from "../../../services/dateService";

export function calcularMetricasAnalisis(panel) {
  const inscripcionesPeriodo = panel?.reportes?.inscripciones || [];

  let webCount = 0;
  let secCount = 0;
  inscripcionesPeriodo.forEach((item) => {
    const origen = String(item.origen || "").toLowerCase();
    if (origen.includes("web") || origen.includes("padres")) {
      webCount++;
    } else {
      secCount++;
    }
  });

  const totalInscripciones = inscripcionesPeriodo.length;
  const webPct = totalInscripciones ? Math.round((webCount / totalInscripciones) * 100) : 0;
  const secPct = totalInscripciones ? Math.round((secCount / totalInscripciones) * 100) : 0;

  let cursoEstrella = "Ninguno";
  let cursoEstrellaCount = 0;
  const counts = {};
  inscripcionesPeriodo.forEach((item) => {
    const programa = item.programa || "Sin programa";
    counts[programa] = (counts[programa] || 0) + 1;
    if (counts[programa] > cursoEstrellaCount) {
      cursoEstrella = programa;
      cursoEstrellaCount = counts[programa];
    }
  });

  const estrellaPct = totalInscripciones ? Math.round((cursoEstrellaCount / totalInscripciones) * 100) : 0;

  return {
    webCount,
    secCount,
    webPct,
    secPct,
    cursoEstrella,
    cursoEstrellaCount,
    estrellaPct,
    totalInscripciones,
  };
}

export function filtrarRegistrosReporte({
  customFiltroOrigen,
  customFiltroPago,
  customFiltroCategoria,
  customFiltroPrograma,
  customFiltroGrados,
  customTipo,
  panel,
  fechaInicio,
  fechaFin,
  incluirInactivos,
  customFiltroMeses,
  customFiltroSemanas,
}) {
  if (!panel?.reportes) return [];

  let raw = [];
  if (customTipo === "inscripciones") {
    raw = panel.reportes.inscripciones || [];
  } else if (customTipo === "programas") {
    const list = panel.reportes.programas || [];
    raw = incluirInactivos ? list : list.filter(p => String(p.estado || "").toLowerCase() === "habilitado");
  } else if (customTipo === "pagos") {
    raw = panel.reportes.pagos || [];
  } else if (customTipo === "direccion_alumnos_pagos") {
    const inscripciones = panel.reportes.inscripciones || [];
    const pagos = panel.reportes.pagos || [];
    raw = inscripciones.map(ins => {
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
        origen: ins.origen || "",
        fechaRegistro: ins.fechaRegistro || "",
      };
    });
  } else if (customTipo === "direccion_alumnos_asistencias") {
    raw = (panel.reportes.inscripciones || []).map(ins => ({
      dni: ins.dni || "",
      estudiante: ins.estudiante || "",
      grado: ins.grado || "",
      programa: ins.programa || "",
      programaId: ins.programaId || ins.programa_id || "",
      telefono: ins.telefono || "",
      fechaRegistro: ins.fechaRegistro || "",
    }));
  }

  let filtered = [...raw];

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
  if (customFiltroCategoria && customFiltroCategoria !== "todos") {
    filtered = filtered.filter((item) => {
      if (customTipo === "programas") {
        return String(item.categoria || "").toLowerCase() === String(customFiltroCategoria).toLowerCase();
      }
      if (customTipo === "inscripciones" || customTipo === "direccion_alumnos_pagos" || customTipo === "direccion_alumnos_asistencias") {
        if (item.categoria) {
          return String(item.categoria).toLowerCase() === String(customFiltroCategoria).toLowerCase();
        }
        const p = findProgram(item.programaId || item.programa);
        return p && String(p.categoria || "").toLowerCase() === String(customFiltroCategoria).toLowerCase();
      }
      if (customTipo === "pagos") {
        const p = findProgram(item.programaId || item.programa);
        return p && String(p.categoria || "").toLowerCase() === String(customFiltroCategoria).toLowerCase();
      }
      return true;
    });
  }

  // 2. Filtrar por Programa/Taller
  if (customFiltroPrograma && customFiltroPrograma !== "todos") {
    filtered = filtered.filter((item) => {
      if (customTipo === "programas") {
        return String(item.id).toLowerCase() === String(customFiltroPrograma).toLowerCase() ||
               String(item.nombre).toLowerCase().trim() === String(customFiltroPrograma).toLowerCase().trim();
      }
      if (customTipo === "inscripciones" || customTipo === "pagos" || customTipo === "direccion_alumnos_pagos" || customTipo === "direccion_alumnos_asistencias") {
        return String(item.programaId).toLowerCase() === String(customFiltroPrograma).toLowerCase() ||
               String(item.programa).toLowerCase().trim() === String(customFiltroPrograma).toLowerCase().trim();
      }
      return true;
    });
  }

  // 3. Filtrar por Grado(s)
  if (customFiltroGrados && customFiltroGrados.length > 0) {
    const gradosSet = new Set(customFiltroGrados.map(g => g.toLowerCase().trim()));
    filtered = filtered.filter((item) => {
      const itemGrado = String(item.grado || item.gradoEstudiante || "").toLowerCase().trim();
      return gradosSet.has(itemGrado);
    });
  }

  // 4. Filtrar por Origen y Pago
  if (customTipo === "inscripciones") {
    if (customFiltroOrigen !== "todos") {
      filtered = filtered.filter((item) => {
        const origen = String(item.origen || "").toLowerCase();
        if (customFiltroOrigen === "web") {
          return origen.includes("web") || origen.includes("padres");
        }
        if (customFiltroOrigen === "secretaria") {
          return origen.includes("sec") || origen.includes("presencial") || origen.includes("carga") || origen.includes("excel") || origen === "";
        }
        return true;
      });
    }
    if (customFiltroPago !== "todos") {
      filtered = filtered.filter((item) => coincideEstadoPago(item.estadoPago, customFiltroPago, true));
    }
  } else if (customTipo === "pagos" && customFiltroPago !== "todos") {
    filtered = filtered.filter((item) => coincideEstadoPago(item.estado, customFiltroPago, false));
  } else if (customTipo === "direccion_alumnos_pagos" && customFiltroPago !== "todos") {
    filtered = filtered.filter((item) => coincideEstadoPago(item.estadoPago, customFiltroPago, true));
  }

  // 4. Filtrar por Rango de Fechas
  if (fechaInicio || fechaFin) {
    const start = fechaInicio ? normalizarFecha(fechaInicio) : null;
    const end = fechaFin ? normalizarFecha(fechaFin) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    filtered = filtered.filter((item) => {
      let itemDateRaw = null;
      if (customTipo === "inscripciones") {
        itemDateRaw = item.fechaRegistro;
      } else if (customTipo === "pagos") {
        itemDateRaw = item.fecha || item.fechaPago;
      } else if (customTipo === "direccion_alumnos_pagos") {
        itemDateRaw = (item.fechaPago && item.fechaPago !== "—") ? item.fechaPago : item.fechaRegistro;
      } else if (customTipo === "direccion_alumnos_asistencias") {
        itemDateRaw = item.fechaRegistro;
      }

      if (!itemDateRaw) return true;
      const itemDate = normalizarFecha(itemDateRaw);
      if (!itemDate) return true;

      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }

  // 5. Filtrar por Meses
  if (customFiltroMeses && customFiltroMeses.length > 0) {
    const mesesSet = new Set(customFiltroMeses.map(m => parseInt(m)));
    filtered = filtered.filter((item) => {
      let itemDateRaw = null;
      if (customTipo === "inscripciones") {
        itemDateRaw = item.fechaRegistro;
      } else if (customTipo === "pagos") {
        itemDateRaw = item.fecha || item.fechaPago;
      } else if (customTipo === "direccion_alumnos_pagos") {
        itemDateRaw = (item.fechaPago && item.fechaPago !== "—") ? item.fechaPago : item.fechaRegistro;
      } else if (customTipo === "direccion_alumnos_asistencias") {
        itemDateRaw = item.fechaRegistro;
      }

      if (!itemDateRaw) return true;
      const itemDate = normalizarFecha(itemDateRaw);
      if (!itemDate) return true;

      const month = itemDate.getMonth() + 1; // 1-indexed
      return mesesSet.has(month);
    });
  }

  // 6. Filtrar por Semanas del Mes
  if (customFiltroSemanas && customFiltroSemanas.length > 0) {
    const semanasSet = new Set(customFiltroSemanas.map(s => parseInt(s)));
    filtered = filtered.filter((item) => {
      let itemDateRaw = null;
      if (customTipo === "inscripciones") {
        itemDateRaw = item.fechaRegistro;
      } else if (customTipo === "pagos") {
        itemDateRaw = item.fecha || item.fechaPago;
      } else if (customTipo === "direccion_alumnos_pagos") {
        itemDateRaw = (item.fechaPago && item.fechaPago !== "—") ? item.fechaPago : item.fechaRegistro;
      } else if (customTipo === "direccion_alumnos_asistencias") {
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

  return filtered;
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

function normalizarTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}
