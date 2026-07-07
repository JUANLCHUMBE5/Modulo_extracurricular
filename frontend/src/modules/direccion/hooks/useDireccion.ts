import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  descargarReportePersonalizado,
  obtenerPanelDireccion,
} from "../direccionService";
import { calcularMetricasAnalisis, filtrarRegistrosReporte } from "../utils/direccionAnalytics";
import { puedeExportar } from "../utils/direccionFormatters";
import { useDireccionBeneficios } from "./useDireccionBeneficios";

export default function useDireccion({
  embedded = false,
  initialView = "resumen",
  user,
}: any) {
  const beneficios = useDireccionBeneficios({ initialView });
  const { refrescarBusquedaDescuento } = beneficios;

  const [periodo, setPeriodo] = useState("todos");
  const [anio, setAnio] = useState("todos");
  const [panel, setPanel] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [dashboardTab, setDashboardTab] = useState("caja");

  const [reporteSeleccionado, setReporteSeleccionado] = useState("direccion_alumnos_pagos");
  const [customTipo, setCustomTipo] = useState("direccion_alumnos_pagos");
  const [customFiltroOrigen, setCustomFiltroOrigen] = useState("todos");
  const [customFiltroPago, setCustomFiltroPago] = useState("todos");
  const [customFiltroCategoria, setCustomFiltroCategoria] = useState("todos");
  const [customFiltroPrograma, setCustomFiltroPrograma] = useState("todos");
  const [customFiltroGrados, setCustomFiltroGrados] = useState<string[]>([]);

  const handleGradosChange = (val: string[]) => {
    if (val.includes("todos")) {
      if (!customFiltroGrados.includes("todos")) {
        setCustomFiltroGrados(["todos"]);
      } else {
        const filtered = val.filter(v => v !== "todos");
        setCustomFiltroGrados(filtered);
      }
    } else {
      setCustomFiltroGrados(val);
    }
  };

  const [customColumnas, setCustomColumnas] = useState<string[]>([]);
  const [exportandoCustom, setExportandoCustom] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [consolidacionAsistencia, setConsolidacionAsistencia] = useState("dia");
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [rangoRapido, setRangoRapido] = useState("todos");

  const cambiarRangoRapido = (val: string) => {
    setRangoRapido(val);
    const d = new Date();
    
    const formatearFechaLocal = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (val === "todos") {
      setFechaInicio("");
      setFechaFin("");
    } else if (val === "hoy") {
      const hoyStr = formatearFechaLocal(d);
      setFechaInicio(hoyStr);
      setFechaFin(hoyStr);
    } else if (val === "esta_semana") {
      const day = d.getDay();
      const diffLunes = d.getDate() - day + (day === 0 ? -6 : 1);
      const lunes = new Date(d.setDate(diffLunes));
      const domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
      setFechaInicio(formatearFechaLocal(lunes));
      setFechaFin(formatearFechaLocal(domingo));
    } else if (val === "este_mes") {
      const primero = new Date(d.getFullYear(), d.getMonth(), 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setFechaInicio(formatearFechaLocal(primero));
      setFechaFin(formatearFechaLocal(ultimo));
    } else if (val === "mes_anterior") {
      const primero = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const ultimo = new Date(d.getFullYear(), d.getMonth(), 0);
      setFechaInicio(formatearFechaLocal(primero));
      setFechaFin(formatearFechaLocal(ultimo));
    }
  };

  const handleFechaInicioChange = (e: any) => {
    setFechaInicio(e.target.value);
    setRangoRapido("personalizado");
  };

  const handleFechaFinChange = (e: any) => {
    setFechaFin(e.target.value);
    setRangoRapido("personalizado");
  };

  const recargaTimerRef = useRef<any>(null);
  const lastFetchTimeRef = useRef(0);

  const exportarHabilitado = puedeExportar(user);

  useEffect(() => {
    let tipo = "inscripciones";
    let defaultCols: string[] = [];

    if (reporteSeleccionado === "pagos_historial") {
      tipo = "pagos";
      defaultCols = ["id", "dni", "estudiante", "programa", "beca", "descuento", "anulado", "estadoFinanciero", "montoPagado", "montoAnulado", "medio", "fecha", "nroRecibo", "observaciones"];
    } else if (reporteSeleccionado === "direccion_alumnos_pagos") {
      tipo = "direccion_alumnos_pagos";
      defaultCols = ["index", "estudiante", "grado", "seccion", "programa", "fechaPago", "nroRecibo", "beca", "descuento", "anulado", "estadoFinanciero", "montoPagado", "montoAnulado", "observaciones"];
    } else if (reporteSeleccionado === "direccion_alumnos_asistencias") {
      tipo = "direccion_alumnos_asistencias";
      defaultCols = ["index", "estudiante", "grado", "seccion", "programa"];
    } else if (reporteSeleccionado === "programas_catalogo") {
      tipo = "programas";
      defaultCols = ["nombre", "categoria", "responsable", "inscritos", "conBeca", "cupos", "costo", "proyectado", "recaudado", "porCobrar"];
    }

    setCustomTipo(tipo);
    setCustomColumnas(defaultCols);
    setCustomFiltroOrigen("todos");
    setCustomFiltroPago("todos");
    setCustomFiltroCategoria("todos");
    setCustomFiltroPrograma("todos");
    setCustomFiltroGrados([]);
    setRangoRapido("todos");
    setFechaInicio("");
    setFechaFin("");
  }, [reporteSeleccionado]);

  const cargarPanel = useCallback(async ({ silencioso = false } = {}) => {
    lastFetchTimeRef.current = Date.now();
    if (!silencioso) setCargando(true);
    setError("");
    try {
      const datos = await obtenerPanelDireccion({
        periodo,
        anio,
      });
      setPanel(datos);
    } catch (err: any) {
      setError(err.message || "No se pudo cargar el modulo de Direccion.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [periodo, anio]);

  useEffect(() => {
    cargarPanel();
  }, [cargarPanel]);

  useEffect(() => {
    const recargarSilencioso = () => {
      window.clearTimeout(recargaTimerRef.current);
      recargaTimerRef.current = window.setTimeout(() => {
        cargarPanel({ silencioso: true });
      }, 300);
    };

    const manejarStorage = (event: any) => {
      if (!event.key || event.key === "san_rafael_db_updated_at") {
        recargarSilencioso();
      }
    };

    const handleMockDbUpdated = () => {
      recargarSilencioso();
      refrescarBusquedaDescuento();
    };

    const handleFocusUpdate = () => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 30000) {
        recargarSilencioso();
      }
    };

    window.addEventListener("api-db-updated", recargarSilencioso);
    window.addEventListener("mock-db-updated", handleMockDbUpdated);
    window.addEventListener("storage", manejarStorage);
    window.addEventListener("focus", handleFocusUpdate);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        recargarSilencioso();
      }
    }, 180000);

    return () => {
      window.clearTimeout(recargaTimerRef.current);
      window.clearInterval(intervalo);
      window.removeEventListener("api-db-updated", recargarSilencioso);
      window.removeEventListener("mock-db-updated", handleMockDbUpdated);
      window.removeEventListener("storage", manejarStorage);
      window.removeEventListener("focus", handleFocusUpdate);
    };
  }, [cargarPanel, refrescarBusquedaDescuento]);

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

  useEffect(() => {
    if (customFiltroCategoria !== "todos") {
      const exists = categoriasOptions.some(opt => opt.value === customFiltroCategoria);
      if (!exists) {
        setCustomFiltroCategoria("todos");
      }
    }
  }, [categoriasOptions, customFiltroCategoria]);

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

  useEffect(() => {
    if (customFiltroPrograma !== "todos") {
      const exists = programasOptions.some(opt => opt.value === customFiltroPrograma);
      if (!exists) {
        setCustomFiltroPrograma("todos");
      }
    }
  }, [programasOptions, customFiltroPrograma]);

  useEffect(() => {
    if (customFiltroGrados.length > 0) {
      const validValues = new Set(gradosOptions.map(opt => opt.value));
      const filtered = customFiltroGrados.filter(g => validValues.has(g));
      if (filtered.length !== customFiltroGrados.length) {
        setCustomFiltroGrados(filtered);
      }
    }
  }, [gradosOptions, customFiltroGrados]);

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

  const ejecutarDescargaCustom = async () => {
    if (!exportarHabilitado) {
      toast.error("Dirección", { description: "Este usuario no tiene permiso para exportar reportes." });
      return;
    }
    if (customColumnas.length === 0) {
      toast.error("Seleccione columnas", { description: "Debe seleccionar al menos una columna para exportar." });
      return;
    }
    setExportandoCustom(true);
    try {
      const archivo = await descargarReportePersonalizado({
        tipoDatos: customTipo,
        filtros: {
          origen: customFiltroOrigen,
          estadoPago: customFiltroPago,
          categoria: customFiltroCategoria,
          programa: customFiltroPrograma,
          grados: customFiltroGrados,
          fechaInicio,
          fechaFin,
          consolidacionAsistencia,
          incluirInactivos,
          anio,
          meses: [],
          semanas: [],
        },
        columnas: customColumnas,
        periodo: periodo,
      });
      toast.success("Reporte personalizado descargado", { description: archivo });
    } catch (err: any) {
      toast.error("No se pudo descargar", { description: err.message || "Revise la configuración de su reporte." });
    } finally {
      setExportandoCustom(false);
    }
  };

  return {
    periodo,
    setPeriodo,
    anio,
    setAnio,
    panel,
    cargando,
    error,
    dashboardTab,
    setDashboardTab,
    reporteSeleccionado,
    setReporteSeleccionado,
    customTipo,
    customFiltroOrigen,
    setCustomFiltroOrigen,
    customFiltroPago,
    setCustomFiltroPago,
    customFiltroCategoria,
    setCustomFiltroCategoria,
    customFiltroPrograma,
    setCustomFiltroPrograma,
    customFiltroGrados,
    handleGradosChange,
    customColumnas,
    setCustomColumnas,
    exportandoCustom,
    fechaInicio,
    fechaFin,
    consolidacionAsistencia,
    setConsolidacionAsistencia,
    incluirInactivos,
    setIncluirInactivos,
    rangoRapido,
    cambiarRangoRapido,
    handleFechaInicioChange,
    handleFechaFinChange,
    exportarHabilitado,
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
    ejecutarDescargaCustom,
    ...beneficios,
  };
}
export { puedeExportar };
