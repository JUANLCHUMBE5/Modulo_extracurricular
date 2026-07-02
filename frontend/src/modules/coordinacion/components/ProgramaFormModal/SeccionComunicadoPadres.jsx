import { IconBook as BookOpen } from "@tabler/icons-react";

function SeccionComunicadoPadres({
  form,
  conComunicadoManual,
  setConComunicadoManual,
  actualizarForm,
}) {
  if (form.tipoComunicado && form.tipoComunicado !== "Otro genérico") return null;

  return (
    <section className="coord-form-section" style={{ paddingBottom: conComunicadoManual ? "20px" : "12px" }}>
      <div
        className="coord-section-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: conComunicadoManual ? "14px" : "0"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={18} />
          <div>
            <h3 style={{ margin: 0 }}>Descripción o Comunicado para Padres</h3>
            {conComunicadoManual ? (
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#64748b", fontWeight: "400" }}>
                Este texto se mostrará a los padres en la invitación del programa.
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className={`coord-toggle-switch-btn ${conComunicadoManual ? "is-active" : ""}`}
          style={{ margin: 0, flexShrink: 0 }}
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
        <div style={{ marginTop: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#374151" }}>
              Texto del Comunicado / Descripción
            </label>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "500" }}>
              {(form.comunicado || "").length} caracteres
            </span>
          </div>
          <textarea
            value={form.comunicado || ""}
            onChange={e => {
              actualizarForm("comunicado", e.target.value);
              actualizarForm("comunicadoCompleto", e.target.value);
            }}
            placeholder="Escriba aquí los detalles, indicaciones, o comunicado del programa para los padres..."
            rows={5}
            style={{
              width: "100%",
              padding: "12px 14px",
              resize: "vertical",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              lineHeight: "1.6",
              fontFamily: "inherit",
              background: "#fafbfc",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
            onFocus={e => {
              e.target.style.borderColor = "#006b5b";
              e.target.style.boxShadow = "0 0 0 3px rgba(0,107,91,0.08)";
              e.target.style.background = "#ffffff";
            }}
            onBlur={e => {
              e.target.style.borderColor = "#cbd5e1";
              e.target.style.boxShadow = "none";
              e.target.style.background = "#fafbfc";
            }}
          />
        </div>
      )}
    </section>
  );
}

export default SeccionComunicadoPadres;
