import { useMemo } from "react";
import { calcularMetricasAnalisis, filtrarRegistrosReporte } from "../utils/direccionAnalytics";

export function useDireccionOptions({
  panel,
  periodo,
  customFiltroCategoria,
  customFiltroPrograma,
  customFiltroGrados,
  incluirInactivos,
  customFiltroOrigen,
  customFiltroPago,
  customTipo,
  fechaInicio,
  fechaFin,
}: any) {
  const resumen = panel?.resumen || {};
  const filasProgramas = panel?.filasProgramas || [];
  const chartInscripciones = panel?.graficos?.inscripcionesPorPrograma || [];
  const chartIngresos = panel?.graficos?.ingresosPorPrograma || [];
  const chartEstadoPago = panel?.graficos?.estadoPago || [];
  const chartOrigen = panel?.graficos?.origen || [];

  const ocupacion = useMemo(() => {
    const cupos = Number(resumen.cupos || 0);
    if (!cupos) return 0;
    return Math.round((Number(resumen.ocupados || 0) / cupos) * 100);
  }, [resumen.cupos, resumen.ocupados]);

  const metricasAnalisis = useMemo(() => calcularMetricasAnalisis(panel), [panel]);

  const listadoVerano = ["Vacaciones Útiles", "Talleres Recreativos", "Talleres Deportivos"];
  const listadoEscolar = useMemo(() => {
    const dbCats = panel?.categorias || ["Academico", "Deportivo", "Maraton", "Reforzamiento"];
    return dbCats.filter((c: any) => {
      const normCat = String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return ![
        "vacaciones utiles",
        "talleres recreativos",
        "talleres deportivos",
        "deportivos",
        "taller recreativo",
        "vacaciones"
      ].includes(normCat);
    });
  }, [panel?.categorias]);

  const categoriasOptions = useMemo(() => {
    let list = [];
    if (periodo === "verano") {
      list = listadoVerano;
    } else if (periodo === "escolar") {
      list = listadoEscolar;
    } else {
      const unicos = new Set([...listadoEscolar, ...listadoVerano]);
      list = Array.from(unicos);
    }
    return [
      { value: "todos", label: "Todas las categorías" },
      ...list.map(c => {
        let label = c;
        if (c === "Academico") label = "Académico";
        if (c === "Maraton") label = "Maratón";
        return { value: c, label };
      })
    ];
  }, [listadoEscolar, periodo]);

  const aniosOptions = useMemo(() => {
    const list = panel?.aniosDisponibles || [];
    const currentYear = String(new Date().getFullYear());
    const merged = Array.from(new Set([currentYear, ...list])).sort((a, b) => b.localeCompare(a));
    return [
      { value: "todos", label: "Todos los años" },
      ...merged.map(y => ({ value: y, label: y }))
    ];
  }, [panel?.aniosDisponibles]);

  const programasOptions = useMemo(() => {
    let list = filasProgramas;
    if (!incluirInactivos) {
      list = list.filter((p: any) => String(p.estado || "").toLowerCase() === "habilitado");
    }
    if (customFiltroCategoria !== "todos") {
      list = list.filter((p: any) => {
        const catProg = String(p.categoria || "").trim().toLowerCase();
        const catFiltro = String(customFiltroCategoria || "").trim().toLowerCase();
        return catProg === catFiltro;
      });
    }
    return [
      { value: "todos", label: "Todos los talleres" },
      ...list.map((p: any) => ({ value: p.id || p.nombre, label: p.nombre }))
    ];
  }, [filasProgramas, incluirInactivos, customFiltroCategoria]);

  const gradosOptions = useMemo(() => {
    const inscripciones = panel?.reportes?.inscripciones || [];
    const programas = panel?.filasProgramas || [];
    const gradosSet = new Set();

    const formatearGradoDb = (gradoRaw: any) => {
      if (!gradoRaw) return "";
      const str = String(gradoRaw).trim();
      if (str.includes(":")) {
        const [nivel, grado] = str.split(":");
        const nivelFormateado = nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
        if (nivelFormateado === "Inicial") {
          return `${grado} Inicial`;
        }
        return `${grado} ${nivelFormateado}`;
      }
      return str;
    };

    if (customFiltroPrograma && customFiltroPrograma !== "todos") {
      const progSeleccionado = programas.find((p: any) => p.id === customFiltroPrograma || p.nombre === customFiltroPrograma);
      if (progSeleccionado && Array.isArray(progSeleccionado.gradosAplicables)) {
        progSeleccionado.gradosAplicables.forEach(g => {
          const gradoStr = formatearGradoDb(g);
          if (gradoStr) gradosSet.add(gradoStr);
        });
      }
    } else {
      programas.forEach((p: any) => {
        if (Array.isArray(p.gradosAplicables)) {
          p.gradosAplicables.forEach(g => {
            const gradoStr = formatearGradoDb(g);
            if (gradoStr) gradosSet.add(gradoStr);
          });
        }
      });
    }

    inscripciones.forEach((ins: any) => {
      const grado = String(ins.grado || "").trim();
      if (grado) gradosSet.add(grado);
    });

    const sorted = [...gradosSet].sort((a: any, b: any) => {
      const numA = parseInt(a) || 99;
      const numB = parseInt(b) || 99;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
    const options = sorted.map(g => ({ value: g, label: g }));
    return [
      { value: "todos", label: "Todos los grados" },
      ...options
    ];
  }, [panel, customFiltroPrograma]);

  const registrosFiltrados = useMemo(() => filtrarRegistrosReporte({
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
    customFiltroMeses: [],
    customFiltroSemanas: [],
  }), [panel, customTipo, customFiltroOrigen, customFiltroPago, customFiltroCategoria, customFiltroPrograma, customFiltroGrados, fechaInicio, fechaFin, incluirInactivos]);

  return {
    resumen,
    filasProgramas,
    chartInscripciones,
    chartIngresos,
    chartEstadoPago,
    chartOrigen,
    ocupacion,
    metricasAnalisis,
    categoriasOptions,
    aniosOptions,
    programasOptions,
    gradosOptions,
    registrosFiltrados,
  };
}
