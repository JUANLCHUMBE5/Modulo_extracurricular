import React, { useState, useEffect, useMemo } from "react";
import { Loader, Badge, Alert, Button } from "@mantine/core";
import {
  IconFileDownload as FileDown,
  IconCalendar as CalendarDays,
  IconClipboardCheck as ClipboardCheck,
  IconClock as Clock,
  IconUser as User,
  IconChartBar as ChartBar,
} from "@tabler/icons-react";
import { listarAsistenciasPrograma } from "../../coordinacion/services/coordinacionService";
import { exportPdfIndividual } from "../../coordinacion/utils/asistenciaExports";
import {
  agruparAsistenciasPorFecha,
  claveFechaAsistencia,
  obtenerDniAsistencia,
  obtenerFechaAsistencia,
} from "../../coordinacion/utils/asistenciasFormatters";
import { resumirClaseSecretaria } from "./SecretariaFields";

const NOMBRES_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA_ABREV = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function SecretariaWorkshopAttendanceRow({ ins, estudiante }) {
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [vistaSemana, setVistaSemana] = useState(true);

  useEffect(() => {
    if (!ins?.programaId) return;

    const cargarAsistencias = async () => {
      setCargando(true);
      setMensaje("");
      try {
        const result = await listarAsistenciasPrograma(ins.programaId);
        setAsistencias(result || []);
      } catch (err: any) {
        setAsistencias([]);
        setMensaje(err.message || "No se pudieron cargar los datos de asistencia.");
      } finally {
        setCargando(false);
      }
    };

    cargarAsistencias();
  }, [ins]);

  const fechasColumnas = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.keys(agrupado)
      .filter((clave) => clave !== "sin-fecha")
      .sort((a, b) => a.localeCompare(b))
      .map((clave) => {
        const [year, month, day] = clave.split("-");
        const dateObj = new Date(`${clave}T00:00:00`);
        const diaSemana = DIAS_SEMANA_ABREV[dateObj.getDay()];
        return {
          clave,
          labelDDMM: `${day}/${month}`,
          diaSemana,
          titulo: agrupado[clave].titulo,
        };
      });
  }, [asistencias]);

  const checkMap = useMemo(() => {
    const map = new Set();
    asistencias.forEach((asist) => {
      const dateKey = claveFechaAsistencia(obtenerFechaAsistencia(asist));
      const dni = obtenerDniAsistencia(asist);
      if (dni && dateKey) {
        map.add(`${dni}:${dateKey}`);
      }
    });
    return map;
  }, [asistencias]);

  const stats = useMemo(() => {
    if (!fechasColumnas.length) return { total: 0, asistio: 0, inasistio: 0, porcentaje: 0 };
    const total = fechasColumnas.length;
    let asistio = 0;
    fechasColumnas.forEach((fechaCol) => {
      const studentDni = estudiante?.dni || ins?.dniEstudiante || "";
      if (studentDni && checkMap.has(`${studentDni}:${fechaCol.clave}`)) {
        asistio++;
      }
    });
    const inasistio = total - asistio;
    const porcentaje = Math.round((asistio / total) * 100);
    return { total, asistio, inasistio, porcentaje };
  }, [fechasColumnas, checkMap, estudiante, ins]);

  // Group by Calendar Week
  const clasesPorSemana = useMemo(() => {
    const semanasMap: Record<string, typeof fechasColumnas> = {};
    
    fechasColumnas.forEach((fechaCol) => {
      const date = new Date(`${fechaCol.clave}T00:00:00`);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      const mondayDate = new Date(date.setDate(diff));
      const mondayStr = mondayDate.toISOString().split("T")[0];
      
      if (!semanasMap[mondayStr]) {
        semanasMap[mondayStr] = [];
      }
      semanasMap[mondayStr].push(fechaCol);
    });

    return Object.keys(semanasMap)
      .sort((a, b) => a.localeCompare(b))
      .map((mondayStr) => {
        const monday = new Date(`${mondayStr}T00:00:00`);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const formatShort = (d: Date) => {
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          return `${dd}/${mm}`;
        };

        return {
          rango: `Semana del ${formatShort(monday)} al ${formatShort(sunday)}`,
          clases: semanasMap[mondayStr],
        };
      });
  }, [fechasColumnas]);

  // Group by Month
  const clasesPorMes = useMemo(() => {
    const mesesMap: Record<string, typeof fechasColumnas> = {};
    
    fechasColumnas.forEach((fechaCol) => {
      const [year, month] = fechaCol.clave.split("-");
      const key = `${year}-${month}`;
      if (!mesesMap[key]) {
        mesesMap[key] = [];
      }
      mesesMap[key].push(fechaCol);
    });

    return Object.keys(mesesMap)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const [year, month] = key.split("-");
        const nombreMes = NOMBRES_MESES[parseInt(month, 10) - 1];
        return {
          titulo: `${nombreMes} ${year}`,
          clases: mesesMap[key],
        };
      });
  }, [fechasColumnas]);

  const handleExportPdf = () => {
    if (!ins || !estudiante) return;
    try {
      exportPdfIndividual({
        programaSeleccionado: {
          id: ins.programaId,
          nombre: ins.programa,
          horario: ins.horario,
          responsable: ins.docente,
        },
        alumno: {
          nombres: estudiante.nombres,
          dni: estudiante.dni,
          codigoEstudiante: estudiante.codigoEstudiante || "",
          telefono: ins.telefono || estudiante.telefonoApoderado || "",
        },
        fechasColumnas,
        checkMap,
      });
    } catch (err: any) {
      setMensaje("No se pudo exportar el PDF: " + err.message);
    }
  };

  const ringColor = stats.porcentaje >= 80 ? "#10b981" : stats.porcentaje >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{
      padding: "24px",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02)",
    }}>
      {/* Taller Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0d9488", background: "#f0fdfa", padding: "4px 8px", borderRadius: "4px" }}>
            Taller Extracurricular
          </span>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "6px 0 4px 0" }}>{ins.programa}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "13px", color: "#64748b", marginTop: "6px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <User size={15} style={{ color: "#94a3b8" }} />
              <strong>Docente:</strong> {ins.docente || "No definido"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Clock size={15} style={{ color: "#94a3b8" }} />
              <strong>Horario:</strong> {resumirClaseSecretaria(ins.horario)}
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          color="teal"
          leftSection={<FileDown size={16} />}
          onClick={handleExportPdf}
          disabled={fechasColumnas.length === 0}
        >
          Exportar PDF
        </Button>
      </div>

      {mensaje && (
        <Alert color="orange" radius="md" style={{ fontSize: "13px" }}>
          {mensaje}
        </Alert>
      )}

      {cargando ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "40px 0" }}>
          <Loader size="sm" color="teal" />
          <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>Cargando matriz de asistencia...</span>
        </div>
      ) : fechasColumnas.length > 0 ? (
        <>
          {/* Stats Dashboard */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "24px",
            background: "#f8fafc",
            padding: "16px 20px",
            borderRadius: "12px",
            alignItems: "center",
            border: "1px solid #f1f5f9"
          }}>
            {/* SVG Circular Attendance Chart */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 - (263.89 * stats.porcentaje) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <span style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>{stats.porcentaje}%</span>
                <span style={{ fontSize: "8px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Asistencia</span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px" }}>
              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "block" }}>Programadas</span>
                <strong style={{ fontSize: "18px", color: "#1e293b" }}>{stats.total} clases</strong>
              </div>
              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600, display: "block" }}>Asistencias</span>
                <strong style={{ fontSize: "18px", color: "#065f46" }}>{stats.asistio}</strong>
              </div>
              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600, display: "block" }}>Inasistencias</span>
                <strong style={{ fontSize: "18px", color: "#991b1b" }}>{stats.inasistio}</strong>
              </div>
              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, display: "block" }}>Condición</span>
                <Badge color={stats.porcentaje >= 80 ? "green" : stats.porcentaje >= 50 ? "orange" : "red"} size="sm" radius="xs" style={{ marginTop: "4px" }}>
                  {stats.porcentaje >= 80 ? "Regular" : "En Riesgo"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Toggle Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", paddingBottom: "2px", gap: "16px" }}>
            <button
              type="button"
              onClick={() => setVistaSemana(true)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: vistaSemana ? "3px solid #0d9488" : "3px solid transparent",
                padding: "8px 4px",
                fontSize: "14px",
                fontWeight: vistaSemana ? 700 : 500,
                color: vistaSemana ? "#0d9488" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Vista Semanal (Consolidado)
            </button>
            <button
              type="button"
              onClick={() => setVistaSemana(false)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: !vistaSemana ? "3px solid #0d9488" : "3px solid transparent",
                padding: "8px 4px",
                fontSize: "14px",
                fontWeight: !vistaSemana ? 700 : 500,
                color: !vistaSemana ? "#0d9488" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Vista Mensual (Consolidado)
            </button>
          </div>

          {/* Tab Content */}
          {vistaSemana ? (
            /* Vista Semanal */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {clasesPorSemana.map((semana, sIdx) => (
                <div key={sIdx} style={{
                  border: "1px solid #f1f5f9",
                  borderRadius: "10px",
                  background: "#fdfdfd",
                  overflow: "hidden"
                }}>
                  <div style={{
                    background: "#f1f5f9",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <CalendarDays size={14} style={{ color: "#64748b" }} />
                    <span>{semana.rango}</span>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                    gap: "10px",
                    padding: "12px 16px"
                  }}>
                    {semana.clases.map((fechaCol) => {
                      const studentDni = estudiante?.dni || ins?.dniEstudiante || "";
                      const asistio = studentDni && checkMap.has(`${studentDni}:${fechaCol.clave}`);
                      const record = asistencias.find((a) => {
                        const dateKey = claveFechaAsistencia(obtenerFechaAsistencia(a));
                        const dni = obtenerDniAsistencia(a);
                        return String(dni) === String(studentDni) && dateKey === fechaCol.clave;
                      });

                      return (
                        <div
                          key={fechaCol.clave}
                          title={`${fechaCol.titulo} - ${asistio ? "Asistió" : "Faltó"}${record?.observacion ? ` (${record.observacion})` : ""}`}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "8px 6px",
                            borderRadius: "8px",
                            background: asistio ? "#f0fdf4" : "#fef2f2",
                            border: `1px solid ${asistio ? "#bbf7d0" : "#fecaca"}`,
                            boxShadow: "0 1px 2px 0 rgba(0,0,0,0.02)",
                          }}
                        >
                          <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>{fechaCol.diaSemana} {fechaCol.labelDDMM}</span>
                          <span style={{
                            fontSize: "13px",
                            fontWeight: "bold",
                            color: asistio ? "#166534" : "#991b1b",
                            marginTop: "4px"
                          }}>
                            {asistio ? "✓ Asistió" : "✗ Faltó"}
                          </span>
                          {record?.observacion && (
                            <span style={{ fontSize: "8px", color: "#64748b", textAlign: "center", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", width: "100%", whiteSpace: "nowrap" }}>
                              {record.observacion}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista Mensual */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {clasesPorMes.map((mes, mIdx) => (
                <div key={mIdx} style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "#ffffff",
                  overflow: "hidden"
                }}>
                  <div style={{
                    background: "#0f172a",
                    padding: "10px 16px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff"
                  }}>
                    {mes.titulo}
                  </div>

                  <div style={{ padding: "16px" }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                      gap: "10px"
                    }}>
                      {mes.clases.map((fechaCol) => {
                        const studentDni = estudiante?.dni || ins?.dniEstudiante || "";
                        const asistio = studentDni && checkMap.has(`${studentDni}:${fechaCol.clave}`);
                        const record = asistencias.find((a) => {
                          const dateKey = claveFechaAsistencia(obtenerFechaAsistencia(a));
                          const dni = obtenerDniAsistencia(a);
                          return String(dni) === String(studentDni) && dateKey === fechaCol.clave;
                        });

                        return (
                          <div
                            key={fechaCol.clave}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <div style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              background: asistio ? "#d1fae5" : "#fee2e2",
                              color: asistio ? "#065f46" : "#991b1b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: "bold",
                              flexShrink: 0
                            }}>
                              {asistio ? "✓" : "✗"}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <strong style={{ fontSize: "11px", color: "#334155" }}>
                                {fechaCol.diaSemana} {fechaCol.labelDDMM}
                              </strong>
                              <span style={{ fontSize: "10px", color: asistio ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                                {asistio ? "Asistió" : "Faltó"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <CalendarDays size={18} style={{ color: "#94a3b8" }} />
          <span style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic" }}>
            Aún no se registran asistencias para este taller.
          </span>
        </div>
      )}
    </div>
  );
}
