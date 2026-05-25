
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Group, Loader, Select, Table } from "@mantine/core";
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
} from "@tabler/icons-react";
import { descargarReporteDireccion, obtenerPanelDireccion } from "./direccionService";
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
  const [periodo, setPeriodo] = useState("todos");
  const [panel, setPanel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState("");
  const [error, setError] = useState("");

  const exportarHabilitado = puedeExportar(user);

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

  const descargar = async (tipo) => {
    if (!exportarHabilitado) {
      toast.error("Direccion", { description: "Este usuario no tiene permiso para exportar reportes." });
      return;
    }
    setDescargando(tipo);
    try {
      const archivo = await descargarReporteDireccion(tipo, { periodo });
      toast.success("Reporte descargado", { description: archivo });
    } catch (err) {
      toast.error("No se pudo descargar", { description: err.message || "Revise la informacion del reporte." });
    } finally {
      setDescargando("");
    }
  };

  return (
    <main className="dir-page">
      <aside className="dir-sidebar">
        <div className="dir-brand">
          <img src="/assets/padres/logo.png.jpg" alt="Colegio San Rafael" />
          <span>Direccion</span>
        </div>
        <nav className="dir-nav" aria-label="Navegacion de direccion">
          <button className="is-active" type="button">
            <ChartBar size={18} />
            <span>Resumen general</span>
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
            <h1>Direccion y reportes</h1>
            <p>Seguimiento de programas, inscripciones, pagos y capacidad operativa.</p>
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
        ) : (
          <>
            <section className="dir-stats" aria-label="Indicadores principales">
              <StatCard
                icon={School}
                label="Programas activos"
                value={`${resumen.programasHabilitados || 0}/${resumen.programas || 0}`}
                detail="habilitados frente al total registrado"
              />
              <StatCard
                icon={Users}
                label="Inscripciones"
                value={resumen.inscripciones || 0}
                detail={`${resumen.familias || 0} familias registradas`}
                tone="blue"
              />
              <StatCard
                icon={Wallet}
                label="Recaudado"
                value={formatearSoles(resumen.totalRecaudado)}
                detail={`${formatearSoles(resumen.totalPendiente)} pendiente`}
                tone="orange"
              />
              <StatCard
                icon={ChartBar}
                label="Ocupacion"
                value={`${ocupacion}%`}
                detail={`${resumen.ocupados || 0} de ${resumen.cupos || 0} cupos`}
                tone="purple"
              />
            </section>

            <section className="dir-report-actions" aria-label="Descarga de reportes">
              <div>
                <h2>Descargar reportes</h2>
                <p>Archivos Excel listos para revision de Direccion.</p>
              </div>
              <Group gap="xs" wrap="wrap">
                {[
                  ["resumen", "Resumen"],
                  ["programas", "Programas"],
                  ["inscripciones", "Inscripciones"],
                  ["pagos", "Pagos"],
                  ["completo", "Completo"],
                ].map(([tipo, label]) => (
                  <Button
                    key={tipo}
                    color={tipo === "completo" ? "orange" : "teal"}
                    variant={tipo === "completo" ? "filled" : "light"}
                    leftSection={<Download size={17} />}
                    loading={descargando === tipo}
                    disabled={!exportarHabilitado}
                    onClick={() => descargar(tipo)}
                  >
                    {label}
                  </Button>
                ))}
              </Group>
            </section>

            <section className="dir-charts">
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
                  <h2>Origen de registros</h2>
                </header>
                {chartOrigen.length ? (
                  <DonutChart h={260} data={chartOrigen} withLabelsLine withLabels />
                ) : (
                  <EmptyChart text="Aun no hay origenes registrados." />
                )}
              </article>
            </section>

            <section className="dir-panel dir-table-panel">
              <header>
                <div>
                  <h2>Programas</h2>
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
      </section>
    </main>
  );
}
