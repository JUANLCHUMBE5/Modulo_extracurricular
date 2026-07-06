import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSidebar from "../../hooks/useSidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Loader } from "@mantine/core";
import { IconAlertCircle as AlertCircle, IconMenu2 as Menu } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  descargarReportePersonalizado,
  obtenerPanelDireccion,
  buscarInscripcionesParaDescuento,
  aplicarDescuentoInscripcion,
  removerDescuentoInscripcion,
  obtenerCorrelativos,
  guardarCorrelativos
} from "./direccionService";
import { calcularMetricasAnalisis, filtrarRegistrosReporte } from "./utils/direccionAnalytics";
import { formatearSoles, puedeExportar } from "./utils/direccionFormatters";
import "./Direccion.css";

// Import modular subcomponents
import DireccionSidebar from "./components/DireccionSidebar/DireccionSidebar";
import DireccionDashboard from "./components/DireccionDashboard/DireccionDashboard";
import DireccionReportes from "./components/DireccionReportes/DireccionReportes";
import DireccionDescuentos from "./components/DireccionDescuentos/DireccionDescuentos";
import DireccionCorrelativos from "./components/DireccionCorrelativos/DireccionCorrelativos";

export default function Direccion({
  embedded = false,
  initialView = "resumen",
  moduleSwitcher,
  onLogout,
  user,
  delegatedContent = null,
}) {
  const { module, subview } = useParams();
  const navigate = useNavigate();
  const vista = embedded ? (initialView || "resumen") : (subview || "resumen");

  const setVista = (newView) => {
    if (embedded) {
      navigate(`/${module}/delegated/direccion/${newView}`);
    } else {
      navigate(`/direccion/${newView}`);
    }
  };

  const [sidebarExpanded, toggleSidebar] = useSidebar("dir");

  const [periodo, setPeriodo] = useState("todos");
  const [anio, setAnio] = useState("todos");
  const [panel, setPanel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Tab state inside dashboard
  const [dashboardTab, setDashboardTab] = useState("caja");

  // Custom reports state
  const [reporteSeleccionado, setReporteSeleccionado] = useState("direccion_alumnos_pagos");
  const [customTipo, setCustomTipo] = useState("direccion_alumnos_pagos");
  const [customFiltroOrigen, setCustomFiltroOrigen] = useState("todos");
  const [customFiltroPago, setCustomFiltroPago] = useState("todos");
  const [customFiltroCategoria, setCustomFiltroCategoria] = useState("todos");
  const [customFiltroPrograma, setCustomFiltroPrograma] = useState("todos");
  const [customFiltroGrados, setCustomFiltroGrados] = useState([]);

  const handleGradosChange = (val) => {
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

  const [customColumnas, setCustomColumnas] = useState([]);
  const [exportandoCustom, setExportandoCustom] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [consolidacionAsistencia, setConsolidacionAsistencia] = useState("dia");
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [rangoRapido, setRangoRapido] = useState("todos");

  const cambiarRangoRapido = (val) => {
    setRangoRapido(val);
    const d = new Date();
    
    const formatearFechaLocal = (date) => {
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

  const handleFechaInicioChange = (e) => {
    setFechaInicio(e.target.value);
    setRangoRapido("personalizado");
  };

  const handleFechaFinChange = (e) => {
    setFechaFin(e.target.value);
    setRangoRapido("personalizado");
  };

  // Scholarships and discounts state
  const [busquedaDescuento, setBusquedaDescuento] = useState("");
  const [resultadosDescuento, setResultadosDescuento] = useState([]);
  const [buscandoDescuento, setBuscandoDescuento] = useState(false);
  const [modalDescuentoAbierto, setModalDescuentoAbierto] = useState(false);
  const [inscripcionSeleccionada, setInscripcionSeleccionada] = useState(null);
  const [datosBeneficio, setDatosBeneficio] = useState({
    tipo: "beca",
    valor: "",
    justificacion: "",
  });
  const recargaTimerRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // Correlativos settings state
  const [correlativosForm, setCorrelativosForm] = useState({
    reciboInicio: "",
    reciboActual: "",
    reciboVirtualInicio: "",
    reciboVirtualActual: "",
    egresoInicio: "",
    egresoActual: ""
  });
  const [guardandoCorrelativos, setGuardandoCorrelativos] = useState(false);

  useEffect(() => {
    if (vista === "correlativos") {
      const cargarCorrelativos = async () => {
        try {
          const res = await obtenerCorrelativos();
          setCorrelativosForm(res || {
            reciboInicio: "",
            reciboActual: "",
            reciboVirtualInicio: "",
            reciboVirtualActual: "",
            egresoInicio: "",
            egresoActual: ""
          });
        } catch (err) {
          toast.error("Error", { description: "No se pudieron cargar los correlativos." });
        }
      };
      cargarCorrelativos();
    }
  }, [vista]);

  const handleGuardarCorrelativos = async (formToSave = correlativosForm) => {
    setGuardandoCorrelativos(true);
    try {
      await guardarCorrelativos(formToSave);
      toast.success("Éxito", { description: "Los correlativos se han guardado correctamente." });
      return true;
    } catch (err) {
      toast.error("Error", { description: err.message || "No se pudieron guardar los correlativos." });
      return false;
    } finally {
      setGuardandoCorrelativos(false);
    }
  };

  const exportarHabilitado = puedeExportar(user);

  const refrescarBusquedaDescuento = useCallback(async () => {
    const term = String(busquedaDescuento || "").trim();
    if (!term) return;
    try {
      const res = await buscarInscripcionesParaDescuento(term);
      setResultadosDescuento(res);
    } catch (err) {
      console.error("Error al refrescar búsqueda:", err);
    }
  }, [busquedaDescuento]);

  // Sync columns based on report selection
  useEffect(() => {
    let tipo = "inscripciones";
    let defaultCols = [];

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
    } catch (err) {
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

    const manejarStorage = (event) => {
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
    return dbCats.filter(c => {
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
      list = list.filter(p => String(p.estado || "").toLowerCase() === "habilitado");
    }
    if (customFiltroCategoria !== "todos") {
      list = list.filter(p => {
        const catProg = String(p.categoria || "").trim().toLowerCase();
        const catFiltro = String(customFiltroCategoria || "").trim().toLowerCase();
        return catProg === catFiltro;
      });
    }
    return [
      { value: "todos", label: "Todos los talleres" },
      ...list.map(p => ({ value: p.id || p.nombre, label: p.nombre }))
    ];
  }, [filasProgramas, incluirInactivos, customFiltroCategoria]);

  const gradosOptions = useMemo(() => {
    const inscripciones = panel?.reportes?.inscripciones || [];
    const programas = panel?.filasProgramas || [];
    const gradosSet = new Set();

    const formatearGradoDb = (gradoRaw) => {
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
      const progSeleccionado = programas.find(p => p.id === customFiltroPrograma || p.nombre === customFiltroPrograma);
      if (progSeleccionado && Array.isArray(progSeleccionado.gradosAplicables)) {
        progSeleccionado.gradosAplicables.forEach(g => {
          const gradoStr = formatearGradoDb(g);
          if (gradoStr) gradosSet.add(gradoStr);
        });
      }
    } else {
      programas.forEach(p => {
        if (Array.isArray(p.gradosAplicables)) {
          p.gradosAplicables.forEach(g => {
            const gradoStr = formatearGradoDb(g);
            if (gradoStr) gradosSet.add(gradoStr);
          });
        }
      });
    }

    inscripciones.forEach(ins => {
      const grado = String(ins.grado || "").trim();
      if (grado) gradosSet.add(grado);
    });

    const sorted = [...gradosSet].sort((a, b) => {
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
      toast.error("Direccion", { description: "Este usuario no tiene permiso para exportar reportes." });
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
    } catch (err) {
      toast.error("No se pudo descargar", { description: err.message || "Revise la configuración de su reporte." });
    } finally {
      setExportandoCustom(false);
    }
  };

  const buscarEstudiantesDescuento = async (e) => {
    if (e) e.preventDefault();
    const term = String(busquedaDescuento || "").trim();
    if (!term) {
      toast.error("Búsqueda vacía", { description: "Por favor ingrese un DNI o Nombre." });
      return;
    }
    setBuscandoDescuento(true);
    try {
      const res = await buscarInscripcionesParaDescuento(term);
      setResultadosDescuento(res);
      if (res.length === 0) {
        toast.info("Sin resultados", { description: "No se encontraron estudiantes para esa búsqueda." });
      }
    } catch (err) {
      toast.error("Error en búsqueda", { description: err.message || "No se pudo completar la búsqueda." });
    } finally {
      setBuscandoDescuento(false);
    }
  };

  const abrirModalBeneficio = (ins) => {
    setInscripcionSeleccionada(ins);
    setDatosBeneficio({
      tipo: ins.descuentoTipo || "beca",
      valor: ins.descuentoValor ? String(ins.descuentoValor) : "",
      justificacion: ins.descuentoJustificacion || "",
    });
    setModalDescuentoAbierto(true);
  };

  const cerrarModalBeneficio = () => {
    setModalDescuentoAbierto(false);
    setInscripcionSeleccionada(null);
    setDatosBeneficio({
      tipo: "beca",
      valor: "",
      justificacion: "",
    });
  };

  const guardarBeneficio = async () => {
    if (!inscripcionSeleccionada) return;
    if (!datosBeneficio.justificacion.trim()) {
      toast.error("Validación", { description: "Debe ingresar una justificación o motivo para el descuento." });
      return;
    }
    if (datosBeneficio.tipo !== "beca" && (!datosBeneficio.valor || Number(datosBeneficio.valor) <= 0)) {
      toast.error("Validación", { description: "Debe ingresar un valor numérico mayor a cero para el descuento." });
      return;
    }

    setBuscandoDescuento(true);
    try {
      await aplicarDescuentoInscripcion(inscripcionSeleccionada.id, {
        tipo: datosBeneficio.tipo,
        valor: Number(datosBeneficio.valor || 0),
        justificacion: datosBeneficio.justificacion.trim(),
      });
      toast.success("Beneficio registrado", { description: "El descuento/beca ha sido aprobado y enviado a Caja." });
      await refrescarBusquedaDescuento();
      cerrarModalBeneficio();
    } catch (err) {
      toast.error("Error", { description: err.message || "No se pudo aplicar el beneficio." });
    } finally {
      setBuscandoDescuento(false);
    }
  };

  const removerBeneficio = async () => {
    if (!inscripcionSeleccionada) return;
    setBuscandoDescuento(true);
    try {
      await removerDescuentoInscripcion(inscripcionSeleccionada.id);
      toast.success("Beneficio removido", { description: "Se ha retirado el descuento y restaurado el costo original." });
      await refrescarBusquedaDescuento();
      cerrarModalBeneficio();
    } catch (err) {
      toast.error("Error", { description: err.message || "No se pudo remover el beneficio." });
    } finally {
      setBuscandoDescuento(false);
    }
  };

  return (
    <main className={embedded ? "dir-page dir-page-embedded" : `dir-page ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      {/* Backdrop overlay — closes sidebar on click */}
      {!embedded && sidebarExpanded && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      {!embedded ? (
        <DireccionSidebar
          sidebarExpanded={sidebarExpanded}
          toggleSidebar={toggleSidebar}
          vista={vista}
          setVista={setVista}
          onLogout={onLogout}
          moduleSwitcher={moduleSwitcher}
          delegatedContent={delegatedContent}
        />
      ) : null}

      <section className={embedded ? "dir-main dir-main-embedded" : "dir-main"}>
        {!sidebarExpanded && !embedded && (
          <button
            className="sidebar-floating-toggle"
            type="button"
            onClick={toggleSidebar}
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={20} />
          </button>
        )}

        {error ? (
          <Alert color="orange" icon={<AlertCircle size={18} />} radius="md">
            {error}
          </Alert>
        ) : null}

        {delegatedContent ? (
          delegatedContent
        ) : cargando ? (
          <section className="dir-loading">
            <Loader color="teal" />
            <p>Cargando informacion de Direccion...</p>
          </section>
        ) : vista === "resumen" ? (
          <DireccionDashboard
            dashboardTab={dashboardTab}
            setDashboardTab={setDashboardTab}
            resumen={resumen}
            ocupacion={ocupacion}
            filasProgramas={filasProgramas}
            chartIngresos={chartIngresos}
            chartEstadoPago={chartEstadoPago}
            chartInscripciones={chartInscripciones}
            chartOrigen={chartOrigen}
            metricasAnalisis={metricasAnalisis}
            panel={panel}
            formatearSoles={formatearSoles}
          />
        ) : vista === "reportes" ? (
          <DireccionReportes
            reporteSeleccionado={reporteSeleccionado}
            setReporteSeleccionado={setReporteSeleccionado}
            anio={anio}
            setAnio={setAnio}
            periodo={periodo}
            setPeriodo={setPeriodo}
            customFiltroCategoria={customFiltroCategoria}
            setCustomFiltroCategoria={setCustomFiltroCategoria}
            customFiltroPrograma={customFiltroPrograma}
            setCustomFiltroPrograma={setCustomFiltroPrograma}
            customFiltroGrados={customFiltroGrados}
            handleGradosChange={handleGradosChange}
            customFiltroOrigen={customFiltroOrigen}
            setCustomFiltroOrigen={setCustomFiltroOrigen}
            customFiltroPago={customFiltroPago}
            setCustomFiltroPago={setCustomFiltroPago}
            rangoRapido={rangoRapido}
            cambiarRangoRapido={cambiarRangoRapido}
            fechaInicio={fechaInicio}
            handleFechaInicioChange={handleFechaInicioChange}
            fechaFin={fechaFin}
            handleFechaFinChange={handleFechaFinChange}
            consolidacionAsistencia={consolidacionAsistencia}
            setConsolidacionAsistencia={setConsolidacionAsistencia}
            incluirInactivos={incluirInactivos}
            setIncluirInactivos={setIncluirInactivos}
            customTipo={customTipo}
            customColumnas={customColumnas}
            setCustomColumnas={setCustomColumnas}
            registrosFiltrados={registrosFiltrados}
            ejecutarDescargaCustom={ejecutarDescargaCustom}
            exportandoCustom={exportandoCustom}
            exportarHabilitado={exportarHabilitado}
            aniosOptions={aniosOptions}
            categoriasOptions={categoriasOptions}
            programasOptions={programasOptions}
            gradosOptions={gradosOptions}
          />
        ) : vista === "correlativos" ? (
          <DireccionCorrelativos
            correlativosForm={correlativosForm}
            setCorrelativosForm={setCorrelativosForm}
            handleGuardarCorrelativos={handleGuardarCorrelativos}
            guardandoCorrelativos={guardandoCorrelativos}
          />
        ) : (
          <DireccionDescuentos
            busquedaDescuento={busquedaDescuento}
            setBusquedaDescuento={setBusquedaDescuento}
            resultadosDescuento={resultadosDescuento}
            buscandoDescuento={buscandoDescuento}
            buscarEstudiantesDescuento={buscarEstudiantesDescuento}
            modalDescuentoAbierto={modalDescuentoAbierto}
            cerrarModalBeneficio={cerrarModalBeneficio}
            inscripcionSeleccionada={inscripcionSeleccionada}
            datosBeneficio={datosBeneficio}
            setDatosBeneficio={setDatosBeneficio}
            abrirModalBeneficio={abrirModalBeneficio}
            guardarBeneficio={guardarBeneficio}
            removerBeneficio={removerBeneficio}
          />
        )}
      </section>
    </main>
  );
}
