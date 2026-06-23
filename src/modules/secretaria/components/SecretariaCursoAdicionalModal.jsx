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
            <div className="secretaria-program-details-card secretaria-add-course-summary">
              <h4 className="secretaria-details-card-title">
                Resumen del Taller
              </h4>
              <div className="secretaria-add-course-meta">
                <div className="secretaria-add-course-meta-item is-schedule">
                  <span>
                    <Clock size={13} /> Horario
                  </span>
                  <strong>
                    {programaSeleccionado.horario || "Por definir"}
                  </strong>
                </div>
                <div className="secretaria-add-course-meta-item">
                  <span>
                    <User size={13} /> Tutor
                  </span>
                  <strong>
                    {programaSeleccionado.docente || "No asignado"}
                  </strong>
                </div>
                <div className="secretaria-add-course-meta-item">
                  <span>
                    <CalendarEvent size={13} /> Vigencia
                  </span>
                  <strong>
                    {programaSeleccionado.fechaInicio && programaSeleccionado.fechaFin
                      ? `${formatearFechaPeru(programaSeleccionado.fechaInicio)} al ${formatearFechaPeru(programaSeleccionado.fechaFin)}`
                      : "Por definir"}
                  </strong>
                </div>
                <div className="secretaria-add-course-meta-item">
                  <span>
                    <Users size={13} /> Cupos
                  </span>
                  <strong className="secretaria-add-course-cupos">
                    {formatearCuposSecretaria(programaSeleccionado)}
                  </strong>
                </div>
              </div>
              <div className="secretaria-add-course-cost">
                <div>
                  <span>Costo del Taller</span>
                  <strong>
                    S/ {Number(programaSeleccionado.costo || 0).toFixed(2)}
                  </strong>
                </div>
              </div>
              {programaSeleccionado.requisitos ? (
                <>
                  <div className="secretaria-add-course-requirements">
                    <span>
                      <InfoCircle size={13} /> Requisitos
                    </span>
                    <p>
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
