import { useId, useState } from "react";
import {
  IconBook as BookOpen,
  IconFileText as FileText,
  IconX as X,
} from "@tabler/icons-react";

function TemplateUploadField({
  plantillaInputKey,
  form,
  programas,
  variablesPlantillaRequeridas,
  onSelect,
  onRemove,
  onAutoFill,
  onUseExisting,
  modoDocumentos = false,
}) {
  const inputId = useId();
  const [programaPlantilla, setProgramaPlantilla] = useState("");
  const plantillasDisponibles = programas.filter((programa) =>
    programa.id !== form.id && programa.plantilla && programa.plantillaBase64 && programa.plantillaValidada
  );
  const variablesVisibles = form.plantillaValidada
    ? variablesPlantillaRequeridas.filter((variable) => form.plantillaVariables.includes(variable.id))
    : variablesPlantillaRequeridas;

  function aplicarPlantillaExistente() {
    if (!programaPlantilla) return;
    onUseExisting(programaPlantilla);
    setProgramaPlantilla("");
  }

  return (
    <div className="coord-field coord-field-full" style={{ animation: "coord-fade-in 0.25s ease" }}>
      {modoDocumentos ? (
        <div className="coord-form-group-green">
          <label>
            <FileText size={16} />
            Subir documento Word
          </label>
          <div
            className="coord-file-drop"
            onClick={() => document.getElementById(inputId)?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("dragover")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("dragover");
              if (e.dataTransfer.files.length) {
                const fakeEvent = { target: { files: e.dataTransfer.files } };
                onSelect(fakeEvent);
              }
            }}
          >
            <FileText size={32} className="coord-drop-icon" style={{ color: "#2b6cb0" }} />
            <p className="coord-drop-text">
              Arrastra tu archivo Word o <span className="coord-drop-highlight" style={{ color: "#2b6cb0", textDecorationColor: "#bee3f8" }}>haz clic para elegir</span>
            </p>
            <div className="coord-drop-sub">.docx — máx 5 MB</div>
            <input
              id={inputId}
              key={plantillaInputKey}
              type="file"
              accept=".docx"
              onChange={onSelect}
              style={{ display: "none" }}
            />
          </div>

          {form.plantilla && (
            <div className="coord-file-info-bar" style={{ background: "#ebf8ff", borderColor: "#bee3f8", color: "#2b6cb0" }}>
              <FileText size={18} style={{ color: "#3182ce" }} />
              <span>{form.plantilla}</span>
              {form.plantillaValidada ? (
                <span className="coord-pill coord-pill-success" style={{ marginLeft: "8px" }}>
                  Validada
                </span>
              ) : (
                <span className="coord-pill coord-pill-error" style={{ marginLeft: "8px" }}>
                  Pendiente
                </span>
              )}
              <button
                type="button"
                className="coord-file-remove"
                style={{ borderColor: "#fed7d7", color: "#c53030" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X size={14} /> Quitar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="coord-template-compact-row">
          <div className="coord-template-file-control">
            <label>Documento Word</label>
            <div className="coord-template-file-row">
              <input
                id={inputId}
                className="coord-template-file"
                key={plantillaInputKey}
                type="file"
                accept=".docx"
                onChange={onSelect}
              />
              <label className="coord-template-file-button" htmlFor={inputId}>
                {form.plantilla ? "Cambiar Word" : "Seleccionar Word"}
              </label>
              <div className="coord-template-file-name">
                <FileText size={16} />
                <span title={form.plantilla || ""}>{form.plantilla || "Sin documento seleccionado"}</span>
              </div>
              {form.plantilla ? (
                <>
                  <span className={`coord-pill ${form.plantillaValidada ? "coord-pill-success" : "coord-pill-error"}`}>
                    {form.plantillaValidada ? "Validada" : "Pendiente"}
                  </span>
                  <button type="button" className="coord-remove-template-btn" onClick={onRemove}>
                    <X size={14} />
                    <span>Quitar</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {plantillasDisponibles.length && !modoDocumentos ? (
        <div className="coord-template-reuse">
          <label>Usar plantilla de otro programa</label>
          <div className="coord-template-reuse-row">
            <select value={programaPlantilla} onChange={(event) => setProgramaPlantilla(event.target.value)}>
              <option value="">Seleccione un programa</option>
              {plantillasDisponibles.map((programa) => (
                <option key={programa.id} value={programa.id}>
                  {programa.nombre}
                </option>
              ))}
            </select>
            <button type="button" className="coord-template-autofill" onClick={aplicarPlantillaExistente} disabled={!programaPlantilla}>
              Usar plantilla
            </button>
          </div>
        </div>
      ) : null}
      {form.plantillaValidada ? (
        <button type="button" className="coord-template-autofill" onClick={onAutoFill}>
          <BookOpen size={15} />
          <span>{modoDocumentos ? "Volver a leer documento" : "Autocompletar datos desde Word"}</span>
        </button>
      ) : null}
      {form.plantilla && !modoDocumentos ? (
        <div className="coord-template-vars">
          {variablesVisibles.map((variable) => (
            <span
              className={`coord-template-var ${form.plantillaVariables.includes(variable.id) ? "is-ok" : ""}`}
              key={variable.id}
            >
              {variable.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default TemplateUploadField;
