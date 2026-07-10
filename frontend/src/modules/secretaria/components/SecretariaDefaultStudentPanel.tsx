import { Loader, Badge, Alert, Button } from "@mantine/core";
import SecretariaWorkshopAttendanceRow from "./SecretariaWorkshopAttendanceRow";
import {
  IconCircleCheck as CheckCircle2,
  IconClipboardCheck as ClipboardCheck,
  IconLoader2 as Loader2,
  IconPrinter as Printer,
  IconSearch as Search,
  IconSend as Send,
  IconAlertTriangle as AlertTriangle,
  IconUserCheck as UserCheck,
  IconMail as Mail,
} from "@tabler/icons-react";
import { resumirClaseSecretaria } from "./SecretariaFields";
import {
  describirSeleccionCambridge,
  obtenerPillEstadoInscripcion,
  obtenerInfoBoxConfig,
} from "./SecretariaStudentPanelHelpers";

export default function SecretariaDefaultStudentPanel({
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
            .map((name: string) => name[0])
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
                const normalizar = (p: string) => String(p || "").toLowerCase().includes("verano") ? "Ciclo verano" : "Año escolar";
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
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

      {modoBusquedaAsistencia && estudiante && inscripcionesEstudiante.length === 0 && (
        <div style={{
          marginTop: "20px",
          background: "#fffdf5",
          border: "1px solid #ffe082",
          borderLeft: "4px solid #ffb300",
          padding: "16px 20px",
          borderRadius: "12px",
          color: "#b7791f",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          width: "100%",
          gridColumn: "1 / -1",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
        }}>
          <AlertTriangle size={24} style={{ color: "#ffb300", flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "14px", display: "block", marginBottom: "3px", color: "#92400e" }}>
              Sin Talleres Matriculados
            </strong>
            <span style={{ fontSize: "12.5px", color: "#b45309", lineHeight: "1.4" }}>
              El estudiante no registra matrículas ni talleres extracurriculares activos en el período seleccionado.
            </span>
          </div>
        </div>
      )}


      {!modoBusquedaAsistencia && (
        !inscripcion ? (
          <>
            {!tieneInvitacionOperativa && (
              <div style={{
                marginTop: "16px",
                background: "#fff5f5",
                border: "1px solid #feb2b2",
                borderLeft: "4px solid #e53e3e",
                padding: "12px 16px",
                borderRadius: "8px",
                color: "#c53030",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                gridColumn: "1 / -1",
                marginBottom: "12px"
              }}>
                <AlertTriangle size={20} style={{ color: "#e53e3e", flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: "13.5px", display: "block", marginBottom: "2px", color: "#9b2c2c" }}>Estudiante no invitado / Sin habilitación</strong>
                  <span style={{ fontSize: "12px", color: "#c53030" }}>Este alumno no figura en la lista de invitados para este período. Solicite la habilitación manual al Módulo de Coordinación Académica.</span>
                </div>
              </div>
            )}
            <button
              className="secretaria-register-button"
              type="button"
              onClick={abrirRegistro}
              disabled={(invitacionSinHorario || !tieneInvitacionOperativa) && !inscripcion}
            >
              <ClipboardCheck size={17} />
              <span>
                {!tieneInvitacionOperativa 
                  ? "No invitado - Requiere Habilitación" 
                  : (invitacionSinHorario ? "Falta horario en Coordinación Académica" : "Registrar inscripcion")}
              </span>
            </button>
          </>
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
