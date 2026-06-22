import { Badge, Table, Loader } from "@mantine/core";
import { BarChart, DonutChart } from "@mantine/charts";
import {
  IconWallet as Wallet,
  IconSchool as School,
  IconUsers as Users,
  IconUserCheck as UserCheck,
  IconChartBar as ChartBar,
  IconDeviceLaptop as Laptop,
  IconBuildingArch as Building,
} from "@tabler/icons-react";
import { StatCard, EmptyChart } from "../DireccionCards";
import "./DireccionDashboard.css";

export default function DireccionDashboard({
  dashboardTab,
  setDashboardTab,
  resumen,
  ocupacion,
  filasProgramas,
  chartIngresos,
  chartEstadoPago,
  chartInscripciones,
  chartOrigen,
  metricasAnalisis,
  panel,
  formatearSoles,
}) {
  const abreviar = (valor) => {
    const texto = String(valor || "Sin nombre").trim();
    return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
  };

  return (
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
          <section className="dir-stats" aria-label="Indicadores principales financiero">
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
                    <strong className="dir-stat-value">
                      {metricasAnalisis.webCount} <span className="dir-stat-sub">({metricasAnalisis.webPct}%)</span>
                    </strong>
                  </div>
                  <div className="dir-analysis-stat-item">
                    <span className="dir-stat-label"><Building size={14} /> Asistente</span>
                    <strong className="dir-stat-value">
                      {metricasAnalisis.secCount} <span className="dir-stat-sub">({metricasAnalisis.secPct}%)</span>
                    </strong>
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
                  <Table.KeepValues>
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
                  </Table.KeepValues>
                </Table>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}
