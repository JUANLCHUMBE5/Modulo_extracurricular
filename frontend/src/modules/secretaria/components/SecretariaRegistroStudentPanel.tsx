import { Badge } from "@mantine/core";
import {
  IconCircleCheck as CheckCircle2,
  IconAlertTriangle as AlertTriangle,
  IconMail as Mail,
  IconCircleX as CircleX,
  IconCreditCard as CreditCard,
  IconId as IdCard,
  IconUserCheck as UserCheck,
  IconEye as Eye,
} from "@tabler/icons-react";
import {
  obtenerInfoBoxConfig,
} from "./SecretariaStudentPanelHelpers";

export default function SecretariaRegistroStudentPanel({
  estudiante,
  inscripcion,
  programas,
  esCicloVerano,
  invitacionSinHorario,
  tieneInvitacionOperativa,
  tipoAlumnoMostrado,
  noProgramasDisponibles = false,
  inscripcionesEstudiante = [],
  onVerAsistencia,
}) {
  if (!estudiante) return null;

  const esPagoCompletado = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(
    (est) => String(inscripcion?.estadoPago || "").toLowerCase().includes(est) || String(inscripcion?.estadoInscripcion || "").toLowerCase().includes(est)
  );

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

      <div style={{
        background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
        borderRadius: "12px",
        padding: "10px 14px",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        border: "1px solid #a5d6a7"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              .map((name: string) => name[0])
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

        {/* Eye icon / button for viewing attendance history */}
        {inscripcionesEstudiante && inscripcionesEstudiante.length > 0 && (
          <button
            type="button"
            onClick={() => onVerAsistencia?.(inscripcionesEstudiante[0])}
            title="Ver Historial de Asistencia"
            style={{
              background: "#ffffff",
              border: "1px solid #a5d6a7",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#2e7d32",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#e8f5e9";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Eye size={18} />
          </button>
        )}
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
        background: esPagoCompletado ? "#e8f5e9" : "#fff8e1",
        borderLeft: esPagoCompletado ? "4px solid #43a047" : "4px solid #fbc02d",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        color: esPagoCompletado ? "#1b5e20" : "#4e342e",
        marginTop: "12px",
        display: "flex",
        alignItems: "flex-start",
        gap: "8px"
      }}>
        {esPagoCompletado ? (
          <CheckCircle2 size={14} style={{ color: "#43a047", marginTop: "1px", flexShrink: 0 }} />
        ) : (
          <IconoBox size={14} style={{ color: "#f57f17", marginTop: "1px", flexShrink: 0 }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <strong style={{ fontWeight: "700", color: esPagoCompletado ? "#1b5e20" : "#4e342e" }}>
            {esPagoCompletado
              ? "Matrícula completada"
              : tieneInvitacionOperativa
                ? "Invitación individual"
                : noProgramasDisponibles
                  ? "Sin taller disponible"
                  : "Invitación masiva"}
          </strong>
          <span style={{ fontSize: "11.5px", lineHeight: "1.3" }}>
            {esPagoCompletado ? (
              "El estudiante ya cuenta con un taller matriculado."
            ) : inscripcion?.derivadoCaja ? (
              `Derivado exitosamente a Cajera: ${inscripcion.programa || "taller seleccionado"}. Este mismo taller ya no se puede derivar otra vez.`
            ) : tieneInvitacionOperativa ? (
              "El estudiante tiene invitación registrada. Asistente solo podrá inscribirlo en el programa asignado por Coordinación Académica."
            ) : noProgramasDisponibles ? (
              "No cuenta con taller disponible."
            ) : (
              "No tiene invitación individual. Asistente puede registrarlo en los programas marcados por Coordinación Académica como invitación masiva."
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
