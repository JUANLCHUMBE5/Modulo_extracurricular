import { IconCircleCheck as CheckCircle2 } from "@tabler/icons-react";

function SecretariaSuccessModal({ inscripcion, onClose }) {
  if (!inscripcion) return null;

  return (
    <div className="secretaria-modal-overlay" role="presentation">
      <section className="secretaria-success-modal" role="dialog" aria-modal="true">
        <div className="secretaria-success-icon">
          <CheckCircle2 size={44} />
        </div>
        <h2>Inscripción registrada</h2>
        <p>La inscripcion fue registrada correctamente.</p>
        <div className="secretaria-success-summary">
          <p><strong>Estudiante:</strong> {inscripcion.nombresEstudiante}</p>
          <p><strong>Programa:</strong> {inscripcion.programa}</p>
          <p><strong>Horario:</strong> {inscripcion.horario}</p>
          {inscripcion.colegioProcedencia ? (
            <p><strong>Colegio:</strong> {inscripcion.colegioProcedencia}</p>
          ) : null}
          <p><strong>Padre/apoderado:</strong> {inscripcion.apoderado}</p>
          <p><strong>Estado:</strong> {inscripcion.estadoInscripción}</p>
        </div>
        <button
          className="secretaria-register-button"
          type="button"
          onClick={onClose}
        >
          Aceptar
        </button>
      </section>
    </div>
  );
}

export default SecretariaSuccessModal;
