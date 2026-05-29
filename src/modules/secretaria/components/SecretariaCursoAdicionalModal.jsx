import {
  IconBook as BookOpen,
  IconCheck as Check,
  IconLoader2 as Loader2,
  IconX as X,
} from "@tabler/icons-react";

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
