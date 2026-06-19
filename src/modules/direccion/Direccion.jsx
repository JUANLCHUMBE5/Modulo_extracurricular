import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Group, Loader, Select, Table, Checkbox, Grid, Divider, Modal, Textarea, TextInput } from "@mantine/core";
import { BarChart, DonutChart } from "@mantine/charts";
import { toast } from "sonner";
import {
  IconAlertCircle as AlertCircle,
  IconChartBar as ChartBar,
  IconDownload as Download,
  IconLogout as LogOut,
  IconRefresh as Refresh,
  IconSchool as School,
  IconUsers as Users,
  IconWallet as Wallet,
  IconDeviceLaptop as Laptop,
  IconBuildingArch as Building,
  IconCrown as Crown,
  IconFilter as Filter,
  IconAdjustments as Adjustments,
  IconClick as Click,
  IconUserCheck as UserCheck,
  IconMenu2 as Menu,
  IconRosetteDiscount as RosetteDiscount,
  IconSearch as Search,
  IconAward as Award,
  IconPercentage as Percentage,
  IconTrash as Trash,
  IconEdit as Edit,
  IconUser as UserIcon,
} from "@tabler/icons-react";
import { StatCard, EmptyChart } from "./components/DireccionCards";
import { columnasDisponiblesMap, opcionesReportesPorModulo } from "./constants/direccionReports";
import { descargarReporteDireccion, descargarReportePersonalizado, obtenerPanelDireccion, buscarInscripcionesParaDescuento, aplicarDescuentoInscripcion, removerDescuentoInscripcion } from "./direccionService";
import { calcularMetricasAnalisis, filtrarRegistrosReporte } from "./utils/direccionAnalytics";
import { formatearSoles, puedeExportar } from "./utils/direccionFormatters";
import "./Direccion.css";

