import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Button,
  Loader,
  Badge,
  Alert,
} from "@mantine/core";
import {
  IconFileDownload as FileDown,
  IconCalendar as CalendarDays,
  IconUserCheck as UserCheck,
  IconAlertCircle as AlertCircle,
  IconSchool as School,
} from "@tabler/icons-react";
import { listarAsistenciasPrograma } from "../../coordinacion/services/coordinacionService";
import { exportPdfIndividual } from "../../coordinacion/utils/asistenciaExports";
import {
  agruparAsistenciasPorFecha,
  claveFechaAsistencia,
  obtenerDniAsistencia,
  obtenerFechaAsistencia,
  formatearFechaAsistencia,
} from "../../coordinacion/utils/asistenciasFormatters";

export default function SecretariaAsistenciaModal({
  open,
  onClose,
  inscripcion,
  estudiante,
  inscripcionesEstudiante = [],
  programas = [],
}) {
  const [activeInscripcion, setActiveInscripcion] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const esInactivo = (ins: any) => {
    if (!ins) return false;
    const hoyStr = new Date().toISOString().split("T")[0];
    const terminado = ins.fechaFin && hoyStr > ins.fechaFin;
    
    // Si el programa no está en la lista de programas activos/habilitados, es inactivo/deshabilitado
    const prog = (programas || []).find(p => p.id === ins.programaId);
    const deshabilitado = !prog || prog.estado === "Deshabilitado" || prog.estado === "Archivado";
    
    return terminado || deshabilitado;
  };

  const { filtradas, tieneOcultos } = useMemo(() => {
    const activas = (inscripcionesEstudiante || []).filter(ins => !esInactivo(ins));
    const inactivos = (inscripcionesEstudiante || []).filter(ins => esInactivo(ins));

    if (activas.length === 0) {
      return {
        filtradas: [],
        tieneOcultos: inactivos.length > 0
      };
    }

    return {
      filtradas: mostrarTodos ? (inscripcionesEstudiante || []) : activas,
      tieneOcultos: inactivos.length > 0
    };
  }, [inscripcionesEstudiante, programas, mostrarTodos]);

  useEffect(() => {
    if (open) {
      const activas = (inscripcionesEstudiante || []).filter(ins => !esInactivo(ins));
      const preseleccionada = inscripcion || activas[0] || null;
      setActiveInscripcion(preseleccionada);
      setMostrarTodos(false);
    } else {
      setActiveInscripcion(null);
    }
  }, [open, inscripcion, inscripcionesEstudiante, programas]);

  useEffect(() => {
    if (!open || !activeInscripcion?.programaId) {
      setAsistencias([]);
      setMensaje("");
      return;
    }

    const cargarAsistencias = async () => {
      setCargando(true);
      setMensaje("");
      try {
        const result = await listarAsistenciasPrograma(activeInscripcion.programaId);
        setAsistencias(result || []);
      } catch (err) {
        setAsistencias([]);
        setMensaje(err.message || "No se pudieron cargar los datos de asistencia del taller.");
      } finally {
        setCargando(false);
      }
    };

    cargarAsistencias();
  }, [open, activeInscripcion]);

  // Group fetched attendance data by date (chronological order)
  const gruposFecha = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.values(agrupado).sort((a, b) => a.clave.localeCompare(b.clave));
  }, [asistencias]);

  // Chronological dates list for lookup and export
  const fechasColumnas = useMemo(() => {
    const agrupado = agruparAsistenciasPorFecha(asistencias);
    return Object.keys(agrupado)
      .sort((a, b) => a.localeCompare(b))
      .map((clave) => {
        const [year, month, day] = clave.split("-");
        return {
          clave,
          labelDDMM: `${day}/${month}`,
          titulo: agrupado[clave].titulo,
        };
      });
  }, [asistencias]);

  // Attendance check map for student DNI
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
    if (!fechasColumnas.length) return { total: 0, asistio: 0, porcentaje: 0 };
    let total = fechasColumnas.length;
    let asistio = 0;
    fechasColumnas.forEach((fechaCol) => {
      const studentDni = estudiante?.dni || activeInscripcion?.dniEstudiante || "";
      if (studentDni && checkMap.has(`${studentDni}:${fechaCol.clave}`)) {
        asistio++;
      }
    });
    const porcentaje = Math.round((asistio / total) * 100);
    return { total, asistio, porcentaje };
  }, [fechasColumnas, checkMap, estudiante, activeInscripcion]);

  const handleExportPdf = () => {
    if (!activeInscripcion || !estudiante) return;
    try {
      exportPdfIndividual({
        programaSeleccionado: {
          id: activeInscripcion.programaId,
          nombre: activeInscripcion.programa,
          horario: activeInscripcion.horario,
          responsable: activeInscripcion.docente,
        },
        alumno: {
          nombres: estudiante.nombres,
          dni: estudiante.dni,
          codigoEstudiante: estudiante.codigoEstudiante || "",
          telefono: activeInscripcion.telefono || estudiante.telefonoApoderado || "",
        },
        fechasColumnas,
        checkMap,
      });
    } catch (err) {
      setMensaje("No se pudo exportar el PDF: " + err.message);
    }
  };

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
          <UserCheck size={20} style={{ color: "#176c60" }} /> Historial de Asistencia
        </span>
      }
      size="lg"
      centered
      radius="md"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Selector if student has multiple workshops */}
        {inscripcionesEstudiante && inscripcionesEstudiante.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Taller / Curso Matriculado</span>
              {tieneOcultos && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#475569", cursor: "pointer", fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={mostrarTodos}
                    onChange={(e) => setMostrarTodos(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  Mostrar talleres finalizados
                </label>
              )}
            </div>
            <select
              value={activeInscripcion?.programaId || ""}
              onChange={(e) => {
                const selected = inscripcionesEstudiante.find(x => x.programaId === e.target.value);
                if (selected) setActiveInscripcion(selected);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13.5px",
                color: "#1e293b",
                background: "#ffffff",
                fontWeight: 500,
                outline: "none"
              }}
            >
              {filtradas.map((ins, idx) => (
                <option key={ins.programaId || idx} value={ins.programaId}>
                  {ins.programa} {esInactivo(ins) ? " (Taller no disponible por el momento)" : ""} — {ins.horario}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Info card of student and program */}
        <div style={{
          padding: "14px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px"
        }}>
          <div>
            <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Estudiante</span>
            <strong style={{ fontSize: "14px", color: "#0f172a" }}>{estudiante?.nombres}</strong>
            <span style={{ display: "block", fontSize: "12px", color: "#475569" }}>DNI: {estudiante?.dni}</span>
          </div>
          <div>
            <span style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Taller / Programa
            </span>
            {activeInscripcion && esInactivo(activeInscripcion) ? (
              <div style={{ marginTop: "4px" }}>
                <span style={{ display: "block", fontSize: "13px", color: "#b42318", fontWeight: 700 }}>
                  Taller no disponible por el momento
                </span>
                <span style={{ display: "block", fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Historial de: {activeInscripcion.programa} (Finalizado)
                </span>
              </div>
            ) : (
              <>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{activeInscripcion?.programa || "Ninguno"}</strong>
                <span style={{ display: "block", fontSize: "12px", color: "#475569" }}>Horario: {activeInscripcion?.horario || "—"}</span>
              </>
            )}
          </div>
        </div>

        {mensaje && (
          <Alert color="orange" radius="md" icon={<AlertCircle size={18} />}>
            {mensaje}
          </Alert>
        )}

        {cargando ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "10px" }}>
            <Loader color="teal" size="md" />
            <span style={{ fontSize: "13px", color: "#64748b" }}>Consultando asistencias del taller...</span>
          </div>
        ) : (
          <>
            {fechasColumnas.length > 0 && activeInscripcion && (!esInactivo(activeInscripcion) || mostrarTodos) ? (
              <>
                {/* Attendance statistics block */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div>
                    <span style={{ display: "block", fontSize: "11px", color: "#1e40af", fontWeight: 700, textTransform: "uppercase" }}>Resumen de Asistencia</span>
                    <span style={{ fontSize: "14px", color: "#1e3a8a", fontWeight: 600 }}>
                      Presente en {stats.asistio} de {stats.total} clases dictadas
                    </span>
                  </div>
                  <Badge color={stats.porcentaje >= 80 ? "green" : stats.porcentaje >= 50 ? "orange" : "red"} size="lg" radius="sm">
                    {stats.porcentaje}% de Asistencia
                  </Badge>
                </div>

                {/* Table of dates */}
                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 600 }}>#</th>
                        <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 600 }}>Fecha de Clase</th>
                        <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 600 }}>Estado</th>
                        <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 600 }}>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fechasColumnas.map((fechaCol, idx) => {
                        const studentDni = estudiante?.dni || activeInscripcion?.dniEstudiante || "";
                        const asistio = studentDni && checkMap.has(`${studentDni}:${fechaCol.clave}`);

                        // Find attendance observation if any
                        const record = asistencias.find((a) => {
                          const dateKey = claveFechaAsistencia(obtenerFechaAsistencia(a));
                          const dni = obtenerDniAsistencia(a);
                          return String(dni) === String(studentDni) && dateKey === fechaCol.clave;
                        });

                        return (
                          <tr key={fechaCol.clave} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 12px", color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 500 }}>
                              {fechaCol.titulo}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontWeight: 700,
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: asistio ? "#e8f7ef" : "#fdf2f2",
                                color: asistio ? "#006b5b" : "#b42318"
                              }}>
                                {asistio ? "Asistió (✓)" : "Faltó (—)"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", color: "#64748b", fontStyle: record?.observacion ? "normal" : "italic" }}>
                              {record?.observacion || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer with actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                  <Button
                    color="sanrafael"
                    leftSection={<FileDown size={16} />}
                    onClick={handleExportPdf}
                  >
                    Descargar Reporte PDF
                  </Button>
                  <Button variant="outline" color="gray" onClick={onClose}>
                    Cerrar
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", textAlign: "center" }}>
                {!activeInscripcion || (esInactivo(activeInscripcion) && !mostrarTodos) ? (
                  <>
                    <AlertCircle size={40} style={{ color: "#b42318", marginBottom: "10px" }} />
                    <h4 style={{ color: "#b42318", margin: 0, fontWeight: 700 }}>Talleres no disponible por el momento</h4>
                    <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px", maxWidth: "340px" }}>
                      El estudiante no se encuentra matriculado en ningún taller activo o habilitado en este periodo.
                    </p>
                    {tieneOcultos && (
                      <div style={{ marginTop: "16px" }}>
                        <Button variant="subtle" color="teal" onClick={() => setMostrarTodos(true)}>
                          Ver historial de talleres finalizados / deshabilitados
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <CalendarDays size={40} style={{ color: "#94a3b8", marginBottom: "10px" }} />
                    <h4 style={{ color: "#475569", margin: 0 }}>Sin registros de asistencia</h4>
                    <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px", maxWidth: "320px" }}>
                      Aún no se han registrado asistencias para este taller en el sistema.
                    </p>
                    <div style={{ marginTop: "16px" }}>
                      <Button variant="outline" color="gray" onClick={onClose}>
                        Cerrar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
