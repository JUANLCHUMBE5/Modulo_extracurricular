import { useState, useEffect, useMemo } from "react";
import { Loader, Badge, Alert, Button } from "@mantine/core";
import {
  IconCircleCheck as CheckCircle2,
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
  IconPrinter as Printer,
  IconSearch as Search,
  IconSend as Send,
  IconAlertTriangle as AlertTriangle,
  IconInfoCircle as InfoCircle,
  IconUserCheck as UserCheck,
  IconFileDownload as FileDown,
  IconCalendar as CalendarDays,
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

function describirSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones = {
    A: "A - Promovido/a por Certificado Oficial 2025",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por Desempeno Academico",
  };
  return opciones[seleccion] || "Pendiente de definir en Coordinación Académica";
}

function obtenerPillEstadoInscripcion(estado = "") {
  const est = String(estado).trim().toLowerCase();
  if (est.includes("no inscrito") || est.includes("anulada")) {
    return {
      clase: "secretaria-pill-danger",
      Icono: AlertTriangle,
    };
  }
  if (est.includes("pago validado") || est.includes("inscrito")) {
    return {
      clase: "secretaria-pill-success",
      Icono: CheckCircle2,
    };
  }
  if (est.includes("pendiente") || est.includes("derivado")) {
    return {
      clase: "secretaria-pill-warning",
      Icono: AlertTriangle,
    };
  }
  return {
    clase: "secretaria-pill-info",
    Icono: InfoCircle,
  };
}

function obtenerInfoBoxConfig({ inscripcion, programas, esCicloVerano, invitacionSinHorario, tieneInvitacionOperativa }) {
  if (inscripcion?.derivadoCaja) {
    return {
      clase: "secretaria-info-box-success",
      Icono: CheckCircle2,
    };
  }
  if (inscripcion) {
    return {
      clase: "secretaria-info-box-info",
      Icono: InfoCircle,
    };
  }
  if (esCicloVerano) {
    if (programas.length > 0) {
      return {
        clase: "secretaria-info-box-info",
        Icono: InfoCircle,
      };
    } else {
      return {
        clase: "secretaria-info-box-danger",
        Icono: AlertTriangle,
      };
    }
  }
  if (invitacionSinHorario) {
    return {
      clase: "secretaria-info-box-warning",
      Icono: AlertTriangle,
    };
  }
  if (tieneInvitacionOperativa) {
    return {
      clase: "secretaria-info-box-success",
      Icono: CheckCircle2,
    };
  }
  if (programas.length > 0) {
    return {
      clase: "secretaria-info-box-info",
      Icono: InfoCircle,
    };
  }
  return {
    clase: "secretaria-info-box-danger",
    Icono: AlertTriangle,
  };
}

