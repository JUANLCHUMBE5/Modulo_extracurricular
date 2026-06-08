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
  customTipo,
  panel,
}) {
  if (!panel?.reportes) return [];

  let raw = [];
  if (customTipo === "inscripciones") {
    raw = panel.reportes.inscripciones || [];
  } else if (customTipo === "programas") {
    raw = panel.reportes.programas || [];
  } else if (customTipo === "pagos") {
    raw = panel.reportes.pagos || [];
  }

  let filtered = [...raw];

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
  }

  return filtered;
}

function coincideEstadoPago(estado, filtro, excluirAnulados) {
  const valor = String(estado || "").toLowerCase();
  if (filtro === "Pagado") {
    return valor.includes("pag") || valor === "completado";
  }
  if (filtro === "Pendiente") {
    return !valor.includes("pag") && valor !== "completado" && (!excluirAnulados || !valor.includes("anul"));
  }
  return true;
}
