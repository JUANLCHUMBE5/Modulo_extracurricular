import { IconBook as BookOpen } from "@tabler/icons-react";

const MAX_PALABRAS = 420;

function contarPalabras(texto: string): number {
  if (!texto || !texto.trim()) return 0;
  return texto.trim().split(/\s+/).length;
}

function SeccionDocumentoOficial({ form, actualizarForm, esCambridgeForm = false }) {
  if (!form.tipoComunicado || form.tipoComunicado === "Otro genérico") return null;

  const areaCambridge = "Inglés / Cambridge";
  const tipoDocumentoValor = esCambridgeForm ? "Carta" : (form.tipoDocumento || "Comunicado");
  const areaTematicaValor = esCambridgeForm ? areaCambridge : (form.areaTematica || "Matemática");

  const palabrasActuales = contarPalabras(form.comunicado || "");
  const excedeLimite = palabrasActuales > MAX_PALABRAS;

  function manejarCambioComunicado(e: any) {
    const nuevoTexto = e.target.value;
    const nuevasPalabras = contarPalabras(nuevoTexto);
    if (nuevasPalabras > MAX_PALABRAS) return;
    actualizarForm("comunicado", nuevoTexto);
    actualizarForm("comunicadoCompleto", nuevoTexto);
  }

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
          <label>Número de documento (editable)</label>
          <input
            value={form.numeroDocumento || ""}
            onChange={e => actualizarForm("numeroDocumento", e.target.value)}
            placeholder="Ej: COM-001-2026"
          />
        </div>
        <div className="coord-field">
          <label>Nombre del ciclo</label>
          <select
            value={form.nombreCiclo || "Ciclo I"}
            onChange={e => actualizarForm("nombreCiclo", e.target.value)}
          >
            <option value="Ciclo I">Ciclo I</option>
            <option value="Ciclo II">Ciclo II</option>
          </select>
        </div>
        <div className="coord-field coord-field-full">
          <label>Cuerpo o justificación del comunicado (editable)</label>
          <small style={{ display: "block", color: "#d97706", fontSize: "11.5px", marginTop: "2px", marginBottom: "6px" }}>
            ⚠️ Este texto se mostrará en el portal de padres. Máximo 400–420 palabras.
          </small>
          <textarea
            value={form.comunicado || ""}
            onChange={manejarCambioComunicado}
            placeholder="Escriba la justificación o cuerpo del comunicado..."
            rows={3}
            style={{
              width: "100%",
              padding: "8px 12px",
              resize: "vertical",
              borderColor: excedeLimite ? "#ef4444" : undefined,
            }}
          />
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "4px",
            fontSize: "12px",
            color: palabrasActuales >= 400 ? "#ef4444" : "#64748b",
            fontWeight: palabrasActuales >= 400 ? 600 : 400,
          }}>
            {palabrasActuales} / {MAX_PALABRAS} palabras
          </div>
        </div>
      </div>
    </section>
  );
}

export default SeccionDocumentoOficial;

