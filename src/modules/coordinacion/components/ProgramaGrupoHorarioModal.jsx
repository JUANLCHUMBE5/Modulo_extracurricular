import {
  IconAlertCircle as AlertCircle,
  IconCalendar as CalendarDays,
  IconCircleCheck as CheckCircle2,
  IconX as X,
} from "@tabler/icons-react";
import GradeSelector from "./GradeSelector";

export default function ProgramaGrupoHorarioModal({
  cerrarGrupoModal,
  diasSemana,
  grupoDraft,
  grupoDraftError,
  grupoDraftErrorTick,
  guardarGrupoDraft,
  nivelesGrados,
  toggleGradoDraft,
  actualizarGrupoDraft,
}) {
  return (
    <div className="coord-modal-overlay" style={{ zIndex: 2200 }}>
      {grupoDraftError ? (
        <div className="coord-floating-error" role="alert" key={grupoDraftErrorTick}>
          <AlertCircle size={15} />
          {grupoDraftError}
        </div>
      ) : null}
      <div className="coord-modal coord-nested-turn-modal" onClick={e => e.stopPropagation()}>
        <div className="coord-modal-header">
          <div className="coord-modal-title">
            <span className="coord-modal-icon"><CalendarDays size={20} /></span>
            <div>
              <h2>Añadir día para otros grados</h2>
              <p>Registre solo los grados que no usan el horario base.</p>
            </div>
          </div>
          <button className="coord-modal-close" type="button" onClick={cerrarGrupoModal}><X size={20} /></button>
        </div>
        <div className="coord-program-form-main coord-nested-turn-body" style={{ padding: "16px 20px" }}>
          <section className="coord-form-section coord-nested-turn-section">
            <div className="coord-section-grid">
              <div className="coord-field coord-field-full">
                <label>Grados del turno *</label>
                <GradeSelector niveles={nivelesGrados} seleccionados={grupoDraft.grados || []} onToggle={toggleGradoDraft} />
              </div>
              <div className="coord-field">
                <label>Días del turno *</label>
                <div className="coord-day-list coord-day-list-sm">
                  {diasSemana.map((dia) => {
                    const diasSeleccionados = String(grupoDraft.dia || "").split(",").map(d => d.trim()).filter(Boolean);
                    const isSelected = diasSeleccionados.includes(dia);
                    return (
                      <label className={`coord-day-chip coord-day-chip-sm ${isSelected ? "is-selected" : ""}`} key={dia}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const nuevosDias = isSelected ? diasSeleccionados.filter((d) => d !== dia) : [...diasSeleccionados, dia];
                            const diasOrdenados = diasSemana.filter(d => nuevosDias.includes(d));
                            actualizarGrupoDraft("dia", diasOrdenados.join(", "));
                          }}
                        />
                        <span title={dia}>{dia.substring(0, 2)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="coord-field"><label>Aula</label><input value={grupoDraft.aula || ""} onChange={e => actualizarGrupoDraft("aula", e.target.value)} placeholder="Ej: A-204" /></div>
              <div className="coord-field"><label>Clase inicio</label><input type="time" value={grupoDraft.horaInicio || "15:20"} onChange={e => actualizarGrupoDraft("horaInicio", e.target.value)} /></div>
              <div className="coord-field"><label>Clase fin</label><input type="time" value={grupoDraft.horaFin || "17:20"} onChange={e => actualizarGrupoDraft("horaFin", e.target.value)} /></div>
              <div className="coord-field"><label>Almuerzo inicio</label><input type="time" value={grupoDraft.almuerzoInicio || "14:20"} onChange={e => actualizarGrupoDraft("almuerzoInicio", e.target.value)} /></div>
              <div className="coord-field"><label>Almuerzo fin</label><input type="time" value={grupoDraft.almuerzoFin || "15:10"} onChange={e => actualizarGrupoDraft("almuerzoFin", e.target.value)} /></div>
              <div className="coord-field"><label>Responsable del turno</label><input value={grupoDraft.responsable || ""} onChange={e => actualizarGrupoDraft("responsable", e.target.value)} placeholder="Ej: Prof. Ana Torres" /></div>
              <div className="coord-field"><label>Tutora / apoyo del turno</label><input value={grupoDraft.tutora || ""} onChange={e => actualizarGrupoDraft("tutora", e.target.value)} placeholder="Ej: Srta. Lucia Vega" /></div>
            </div>
          </section>
        </div>
        <div className="coord-modal-actions">
          <button type="button" className="coord-secondary-button" onClick={cerrarGrupoModal}>Cancelar</button>
          <button type="button" className="coord-register-button" onClick={guardarGrupoDraft}>
            <CheckCircle2 size={17} /> <span>Guardar turno</span>
          </button>
        </div>
      </div>
    </div>
  );
}
