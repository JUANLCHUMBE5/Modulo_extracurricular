import {
  IconCircleCheck as CheckCircle2,
} from "@tabler/icons-react";
import { resumirHorarioSecretaria } from "./SecretariaFields";

function SecretariaSuccessModal({ inscripcion, onClose }) {
  if (!inscripcion) return null;
  const horario = resumirHorarioSecretaria(inscripcion.horario);

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
          <p><strong>Día(s):</strong> {horario.dia || "No definido"}</p>
          <p><strong>Hora:</strong> {horario.clase || "No definido"}</p>
          {inscripcion.colegioProcedencia ? (
            <p><strong>Colegio:</strong> {inscripcion.colegioProcedencia}</p>
          ) : null}
          <p><strong>Padre/apoderado:</strong> {inscripcion.apoderado}</p>
          <p><strong>Estado:</strong> {inscripcion.estadoInscripción}</p>
        </div>
        <div className="secretaria-final-actions secretaria-success-actions">
          <button
            className="secretaria-register-button"
            type="button"
            onClick={onClose}
          >
            Aceptar
          </button>
        </div>
      </section>
    </div>
  );
}

export default SecretariaSuccessModal;
