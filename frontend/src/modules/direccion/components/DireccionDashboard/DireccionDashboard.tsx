import { useState, useMemo, useCallback } from "react";
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
  IconDownload as Download,
} from "@tabler/icons-react";
import { exportExcelControlPagos, exportPdfControlPagos } from "../../utils/direccionControlPagosExports";
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
  const [fechaFiltroDocentes, setFechaFiltroDocentes] = useState("");

  const allAsistencias = useMemo(() => panel?.reportes?.asistencias || [], [panel]);
  const allInscripciones = useMemo(() => panel?.reportes?.inscripciones || [], [panel]);
  const allProgramas = useMemo(() => panel?.reportes?.programas || [], [panel]);

  // Obtener fechas en que se registraron asistencias
  const fechasAsistencia = useMemo(() => {
    const setFechas = new Set<string>();
    allAsistencias.forEach((asistencia: any) => {
      const fecha = asistencia.fecha_asistencia || asistencia.fechaRegistro || asistencia.fecha || asistencia.createdAt || asistencia.fechaAsistencia || "";
      if (fecha) {
        try {
          const clave = new Date(fecha).toLocaleDateString("sv-SE");
          if (clave && clave !== "Invalid Date") {
            setFechas.add(clave);
          }
        } catch (e) {}
      }
    });
    return Array.from(setFechas).sort((a, b) => b.localeCompare(a));
  }, [allAsistencias]);

  const fechaActiva = fechaFiltroDocentes || fechasAsistencia[0] || "";

  // Helper para descomponer grado y nivel del alumno
  const resolverGradoYNivel = (alumno: any) => {
    const textoGrado = String(alumno.grado || "").trim();
    const nivelExistente = alumno.nivel || alumno.nivel_nombre || alumno.nivelEducativo || "";
    if (!textoGrado) {
      return { grado: "", nivel: nivelExistente };
    }
    const lower = textoGrado.toLowerCase();
    let nivel = "";
    let grado = textoGrado;
    if (lower.includes("inicial")) {
      nivel = "Inicial";
      grado = textoGrado.replace(/inicial/i, "").trim();
    } else if (lower.includes("primaria")) {
      nivel = "Primaria";
      grado = textoGrado.replace(/primaria/i, "").trim();
    } else if (lower.includes("secundaria")) {
      nivel = "Secundaria";
      grado = textoGrado.replace(/secundaria/i, "").trim();
    }
    if (!nivel && nivelExistente) {
      nivel = nivelExistente;
    }
    return { grado, nivel };
  };

  // Helper para determinar qué docente enseña a un alumno en un programa
  const obtenerDocenteAlumno = useCallback((alumno: any, prog: any) => {
    if (!prog) return "Sin asignar";
    
    const grupos = prog.horarios_por_grupo || prog.horariosPorGrupo || [];
    if (!Array.isArray(grupos) || grupos.length === 0) {
      return prog.responsable || "Sin asignar";
    }
    
    const { grado, nivel } = resolverGradoYNivel(alumno);
    if (!grado) return prog.responsable || "Sin asignar";
    
    const searchKey = `${nivel}:${grado}`.trim().toLowerCase();
    const grupoEncontrado = grupos.find((g: any) => 
      Array.isArray(g.grados) && g.grados.some((gk: string) => 
        String(gk).trim().toLowerCase() === searchKey
      )
    );
    
    return grupoEncontrado?.responsable || prog.responsable || "Sin asignar";
  }, []);

  // Calcular las estadísticas de asistencia consolidadas por docente y programa
  const estadisticasDocentes = useMemo(() => {
    if (!fechaActiva) return [];
    
    const asistenciasDia = allAsistencias.filter((a: any) => {
      const fecha = a.fecha_asistencia || a.fechaRegistro || a.fecha || a.createdAt || a.fechaAsistencia || "";
      if (!fecha) return false;
      try {
        return new Date(fecha).toLocaleDateString("sv-SE") === fechaActiva;
      } catch (e) {
        return false;
      }
    });

    const mapaDocentes: { [key: string]: {
      docente: string;
      programa: string;
      aula: string;
      matriculados: number;
      asistieron: number;
    }} = {};

    // 1. Registrar todos los docentes y bloques posibles en el mapa
    allProgramas.forEach((prog: any) => {
      const grupos = prog.horarios_por_grupo || prog.horariosPorGrupo || [];
      if (Array.isArray(grupos) && grupos.length > 0) {
        grupos.forEach((g: any) => {
          const docente = g.responsable || "Sin asignar";
          const aula = g.aula || prog.aula || "Sin aula";
          const clave = `${docente}-${prog.id}-${aula}`;
          
          if (!mapaDocentes[clave]) {
            mapaDocentes[clave] = {
              docente,
              programa: prog.nombre_programa || prog.nombre || "Sin programa",
              aula,
              matriculados: 0,
              asistieron: 0,
            };
          }
        });
      } else {
        const docente = prog.responsable || "Sin asignar";
        const aula = prog.aula || "Sin aula";
        const clave = `${docente}-${prog.id}-${aula}`;
        
        if (!mapaDocentes[clave]) {
          mapaDocentes[clave] = {
            docente,
            programa: prog.nombre_programa || prog.nombre || "Sin programa",
            aula,
            matriculados: 0,
            asistieron: 0,
          };
        }
      }
    });

    // 2. Contar matriculados
    allInscripciones.forEach((ins: any) => {
      const prog = allProgramas.find((p: any) => String(p.id) === String(ins.programaId));
      if (!prog) return;

      const docente = obtenerDocenteAlumno(ins, prog);
      const grupos = prog.horarios_por_grupo || prog.horariosPorGrupo || [];
      let aula = prog.aula || "Sin aula";
      if (Array.isArray(grupos) && grupos.length > 0) {
        const { grado, nivel } = resolverGradoYNivel(ins);
        const searchKey = `${nivel}:${grado}`.trim().toLowerCase();
        const g = grupos.find((item: any) => 
          Array.isArray(item.grados) && item.grados.some((gk: string) => String(gk).trim().toLowerCase() === searchKey)
        );
        if (g) aula = g.aula || aula;
      }

      const clave = `${docente}-${prog.id}-${aula}`;
      if (mapaDocentes[clave]) {
        mapaDocentes[clave].matriculados += 1;
      }
    });

    // 3. Contar asistidos
    asistenciasDia.forEach((a: any) => {
      const dni = a.dni_estudiante || a.dniEstudiante || a.dni || "";
      const progId = a.programa_id || a.programaId || "";
      const ins = allInscripciones.find((i: any) => String(i.dniEstudiante || i.dni || i.dni_estudiante) === String(dni) && String(i.programaId) === String(progId));
      if (!ins) return;

      const prog = allProgramas.find((p: any) => String(p.id) === String(progId));
      if (!prog) return;

      const docente = obtenerDocenteAlumno(ins, prog);
      const grupos = prog.horarios_por_grupo || prog.horariosPorGrupo || [];
      let aula = prog.aula || "Sin aula";
      if (Array.isArray(grupos) && grupos.length > 0) {
        const { grado, nivel } = resolverGradoYNivel(ins);
        const searchKey = `${nivel}:${grado}`.trim().toLowerCase();
        const g = grupos.find((item: any) => 
          Array.isArray(item.grados) && item.grados.some((gk: string) => String(gk).trim().toLowerCase() === searchKey)
        );
        if (g) aula = g.aula || aula;
      }

      const clave = `${docente}-${prog.id}-${aula}`;
      if (mapaDocentes[clave]) {
        mapaDocentes[clave].asistieron += 1;
      }
    });

    return Object.values(mapaDocentes).filter(item => item.matriculados > 0);
  }, [fechaActiva, allAsistencias, allInscripciones, allProgramas, obtenerDocenteAlumno]);
  const abreviar = (valor) => {
    const texto = String(valor || "Sin nombre").trim();
    return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
  };
  return (
    <div className="dir-dashboard-workspace-card">

      {/* SELECCION DE MODULOS DEL DASHBOARD */}
      <div className="dir-module-tabs-row" role="tablist" style={{ marginTop: "-8px", marginBottom: "8px" }}>
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

      {/* SECCION SEGMENTADA POR PESTANA ACTIVA */}
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
              label="Monto Anulado"
              value={formatearSoles(resumen.totalAnulado || 0)}
              detail="Recibos anulados en el periodo"
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
                  h={180}
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
                  h={180}
                  data={chartEstadoPago}
                  thickness={12}
                  paddingAngle={5}
                  size={135}
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
                  h={180}
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
                  h={180}
                  data={(() => {
                    const conteoAgrupado = {};
                    chartOrigen.forEach((item) => {
                      const nameLower = String(item.name || "").toLowerCase();
                      let key = "Otro";
                      let color = "blue.6";
                      if (nameLower.includes("portal") || nameLower.includes("web") || nameLower.includes("padre")) {
                        key = "Vía Web / Padres";
                        color = "teal.6";
                      } else if (nameLower.includes("presencial") || nameLower.includes("asistente") || nameLower.includes("carga") || nameLower.includes("excel") || nameLower === "") {
                        key = "Vía Asistente";
                        color = "orange.6";
                      } else {
                        key = item.name || "Otro";
                        color = item.color;
                      }
                      if (!conteoAgrupado[key]) {
                        conteoAgrupado[key] = { name: key, value: 0, color };
                      }
                      conteoAgrupado[key].value += item.value;
                    });
                    return Object.values(conteoAgrupado);
                  })()}
                  thickness={12}
                  paddingAngle={5}
                  size={135}
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
              <div className="dir-analysis-card-body" style={{ padding: "10px 10px" }}>
                <div className="dir-analysis-stat-row" style={{ marginBottom: "8px" }}>
                  <div className="dir-analysis-stat-item">
                    <span className="dir-stat-label"><Laptop size={14} /> Vía Web / Padres</span>
                    <strong className="dir-stat-value">
                      {metricasAnalisis.webCount} <span className="dir-stat-sub">({metricasAnalisis.webPct}%)</span>
                    </strong>
                  </div>
                  <div className="dir-analysis-stat-item">
                    <span className="dir-stat-label"><Building size={14} /> Vía Asistente</span>
                    <strong className="dir-stat-value">
                      {metricasAnalisis.secCount} <span className="dir-stat-sub">({metricasAnalisis.secPct}%)</span>
                    </strong>
                  </div>
                </div>
                <div className="dir-progress-bar-container" style={{ height: "12px" }}>
                  <div
                    className="dir-progress-bar-web"
                    style={{ width: `${metricasAnalisis.webPct}%` }}
                    title={`Vía Web / Padres: ${metricasAnalisis.webPct}%`}
                  />
                  <div
                    className="dir-progress-bar-sec"
                    style={{ width: `${metricasAnalisis.secPct}%` }}
                    title={`Vía Asistente: ${metricasAnalisis.secPct}%`}
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

          <section className="dir-charts-single">
            <article className="dir-panel">
              <header>
                <h2>Asistencia por taller hoy</h2>
                <p>Matriculados vs Asistidos</p>
              </header>
              {panel?.graficos?.asistenciaPorPrograma?.length ? (
                <BarChart
                  h={180}
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
          </section>

          <section className="dir-panel dir-table-panel" style={{ marginTop: "16px" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", padding: "12px 16px" }}>
              <div>
                <h2>Control de Pagos a Docentes por Asistencia</h2>
                <p>Resumen de asistencia de alumnos matriculados y cálculo de cumplimiento para pago del profesor</p>
              </div>
              
              {fechasAsistencia.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Revisión de Fecha:</span>
                    <select
                      value={fechaActiva}
                      onChange={(e) => setFechaFiltroDocentes(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#1e293b",
                        background: "#ffffff",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      {fechasAsistencia.map((f) => (
                        <option key={f} value={f}>
                          {f.split("-").reverse().join("/")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => exportPdfControlPagos({ fecha: fechaActiva, estadisticas: estadisticasDocentes })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#b91c1c",
                      background: "#fef2f2",
                      border: "1px solid #fee2e2",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#fee2e2";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "#fef2f2";
                    }}
                  >
                    <Download size={14} /> PDF
                  </button>

                  <button
                    onClick={() => exportExcelControlPagos({ fecha: fechaActiva, estadisticas: estadisticasDocentes })}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#15803d",
                      background: "#f0fdf4",
                      border: "1px solid #dcfce7",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#dcfce7";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "#f0fdf4";
                    }}
                  >
                    <Download size={14} /> Excel
                  </button>
                </div>
              )}
            </header>

            <div className="dir-table-wrap">
              <Table striped highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ fontSize: "11px", padding: "10px 14px" }}>Profesor / Docente</Table.Th>
                    <Table.Th style={{ fontSize: "11px", padding: "10px 14px" }}>Taller / Programa</Table.Th>
                    <Table.Th style={{ fontSize: "11px", padding: "10px 14px" }}>Aula / Bloque</Table.Th>
                    <Table.Th style={{ fontSize: "11px", padding: "10px 14px", textAlign: "center" }}>Matriculados</Table.Th>
                    <Table.Th style={{ fontSize: "11px", padding: "10px 14px", textAlign: "center" }}>Asistieron</Table.Th>
                    <Table.Th style={{ fontSize: "11px", padding: "10px 14px", textAlign: "center" }}>Tasa de Asistencia</Table.Th>
                    <Table.Th style={{ fontSize: "11px", padding: "10px 14px", textAlign: "center" }}>Sugerencia de Pago</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {estadisticasDocentes.map((item, idx) => {
                    const tasa = item.matriculados > 0 ? Math.round((item.asistieron / item.matriculados) * 100) : 0;
                    return (
                      <Table.Tr key={`${item.docente}-${idx}`}>
                        <Table.Td style={{ padding: "8px 14px" }}>
                          {item.docente.includes(" · ") ? (
                            <div style={{ display: "grid", gap: "2px" }}>
                              {item.docente.split(" · ").map((doc: string, dIdx: number) => (
                                <span key={dIdx} style={{ color: "#0f766e", fontSize: "11px", fontWeight: 600, display: "block" }}>
                                  {doc}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <strong style={{ color: "#0f766e", fontSize: "12px", fontWeight: 600 }}>{item.docente}</strong>
                          )}
                        </Table.Td>
                        <Table.Td style={{ fontSize: "11.5px", fontWeight: 500, color: "#334155", maxWidth: "220px", whiteSpace: "normal", padding: "8px 14px" }}>
                          {item.programa}
                        </Table.Td>
                        <Table.Td style={{ fontSize: "11.5px", color: "#475569", padding: "8px 14px" }}>{item.aula}</Table.Td>
                        <Table.Td style={{ textAlign: "center", fontWeight: 600, fontSize: "12px", padding: "8px 14px" }}>{item.matriculados}</Table.Td>
                        <Table.Td style={{ textAlign: "center", fontWeight: 600, fontSize: "12px", color: item.asistieron === item.matriculados ? "#0f766e" : "#b45309", padding: "8px 14px" }}>
                          {item.asistieron}
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center", padding: "8px 14px" }}>
                          <span style={{ 
                            fontWeight: 700, 
                            fontSize: "12px",
                            color: tasa === 100 ? "#0f766e" : tasa >= 50 ? "#d97706" : "#dc2626"
                          }}>
                            {tasa}%
                          </span>
                        </Table.Td>
                        <Table.Td style={{ textAlign: "center", padding: "8px 14px" }}>
                          <Badge
                            color={tasa === 100 ? "teal" : tasa > 0 ? "orange" : "red"}
                            variant="light"
                            size="xs"
                            styles={{ label: { fontSize: "10px", fontWeight: 700 } }}
                          >
                            {tasa === 100 
                              ? "Pago Completo" 
                              : tasa > 0 
                                ? `Pago Parcial (${tasa}%)` 
                                : "Sin Pago"}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                  {estadisticasDocentes.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <div className="dir-empty-table" style={{ minHeight: "100px", color: "#64748b" }}>
                          No hay registros de asistencia para la fecha seleccionada.
                        </div>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                </Table.Tbody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
