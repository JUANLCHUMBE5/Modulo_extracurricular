import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  descargarReportePersonalizado,
  obtenerPanelDireccion,
} from "../direccionService";
import { puedeExportar } from "../utils/direccionFormatters";
import { useDireccionBeneficios } from "./useDireccionBeneficios";
import { useDireccionFilters } from "./useDireccionFilters";
import { useDireccionOptions } from "./useDireccionOptions";

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

  const filters = useDireccionFilters();
  const {
    customTipo,
    customFiltroOrigen,
    customFiltroPago,
    customFiltroCategoria,
    customFiltroPrograma,
    customFiltroGrados,
    customColumnas,
    fechaInicio,
    fechaFin,
    consolidacionAsistencia,
    incluirInactivos,
    setCustomTipo,
    setCustomColumnas,
    setCustomFiltroOrigen,
    setCustomFiltroPago,
    setCustomFiltroCategoria,
    setCustomFiltroPrograma,
    setCustomFiltroGrados,
    setFechaInicio,
    setFechaFin,
    setRangoRapido,
    setExportandoCustom,
  } = filters;

  const options = useDireccionOptions({
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
  });

  const {
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
  } = options;

  const recargaTimerRef = useRef<any>(null);
  const lastFetchTimeRef = useRef(0);
  const exportarHabilitado = puedeExportar(user);

  useEffect(() => {
    let tipo = "inscripciones";
    let defaultCols: string[] = [];

    if (reporteSeleccionado === "pagos_historial") {
      tipo = "pagos";
      defaultCols = [
        "id",
        "dni",
        "estudiante",
        "programa",
        "beca",
        "descuento",
        "anulado",
        "estadoFinanciero",
        "montoPagado",
        "montoAnulado",
        "medio",
        "fecha",
        "nroRecibo",
        "observaciones",
      ];
    } else if (reporteSeleccionado === "direccion_alumnos_pagos") {
      tipo = "direccion_alumnos_pagos";
      defaultCols = [
        "index",
        "estudiante",
        "grado",
        "seccion",
        "programa",
        "fechaPago",
        "nroRecibo",
        "beca",
        "descuento",
        "anulado",
        "estadoFinanciero",
        "montoPagado",
        "montoAnulado",
        "observaciones",
      ];
    } else if (reporteSeleccionado === "direccion_alumnos_asistencias") {
      tipo = "direccion_alumnos_asistencias";
      defaultCols = ["index", "estudiante", "grado", "seccion", "programa"];
    } else if (reporteSeleccionado === "programas_catalogo") {
      tipo = "programas";
      defaultCols = [
        "nombre",
        "categoria",
        "responsable",
        "inscritos",
        "conBeca",
        "cupos",
        "costo",
        "proyectado",
        "recaudado",
        "porCobrar",
      ];
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
  }, [
    reporteSeleccionado,
    setCustomTipo,
    setCustomColumnas,
    setCustomFiltroOrigen,
    setCustomFiltroPago,
    setCustomFiltroCategoria,
    setCustomFiltroPrograma,
    setCustomFiltroGrados,
    setRangoRapido,
    setFechaInicio,
    setFechaFin,
  ]);

  const cargarPanel = useCallback(
    async ({ silencioso = false } = {}) => {
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
    },
    [periodo, anio]
  );

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

  useEffect(() => {
    if (customFiltroCategoria !== "todos") {
      const exists = categoriasOptions.some((opt) => opt.value === customFiltroCategoria);
      if (!exists) {
        setCustomFiltroCategoria("todos");
      }
    }
  }, [categoriasOptions, customFiltroCategoria, setCustomFiltroCategoria]);

  useEffect(() => {
    if (customFiltroPrograma !== "todos") {
      const exists = programasOptions.some((opt) => opt.value === customFiltroPrograma);
      if (!exists) {
        setCustomFiltroPrograma("todos");
      }
    }
  }, [programasOptions, customFiltroPrograma, setCustomFiltroPrograma]);

  useEffect(() => {
    if (customFiltroGrados.length > 0) {
      const validValues = new Set(gradosOptions.map((opt) => opt.value));
      const filtered = customFiltroGrados.filter((g) => validValues.has(g));
      if (filtered.length !== customFiltroGrados.length) {
        setCustomFiltroGrados(filtered);
      }
    }
  }, [gradosOptions, customFiltroGrados, setCustomFiltroGrados]);

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
    ...filters,
    ...beneficios,
  };
}

export { puedeExportar };