export default function Direccion({ onLogout, user }) {
  const { subview } = useParams();
  const navigate = useNavigate();
  const vista = subview || "resumen";

  const setVista = (newView) => {
    navigate(`/direccion/${newView}`);
  };

  // Estado de la barra lateral (colapsada/expandida)
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem("dir_sidebar_expanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const newVal = !prev;
      localStorage.setItem("dir_sidebar_expanded", JSON.stringify(newVal));
      return newVal;
    });
  };
  const [periodo, setPeriodo] = useState("todos");
  const [panel, setPanel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Estado de las Pestañas del Dashboard
  const [dashboardTab, setDashboardTab] = useState("caja");

  // Estados del Centro de Reportes Modular y Personalizado
  const [moduloActivo, setModuloActivo] = useState("caja"); // "caja" | "coordinacion" | "padres" | "direccion"
  const [reporteSeleccionado, setReporteSeleccionado] = useState("pagos_historial");
  const [customTipo, setCustomTipo] = useState("pagos");
  const [customFiltroOrigen, setCustomFiltroOrigen] = useState("todos");
  const [customFiltroPago, setCustomFiltroPago] = useState("todos");
  const [customFiltroCategoria, setCustomFiltroCategoria] = useState("todos");
  const [customFiltroPrograma, setCustomFiltroPrograma] = useState("todos");
  const [customColumnas, setCustomColumnas] = useState([]);
  const [exportandoCustom, setExportandoCustom] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [consolidacionAsistencia, setConsolidacionAsistencia] = useState("semana");

  // Estados para Descuentos y Becas
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

  // Cambiar el modulo activo y pre-seleccionar el primer reporte de esa categoria
  const cambiarModulo = (mod) => {
    setModuloActivo(mod);
    setCustomFiltroOrigen("todos");
    setCustomFiltroPago("todos");
    setCustomFiltroCategoria("todos");
    setCustomFiltroPrograma("todos");
    if (mod === "caja") {
      setReporteSeleccionado("pagos_historial");
    } else if (mod === "coordinacion") {
      setReporteSeleccionado("programas_catalogo");
    } else if (mod === "padres") {
      setReporteSeleccionado("padres_matriculas");
    } else if (mod === "direccion") {
      setReporteSeleccionado("direccion_alumnos_pagos");
    }
  };

  // Mapear el reporte descriptivo a tipo de datos y pre-selección inteligente de columnas
  useEffect(() => {
    let tipo = "inscripciones";
    let defaultCols = [];

    if (reporteSeleccionado === "pagos_historial") {
      tipo = "pagos";
      defaultCols = ["id", "dni", "estudiante", "programa", "monto", "estado", "medio", "fecha"];
    } else if (reporteSeleccionado === "pagos_resumen") {
      tipo = "pagos";
      defaultCols = ["estudiante", "programa", "monto", "estado"];
    } else if (reporteSeleccionado === "programas_catalogo") {
      tipo = "programas";
      defaultCols = ["nombre", "periodo", "estado", "categoria", "responsable", "costo", "proyectado", "recaudado"];
    } else if (reporteSeleccionado === "programas_capacidad") {
      tipo = "programas";
      defaultCols = ["id", "nombre", "inscritos", "cupos", "avance"];
    } else if (reporteSeleccionado === "padres_matriculas") {
      tipo = "inscripciones";
      defaultCols = ["id", "dni", "estudiante", "grado", "programa", "estadoInscripcion", "estadoPago", "origen"];
    } else if (reporteSeleccionado === "padres_apoderados") {
      tipo = "inscripciones";
      defaultCols = ["estudiante", "apoderado", "telefono", "programa"];
    } else if (reporteSeleccionado === "direccion_alumnos_pagos") {
      tipo = "direccion_alumnos_pagos";
      defaultCols = ["dni", "estudiante", "grado", "programa", "costo", "montoPagado", "pendiente", "estadoPago", "medioPago", "fechaPago"];
    } else if (reporteSeleccionado === "direccion_alumnos_asistencias") {
      tipo = "direccion_alumnos_asistencias";
      defaultCols = ["dni", "estudiante", "grado", "programa"];
    }

    setCustomTipo(tipo);
    setCustomColumnas(defaultCols);
    setCustomFiltroOrigen("todos");
    setCustomFiltroPago("todos");
    setCustomFiltroCategoria("todos");
    setCustomFiltroPrograma("todos");
  }, [reporteSeleccionado]);

  const cargarPanel = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCargando(true);
    setError("");
    try {
      const datos = await obtenerPanelDireccion({ periodo });
      setPanel(datos);
    } catch (err) {
      setError(err.message || "No se pudo cargar el modulo de Direccion.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [periodo]);

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

    window.addEventListener("api-db-updated", recargarSilencioso);
    window.addEventListener("mock-db-updated", handleMockDbUpdated);
    window.addEventListener("storage", manejarStorage);
    window.addEventListener("focus", recargarSilencioso);
    const intervalo = window.setInterval(recargarSilencioso, 30000);

    return () => {
      window.clearTimeout(recargaTimerRef.current);
      window.clearInterval(intervalo);
      window.removeEventListener("api-db-updated", recargarSilencioso);
      window.removeEventListener("mock-db-updated", handleMockDbUpdated);
      window.removeEventListener("storage", manejarStorage);
      window.removeEventListener("focus", recargarSilencioso);
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

  const statsDescuentos = useMemo(() => {
    const inscripciones = panel?.reportes?.inscripciones || [];
    let totalBecas = 0;
    let totalDescuentosParciales = 0;
    let totalMontoDescontado = 0;

    inscripciones.forEach(ins => {
      if (ins.descuentoAprobado) {
        if (ins.descuentoTipo === "beca") {
          totalBecas++;
        } else {
          totalDescuentosParciales++;
        }
        totalMontoDescontado += Math.max(0, (ins.costoOriginal || 0) - (ins.costo || 0));
      }
    });

    return { totalBecas, totalDescuentosParciales, totalMontoDescontado };
  }, [panel]);

  const obtenerIniciales = (nombre) => {
    const clean = String(nombre || "").trim().toUpperCase();
    if (!clean) return "?";
    const partes = clean.split(/\s+/);
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`;
    }
    return clean.slice(0, 2);
  };

  const categoriasOptions = useMemo(() => {
    const list = panel?.categorias || ["Academico", "Deportivo", "Maraton", "Reforzamiento"];
    return [
      { value: "todos", label: "Todas las categorías" },
      ...list.map(c => ({ value: c, label: c }))
    ];
  }, [panel?.categorias]);

  const programasOptions = useMemo(() => {
    return [
      { value: "todos", label: "Todos los talleres" },
      ...filasProgramas.map(p => ({ value: p.id || p.nombre, label: p.nombre }))
    ];
  }, [filasProgramas]);

  const registrosFiltrados = useMemo(() => filtrarRegistrosReporte({
    customFiltroOrigen,
    customFiltroPago,
    customFiltroCategoria,
    customFiltroPrograma,
    customTipo,
    panel,
    fechaInicio,
    fechaFin,
  }), [panel, customTipo, customFiltroOrigen, customFiltroPago, customFiltroCategoria, customFiltroPrograma, fechaInicio, fechaFin]);

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
          fechaInicio,
          fechaFin,
          consolidacionAsistencia,
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
    <main className={`dir-page ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <aside className="dir-sidebar">
        <div className="dir-sidebar-brand-row">
          <button className="dir-menu-toggle-btn" type="button" onClick={toggleSidebar} aria-label="Alternar barra lateral">
            <Menu size={20} />
          </button>
          {sidebarExpanded && (
            <div className="dir-brand" aria-label="Colegio San Rafael">
              <img className="dir-brand-logo" src="/assets/padres/logo.png.jpg" alt="Colegio San Rafael" />
            </div>
          )}
        </div>
        {sidebarExpanded && <p className="dir-module-label">Módulo Dirección</p>}
        <nav className="dir-nav" aria-label="Navegacion de direccion">
          <button className={vista === "resumen" ? "is-active" : ""} type="button" onClick={() => setVista("resumen")} title="Resumen general">
            <ChartBar size={18} />
            <span className="dir-nav-text">Resumen general</span>
          </button>
          <button className={vista === "reportes" ? "is-active" : ""} type="button" onClick={() => setVista("reportes")} title="Reportes">
            <Download size={18} />
            <span className="dir-nav-text">Reportes</span>
          </button>
          <button className={vista === "descuentos" ? "is-active" : ""} type="button" onClick={() => setVista("descuentos")} title="Descuentos y Becas">
            <RosetteDiscount size={18} />
            <span className="dir-nav-text">Descuentos y Becas</span>
          </button>
        </nav>
        <button className="dir-logout" type="button" onClick={onLogout} title="Cerrar sesion">
          <LogOut size={18} />
          <span className="dir-nav-text">Cerrar sesion</span>
        </button>
      </aside>

      <section className="dir-main">
        <header className="dir-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {!sidebarExpanded && (
              <button
                className="dir-menu-toggle-btn-header"
                type="button"
                onClick={toggleSidebar}
                aria-label="Mostrar barra lateral"
                title="Mostrar barra lateral"
              >
                <Menu size={22} />
              </button>
            )}

          </div>
          <Group gap="xs" wrap="wrap">
            <Select
              className="dir-period"
              data={[
                { value: "todos", label: "Todos los periodos" },
                { value: "escolar", label: "Año escolar" },
                { value: "verano", label: "Verano" },
              ]}
              value={periodo}
              onChange={(value) => setPeriodo(value || "todos")}
              allowDeselect={false}
            />
          </Group>
        </header>

        {error ? (
          <Alert color="orange" icon={<AlertCircle size={18} />} radius="md">
            {error}
          </Alert>
        ) : null}

        {cargando ? (
          <section className="dir-loading">
            <Loader color="teal" />
            <p>Cargando informacion de Direccion...</p>
          </section>
        ) : vista === "resumen" ? (
          <>
            {/* ── SELECCIÓN DE MÓDULOS DEL DASHBOARD (TABS DE DISEÑO PREMIUM) ── */}
            <div className="dir-module-tabs-row" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={dashboardTab === "caja"}
                className={`dir-module-tab ${dashboardTab === "caja" ? "is-active" : ""}`}
                onClick={() => setDashboardTab("caja")}
              >
                <Wallet size={18} />
                <div>
                  <strong>Módulo Cajera</strong>
                </div>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={dashboardTab === "coordinacion"}
                className={`dir-module-tab ${dashboardTab === "coordinacion" ? "is-active" : ""}`}
                onClick={() => setDashboardTab("coordinacion")}
              >
                <School size={18} />
                <div>
                  <strong>Módulo Coordinación Académica</strong>
                </div>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={dashboardTab === "padres"}
                className={`dir-module-tab ${dashboardTab === "padres" ? "is-active" : ""}`}
                onClick={() => setDashboardTab("padres")}
              >
                <Users size={18} />
                <div>
                  <strong>Módulo Padres</strong>
                </div>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={dashboardTab === "asistencia"}
                className={`dir-module-tab ${dashboardTab === "asistencia" ? "is-active" : ""}`}
                onClick={() => setDashboardTab("asistencia")}
              >
                <UserCheck size={18} />
                <div>
                  <strong>Asistencia y Control</strong>
                </div>
              </button>
            </div>

            {/* ── SECCIÓN SEGMENTADA POR PESTAÑA ACTIVA ── */}
            {dashboardTab === "caja" && (
              <>
                <section className="dir-stats" aria-label="Indicadores principales financieros">
                  <StatCard
                    icon={Wallet}
                    label="Total Recaudado"
                    value={formatearSoles(resumen.totalRecaudado)}
                    detail="Ingresos validados e inscripciones pagadas"
                    tone="teal"
                  />
                  <StatCard
                    icon={Wallet}
                    label="Monto Pendiente"
                    value={formatearSoles(resumen.totalPendiente)}
                    detail="Cuentas pendientes por regularizar"
                    tone="orange"
                  />
                  <StatCard
                    icon={School}
                    label="Proyección Total"
                    value={formatearSoles(resumen.totalProyectado)}
                    detail="Ingresos esperados en el periodo"
                    tone="blue"
                  />
                </section>

                <section className="dir-charts">
                  <article className="dir-panel">
                    <header>
                      <h2>Montos por programa</h2>
                    </header>
                    {chartIngresos.length ? (
                      <BarChart
                        h={260}
                        data={chartIngresos}
                        dataKey="programa"
                        series={[
                          { name: "proyectado", color: "orange.5" },
                          { name: "recaudado", color: "teal.5" },
                        ]}
                        tickLine="none"
                        gridAxis="xy"
                        strokeDasharray="4 4"
                        radius={6}
                        barProps={{ radius: [6, 6, 0, 0] }}
                      />
                    ) : (
                      <EmptyChart text="Aun no hay montos para graficar." />
                    )}
                  </article>

                  <article className="dir-panel">
                    <header>
                      <h2>Estado de pagos</h2>
                    </header>
                    {chartEstadoPago.length ? (
                      <DonutChart
                        h={260}
                        data={chartEstadoPago}
                        thickness={14}
                        paddingAngle={5}
                        size={170}
                        withLabels={false}
                        withLabelsLine={false}
                        withLegend
                        legendPosition="right"
                      />
                    ) : (
                      <EmptyChart text="Aun no hay pagos registrados." />
                    )}
                  </article>
                </section>
              </>
            )}

            {dashboardTab === "coordinacion" && (
              <>
                <section className="dir-stats" aria-label="Indicadores principales académicos">
                  <StatCard
                    icon={School}
                    label="Programas activos"
                    value={`${resumen.programasHabilitados || 0}/${resumen.programas || 0}`}
                    detail="habilitados frente al total registrado"
                    tone="green"
                  />
                  <StatCard
                    icon={ChartBar}
                    label="Ocupacion Global"
                    value={`${ocupacion}%`}
                    detail={`${resumen.ocupados || 0} de ${resumen.cupos || 0} cupos utilizados`}
                    tone="purple"
                  />
                </section>

                <section className="dir-charts-single">
                  <article className="dir-panel">
                    <header>
                      <h2>Inscripciones por programa</h2>
                    </header>
                    {chartInscripciones.length ? (
                      <BarChart
                        h={260}
                        data={chartInscripciones}
                        dataKey="programa"
                        series={[{ name: "inscripciones", color: "teal.5" }]}
                        tickLine="none"
                        gridAxis="xy"
                        strokeDasharray="4 4"
                        radius={6}
                        barProps={{ radius: [6, 6, 0, 0] }}
                      />
                    ) : (
                      <EmptyChart text="Aun no hay inscripciones para graficar." />
                    )}
                  </article>
                </section>

                <section className="dir-panel dir-table-panel">
                  <header>
                    <div>
                      <h2>Programas registrados</h2>
                      <p>{filasProgramas.length} registros visibles</p>
                    </div>
                  </header>
                  <div className="dir-table-wrap">
                    <Table striped highlightOnHover verticalSpacing="sm">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Programa</Table.Th>
                          <Table.Th>Estado</Table.Th>
                          <Table.Th>Responsable</Table.Th>
                          <Table.Th>Inscritos</Table.Th>
                          <Table.Th>Cupos</Table.Th>
                          <Table.Th>Proyectado</Table.Th>
                          <Table.Th>Recaudado</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filasProgramas.map((item) => (
                          <Table.Tr key={item.id || item.nombre}>
                            <Table.Td>
                              <strong>{item.nombre}</strong>
                              <span className="dir-muted">{item.categoria} · {item.periodo}</span>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={item.estado === "Habilitado" ? "teal" : "gray"} variant="light">
                                {item.estado}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{item.responsable}</Table.Td>
                            <Table.Td>{item.inscritos}</Table.Td>
                            <Table.Td>{item.ocupados}/{item.cupos || "-"}</Table.Td>
                            <Table.Td>{formatearSoles(item.proyectado)}</Table.Td>
                            <Table.Td>{formatearSoles(item.recaudado)}</Table.Td>
                          </Table.Tr>
                        ))}
                        {!filasProgramas.length ? (
                          <Table.Tr>
                            <Table.Td colSpan={7}>
                              <div className="dir-empty-table">No hay programas para el periodo seleccionado.</div>
                            </Table.Td>
                          </Table.Tr>
                        ) : null}
                      </Table.Tbody>
                    </Table>
                  </div>
                </section>
              </>
            )}

            {dashboardTab === "padres" && (
              <>
                <section className="dir-stats" aria-label="Indicadores principales de portal de padres">
                  <StatCard
                    icon={Users}
                    label="Inscripciones totales"
                    value={resumen.inscripciones || 0}
                    detail={`${resumen.familias || 0} familias registradas`}
                    tone="blue"
                  />
                  <StatCard
                    icon={Laptop}
                    label="Vía Web / Padres"
                    value={`${metricasAnalisis.webCount} (${metricasAnalisis.webPct}%)`}
                    detail="Matrículas auto-gestionadas online"
                    tone="teal"
                  />
                  <StatCard
                    icon={Building}
                    label="Vía Asistente"
                    value={`${metricasAnalisis.secCount} (${metricasAnalisis.secPct}%)`}
                    detail="Registros ingresados presencialmente"
                    tone="orange"
                  />
                </section>

                <section className="dir-charts">
                  <article className="dir-panel">
                    <header>
                      <h2>Origen de registros</h2>
                    </header>
                    {chartOrigen.length ? (
                      <DonutChart
                        h={260}
                        data={chartOrigen}
                        thickness={14}
                        paddingAngle={5}
                        size={170}
                        withLabels={false}
                        withLabelsLine={false}
                        withLegend
                        legendPosition="right"
                      />
                    ) : (
                      <EmptyChart text="Aun no hay origenes registrados." />
                    )}
                  </article>

                  <article className="dir-panel">
                    <header>
                      <h2>Canal de Matrícula (Progreso)</h2>
                    </header>
                    <div className="dir-analysis-card-body" style={{ padding: "20px 10px" }}>
                      <div className="dir-analysis-stat-row" style={{ marginBottom: "16px" }}>
                        <div className="dir-analysis-stat-item">
                          <span className="dir-stat-label"><Laptop size={14} /> Vía Web / Padres</span>
                          <strong className="dir-stat-value">{metricasAnalisis.webCount} <span className="dir-stat-sub">({metricasAnalisis.webPct}%)</span></strong>
                        </div>
                        <div className="dir-analysis-stat-item">
                          <span className="dir-stat-label"><Building size={14} /> Asistente</span>
                          <strong className="dir-stat-value">{metricasAnalisis.secCount} <span className="dir-stat-sub">({metricasAnalisis.secPct}%)</span></strong>
                        </div>
                      </div>
                      <div className="dir-progress-bar-container" style={{ height: "12px" }}>
                        <div
                          className="dir-progress-bar-web"
                          style={{ width: `${metricasAnalisis.webPct}%` }}
                          title={`Web: ${metricasAnalisis.webPct}%`}
                        />
                        <div
                          className="dir-progress-bar-sec"
                          style={{ width: `${metricasAnalisis.secPct}%` }}
                          title={`Asistente: ${metricasAnalisis.secPct}%`}
                        />
                      </div>
                    </div>
                  </article>
                </section>
              </>
            )}

            {dashboardTab === "asistencia" && (
              <>
                <section className="dir-stats" aria-label="Indicadores principales de asistencia">
                  <StatCard
                    icon={UserCheck}
                    label="Asistidos Hoy"
                    value={resumen.asistidosHoy || 0}
                    detail="Alumnos únicos que registraron ingreso hoy"
                    tone="green"
                  />
                  <StatCard
                    icon={Users}
                    label="Matrícula Total"
                    value={resumen.inscripciones || 0}
                    detail="Alumnos activos registrados en el periodo"
                    tone="blue"
                  />
                  <StatCard
                    icon={ChartBar}
                    label="Tasa de Asistencia"
                    value={resumen.inscripciones > 0 ? `${Math.round((resumen.asistidosHoy / resumen.inscripciones) * 100)}%` : "0%"}
                    detail="Porcentaje de asistencia del día de hoy"
                    tone="purple"
                  />
                </section>

                <section className="dir-charts">
                  <article className="dir-panel">
                    <header>
                      <h2>Asistencia por taller hoy</h2>
                      <p>Matriculados vs Asistidos</p>
                    </header>
                    {panel?.graficos?.asistenciaPorPrograma?.length ? (
                      <BarChart
                        h={280}
                        data={panel.graficos.asistenciaPorPrograma}
                        dataKey="programa"
                        series={[
                          { name: "matriculados", color: "gray.4" },
                          { name: "asistidos", color: "teal.5" },
                        ]}
                        tickLine="none"
                        gridAxis="xy"
                        strokeDasharray="4 4"
                        radius={6}
                        barProps={{ radius: [6, 6, 0, 0] }}
                      />
                    ) : (
                      <EmptyChart text="Aun no hay asistencias hoy." />
                    )}
                  </article>

                  <article className="dir-panel dir-table-panel" style={{ display: "flex", flexDirection: "column" }}>
                    <header style={{ padding: "16px 20px" }}>
                      <h2>Bitácora de Ingresos (En Vivo)</h2>
                      <p>Últimos accesos registrados por el auxiliar</p>
                    </header>
                    <div className="dir-table-wrap" style={{ flexGrow: 1, maxHeight: "280px", overflowY: "auto" }}>
                      <Table striped highlightOnHover verticalSpacing="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Hora</Table.Th>
                            <Table.Th style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Estudiante</Table.Th>
                            <Table.Th style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Taller</Table.Th>
                            <Table.Th style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>Acceso</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {panel?.ultimosIngresos?.map((item, index) => (
                            <Table.Tr key={item.id || index}>
                              <Table.Td style={{ fontWeight: 700, color: "var(--ui-primary-dark)" }}>{item.hora}</Table.Td>
                              <Table.Td>
                                <strong>{item.estudiante}</strong>
                                <span className="dir-muted" style={{ fontSize: "11px" }}>DNI: {item.dni || "—"}</span>
                              </Table.Td>
                              <Table.Td>{item.programa}</Table.Td>
                              <Table.Td>
                                <Badge
                                  color={item.estadoAcceso === "pagado" || item.estadoAcceso === "permitido" ? "teal" : "red"}
                                  variant="light"
                                >
                                  {item.estadoAcceso === "pagado" || item.estadoAcceso === "permitido" ? "Permitido" : "Rechazado"}
                                </Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                          {!panel?.ultimosIngresos?.length ? (
                            <Table.Tr>
                              <Table.Td colSpan={4}>
                                <div className="dir-empty-table" style={{ minHeight: "120px" }}>
                                  No hay registros de ingreso en la base de datos.
                                </div>
                              </Table.Td>
                            </Table.Tr>
                          ) : null}
                        </Table.Tbody>
                      </Table>
                    </div>
                  </article>
                </section>
              </>
            )}
          </>
        ) : vista === "reportes" ? (
          <section className="dir-reports-view">
            {/* ── GENERADOR DE REPORTES A LA MEDIDA (PERSONALIZADO POR MÓDULO) ── */}
            <article className="dir-custom-report-builder">
              <header className="dir-builder-header">
                <div>
                  <span className="dir-tag">Descargas</span>
                  <h2>Generador de Reportes</h2>
                </div>
                <div className="dir-builder-header-actions">
                  <Button
                    color="teal"
                    leftSection={<Download size={18} />}
                    loading={exportandoCustom}
                    disabled={!exportarHabilitado || registrosFiltrados.length === 0 || customColumnas.length === 0}
                    onClick={ejecutarDescargaCustom}
                    size="md"
                    className="dir-download-custom-btn"
                  >
                    Descargar Excel
                  </Button>
                </div>
              </header>

              {/* ── SELECCIÓN DE MÓDULOS (TABS DE DISEÑO PREMIUM) ── */}
              <div className="dir-module-tabs-row" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={moduloActivo === "caja"}
                  className={`dir-module-tab ${moduloActivo === "caja" ? "is-active" : ""}`}
                  onClick={() => cambiarModulo("caja")}
                >
                  <Wallet size={18} />
                  <div>
                    <strong>Módulo Cajera</strong>
                  </div>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={moduloActivo === "coordinacion"}
                  className={`dir-module-tab ${moduloActivo === "coordinacion" ? "is-active" : ""}`}
                  onClick={() => cambiarModulo("coordinacion")}
                >
                  <School size={18} />
                  <div>
                    <strong>Módulo Coordinación Académica</strong>
                  </div>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={moduloActivo === "padres"}
                  className={`dir-module-tab ${moduloActivo === "padres" ? "is-active" : ""}`}
                  onClick={() => cambiarModulo("padres")}
                >
                  <Users size={18} />
                  <div>
                    <strong>Módulo Padres</strong>
                  </div>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={moduloActivo === "direccion"}
                  className={`dir-module-tab ${moduloActivo === "direccion" ? "is-active" : ""}`}
                  onClick={() => cambiarModulo("direccion")}
                >
                  <Crown size={18} />
                  <div>
                    <strong>Consolidados Dirección</strong>
                  </div>
                </button>
              </div>

              <div className="dir-builder-content">
                <div className="dir-builder-sidebar">
                  <div className="dir-builder-form-group">
                    <label className="dir-builder-label"><Click size={14} /> 1. Reporte</label>
                    <Select
                      data={opcionesReportesPorModulo[moduloActivo] || []}
                      value={reporteSeleccionado}
                      onChange={(val) => setReporteSeleccionado(val || opcionesReportesPorModulo[moduloActivo]?.[0]?.value)}
                      allowDeselect={false}
                    />
                  </div>

                  <div className="dir-builder-form-group">
                    <label className="dir-builder-label"><Filter size={14} /> 2. Filtros</label>
                    <div className="dir-builder-filters" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <Select
                        label="Categoría de Taller"
                        data={categoriasOptions}
                        value={customFiltroCategoria}
                        onChange={(val) => setCustomFiltroCategoria(val || "todos")}
                        allowDeselect={false}
                        size="xs"
                      />
                      {(customTipo === "inscripciones" ||
                        customTipo === "pagos" ||
                        customTipo === "direccion_alumnos_pagos" ||
                        customTipo === "direccion_alumnos_asistencias") && (
                          <Select
                            label="Programa / Taller"
                            data={programasOptions}
                            value={customFiltroPrograma}
                            onChange={(val) => setCustomFiltroPrograma(val || "todos")}
                            allowDeselect={false}
                            size="xs"
                          />
                        )}
                      {customTipo === "inscripciones" && (
                        <Select
                          label="Canal / Origen"
                          data={[
                            { value: "todos", label: "Todos los canales" },
                            { value: "web", label: "Solo vía Web / Padres" },
                            { value: "secretaria", label: "Solo vía Asistente" },
                          ]}
                          value={customFiltroOrigen}
                          onChange={(val) => setCustomFiltroOrigen(val || "todos")}
                          allowDeselect={false}
                          size="xs"
                        />
                      )}
                      {(customTipo === "inscripciones" ||
                        customTipo === "pagos" ||
                        customTipo === "direccion_alumnos_pagos") && (
                          <Select
                            label="Estado de Pago"
                            data={[
                              { value: "todos", label: "Todos los estados" },
                              { value: "Pagado", label: "Solo Pagados" },
                              { value: "Pendiente", label: "Solo Pendientes" },
                            ]}
                            value={customFiltroPago}
                            onChange={(val) => setCustomFiltroPago(val || "todos")}
                            allowDeselect={false}
                            size="xs"
                          />
                        )}

                      {/* Rango de Fechas */}
                      <div style={{ display: "flex", gap: "6px", flexDirection: "column", marginTop: "4px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Fecha Inicio</span>
                          <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 10px",
                              border: "1px solid #ced4da",
                              borderRadius: "6px",
                              fontSize: "12px",
                              backgroundColor: "#ffffff",
                              color: "#495057",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Fecha Fin</span>
                          <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 10px",
                              border: "1px solid #ced4da",
                              borderRadius: "6px",
                              fontSize: "12px",
                              backgroundColor: "#ffffff",
                              color: "#495057",
                            }}
                          />
                        </div>
                      </div>

                      {/* Agrupación de Asistencias */}
                      {customTipo === "direccion_alumnos_asistencias" && (
                        <Select
                          label="Consolidación Asistencia"
                          data={[
                            { value: "dia", label: "Por Día (Detallado)" },
                            { value: "semana", label: "Por Semana" },
                            { value: "mes", label: "Por Mes" },
                          ]}
                          value={consolidacionAsistencia}
                          onChange={(val) => setConsolidacionAsistencia(val || "semana")}
                          allowDeselect={false}
                          size="xs"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="dir-builder-columns-selector">
                  <div className="dir-columns-header">
                    <label className="dir-builder-label"><Adjustments size={14} /> 3. Columnas a exportar</label>
                    <Group gap="xs">
                      <Button
                        variant="subtle"
                        color="teal"
                        size="xs"
                        onClick={() => setCustomColumnas(columnasDisponiblesMap[customTipo].map((c) => c.key))}
                      >
                        Seleccionar todo
                      </Button>
                      <Button
                        variant="subtle"
                        color="orange"
                        size="xs"
                        onClick={() => setCustomColumnas([])}
                      >
                        Limpiar selección
                      </Button>
                    </Group>
                  </div>

                  <div className="dir-columns-checkbox-container">
                    <Grid>
                      {columnasDisponiblesMap[customTipo]?.map((col) => {
                        const isChecked = customColumnas.includes(col.key);
                        return (
                          <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={col.key}>
                            <Checkbox
                              label={col.label}
                              checked={isChecked}
                              color="teal"
                              onChange={(event) => {
                                if (event.currentTarget.checked) {
                                  setCustomColumnas([...customColumnas, col.key]);
                                } else {
                                  setCustomColumnas(customColumnas.filter((k) => k !== col.key));
                                }
                              }}
                            />
                          </Grid.Col>
                        );
                      })}
                    </Grid>
                  </div>
                </div>
              </div>
            </article>
          </section>
        ) : (
          <section className="dir-descuentos-view" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Cabecera de estadísticas rápidas específicas para Descuentos */}
            <section className="dir-stats dir-stats-descuentos" aria-label="Estadísticas de descuentos y becas">
              <StatCard
                icon={Award}
                label="Becas Completas (100%)"
                value={statsDescuentos.totalBecas}
                detail="Exoneraciones completas aprobadas"
                tone="teal"
              />
              <StatCard
                icon={Percentage}
                label="Descuentos Especiales"
                value={statsDescuentos.totalDescuentosParciales}
                detail="Beneficios de monto fijo o porcentaje"
                tone="blue"
              />
              <StatCard
                icon={Wallet}
                label="Monto Subsidiado"
                value={formatearSoles(statsDescuentos.totalMontoDescontado)}
                detail="Inversión total en apoyo familiar"
                tone="green"
              />
            </section>

            <article className="dir-search-container">
              <div style={{ marginBottom: "20px" }}>
                <span className="dir-tag" style={{ background: "#e0f2fe", color: "#0369a1", marginBottom: "4px" }}>Finanzas</span>
                <h2 style={{ margin: 0, color: "#0c1a30", fontSize: "20px", fontWeight: 800 }}>Autorización de Descuentos y Becas</h2>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>Consulte las pre-inscripciones activas por estudiante y asigne becas de estudio o descuentos especiales.</p>
              </div>

              <form onSubmit={buscarEstudiantesDescuento} className="dir-search-form">
                <TextInput
                  placeholder="Ingrese DNI o nombre completo del estudiante..."
                  value={busquedaDescuento}
                  onChange={(e) => setBusquedaDescuento(e.target.value)}
                  style={{ flex: 1 }}
                  size="md"
                  leftSection={<Search size={18} />}
                  styles={{
                    input: {
                      borderRadius: "8px",
                      borderColor: "#cbd5e1",
                      fontSize: "14px",
                      height: "46px"
                    }
                  }}
                />
                <Button
                  color="teal"
                  type="submit"
                  loading={buscandoDescuento}
                  size="md"
                  styles={{
                    root: {
                      height: "46px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      padding: "0 24px",
                      background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
                    }
                  }}
                >
                  Buscar Alumno
                </Button>
              </form>
            </article>

            {resultadosDescuento.length > 0 ? (
              <div className="dir-table-panel" style={{ background: "#ffffff", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 15px rgba(0,0,0,0.01)" }}>
                <div className="dir-table-wrap">
                  <Table striped highlightOnHover verticalSpacing="md">
                    <Table.Thead>
                      <Table.Tr style={{ background: "#f8fafc" }}>
                        <Table.Th style={{ width: "32%" }}>Estudiante</Table.Th>
                        <Table.Th style={{ width: "12%" }}>DNI</Table.Th>
                        <Table.Th style={{ width: "24%" }}>Taller / Programa</Table.Th>
                        <Table.Th style={{ textAlign: "right", width: "12%" }}>Costo Taller</Table.Th>
                        <Table.Th style={{ width: "14%" }}>Beneficio</Table.Th>
                        <Table.Th style={{ textAlign: "right", width: "12%" }}>Costo Final</Table.Th>
                        <Table.Th style={{ width: "10%" }}>Pago</Table.Th>
                        <Table.Th style={{ textAlign: "center", width: "12%" }}>Acción</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {resultadosDescuento.map((ins) => {
                        const tieneDescuento = ins.descuentoAprobado;
                        const esPagoCompletado = ["pagado", "pago validado", "completado"].includes(String(ins.estadoPago || "").toLowerCase().trim());
                        const avatarClass = `alt-${(ins.estudiante || ins.nombresEstudiante || "").length % 5}`;

                        return (
                          <Table.Tr key={ins.id} className="dir-descuentos-row">
                            <Table.Td>
                              <div className="dir-student-avatar-cell">
                                <div className={`dir-student-avatar ${avatarClass}`}>
                                  {obtenerIniciales(ins.estudiante || ins.nombresEstudiante)}
                                </div>
                                <div className="dir-student-name-container">
                                  <strong>{ins.estudiante || ins.nombresEstudiante}</strong>
                                  <span>Pre-inscrito</span>
                                </div>
                              </div>
                            </Table.Td>
                            <Table.Td style={{ fontWeight: 650, color: "#475569" }}>
                              {ins.dni || ins.dniEstudiante}
                            </Table.Td>
                            <Table.Td>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <strong style={{ fontSize: "13px", color: "#0c1a30" }}>{ins.programa}</strong>
                                <span className="dir-muted" style={{ fontSize: "11px", marginTop: "2px" }}>{ins.categoria || "Extracurricular"}</span>
                              </div>
                            </Table.Td>
                            <Table.Td style={{ textAlign: "right" }} className={tieneDescuento ? "dir-cost-original-td" : ""}>
                              {formatearSoles(ins.costoOriginal || ins.costo)}
                            </Table.Td>
                            <Table.Td>
                              {tieneDescuento ? (
                                <Badge
                                  color={ins.descuentoTipo === "beca" ? "teal" : "blue"}
                                  variant="filled"
                                  className="dir-badge-discount"
                                  style={{
                                    background: ins.descuentoTipo === "beca"
                                      ? "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)"
                                      : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                                  }}
                                >
                                  {ins.descuentoTipo === "beca"
                                    ? "Beca 100%"
                                    : ins.descuentoTipo === "porcentaje"
                                      ? `-${ins.descuentoValor}%`
                                      : `-S/. ${ins.descuentoMonto}`}
                                </Badge>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 500 }}>Ninguno</span>
                              )}
                            </Table.Td>
                            <Table.Td style={{ textAlign: "right" }} className={`dir-cost-final-td ${tieneDescuento ? "has-discount" : ""}`}>
                              {formatearSoles(ins.costo)}
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={esPagoCompletado ? "teal" : "orange"}
                                variant="light"
                                styles={{
                                  root: {
                                    fontWeight: 700,
                                    fontSize: "11px",
                                    height: "22px"
                                  }
                                }}
                              >
                                {esPagoCompletado ? "Pagado" : "Pendiente"}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ textAlign: "center" }}>
                              {esPagoCompletado ? (
                                <Button size="xs" variant="subtle" color="gray" disabled styles={{ root: { fontWeight: 600 } }}>
                                  Ya pagado
                                </Button>
                              ) : (
                                <Button
                                  size="xs"
                                  variant={tieneDescuento ? "light" : "outline"}
                                  color="teal"
                                  className="dir-action-btn-descuento"
                                  leftSection={tieneDescuento ? <Edit size={13} /> : <RosetteDiscount size={13} />}
                                  onClick={() => abrirModalBeneficio(ins)}
                                  styles={{
                                    root: {
                                      borderColor: tieneDescuento ? "transparent" : "#0c8569",
                                      color: tieneDescuento ? "#0c8569" : "#0c8569",
                                      backgroundColor: tieneDescuento ? "#e6fcf5" : "transparent"
                                    }
                                  }}
                                >
                                  {tieneDescuento ? "Editar" : "Aplicar"}
                                </Button>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="dir-empty-state-card">
                <div className="dir-empty-state-icon-container" style={{
                  background: busquedaDescuento ? "#fef2f2" : "#e6fcf5",
                  color: busquedaDescuento ? "#ef4444" : "#0c8569",
                  borderColor: busquedaDescuento ? "#fee2e2" : "#c3fae8"
                }}>
                  {busquedaDescuento ? <AlertCircle size={36} /> : <RosetteDiscount size={36} />}
                </div>
                <h3>{busquedaDescuento ? "Sin resultados" : "Buscador de Alumnos"}</h3>
                <p>
                  {busquedaDescuento
                    ? `No se encontraron pre-inscripciones activas que coincidan con "${busquedaDescuento}". Asegúrese de escribir correctamente el DNI o nombres del alumno.`
                    : "Ingrese el DNI o el nombre completo del estudiante en el cuadro de búsqueda para consultar las pre-inscripciones y aplicar becas o descuentos especiales."}
                </p>
                {!busquedaDescuento && (
                  <div className="dir-empty-state-steps">
                    <div className="dir-empty-state-step">
                      <span className="dir-empty-state-step-num">Paso 1</span>
                      <span className="dir-empty-state-step-text">Buscar estudiante</span>
                    </div>
                    <div className="dir-empty-state-step">
                      <span className="dir-empty-state-step-num">Paso 2</span>
                      <span className="dir-empty-state-step-text">Definir beneficio</span>
                    </div>
                    <div className="dir-empty-state-step">
                      <span className="dir-empty-state-step-num">Paso 3</span>
                      <span className="dir-empty-state-step-text">Enviar a Caja</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal para aplicar beneficio */}
            <Modal
              opened={modalDescuentoAbierto}
              onClose={cerrarModalBeneficio}
              title={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <RosetteDiscount size={22} color="#0c8569" />
                  <strong style={{ fontSize: "16px", color: "#0c1a30" }}>
                    {datosBeneficio.tipo === "beca" ? "Aprobación de Beca Completa" : "Autorización de Descuento Especial"}
                  </strong>
                </div>
              }
              size="md"
              centered
              radius="lg"
              styles={{
                header: {
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "12px",
                  marginBottom: "16px"
                },
                close: {
                  color: "#94a3b8",
                  "&:hover": {
                    color: "#64748b",
                    backgroundColor: "#f8fafc"
                  }
                }
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {inscripcionSeleccionada && (
                  <div className="dir-modal-student-card">
                    <div className="dir-modal-student-avatar">
                      {obtenerIniciales(inscripcionSeleccionada.estudiante || inscripcionSeleccionada.nombresEstudiante)}
                    </div>
                    <div className="dir-modal-student-details">
                      <span className="label">Estudiante</span>
                      <span className="name">{inscripcionSeleccionada.estudiante || inscripcionSeleccionada.nombresEstudiante}</span>
                      <span className="sub">DNI: {inscripcionSeleccionada.dni || inscripcionSeleccionada.dniEstudiante}</span>
                      <span className="sub" style={{ fontWeight: 700, color: "#0c8569", marginTop: "2px" }}>
                        Taller: {inscripcionSeleccionada.programa}
                      </span>
                      <span className="sub" style={{ fontWeight: 800, color: "#0c1a30", display: "flex", gap: "6px" }}>
                        Costo Original: <span style={{ color: "#0c8569" }}>{formatearSoles(inscripcionSeleccionada.costoOriginal || inscripcionSeleccionada.costo)}</span>
                      </span>
                    </div>
                  </div>
                )}

                <Select
                  label="Tipo de Beneficio"
                  data={[
                    { value: "beca", label: "Beca Completa (100% descuento)" },
                    { value: "monto", label: "Descuento de monto fijo (S/.)" },
                    { value: "porcentaje", label: "Descuento porcentual (%)" },
                  ]}
                  value={datosBeneficio.tipo}
                  onChange={(val) => setDatosBeneficio({ ...datosBeneficio, tipo: val || "beca", valor: "" })}
                  allowDeselect={false}
                  styles={{
                    label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
                    input: { borderRadius: "8px", borderColor: "#cbd5e1" }
                  }}
                />

                {datosBeneficio.tipo !== "beca" && (
                  <TextInput
                    label={datosBeneficio.tipo === "porcentaje" ? "Porcentaje de descuento (%)" : "Monto a descontar (S/.)"}
                    placeholder={datosBeneficio.tipo === "porcentaje" ? "Ej. 50" : "Ej. 25"}
                    value={datosBeneficio.valor}
                    onChange={(e) => setDatosBeneficio({ ...datosBeneficio, valor: e.target.value })}
                    type="number"
                    min="1"
                    required
                    styles={{
                      label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
                      input: { borderRadius: "8px", borderColor: "#cbd5e1" }
                    }}
                  />
                )}

                <Textarea
                  label="Justificación / Motivo de Aprobación"
                  placeholder="Ej. Convenio institucional, familiar directo de docente, beca socioeconómica..."
                  value={datosBeneficio.justificacion}
                  onChange={(e) => setDatosBeneficio({ ...datosBeneficio, justificacion: e.target.value })}
                  rows={3}
                  required
                  styles={{
                    label: { fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" },
                    input: { borderRadius: "8px", borderColor: "#cbd5e1" }
                  }}
                />

                <Divider style={{ margin: "6px 0" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  {inscripcionSeleccionada?.descuentoAprobado ? (
                    <Button
                      variant="subtle"
                      color="red"
                      leftSection={<Trash size={14} />}
                      onClick={removerBeneficio}
                      loading={buscandoDescuento}
                      styles={{
                        root: {
                          fontWeight: 750,
                          fontSize: "12.5px"
                        }
                      }}
                    >
                      Retirar beneficio
                    </Button>
                  ) : (
                    <div />
                  )}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Button variant="subtle" color="gray" onClick={cerrarModalBeneficio} styles={{ root: { fontWeight: 600 } }}>
                      Cancelar
                    </Button>
                    <Button
                      color="teal"
                      onClick={guardarBeneficio}
                      loading={buscandoDescuento}
                      styles={{
                        root: {
                          borderRadius: "8px",
                          fontWeight: 700,
                          background: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
                          padding: "0 16px"
                        }
                      }}
                    >
                      Aprobar y Mandar a Caja
                    </Button>
                  </div>
                </div>
              </div>
            </Modal>
          </section>
        )}
      </section>
    </main>
  );
}
