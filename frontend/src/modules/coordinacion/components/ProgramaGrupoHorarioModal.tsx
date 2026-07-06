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
  esCambridgeForm = false,
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
              <h2>Añadir grado o bloque</h2>
              <p>Registre los grados que comparten docente, días, almuerzo y horario.</p>
            </div>
          </div>
          <button className="coord-modal-close" type="button" onClick={cerrarGrupoModal}><X size={20} /></button>
        </div>
        <div className="coord-program-form-main coord-nested-turn-body" style={{ padding: "20px 24px" }}>
          <section className="coord-form-section coord-nested-turn-section" style={{ border: "none", padding: 0, margin: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Grados del bloque */}
              <div className="coord-field" style={{ margin: 0 }}>
                <label style={{ fontWeight: "600", color: "#344054", marginBottom: "8px", display: "block" }}>Grados del bloque{esCambridgeForm ? "" : " *"}</label>
                <GradeSelector niveles={nivelesGrados} seleccionados={grupoDraft.grados || []} onToggle={toggleGradoDraft} />
              </div>

              {/* Días del bloque */}
              <div className="coord-field" style={{ margin: 0 }}>
                <label style={{ fontWeight: "600", color: "#344054", marginBottom: "8px", display: "block" }}>Días del bloque *</label>
                <div className="coord-day-list coord-day-list-sm" style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: 0 }}>
                  {diasSemana.map((dia) => {
                    const diasSeleccionados = String(grupoDraft.dia || "").split(",").map(d => d.trim()).filter(Boolean);
                    const isSelected = diasSeleccionados.includes(dia);
                    return (
                      <label className={`coord-day-chip coord-day-chip-sm ${isSelected ? "is-selected" : ""}`} key={dia} style={{ cursor: "pointer" }}>
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

              {/* Grid de 2 columnas para los detalles y horarios */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                {/* Docente / Tutor */}
                <div className="coord-field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>Docente/Tutor responsable *</label>
                  <input value={grupoDraft.responsable || ""} onChange={e => actualizarGrupoDraft("responsable", e.target.value)} placeholder="Ej: Prof. Ana Torres" />
                </div>
                {/* Apoyo / Auxiliar */}
                <div className="coord-field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>Apoyo / auxiliar</label>
                  <input value={grupoDraft.tutora || ""} onChange={e => actualizarGrupoDraft("tutora", e.target.value)} placeholder="Ej: Srta. Lucia Vega" />
                </div>

                {/* Aula */}
                <div className="coord-field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>Aula</label>
                  <input value={grupoDraft.aula || ""} onChange={e => actualizarGrupoDraft("aula", e.target.value)} placeholder="Ej: A-204" />
                </div>
                {/* Cupos */}
                <div className="coord-field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>Cupos *</label>
                  <input
                    type="number"
                    min="1"
                    value={grupoDraft.cupos !== undefined ? grupoDraft.cupos : ""}
                    onChange={e => actualizarGrupoDraft("cupos", e.target.value)}
                    placeholder="Ej: 20"
                  />
                </div>

                {/* Hora inicio de clase */}
                <div className="coord-field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>Hora inicio de clase *</label>
                  <input type="time" value={grupoDraft.horaInicio || "15:20"} onChange={e => actualizarGrupoDraft("horaInicio", e.target.value)} />
                </div>
                {/* Hora fin de clase */}
                <div className="coord-field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>Hora fin de clase *</label>
                  <input type="time" value={grupoDraft.horaFin || "17:20"} onChange={e => actualizarGrupoDraft("horaFin", e.target.value)} />
                </div>

                {/* ¿Incluye almuerzo? */}
                <div className="coord-field" style={{ margin: 0 }}>
                  <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>¿Incluye almuerzo? *</label>
                  <select
                    value={grupoDraft.almuerzoInicio && grupoDraft.almuerzoFin ? "si" : "no"}
                    onChange={(e) => {
                      if (e.target.value === "si") {
                        actualizarGrupoDraft("almuerzoInicio", "14:20");
                        actualizarGrupoDraft("almuerzoFin", "15:10");
                      } else {
                        actualizarGrupoDraft("almuerzoInicio", "");
                        actualizarGrupoDraft("almuerzoFin", "");
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "36px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      padding: "0 8px",
                      background: "#ffffff"
                    }}
                  >
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {/* Horario de almuerzo (solo si incluye almuerzo) */}
                {grupoDraft.almuerzoInicio !== "" && grupoDraft.almuerzoFin !== "" && grupoDraft.almuerzoInicio !== undefined ? (
                  <div className="coord-field" style={{ margin: 0 }}>
                    <label style={{ fontWeight: "600", color: "#344054", marginBottom: "6px", display: "block" }}>Horario de almuerzo</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="time"
                        value={grupoDraft.almuerzoInicio || "14:20"}
                        onChange={e => actualizarGrupoDraft("almuerzoInicio", e.target.value)}
                        style={{ width: "100%", height: "36px", borderRadius: "6px", border: "1px solid #cbd5e1", padding: "0 8px" }}
                      />
                      <span style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>a</span>
                      <input
                        type="time"
                        value={grupoDraft.almuerzoFin || "15:10"}
                        onChange={e => actualizarGrupoDraft("almuerzoFin", e.target.value)}
                        style={{ width: "100%", height: "36px", borderRadius: "6px", border: "1px solid #cbd5e1", padding: "0 8px" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            </div>
          </section>
        </div>
        <div className="coord-modal-actions">
          <button type="button" className="coord-secondary-button" onClick={cerrarGrupoModal}>Cancelar</button>
          <button type="button" className="coord-register-button" onClick={guardarGrupoDraft}>
            <CheckCircle2 size={17} /> <span>Guardar bloque</span>
          </button>
        </div>
      </div>
    </div>
  );
}