function SecretariaWorkshopAttendanceRow({ ins, estudiante }) {
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!ins?.programaId) return;

    const cargarAsistencias = async () => {
      setCargando(true);
      setMensaje("");
      try {
        const result = await listarAsistenciasPrograma(ins.programaId);
        setAsistencias(result || []);
      } catch (err) {
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
      const studentDni = estudiante?.dni || ins?.dniEstudiante || "";
      if (studentDni && checkMap.has(`${studentDni}:${fechaCol.clave}`)) {
        asistio++;
      }
    });
    const porcentaje = Math.round((asistio / total) * 100);
    return { total, asistio, porcentaje };
  }, [fechasColumnas, checkMap, estudiante, ins]);

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
    } catch (err) {
      setMensaje("No se pudo exportar el PDF: " + err.message);
    }
  };

  return (
    <div style={{
      padding: "16px",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <strong style={{ fontSize: "15px", color: "#0f172a" }}>{ins.programa}</strong>
          <span style={{ fontSize: "12px", color: "#64748b", display: "block", marginTop: "2px" }}>
            <strong>Docente:</strong> {ins.docente || "No definido"} · <strong>Horario:</strong> {resumirClaseSecretaria(ins.horario)}
          </span>
        </div>
        {fechasColumnas.length > 0 && (
          <Badge color={stats.porcentaje >= 80 ? "green" : stats.porcentaje >= 50 ? "orange" : "red"} size="md" radius="sm">
            {stats.porcentaje}% Asistencia ({stats.asistio}/{stats.total})
          </Badge>
        )}
      </div>

      {mensaje && (
        <Alert color="orange" radius="sm" py={6} style={{ fontSize: "12px" }}>
          {mensaje}
        </Alert>
      )}

      {cargando ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0" }}>
          <Loader size="xs" color="teal" />
          <span style={{ fontSize: "12px", color: "#64748b" }}>Cargando asistencias...</span>
        </div>
      ) : fechasColumnas.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" }}>
            {fechasColumnas.map((fechaCol) => {
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
                    minWidth: "64px",
                    padding: "6px",
                    borderRadius: "6px",
                    background: asistio ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${asistio ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>{fechaCol.labelDDMM}</span>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: asistio ? "#166534" : "#991b1b",
                    marginTop: "4px"
                  }}>
                    {asistio ? "✓" : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <Button
              size="xs"
              variant="outline"
              color="teal"
              leftSection={<FileDown size={14} />}
              onClick={handleExportPdf}
            >
              Exportar Reporte PDF
            </Button>
          </div>
        </>
      ) : (
        <div style={{ padding: "8px 0", display: "flex", alignItems: "center", gap: "6px" }}>
          <CalendarDays size={16} style={{ color: "#94a3b8" }} />
          <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
            Aún no se registran asistencias para este taller.
          </span>
        </div>
      )}
    </div>
  );
}

function SecretariaStudentPanel({
  abrirFichaGenerada,
  abrirCursoAdicional,
  abrirRegistro,
  cursosAdicionalesDisponibles = 0,
  derivarACaja,
  derivandoCaja,
  esCicloVerano,
  estudiante,
  imprimiendoFichaRegistro,
  inscripcion,
  invitacionSinHorario,
  limpiarBusquedaEstudiante,
  nombreProgramaAMostrar,
  programas,
  tieneInvitacionOperativa,
  tipoAlumnoMostrado,
  inscripcionesEstudiante = [],
  onVerAsistencia,
  modoBusquedaAsistencia = false,
}) {
  if (!estudiante) return null;
  const esCambridge = /cambridge/i.test([
    nombreProgramaAMostrar,
    estudiante.programaNombre,
    estudiante.plantilla,
    inscripcion?.programa,
  ].filter(Boolean).join(" "));
  const seleccionCambridge = inscripcion?.seleccion || estudiante.seleccion || "";
  const nivelCambridge = inscripcion?.nivelCambridge || estudiante.nivelCambridge || "";
  const esPagoCompletado = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(
    (est) => String(inscripcion?.estadoPago || "").toLowerCase().includes(est) || String(inscripcion?.estadoInscripcion || "").toLowerCase().includes(est)
  );

  return (
    <section className="secretaria-student-panel">
      <div className="secretaria-student-summary">
        <div className="secretaria-avatar">
          {estudiante.nombres
            .split(" ")
            .slice(0, 2)
            .map((name) => name[0])
            .join("")}
        </div>
        <div>
          <span className="secretaria-overline">Estudiante encontrado</span>
          <strong>{estudiante.nombres}</strong>
          <span>
            {estudiante.dni ? `DNI ${estudiante.dni}` : "Sin DNI registrado"} · {estudiante.codigoEstudiante || "Sin código"}
            {modoBusquedaAsistencia && estudiante.grado && ` · ${estudiante.grado} ${estudiante.seccion || ""}`}
          </span>
        </div>
        <button className="secretaria-secondary-button secretaria-new-search-button" type="button" onClick={limpiarBusquedaEstudiante}>
          <Search size={15} />
          Buscar otro estudiante
        </button>
      </div>

      {!modoBusquedaAsistencia && (
        <dl className="secretaria-student-data" aria-label="Datos del estudiante">
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Código</dt>
          <dd>{estudiante.codigoEstudiante || "No registrado"}</dd>
        </div>
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Grado</dt>
          <dd>{estudiante.grado}</dd>
        </div>
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Sección / Aula</dt>
          <dd>{estudiante.seccion}</dd>
        </div>
        <div className="secretaria-data-compact secretaria-data-identity">
          <dt>Tipo de alumno</dt>
          <dd>{tipoAlumnoMostrado}</dd>
        </div>
        <div className="secretaria-data-status secretaria-data-process">
          <dt>Periodo</dt>
          <dd>
            {(() => {
              const normalizar = (p) => String(p || "").toLowerCase().includes("verano") ? "Ciclo verano" : "Año escolar";
              if (inscripcion?.periodo) return normalizar(inscripcion.periodo);
              if (estudiante?.programaPeriodo) return normalizar(estudiante.programaPeriodo);
              if (estudiante?.periodo) return normalizar(estudiante.periodo);
              return esCicloVerano ? "Ciclo verano" : "Año escolar";
            })()}
          </dd>
        </div>
        {!esCicloVerano ? (
          <div className="secretaria-data-status secretaria-data-process">
            <dt>Invitacion</dt>
            <dd>
              {(() => {
                let pillClass = "secretaria-pill-danger";
                let Icon = AlertTriangle;
                let text = "Sin invitación";

                if (tieneInvitacionOperativa && !invitacionSinHorario) {
                  pillClass = "secretaria-pill-success";
                  Icon = CheckCircle2;
                  text = "Registrada";
                } else if (invitacionSinHorario) {
                  pillClass = "secretaria-pill-warning";
                  Icon = AlertTriangle;
                  text = "Falta horario";
                }

                return (
                  <span className={`secretaria-pill ${pillClass}`}>
                    <Icon size={13} />
                    {text}
                  </span>
                );
              })()}
            </dd>
          </div>
        ) : null}
        <div className="secretaria-data-status secretaria-data-process">
          <dt>Estado inscripción</dt>
          <dd>
            {(() => {
              const { clase, Icono } = obtenerPillEstadoInscripcion(estudiante.estadoInscripción);
              return (
                <span className={`secretaria-pill ${clase}`}>
                  <Icono size={13} />
                  {estudiante.estadoInscripción}
                </span>
              );
            })()}
          </dd>
        </div>
        <div className="secretaria-data-status secretaria-data-process">
          <dt>Estado pago</dt>
          <dd>{estudiante.estadoPago || "Sin pago"}</dd>
        </div>
        <div className="secretaria-data-wide secretaria-data-program">
          <dt>{tieneInvitacionOperativa ? "Programa asignado" : esCicloVerano ? "Programa de verano" : "Programa"}</dt>
          <dd>{nombreProgramaAMostrar || "Se seleccionara al registrar"}</dd>
        </div>
        {esCambridge ? (
          <>
            <div className="secretaria-data-program">
              <dt>Modalidad Cambridge A/B/C</dt>
              <dd>{describirSeleccionCambridge(seleccionCambridge)}</dd>
            </div>
            {nivelCambridge ? (
              <div className="secretaria-data-program">
                <dt>Nivel Cambridge</dt>
                <dd>{nivelCambridge}</dd>
              </div>
            ) : null}
          </>
        ) : null}
        {inscripcion ? (
          <>
            <div className="secretaria-data-program">
              <dt>Horario</dt>
              <dd>{resumirClaseSecretaria(inscripcion.horario)}</dd>
            </div>
            <div className="secretaria-data-program">
              <dt>Costo referencial</dt>
              <dd>S/ {Number(inscripcion.costo).toFixed(2)}</dd>
            </div>
            <div className="secretaria-data-program">
              <dt>Uniforme requerido</dt>
              <dd>{inscripcion.requiereUniforme ? "Sí" : "No"}</dd>
            </div>
            <div className="secretaria-data-contact">
              <dt>Nombre del padre</dt>
              <dd>{inscripcion.apoderado}</dd>
            </div>
            <div className="secretaria-data-contact">
              <dt>Teléfono</dt>
              <dd>{inscripcion.telefono}</dd>
            </div>
            <div className="secretaria-data-contact">
              <dt>Estado pago</dt>
              <dd>{inscripcion.estadoPago}</dd>
            </div>
          </>
        ) : null}
        </dl>
      )}

      {modoBusquedaAsistencia && inscripcionesEstudiante.length > 0 && (
        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px", width: "100%", gridColumn: "1 / -1" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", margin: "0 0 4px 0", borderBottom: "2px solid #e2e8f0", paddingBottom: "6px" }}>
            Talleres y Cursos Matriculados
          </h3>
          {modoBusquedaAsistencia ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
              {inscripcionesEstudiante.map((ins, index) => (
                <SecretariaWorkshopAttendanceRow
                  key={ins.id || index}
                  ins={ins}
                  estudiante={estudiante}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
              {inscripcionesEstudiante.map((ins, index) => {
                const esPagoIns = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(
                  (est) => String(ins.estadoPago || "").toLowerCase().includes(est) || String(ins.estadoInscripcion || "").toLowerCase().includes(est)
                );
                return (
                  <div key={ins.id || index} style={{
                    padding: "12px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "10px",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}>
                    <div>
                      <div style={{ display: "flex", justifyInscripciones: "space-between", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <strong style={{ fontSize: "14px", color: "#0f172a" }}>{ins.programa}</strong>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: esPagoIns ? "#e8f7ef" : "#fef6e7",
                          color: esPagoIns ? "#006b5b" : "#b25e00",
                        }}>
                          {ins.estadoPago || "Pendiente"}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                        <strong>Horario:</strong> {resumirClaseSecretaria(ins.horario)}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        <strong>Docente:</strong> {ins.docente || "No definido"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "8px", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => onVerAsistencia?.(ins)}
                        style={{
                          flex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: "#f0fdfa",
                          border: "1px solid #ccfbf1",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#0d9488",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#e6fffa";
                          e.currentTarget.style.borderColor = "#99f6e4";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#f0fdfa";
                          e.currentTarget.style.borderColor = "#ccfbf1";
                        }}
                      >
                        <UserCheck size={14} />
                        Consultar Asistencia
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!modoBusquedaAsistencia && (() => {
        const config = obtenerInfoBoxConfig({
          inscripcion,
          programas,
          esCicloVerano,
          invitacionSinHorario,
          tieneInvitacionOperativa,
        });
        const IconoBox = config.Icono;
        return (
          <div className={`secretaria-info-box ${config.clase}`}>
            <IconoBox size={19} />
            {inscripcion?.derivadoCaja ? (
              <p>
                Derivado exitosamente a Cajera: {inscripcion.programa || "taller seleccionado"}. Este mismo taller ya no se puede derivar otra vez.
                {cursosAdicionalesDisponibles > 0
                  ? " Si necesita otro cobro, registre un curso adicional."
                  : " No hay cursos adicionales disponibles para este grado."}
              </p>
            ) : inscripcion && programas.length > 0 ? (
              <p>
                Taller actual para Cajera: {inscripcion.programa || "No definido"}. Asistente puede registrar
                un curso adicional si corresponde, cuidando no derivar otro taller por error.
              </p>
            ) : inscripcion ? (
              <p>
                Inscripcion registrada para {inscripcion.programa || "este taller"}. Derivar a Cajera para validar el pago.
              </p>
            ) : esCicloVerano && programas.length > 0 ? (
              <p>
                Ciclo verano no usa invitación. Asistente debe seleccionar el programa de verano al registrar.
              </p>
            ) : esCicloVerano ? (
              <p>
                Coordinación Académica debe registrar y habilitar un programa de ciclo verano disponible para el estudiante.
              </p>
            ) : invitacionSinHorario ? (
              <p>
                El estudiante si esta cargado por Coordinación Académica, pero falta configurar un horario para su grado antes de inscribirlo.
              </p>
            ) : tieneInvitacionOperativa ? (
              <p>
                El estudiante tiene invitación registrada. Asistente solo
                podrá inscribirlo en el programa asignado por Coordinación Académica.
              </p>
            ) : programas.length > 0 ? (
              <p>
                No tiene invitación individual. Asistente puede registrarlo
                en los programas marcados por Coordinación Académica como invitación masiva.
              </p>
            ) : (
              <p>
                No tiene invitación registrada. Coordinación Académica debe habilitar una
                invitación masiva o registrar una invitación individual.
              </p>
            )}
          </div>
        );
      })()}

      {!modoBusquedaAsistencia && (
        !inscripcion ? (
          <button
            className="secretaria-register-button"
            type="button"
            onClick={abrirRegistro}
            disabled={invitacionSinHorario && !inscripcion}
          >
            <ClipboardCheck size={17} />
            <span>{invitacionSinHorario ? "Falta horario en Coordinación Académica" : "Registrar inscripcion"}</span>
          </button>
        ) : (
          <div className="secretaria-final-actions">
            <button
              className="secretaria-primary-button"
              type="button"
              onClick={abrirFichaGenerada}
              disabled={imprimiendoFichaRegistro}
            >
              {imprimiendoFichaRegistro ? <Loader2 className="secretaria-spin" size={17} /> : <Printer size={17} />}
              <span>{imprimiendoFichaRegistro ? "Preparando ficha" : "Imprimir ficha de registro"}</span>
            </button>
            <button
              className="secretaria-register-button"
              type="button"
              onClick={derivarACaja}
              disabled={derivandoCaja || inscripcion.derivadoCaja || esPagoCompletado}
            >
              {derivandoCaja ? (
                <Loader2 className="secretaria-spin" size={17} />
              ) : esPagoCompletado ? (
                <CheckCircle2 size={17} />
              ) : (
                <Send size={17} />
              )}
              <span>
                {inscripcion.derivadoCaja
                  ? "Derivado exitosamente"
                  : esPagoCompletado
                    ? "Pago completado"
                    : derivandoCaja
                      ? "Derivando"
                    : `Derivar: ${inscripcion.programa || "Cajera"}`}
              </span>
            </button>
            {cursosAdicionalesDisponibles > 0 ? (
              <button
                className="secretaria-secondary-button"
                type="button"
                onClick={abrirCursoAdicional}
              >
                <ClipboardCheck size={17} />
                <span>Registrar curso adicional</span>
              </button>
            ) : null}
          </div>
        )
      )}
    </section>
  );
}

export default SecretariaStudentPanel;
