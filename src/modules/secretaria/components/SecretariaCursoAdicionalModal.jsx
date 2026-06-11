import {
  IconBook as BookOpen,
  IconCheck as Check,
  IconLoader2 as Loader2,
  IconX as X,
  IconClock as Clock,
  IconUser as User,
  IconCalendarEvent as CalendarEvent,
  IconUsers as Users,
  IconInfoCircle as InfoCircle,
} from "@tabler/icons-react";
import { formatearFechaPeru } from "../../../services/dateService";
import { formatearCuposSecretaria } from "./SecretariaFields";

function SecretariaCursoAdicionalModal({
  cursoId,
  estudiante,
  guardando,
  inscripcionActual,
  onCancel,
  onChange,
  onSubmit,
  programas,
}) {
  if (!estudiante) return null;

  const programaSeleccionado = programas.find((p) => p.id === cursoId);

  return (
    <div className="secretaria-modal-overlay" role="presentation">
      <section className="secretaria-card secretaria-add-course-modal" role="dialog" aria-modal="true">
        <div className="secretaria-add-course-head">
          <div className="secretaria-add-course-title">
            <span>
              <BookOpen size={25} />
            </span>
            <h2>Curso adicional</h2>
          </div>
          <button className="secretaria-modal-close" type="button" onClick={onCancel} aria-label="Cerrar curso adicional">
            <X size={18} />
          </button>
        </div>

        <p className="secretaria-add-course-student">
          <strong>Estudiante:</strong> {estudiante.nombres}
          <span>
            Código {estudiante.codigoEstudiante || "sin código"} · {inscripcionActual?.programa || estudiante.programaNombre || "Sin curso previo"}
          </span>
        </p>

        <form className="secretaria-add-course-form" onSubmit={onSubmit}>
          <label htmlFor="cursoAdicional">Seleccione curso adicional:</label>
          <select
            id="cursoAdicional"
            value={cursoId}
            onChange={(event) => onChange(event.target.value)}
            disabled={!programas.length || guardando}
          >
            {programas.length ? (
              programas.map((programa) => (
                <option key={programa.id} value={programa.id}>
                  {programa.nombre} (S/ {Number(programa.costo || 0).toFixed(0)})
                </option>
              ))
            ) : (
              <option value="">No hay cursos adicionales disponibles</option>
            )}
          </select>

          {programaSeleccionado ? (
            <div className="secretaria-program-details-card" style={{ marginTop: "1rem", marginBottom: "1.25rem", width: "100%", boxSizing: "border-box" }}>
              <h4 className="secretaria-details-card-title" style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1e293b" }}>
                Resumen del Taller
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={13} /> Horario
                  </span>
                  <strong style={{ fontSize: "0.85rem", color: "#334155" }}>
                    {programaSeleccionado.horario || "Por definir"}
                  </strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <User size={13} /> Tutor
                  </span>
                  <strong style={{ fontSize: "0.85rem", color: "#334155" }}>
                    {programaSeleccionado.docente || "No asignado"}
                  </strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CalendarEvent size={13} /> Vigencia
                  </span>
                  <strong style={{ fontSize: "0.85rem", color: "#334155" }}>
                    {programaSeleccionado.fechaInicio && programaSeleccionado.fechaFin
                      ? `${formatearFechaPeru(programaSeleccionado.fechaInicio)} al ${formatearFechaPeru(programaSeleccionado.fechaFin)}`
                      : "Por definir"}
                  </strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Users size={13} /> Cupos
                  </span>
                  <strong style={{ fontSize: "0.85rem", color: "#16a34a" }}>
                    {formatearCuposSecretaria(programaSeleccionado)}
                  </strong>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", margin: "0.5rem 0", paddingTop: "0.5rem" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Costo del Taller</span>
                  <strong style={{ fontSize: "1.1rem", color: "#1e3a8a" }}>
                    S/ {Number(programaSeleccionado.costo || 0).toFixed(2)}
                  </strong>
                </div>
              </div>
              {programaSeleccionado.requisitos ? (
                <>
                  <div style={{ borderTop: "1px solid #e2e8f0", margin: "0.5rem 0", paddingTop: "0.5rem" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      <InfoCircle size={13} /> Requisitos
                    </span>
                    <p style={{ fontSize: "0.8rem", color: "#475569", margin: "0", lineHeight: "1.25" }}>
                      {programaSeleccionado.requisitos}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="secretaria-add-course-actions">
            <button className="secretaria-secondary-button" type="button" onClick={onCancel} disabled={guardando}>
              Cancelar
            </button>
            <button className="secretaria-register-button" type="submit" disabled={!programas.length || guardando}>
              {guardando ? <Loader2 className="secretaria-spin" size={17} /> : <Check size={17} />}
              <span>{guardando ? "Registrando" : "Registrar curso"}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SecretariaCursoAdicionalModal;
