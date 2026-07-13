import React from "react";
import {
  IconCalendar as CalendarDays,
  IconUserCircle as UserRound,
  IconWallet as Wallet,
  IconCircleCheck as CheckCircle,
  IconCheck as Check,
  IconSchool as School,
  IconClock,
  IconPresentation,
  IconTag,
} from "@tabler/icons-react";
import {
  dividirHorarioPadres,
  convertirHorasAMPM,
  formatearRangoFechasPadres,
  repararTexto,
  formatearHorarioDetalle,
} from "../utils/padresTextUtils";
import { obtenerVentanaInscripcion } from "../../../services/dateService";

export function obtenerEstadoPagoPadres(inscripcion: any = {}) {
  const registro = inscripcion || {};
  const texto = String(`${registro.estadoPago || ""} ${registro.estadoInscripcion || ""}`)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["completado", "pagado", "validado", "pago validado", "exitoso"].some((item) => texto.includes(item))) return "pagado";
  
  if (inscripcion?.derivadoCaja || inscripcion?.estadoCaja === "reservado_caja") {
    return "pendiente_caja";
  }
  
  if (["verificando", "verificacion", "por verificar", "revision", "proceso", "pendiente_validacion"].some((item) => texto.includes(item))) return "verificando";
  return "pendiente";
}

export function formatearInicioTaller(fechaStr: string) {
  if (!fechaStr) return "Por definir";
  const partes = String(fechaStr).split("-");
  if (partes.length !== 3) return fechaStr;

  const yyyy = parseInt(partes[0], 10);
  const mm = parseInt(partes[1], 10) - 1;
  const dd = parseInt(partes[2], 10);
  const fecha = new Date(yyyy, mm, dd);

  if (Number.isNaN(fecha.getTime())) return fechaStr;

  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const diaNombre = diasSemana[fecha.getDay()];

  const diaStr = String(dd).padStart(2, "0");
  const mesStr = String(mm + 1).padStart(2, "0");
  
  return `${diaNombre}, ${diaStr}/${mesStr}/${yyyy}`;
}

