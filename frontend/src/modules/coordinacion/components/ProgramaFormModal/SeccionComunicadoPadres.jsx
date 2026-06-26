import { IconBook as BookOpen } from "@tabler/icons-react";

function SeccionComunicadoPadres({
  form,
  conComunicadoManual,
  setConComunicadoManual,
  actualizarForm,
}) {
  if (form.tipoComunicado && form.tipoComunicado !== "Otro genérico") return null;

  return (
    <section className="coord-form-section" style={{ paddingBottom: conComunicadoManual ? "16px" : "10px" }}>
      <div
        className="coord-section-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: conComunicadoManual ? "12px" : "0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOpen size={18} />
          <div>
            <h3 style={{ margin: 0 }}>Descripción o Comunicado para Padres</h3>
          </div>
        </div>
        <button
          type="button"
          className={`coord-toggle-switch-btn ${conComunicadoManual ? "is-active" : ""}`}
          style={{ margin: 0 }}
          onClick={() => {
            const val = !conComunicadoManual;
            setConComunicadoManual(val);
            if (!val) {
              actualizarForm("comunicado", "");
              actualizarForm("comunicadoCompleto", "");
            }
          }}
        >
          <span className="coord-toggle-switch-slider"></span>
          <div className="coord-toggle-switch-labels">
            <span className="coord-toggle-switch-label-on">Activo</span>
            <span className="coord-toggle-switch-label-off">Inactivo</span>
          </div>
        </button>
      </div>
      {conComunicadoManual && (
        <div className="coord-section-grid" style={{ marginTop: "8px" }}>
          <div className="coord-field coord-field-full">
            <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#374151" }}>
              Texto del Comunicado / Descripción
            </label>
            <textarea
              value={form.comunicado || ""}
              onChange={e => {
                actualizarForm("comunicado", e.target.value);
                actualizarForm("comunicadoCompleto", e.target.value);
              }}
              placeholder="Escriba aquí los detalles, indicaciones, o comunicado del programa para los padres..."
              rows={4}
              style={{
                width: "100%",
                padding: "8px 12px",
                resize: "vertical"
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default SeccionComunicadoPadres;
