import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Group, Loader, Select, Table, Checkbox, Grid, Divider } from "@mantine/core";
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
} from "@tabler/icons-react";
import { StatCard, EmptyChart } from "./components/DireccionCards";
import { columnasDisponiblesMap, opcionesReportesPorModulo } from "./constants/direccionReports";
import { descargarReporteDireccion, descargarReportePersonalizado, obtenerPanelDireccion } from "./direccionService";
import { calcularMetricasAnalisis, filtrarRegistrosReporte } from "./utils/direccionAnalytics";
import { formatearSoles, puedeExportar } from "./utils/direccionFormatters";
import "./Direccion.css";

export default function Direccion({ onLogout, user }) {
  const [vista, setVista] = useState("resumen");
  
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
  const [moduloActivo, setModuloActivo] = useState("caja"); // "caja" | "coordinacion" | "padres"
  const [reporteSeleccionado, setReporteSeleccionado] = useState("pagos_historial");
  const [customTipo, setCustomTipo] = useState("pagos");
  const [customFiltroOrigen, setCustomFiltroOrigen] = useState("todos");
  const [customFiltroPago, setCustomFiltroPago] = useState("todos");
  const [customFiltroCategoria, setCustomFiltroCategoria] = useState("todos");
  const [customFiltroPrograma, setCustomFiltroPrograma] = useState("todos");
  const [customColumnas, setCustomColumnas] = useState([]);
  const [exportandoCustom, setExportandoCustom] = useState(false);
  const recargaTimerRef = useRef(null);

  const exportarHabilitado = puedeExportar(user);

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

    window.addEventListener("api-db-updated", recargarSilencioso);
    window.addEventListener("storage", manejarStorage);
    window.addEventListener("focus", recargarSilencioso);
    const intervalo = window.setInterval(recargarSilencioso, 30000);

    return () => {
      window.clearTimeout(recargaTimerRef.current);
      window.clearInterval(intervalo);
      window.removeEventListener("api-db-updated", recargarSilencioso);
      window.removeEventListener("storage", manejarStorage);
      window.removeEventListener("focus", recargarSilencioso);
    };
  }, [cargarPanel]);

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
  }), [panel, customTipo, customFiltroOrigen, customFiltroPago, customFiltroCategoria, customFiltroPrograma]);

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
            <div>
              <span>Panel institucional</span>
              <h1>{vista === "reportes" ? "Descarga de reportes" : "Dirección y reportes"}</h1>
              {vista !== "reportes" && (
                <p>Seguimiento de programas, inscripciones, pagos y capacidad operativa.</p>
              )}
            </div>
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
        ) : (
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
              </div>

              <div className="dir-builder-content">
                <div className="dir-builder-sidebar">
                  <div className="dir-builder-form-group">
                    <label className="dir-builder-label"><Click size={14} /> 1. Reporte</label>
                    <Select
                      data={opcionesReportesPorModulo[moduloActivo]}
                      value={reporteSeleccionado}
                      onChange={(val) => setReporteSeleccionado(val || opcionesReportesPorModulo[moduloActivo][0].value)}
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
                      {(customTipo === "inscripciones" || customTipo === "pagos") && (
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
                      {(customTipo === "inscripciones" || customTipo === "pagos") && (
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
                    </div>
                  </div>

                  {/* El botón de descarga ahora se ubica en la cabecera superior */}
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
                      {columnasDisponiblesMap[customTipo].map((col) => {
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
        )}
      </section>
    </main>
  );
}