export function formatearFechaLimiteEnPalabras(fechaStr: string) {
  if (!fechaStr) return "";
  const partes = String(fechaStr).split("-");
  if (partes.length !== 3) return fechaStr;
  const yyyy = parseInt(partes[0], 10);
  const mm = parseInt(partes[1], 10) - 1;
  const dd = parseInt(partes[2], 10);
  const fecha = new Date(yyyy, mm, dd);
  if (Number.isNaN(fecha.getTime())) return fechaStr;

  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${dd} de ${meses[mm]} de ${yyyy}`;
}

export function calcularPrimerDiaClase(fechaInicioStr: string, horarioStr: string) {
  if (!fechaInicioStr) return "Por definir";

  const texto = repararTexto(String(horarioStr || "")).trim();
  const completo = dividirHorarioPadres(texto);
  const simple = !completo ? texto.match(/^(.+?)\s+clase\s+(.+?)(?:\s+almuerzo\s+(.+))?$/i) : null;
  const diaNombreRaw = completo?.dia || simple?.[1]?.trim() || "";

  if (!diaNombreRaw) {
    return formatearInicioTaller(fechaInicioStr);
  }

  const diaLower = diaNombreRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const diasMap: any = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6
  };

  const targetDayOfWeek = diasMap[diaLower];
  if (targetDayOfWeek === undefined) {
    return formatearInicioTaller(fechaInicioStr);
  }

  const partes = String(fechaInicioStr).split("-");
  if (partes.length !== 3) return fechaInicioStr;

  const yyyy = parseInt(partes[0], 10);
  const mm = parseInt(partes[1], 10) - 1;
  const dd = parseInt(partes[2], 10);
  const fecha = new Date(yyyy, mm, dd);

  if (Number.isNaN(fecha.getTime())) return fechaInicioStr;

  const currentDayOfWeek = fecha.getDay();
  let diff = targetDayOfWeek - currentDayOfWeek;
  if (diff < 0) {
    diff += 7;
  }

  if (diff > 0) {
    fecha.setDate(fecha.getDate() + diff);
  }

  const ddNueva = fecha.getDate();
  const mmNueva = fecha.getMonth();
  const yyyyNueva = fecha.getFullYear();

  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const diaNombre = diasSemana[fecha.getDay()];

  const diaStr = String(ddNueva).padStart(2, "0");
  const mesStr = String(mmNueva + 1).padStart(2, "0");

  return `${diaNombre}, ${diaStr}/${mesStr}/${yyyyNueva}`;
}

export function HorarioCompactoPadres({ horario, talleresDeportivos }: any) {
  const texto = repararTexto(String(horario || "")).trim();

  if (!texto) {
    return (
      <div className="padres-flow-course-schedule">
        <div className="padres-schedule-empty">
          <CalendarDays size={14} />
          <span>Horario por confirmar</span>
        </div>
      </div>
    );
  }

  const completo = dividirHorarioPadres(texto);
  const simple = !completo ? texto.match(/^(.+?)\s+clase\s+(.+?)(?:\s+almuerzo\s+(.+))?$/i) : null;

  const dia = completo?.dia || simple?.[1]?.trim();
  const clase = completo?.clase || simple?.[2]?.trim();
  const almuerzo = completo?.almuerzo || simple?.[3]?.trim();

  if (dia || clase) {
    return (
      <div className="padres-flow-course-schedule is-simple">
        <div className="padres-schedule-item">
          <CalendarDays size={14} />
          <span>{[dia, convertirHorasAMPM(clase)].filter(Boolean).join(": ")}</span>
        </div>
        {almuerzo ? (
          <div className="padres-schedule-item" style={{ fontSize: "12px", color: "#64748b", paddingLeft: "22px", marginTop: "2px" }}>
            <span>Almuerzo: {convertirHorasAMPM(almuerzo)}</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="padres-flow-course-schedule">
      <div className="padres-schedule-item">
        <CalendarDays size={14} />
        <span>{convertirHorasAMPM(texto)}</span>
      </div>
    </div>
  );
}

export default function ProgramDetailsCard({
  programa,
  nombrePrograma,
  nivelesTalleres,
  deportesUnicos,
  inscripcion,
  noteBg,
  noteBorderColor,
  noteTextColor,
  noteIconColor,
  noteText,
  buttonDisabled,
  buttonAction,
  buttonText,
  formatearSoles,
  IconHead,
}: any) {
  const esDeportivo = (Array.isArray(programa.talleresDeportivos) && programa.talleresDeportivos.length > 0) ||
    String(programa.nombre || "").toLowerCase().includes("deport") ||
    String(programa.nombre || "").toLowerCase().includes("deprot") ||
    String(programa.programa || "").toLowerCase().includes("deport") ||
    String(programa.programa || "").toLowerCase().includes("deprot");

  const esCambridge = String([programa.programa, programa.nombre, programa.categoria, programa.plantilla].filter(Boolean).join(" ")).toLowerCase().includes("cambridge");
  const datosHorario = dividirHorarioPadres(programa.horario);

  return (
    <article className="padres-flow-panel padres-flow-program-card custom-padres-program-card">
      <div className="padres-details-box-container">
        <div className="padres-flow-program-head custom-program-head">
          <div className="head-left-side">
            <span className="padres-flow-program-icon custom-math-icon-box">
              <IconHead size={22} fill="currentColor" />
            </span>
            <div className="head-text-block">
              <h2>{repararTexto(nombrePrograma)}</h2>
              {nivelesTalleres.length > 0 ? (
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", display: "block", marginTop: "2px" }}>
                  Modalidad: {nivelesTalleres.join(", ")}
                </span>
              ) : null}
              {deportesUnicos.length > 0 ? (
                <span style={{ fontSize: "11.5px", color: "#059669", fontWeight: "800", textTransform: "uppercase", display: "block", marginTop: "2px" }}>
                  DISPONIBLES: {deportesUnicos.join(", ")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="head-right-side">
            <span className="badge-school-invitation">
              <School size={14} style={{ marginRight: "5px", verticalAlign: "middle" }} />
              {esDeportivo
                ? "Invitación Deportiva"
                : esCambridge
                  ? "Invitación Cambridge"
                  : "Invitación Académica"}
            </span>
            {inscripcion && (
              <span className="badge-school-assigned">
                <Check size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                Asignado
              </span>
            )}
          </div>
        </div>

        {(() => {
          const gridStyle = {
            gridTemplateColumns: esDeportivo
              ? "minmax(250px, 1.4fr) repeat(2, minmax(140px, 0.7fr))"
              : "minmax(250px, 1.4fr) repeat(3, minmax(140px, 0.7fr))"
          };

          return (
            <div className="padres-flow-program-grid custom-program-grid" style={gridStyle}>
              <div className="padres-flow-info-tile custom-info-tile">
                <span className="padres-flow-info-icon custom-icon-circle">
                  <IconClock size={18} />
                </span>
                <div className="info-tile-text-container">
                  {datosHorario ? (
                    <div className="custom-schedule-stack">
                      <span className="custom-schedule-label">HORARIO - {String(datosHorario.grados || "").toUpperCase()}</span>
                      <strong className="custom-schedule-day">DIAS: {datosHorario.dia}</strong>
                      <span className="custom-schedule-class">CLASE: {convertirHorasAMPM(datosHorario.clase.replace(/\s*·.*$/, ""))}</span>
                      {datosHorario.almuerzo ? (
                        <span className="custom-schedule-class">ALMUERZO: {convertirHorasAMPM(datosHorario.almuerzo)}</span>
                      ) : null}
                      {datosHorario.clase.includes("·") ? (
                        <span className="custom-schedule-class">
                          {(() => {
                            const rawAula = datosHorario.clase.replace(/^.*·\s*/, "");
                            const numeroAula = rawAula.replace(/aula\s*/i, "").trim();
                            return `AULA: ${numeroAula}`;
                          })()}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="custom-schedule-stack">
                      <span className="custom-schedule-label">Horario</span>
                      <strong className="custom-schedule-day" style={{ whiteSpace: "pre-line" }}>{formatearHorarioDetalle(convertirHorasAMPM(programa.horario) || "Por confirmar")}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="padres-flow-info-tile custom-info-tile">
                <span className="padres-flow-info-icon custom-icon-circle">
                  <CalendarDays size={18} />
                </span>
                <div className="info-tile-text-container">
                  <span>Vigencia</span>
                  <strong className="detail-value text-bold">
                    {(() => {
                      if (programa.usarFechaLimiteInscripcion && programa.fechaLimiteInscripcion) {
                        return `Hasta el ${formatearFechaLimiteEnPalabras(programa.fechaLimiteInscripcion)}`;
                      }
                      
                      const ventana = obtenerVentanaInscripcion(
                        programa.fechaInicio,
                        new Date(),
                        programa.duracionAvisoDias,
                        programa.horaLimiteAviso,
                        programa
                      );
                      if (ventana.fechaLimite) {
                        const partes = ventana.fechaLimite.split("/");
                        if (partes.length === 3) {
                          const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
                          const mIdx = parseInt(partes[1], 10) - 1;
                          return `Hasta el ${parseInt(partes[0], 10)} de ${meses[mIdx]} de ${partes[2]}`;
                        }
                        return `Hasta el ${ventana.fechaLimite}`;
                      }

                      return "Por confirmar";
                    })()}
                  </strong>
                </div>
              </div>

              {!esDeportivo && (
                <div className="padres-flow-info-tile custom-info-tile">
                  <span className="padres-flow-info-icon custom-icon-circle">
                    <IconPresentation size={18} />
                  </span>
                  <div className="info-tile-text-container">
                    <span>Profesor(a)</span>
                    <strong className="detail-value text-bold">{programa.docente || programa.responsable || "Por definir"}</strong>
                  </div>
                </div>
              )}

              <div className="padres-flow-info-tile custom-info-tile is-price">
                <span className="padres-flow-info-icon custom-icon-circle">
                  <IconTag size={18} />
                </span>
                <div className="info-tile-text-container">
                  <span>Costo</span>
                  <strong className="detail-value price-bold">{formatearSoles(programa.costo)}</strong>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="padres-flow-program-note custom-program-note" style={{ background: noteBg, borderTop: `1px solid ${noteBorderColor}` }}>
          <p style={{ color: noteTextColor, display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle size={18} style={{ color: noteIconColor, flexShrink: 0 }} />
            {noteText}
          </p>
          <button
            className="padres-flow-primary-button custom-action-btn"
            type="button"
            disabled={buttonDisabled}
            onClick={buttonAction}
            style={buttonDisabled && buttonText !== "Pago exitoso" ? { background: "#e2e8f0", color: "#64748b", cursor: "not-allowed", border: "1px solid #cbd5e1" } : {}}
          >
            {buttonText}
            {buttonText === "Pago exitoso" && <Check size={14} style={{ marginLeft: "6px" }} />}
          </button>
        </div>
      </div>
    </article>
  );
}
