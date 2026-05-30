import { useEffect, useMemo, useState } from "react";
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
} from "@tabler/icons-react";
import { descargarReporteDireccion, descargarReportePersonalizado, obtenerPanelDireccion } from "./direccionService";
import "./Direccion.css";

const permisosExportar = ["reportes.exportar"];

function puedeExportar(user) {
  if (user?.role === "administrador") return true;
  const permisos = Array.isArray(user?.permisos) ? user.permisos : Array.isArray(user?.permissions) ? user.permissions : [];
  return permisosExportar.some((permiso) => permisos.includes(permiso));
}

function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

function StatCard({ icon: Icon, label, value, detail, tone = "green" }) {
  return (
    <article className={`dir-stat is-${tone}`}>
      <div className="dir-stat-icon">
        <Icon size={22} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function EmptyChart({ text }) {
  return <div className="dir-empty-chart">{text}</div>;
}

export default function Direccion({ onLogout, user }) {
  const [vista, setVista] = useState("resumen");
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
  const [customColumnas, setCustomColumnas] = useState([]);
  const [exportandoCustom, setExportandoCustom] = useState(false);

  const exportarHabilitado = puedeExportar(user);

  const columnasDisponiblesMap = {
    inscripciones: [
      { key: "id", label: "Código de Inscripción" },
      { key: "dni", label: "DNI Estudiante" },
      { key: "estudiante", label: "Nombres Estudiante" },
      { key: "grado", label: "Grado Aplicable" },
      { key: "programa", label: "Programa / Taller" },
      { key: "estadoInscripcion", label: "Estado Inscripción" },
      { key: "estadoPago", label: "Estado de Pago" },
      { key: "costo", label: "Costo / Monto" },
      { key: "origen", label: "Canal / Origen" },
      { key: "fechaRegistro", label: "Fecha de Registro" },
      { key: "apoderado", label: "Nombre Apoderado" },
      { key: "telefono", label: "Teléfono Apoderado" },
    ],
    programas: [
      { key: "id", label: "Código de Programa" },
      { key: "nombre", label: "Nombre Programa" },
      { key: "periodo", label: "Periodo / Ciclo" },
      { key: "estado", label: "Estado Programa" },
      { key: "categoria", label: "Categoría" },
      { key: "responsable", label: "Profesor Responsable" },
      { key: "inscritos", label: "Total Inscritos" },
      { key: "cupos", label: "Cupos Totales" },
      { key: "avance", label: "Porcentaje Ocupación (%)" },
      { key: "costo", label: "Costo Individual" },
      { key: "proyectado", label: "Monto Proyectado" },
      { key: "recaudado", label: "Monto Recaudado" },
    ],
    pagos: [
      { key: "id", label: "Código Transacción" },
      { key: "dni", label: "DNI Estudiante" },
      { key: "estudiante", label: "Nombre Estudiante" },
      { key: "programa", label: "Programa / Taller" },
      { key: "monto", label: "Monto Pagado" },
      { key: "estado", label: "Estado Pago" },
      { key: "medio", label: "Medio de Pago" },
      { key: "fecha", label: "Fecha Pago" },
    ],
  };

  // Cambiar el modulo activo y pre-seleccionar el primer reporte de esa categoria
  const cambiarModulo = (mod) => {
    setModuloActivo(mod);
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
  }, [reporteSeleccionado]);

  const cargarPanel = async () => {
    setCargando(true);
    setError("");
    try {
      const datos = await obtenerPanelDireccion({ periodo });
      setPanel(datos);
    } catch (err) {
      setError(err.message || "No se pudo cargar el modulo de Direccion.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPanel();
  }, [periodo]);

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

  // Cálculos analíticos en vivo
  const metricasAnalisis = useMemo(() => {
    const inscripcionesPeriodo = panel?.reportes?.inscripciones || [];
    
    let webCount = 0;
    let secCount = 0;
    inscripcionesPeriodo.forEach((item) => {
      const o = String(item.origen || "").toLowerCase();
      if (o.includes("web") || o.includes("padres")) {
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
      const prog = item.programa || "Sin programa";
      counts[prog] = (counts[prog] || 0) + 1;
      if (counts[prog] > cursoEstrellaCount) {
        cursoEstrella = prog;
        cursoEstrellaCount = counts[prog];
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
  }, [panel]);

  // Registros que coinciden con los filtros del constructor
  const registrosFiltrados = useMemo(() => {
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
          const o = String(item.origen || "").toLowerCase();
          if (customFiltroOrigen === "web") {
            return o.includes("web") || o.includes("padres");
          }
          if (customFiltroOrigen === "secretaria") {
            return o.includes("sec") || o.includes("presencial") || o.includes("carga") || o.includes("excel") || o === "";
          }
          return true;
        });
      }
      if (customFiltroPago !== "todos") {
        filtered = filtered.filter((item) => {
          const ep = String(item.estadoPago || "").toLowerCase();
          if (customFiltroPago === "Pagado") {
            return ep.includes("pag") || ep === "completado";
          }
          if (customFiltroPago === "Pendiente") {
            return !ep.includes("pag") && ep !== "completado" && !ep.includes("anul");
          }
          return true;
        });
      }
    } else if (customTipo === "pagos") {
      if (customFiltroPago !== "todos") {
        filtered = filtered.filter((item) => {
          const ep = String(item.estado || "").toLowerCase();
          if (customFiltroPago === "Pagado") {
            return ep.includes("pag") || ep === "completado";
          }
          if (customFiltroPago === "Pendiente") {
            return !ep.includes("pag") && ep !== "completado";
          }
          return true;
        });
      }
    }
    
    return filtered;
  }, [panel, customTipo, customFiltroOrigen, customFiltroPago]);

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

  // Opciones de reporte según el módulo activo
  const opcionesReportesPorModulo = {
    caja: [
      { value: "pagos_historial", label: "Historial de Transacciones Financieras (Pagos)" },
      { value: "pagos_resumen", label: "Resumen de Cobros por Alumno" },
    ],
    coordinacion: [
      { value: "programas_catalogo", label: "Catálogo General de Talleres (Programas)" },
      { value: "programas_capacidad", label: "Capacidad de Aulas y Ocupación" },
    ],
    padres: [
      { value: "padres_matriculas", label: "Matrículas y Estado de Pago de Alumnos" },
      { value: "padres_apoderados", label: "Directorio Telefónico de Apoderados" },
    ],
  };

  return (
    <main className="dir-page">
      <aside className="dir-sidebar">
        <div className="dir-brand">
          <img src="/assets/padres/logo.png.jpg" alt="Colegio San Rafael" />
          <span>Direccion</span>
        </div>
        <nav className="dir-nav" aria-label="Navegacion de direccion">
          <button className={vista === "resumen" ? "is-active" : ""} type="button" onClick={() => setVista("resumen")}>
            <ChartBar size={18} />
            <span>Resumen general</span>
          </button>
          <button className={vista === "reportes" ? "is-active" : ""} type="button" onClick={() => setVista("reportes")}>
            <Download size={18} />
            <span>Reportes</span>
          </button>
        </nav>
        <button className="dir-logout" type="button" onClick={onLogout}>
          <LogOut size={18} />
          <span>Cerrar sesion</span>
        </button>
      </aside>

      <section className="dir-main">
        <header className="dir-header">
          <div>
            <span>Panel institucional</span>
            <h1>{vista === "reportes" ? "Descarga de reportes" : "Direccion y reportes"}</h1>
            {vista !== "reportes" && (
              <p>Seguimiento de programas, inscripciones, pagos y capacidad operativa.</p>
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
            <Button variant="light" color="teal" leftSection={<Refresh size={17} />} onClick={cargarPanel}>
              Actualizar
            </Button>
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
                  <strong>Módulo Caja</strong>
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
                  <strong>Módulo Coordinación</strong>
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
                          { name: "proyectado", color: "orange.6" },
                          { name: "recaudado", color: "teal.6" },
                        ]}
                        tickLine="none"
                        gridAxis="y"
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
                      <DonutChart h={260} data={chartEstadoPago} withLabelsLine withLabels />
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
                        series={[{ name: "inscripciones", color: "teal.6" }]}
                        tickLine="none"
                        gridAxis="y"
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
                    label="Vía Secretaría"
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
                      <DonutChart h={260} data={chartOrigen} withLabelsLine withLabels />
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
                          <span className="dir-stat-label"><Building size={14} /> Secretaría</span>
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
                          title={`Secretaría: ${metricasAnalisis.secPct}%`}
                        />
                      </div>
                    </div>
                  </article>
                </section>
              </>
            )}
          </>
        ) : (
          <section className="dir-reports-view">
            {/* ── PANEL DE VISUALIZACIÓN ANALÍTICA (PANTALLA) ── */}
            <article className="dir-analysis-dashboard">
              <header className="dir-analysis-header">
                <div className="dir-analysis-title-row">
                  <span className="dir-tag">Analisis en vivo</span>
                  <h2>Estadísticas del periodo</h2>
                </div>
              </header>

              <div className="dir-analysis-grid">
                <div className="dir-analysis-card">
                  <div className="dir-analysis-card-header">
                    <div className="dir-analysis-card-icon is-teal">
                      <Users size={18} />
                    </div>
                    <div>
                      <h3>Canal de Matrícula</h3>
                    </div>
                  </div>
                  <div className="dir-analysis-card-body">
                    <div className="dir-analysis-stat-row">
                      <div className="dir-analysis-stat-item">
                        <span className="dir-stat-label"><Laptop size={14} /> Web</span>
                        <strong className="dir-stat-value">{metricasAnalisis.webCount} <span className="dir-stat-sub">({metricasAnalisis.webPct}%)</span></strong>
                      </div>
                      <div className="dir-analysis-stat-item">
                        <span className="dir-stat-label"><Building size={14} /> Secretaría</span>
                        <strong className="dir-stat-value">{metricasAnalisis.secCount} <span className="dir-stat-sub">({metricasAnalisis.secPct}%)</span></strong>
                      </div>
                    </div>
                    <div className="dir-progress-bar-container">
                      <div 
                        className="dir-progress-bar-web" 
                        style={{ width: `${metricasAnalisis.webPct}%` }}
                        title={`Web: ${metricasAnalisis.webPct}%`}
                      />
                      <div 
                        className="dir-progress-bar-sec" 
                        style={{ width: `${metricasAnalisis.secPct}%` }}
                        title={`Secretaría: ${metricasAnalisis.secPct}%`}
                      />
                    </div>
                  </div>
                </div>

                <div className="dir-analysis-card">
                  <div className="dir-analysis-card-header">
                    <div className="dir-analysis-card-icon is-orange">
                      <Crown size={18} />
                    </div>
                    <div>
                      <h3>Curso con Mayor Demanda</h3>
                    </div>
                  </div>
                  <div className="dir-analysis-card-body">
                    <h4 className="dir-star-course-name">{metricasAnalisis.cursoEstrella}</h4>
                    <div className="dir-star-course-metrics">
                      <div className="dir-analysis-stat-item">
                        <span className="dir-stat-label">Inscritos</span>
                        <strong className="dir-stat-value">{metricasAnalisis.cursoEstrellaCount} <span className="dir-stat-sub">Alum.</span></strong>
                      </div>
                      <div className="dir-analysis-stat-item">
                        <span className="dir-stat-label">Porcentaje</span>
                        <strong className="dir-stat-value">{metricasAnalisis.estrellaPct}%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dir-analysis-card">
                  <div className="dir-analysis-card-header">
                    <div className="dir-analysis-card-icon is-purple">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <h3>Resumen de Recaudación</h3>
                    </div>
                  </div>
                  <div className="dir-analysis-card-body">
                    <div className="dir-analysis-stat-row">
                      <div className="dir-analysis-stat-item">
                        <span className="dir-stat-label">Recaudado</span>
                        <strong className="dir-stat-value is-teal-text">{formatearSoles(resumen.totalRecaudado)}</strong>
                      </div>
                      <div className="dir-analysis-stat-item">
                        <span className="dir-stat-label">Pendiente</span>
                        <strong className="dir-stat-value is-orange-text">{formatearSoles(resumen.totalPendiente)}</strong>
                      </div>
                    </div>
                    <p className="dir-analysis-card-hint">Proyectado: {formatearSoles(resumen.totalProyectado)}</p>
                  </div>
                </div>
              </div>
            </article>



            {/* ── GENERADOR DE REPORTES A LA MEDIDA (PERSONALIZADO POR MÓDULO) ── */}
            <article className="dir-custom-report-builder">
              <header className="dir-builder-header">
                <span className="dir-tag">Descargas</span>
                <h2>Generador de Reportes</h2>
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
                    <strong>Módulo Caja</strong>
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
                    <strong>Módulo Coordinación</strong>
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
                    <div className="dir-builder-filters">
                      {customTipo === "inscripciones" && (
                        <>
                          <Select
                            label="Canal / Origen"
                            data={[
                              { value: "todos", label: "Todos los canales" },
                              { value: "web", label: "Solo vía Web / Padres" },
                              { value: "secretaria", label: "Solo vía Secretaría" },
                            ]}
                            value={customFiltroOrigen}
                            onChange={(val) => setCustomFiltroOrigen(val || "todos")}
                            allowDeselect={false}
                            size="xs"
                          />
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
                        </>
                      )}
                      {customTipo === "pagos" && (
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
                      {customTipo === "programas" && (
                        <p className="dir-builder-empty-filters">Filtro aplicado por el periodo general superior.</p>
                      )}
                    </div>
                  </div>

                  <div className="dir-builder-summary-card">
                    <div className="dir-summary-card-header">
                      <h4>Resumen</h4>
                    </div>
                    <div className="dir-summary-card-body">
                      <div className="dir-summary-metric">
                        <span>Registros:</span>
                        <strong>{registrosFiltrados.length}</strong>
                      </div>
                      <div className="dir-summary-metric">
                        <span>Columnas:</span>
                        <strong>{customColumnas.length}</strong>
                      </div>
                    </div>
                    <Button
                      color="teal"
                      fullWidth
                      leftSection={<Download size={18} />}
                      loading={exportandoCustom}
                      disabled={!exportarHabilitado || registrosFiltrados.length === 0 || customColumnas.length === 0}
                      onClick={ejecutarDescargaCustom}
                      size="md"
                      className="dir-download-custom-btn"
                    >
                      Descargar Excel (.xlsx)
                    </Button>
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
                      {columnasDisponiblesMap[customTipo].map((col) => {
                        const isChecked = customColumnas.includes(col.key);
                        return (
                          <Grid.Col span={{ base: 12, sm: 6 }} key={col.key}>
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

              {/* ── VISTA PREVIA DE DATOS (TABLA DE VISUALIZACIÓN) ── */}
              <div className="dir-builder-preview-section">
                <Divider my="lg" />
                <div className="dir-preview-table-header" style={{ marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#102035", fontWeight: 900 }}>Vista previa</h3>
                  </div>
                </div>
                
                <div className="dir-table-wrap">
                  <Table striped highlightOnHover verticalSpacing="xs" className="dir-preview-table">
                    <Table.Thead>
                      <Table.Tr>
                        {customColumnas.length === 0 ? (
                          <Table.Th style={{ color: "#b42318" }}>Seleccione al menos una columna...</Table.Th>
                        ) : (
                          customColumnas.map((colKey) => {
                            const colLabel = columnasDisponiblesMap[customTipo].find(c => c.key === colKey)?.label || colKey;
                            return <Table.Th key={colKey}>{colLabel}</Table.Th>;
                          })
                        )}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {registrosFiltrados.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={customColumnas.length || 1}>
                            <div className="dir-empty-preview" style={{ padding: "30px", textAlign: "center", color: "#667085", fontSize: "13px", fontWeight: 800 }}>
                              Sin registros que coincidan.
                            </div>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        registrosFiltrados.slice(0, 10).map((row, rowIndex) => (
                          <Table.Tr key={rowIndex}>
                            {customColumnas.map((colKey) => {
                              let value = row[colKey];
                              if (colKey === "costo" || colKey === "monto" || colKey === "proyectado" || colKey === "recaudado") {
                                value = formatearSoles(value);
                              } else if (colKey === "avance") {
                                value = `${value}%`;
                              }
                              return <Table.Td key={colKey}>{value !== undefined && value !== null ? String(value) : "—"}</Table.Td>;
                            })}
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </div>
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
