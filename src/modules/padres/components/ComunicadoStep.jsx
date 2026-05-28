import {
  IconAlertCircle as AlertCircle,
  IconFileText as FileText,
} from "@tabler/icons-react";
import PortalBadge from "./PortalBadge";

export default function ComunicadoStep({
  comunicadoPadres,
  infoProgramaAceptada,
  programa,
  setInfoProgramaAbierta,
  setInfoProgramaAceptada,
  setPasoActivo,
}) {
  if (!programa) {
    return (
      <article className="padres-flow-panel padres-flow-empty-inline">
        <AlertCircle size={24} />
        <strong>Sin comunicado disponible</strong>
        <p>Primero Coordinacion debe asignar o publicar un programa.</p>
      </article>
    );
  }

  return (
    <article className="padres-flow-panel padres-flow-step-panel">
      <div className="padres-flow-section-title">
        <div>
          <PortalBadge tone="orange">Comunicado oficial</PortalBadge>
          <h2>Revise la información del programa</h2>
          <p>La familia debe leer y aceptar el comunicado antes de confirmar datos y pasar al pago.</p>
        </div>
      </div>

      <div className="padres-flow-letter">
        {comunicadoPadres.fecha ? <p>{comunicadoPadres.fecha}</p> : null}
        {comunicadoPadres.parrafos.map((parrafo, index) => (
          <p key={`${index}-${parrafo}`}>{parrafo}</p>
        ))}
      </div>

      <div className="padres-flow-requirements">
        <h3>Indicaciones principales</h3>
        <ul>
          <li>El estudiante debe asistir de forma continua y puntual al horario indicado.</li>
          <li>Debe mantener orden y disciplina durante el programa.</li>
          <li>Debe llevar los materiales solicitados por el docente.</li>
          <li>Si lleva almuerzo, la lonchera debe estar rotulada.</li>
        </ul>
      </div>

      <label className="padres-flow-check">
        <input
          type="checkbox"
          checked={infoProgramaAceptada}
          onChange={(event) => setInfoProgramaAceptada(event.target.checked)}
        />
        <span>He leído y acepto la información del programa.</span>
      </label>

      <div className="padres-flow-actions">
        <button className="padres-flow-secondary-button" type="button" onClick={() => setInfoProgramaAbierta(true)}>
          <FileText size={16} />
          Ver comunicado completo
        </button>
        <button
          className="padres-flow-primary-button"
          type="button"
          disabled={!infoProgramaAceptada}
          onClick={() => setPasoActivo(2)}
        >
          Continuar a datos
        </button>
      </div>
    </article>
  );
}
