import { IconBook as BookOpen } from "@tabler/icons-react";

function SeccionDocumentoOficial({ form, actualizarForm, esCambridgeForm = false }) {
  if (!form.tipoComunicado || form.tipoComunicado === "Otro genérico") return null;

  const areaCambridge = "Inglés / Cambridge";
  const tipoDocumentoValor = esCambridgeForm ? "Carta" : (form.tipoDocumento || "Comunicado");
  const areaTematicaValor = esCambridgeForm ? areaCambridge : (form.areaTematica || "Matemática");

  return (
    <section className="coord-form-section" style={{ borderLeft: "4px solid #3b82f6", paddingLeft: "12px" }}>
      <div className="coord-section-heading">
        <BookOpen size={18} style={{ color: "#3b82f6" }} />
        <div>
          <h3 style={{ color: "#1e3a8a" }}>Datos del documento oficial</h3>
        </div>
      </div>
      <div className="coord-section-grid coord-doc-fields-grid">
        <div className="coord-field">
          <label>Tipo de documento *</label>
          <select
            value={tipoDocumentoValor}
            disabled={esCambridgeForm}
            onChange={e => {
              const nuevoTipoDoc = e.target.value;
              actualizarForm("tipoDocumento", nuevoTipoDoc);
              const prefix = nuevoTipoDoc === "Carta" ? "CAR" : "COM";
              const currentNum = form.numeroDocumento || "";
              const anio = new Date().getFullYear();
              if (currentNum.startsWith("COM-") || currentNum.startsWith("CAR-")) {
                actualizarForm("numeroDocumento", currentNum.replace(/^(COM|CAR)-/, `${prefix}-`));
              } else {
                const randomId = Math.floor(Math.random() * 90) + 10;
                actualizarForm("numeroDocumento", `${prefix}-0${randomId}-${anio}`);
              }
            }}
          >
            <option value="Comunicado">Comunicado</option>
            <option value="Carta">Carta</option>
          </select>
        </div>
        <div className="coord-field">
          <label>Número de documento (editable) *</label>
          <input
            value={form.numeroDocumento || ""}
            onChange={e => actualizarForm("numeroDocumento", e.target.value)}
            placeholder="Ej: COM-001-2026"
          />
        </div>
        <div className="coord-field">
          <label>Área temática *</label>
          <select
            value={areaTematicaValor}
            disabled={esCambridgeForm}
            onChange={e => actualizarForm("areaTematica", e.target.value)}
          >
            {esCambridgeForm ? (
              <option value={areaCambridge}>{areaCambridge}</option>
            ) : (
              <>
                <option value="Matemática">Matemática</option>
                <option value="Comunicación">Comunicación</option>
                <option value="Matemática y Comunicación">Matemática y Comunicación</option>
              </>
            )}
          </select>
        </div>
        <div className="coord-field">
          <label>Nombre del ciclo *</label>
          <select
            value={form.nombreCiclo || "Ciclo I"}
            onChange={e => actualizarForm("nombreCiclo", e.target.value)}
          >
            <option value="Ciclo I">Ciclo I</option>
            <option value="Ciclo II">Ciclo II</option>
          </select>
        </div>
        <div className="coord-field coord-field-full">
          <label>Cuerpo o justificación del comunicado (editable) *</label>
          <textarea
            value={form.comunicado || ""}
            onChange={e => {
              actualizarForm("comunicado", e.target.value);
              actualizarForm("comunicadoCompleto", e.target.value);
            }}
            placeholder="Escriba la justificación o cuerpo del comunicado..."
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              resize: "vertical"
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default SeccionDocumentoOficial;
