import { useState, useEffect, useMemo } from "react";
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
  IconInfoCircle as InfoCircle,
  IconUserCheck as UserCheck,
  IconFileDownload as FileDown,
  IconCalendar as CalendarDays,
  IconMail as Mail,
  IconCircleX as CircleX,
  IconCreditCard as CreditCard,
  IconId as IdCard,
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
  modoRegistro = false,
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

  if (modoRegistro) {
    const config = obtenerInfoBoxConfig({
      inscripcion,
      programas,
      esCicloVerano,
      invitacionSinHorario,
      tieneInvitacionOperativa,
    });
    const IconoBox = config.Icono;

    const invitacionBadge = tieneInvitacionOperativa && !invitacionSinHorario
      ? { class: 'success', text: 'CON INVITACIÓN', icon: CheckCircle2 }
      : invitacionSinHorario
        ? { class: 'warning', text: 'FALTA HORARIO', icon: AlertTriangle }
        : { class: 'secondary', text: 'SIN INVITACIÓN', icon: Mail };

    const inscripcionBadge = estudiante.estadoInscripción === "Inscrito"
      ? { class: 'success', text: 'INSCRITO', icon: CheckCircle2 }
      : { class: 'danger', text: 'NO INSCRITO', icon: CircleX };

    const pagoBadge = esPagoCompletado || estudiante.estadoPago === "Pagado"
      ? { class: 'success', text: 'Pagado', icon: CheckCircle2 }
      : { class: 'warning', text: 'Sin pago', icon: CreditCard };

    return (
      <section className="secretaria-student-panel">
        {/* Title */}
        <div style={{
          fontSize: "12px",
          fontWeight: "750",
          color: "#558b2f",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <IdCard size={16} style={{ color: "#43a047" }} />
          <span>DATOS DEL ESTUDIANTE</span>
        </div>

        {/* Student Banner */}
        <div style={{
          background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
          borderRadius: "12px",
          padding: "10px 14px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          border: "1px solid #a5d6a7"
        }}>
          <div style={{
            width: "36px",
            height: "36px",
            background: "#388e3c",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "15px",
            fontWeight: "700",
            flexShrink: 0
          }}>
            {estudiante.nombres
              .split(" ")
              .slice(0, 2)
              .map((name) => name[0])
              .join("")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <h3 style={{ fontSize: "14.5px", fontWeight: "800", color: "#1b5e20", margin: 0, padding: 0 }}>
              {estudiante.nombres}
            </h3>
            <span style={{ fontSize: "11px", color: "#2e7d32", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={12} style={{ color: "#43a047" }} />
              DNI {estudiante.dni || "No registrado"} &middot; {estudiante.codigoEstudiante || "Sin código"}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 12px",
          marginBottom: "12px"
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", letterSpacing: "0.4px" }}>Código</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a2a", marginTop: "1px" }}>
              <span style={{ background: "#e8f5e9", padding: "2px 8px", borderRadius: "30px", fontSize: "11px", fontWeight: "700", color: "#1b5e20" }}>
                {estudiante.codigoEstudiante || "--"}
              </span>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", letterSpacing: "0.4px" }}>Grado</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a2a", marginTop: "1px" }}>{estudiante.grado}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", letterSpacing: "0.4px" }}>Periodo</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a2a", marginTop: "1px" }}>
              {esCicloVerano ? "Ciclo Verano" : "Año Escolar"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#558b2f", textTransform: "uppercase", letterSpacing: "0.4px" }}>Sección / Aula</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e3a2a", marginTop: "1px" }}>{estudiante.seccion || "--"}</span>
          </div>
        </div>

        {/* Status Badges Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "6px",
          marginTop: "8px"
        }}>
          <span style={{
            background: invitacionBadge.class === "success" ? "#e8f5e9" : invitacionBadge.class === "warning" ? "#fff8e1" : "#f5f5f5",
            color: invitacionBadge.class === "success" ? "#1b5e20" : invitacionBadge.class === "warning" ? "#e65100" : "#616161",
            borderColor: invitacionBadge.class === "success" ? "#a5d6a7" : invitacionBadge.class === "warning" ? "#ffe082" : "#e0e0e0",
            borderWidth: "1px",
            borderStyle: "solid",
            padding: "4px 6px",
            borderRadius: "30px",
            fontSize: "10px",
            fontWeight: "750",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            justifyContent: "center"
          }}>
            <invitacionBadge.icon size={11} /> {invitacionBadge.text}
          </span>
          <span style={{
            background: inscripcionBadge.class === "success" ? "#e8f5e9" : "#ffebee",
            color: inscripcionBadge.class === "success" ? "#1b5e20" : "#c62828",
            borderColor: inscripcionBadge.class === "success" ? "#a5d6a7" : "#ffcdd2",
            borderWidth: "1px",
            borderStyle: "solid",
            padding: "4px 6px",
            borderRadius: "30px",
            fontSize: "10px",
            fontWeight: "750",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            justifyContent: "center"
          }}>
            <inscripcionBadge.icon size={11} /> {inscripcionBadge.text}
          </span>
          <span style={{
            background: "#e8f5e9",
            color: "#1b5e20",
            borderColor: "#a5d6a7",
            borderWidth: "1px",
            borderStyle: "solid",
            padding: "4px 6px",
            borderRadius: "30px",
            fontSize: "10px",
            fontWeight: "750",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            justifyContent: "center"
          }}>
            <UserCheck size={11} /> {tipoAlumnoMostrado}
          </span>
          <span style={{
            gridColumn: "span 3",
            background: pagoBadge.class === "success" ? "#e8f5e9" : "#fff8e1",
            color: pagoBadge.class === "success" ? "#1b5e20" : "#e65100",
            borderColor: pagoBadge.class === "success" ? "#a5d6a7" : "#ffe082",
            borderWidth: "1px",
            borderStyle: "solid",
            padding: "4px 10px",
            borderRadius: "30px",
            fontSize: "11px",
            fontWeight: "750",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            justifyContent: "center"
          }}>
            <pagoBadge.icon size={12} /> Estado pago: <strong style={{ marginLeft: "2px" }}>{pagoBadge.text}</strong>
          </span>
        </div>

        {/* Invitation Note Info Box */}
        <div style={{
          background: "#fff8e1",
          borderLeft: "4px solid #fbc02d",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#4e342e",
          marginTop: "12px",
          display: "flex",
          alignItems: "flex-start",
          gap: "8px"
        }}>
          <IconoBox size={14} style={{ color: "#f57f17", marginTop: "1px", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <strong style={{ fontWeight: "700", color: "#4e342e" }}>
              {tieneInvitacionOperativa ? "Invitación individual" : "Invitación masiva"}
            </strong>
            <span style={{ fontSize: "11.5px", lineHeight: "1.3" }}>
              {inscripcion?.derivadoCaja ? (
                `Derivado exitosamente a Cajera: ${inscripcion.programa || "taller seleccionado"}. Este mismo taller ya no se puede derivar otra vez.`
              ) : tieneInvitacionOperativa ? (
                "El estudiante tiene invitación registrada. Asistente solo podrá inscribirlo en el programa asignado por Coordinación Académica."
              ) : (
                "No tiene invitación individual. Asistente puede registrarlo en los programas marcados por Coordinación Académica como invitación masiva."
              )}
            </span>
          </div>
        </div>
      </section>
    );
  }

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

      {modoBusquedaAsistencia && inscripcionesEstudiante.length === 0 && (
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
