import { useState } from "react";
import { toast } from "sonner";
import {
  IconCertificate as Certificate,
  IconPlus as Plus,
  IconX as X,
} from "@tabler/icons-react";
import { diasSemana } from "../../../constants/coordinacionConstants";
import { crearCategoria, eliminarCategoria, listarCategorias } from "../../../services/coordinacionService";

function SeccionCambridge({ form, esCambridgeForm, actualizarForm, categorias, setCategorias }) {
  if (!esCambridgeForm) return null;

  const [esOtro, setEsOtro] = useState(
    Boolean(form.nivelCambridge && !["A1", "A2", "B1", "B2", "C1", "C2", "KET", "PET", "FCE", "CAE"].includes(form.nivelCambridge))
  );

  const [modalDialog, setModalDialog] = useState<{
    show: boolean;
    type: "prompt" | "confirm";
    title: string;
    message: string;
    value?: string;
    onConfirm: (val?: string) => void;
  } | null>(null);

  const defaultCambridgeLevels = ["A1", "A2", "B1", "B2", "C1", "C2", "KET", "PET", "FCE", "CAE"];

  const dbCambridgeLevels = (categorias || [])
    .filter((c: any) => String(c).startsWith("NIVEL_CAMBRIDGE:"))
    .map((c: any) => String(c).substring("NIVEL_CAMBRIDGE:".length));

  const deletedCambridgeLevels = (categorias || [])
    .filter((c: any) => String(c).startsWith("DELETED_NIVEL_CAMBRIDGE:"))
    .map((c: any) => String(c).substring("DELETED_NIVEL_CAMBRIDGE:".length));

  const customCambridgeLevels = dbCambridgeLevels.filter((c: any) => !defaultCambridgeLevels.includes(c));

  const listadoCambridgeLevels = [
    ...defaultCambridgeLevels.filter(lvl => !deletedCambridgeLevels.includes(lvl)),
    ...customCambridgeLevels.filter(lvl => !deletedCambridgeLevels.includes(lvl)),
  ];

  const handleAgregarNivelPrompt = () => {
    setModalDialog({
      show: true,
      type: "prompt",
      title: "Agregar Nuevo Nivel",
      message: "Escriba el nombre del nuevo nivel de Cambridge (ej: Starters, Flyers, C2 Proficiency):",
      value: "",
      onConfirm: async (nombre) => {
        if (!nombre || !nombre.trim()) return;
        const nombreNormal = nombre.trim();
        const wasDeletedDefault = deletedCambridgeLevels.includes(nombreNormal);
        const nameWithPrefix = wasDeletedDefault
          ? "DELETED_NIVEL_CAMBRIDGE:" + nombreNormal
          : "NIVEL_CAMBRIDGE:" + nombreNormal;

        try {
          if (wasDeletedDefault) {
            await eliminarCategoria(nameWithPrefix);
          } else {
            await crearCategoria(nameWithPrefix);
          }
          const cats = await listarCategorias();
          setCategorias(cats);
          actualizarForm("nivelCambridge", nombreNormal);
          setEsOtro(false);
          toast.success("Nivel agregado", { description: `"${nombreNormal}" se agregó a las opciones.` });
        } catch (err: any) {
          toast.error("Error", { description: err.message || "No se pudo agregar el nivel." });
        }
      }
    });
  };

  const handleQuitarNivelSelect = () => {
    const seleccionado = form.nivelCambridge;
    if (!seleccionado || seleccionado === "Otro") return;

    setModalDialog({
      show: true,
      type: "confirm",
      title: "Eliminar Opción",
      message: `¿Eliminar la opción "${seleccionado}" de la lista de opciones?`,
      onConfirm: async () => {
        try {
          const isDefault = defaultCambridgeLevels.includes(seleccionado);
          if (isDefault) {
            await crearCategoria("DELETED_NIVEL_CAMBRIDGE:" + seleccionado);
          } else {
            await eliminarCategoria("NIVEL_CAMBRIDGE:" + seleccionado);
          }
          
          const cats = await listarCategorias();
          setCategorias(cats);
          
          const remaining = listadoCambridgeLevels.filter(lvl => lvl !== seleccionado);
          actualizarForm("nivelCambridge", remaining[0] || "");
          setEsOtro(false);
          toast.success("Nivel eliminado", { description: `"${seleccionado}" se eliminó de las opciones.` });
        } catch (err: any) {
          toast.error("Error", { description: err.message || "No se pudo quitar el nivel." });
        }
      }
    });
  };

  return (
    <section className="coord-form-section">
      <div className="coord-section-heading">
        <Certificate size={18} />
        <div>
          <h3>Cambridge (Clases)</h3>
        </div>
      </div>

      <div className="coord-section-grid">
        <div className="coord-field">
          <label>Docente / profesor responsable</label>
          <input
            value={form.responsable || ""}
            onChange={(event) => actualizarForm("responsable", event.target.value)}
            placeholder="Ej. Prof. Ana Torres"
          />
        </div>

        <div className="coord-field">
          <label>Cupos</label>
          <input
            type="number"
            min="1"
            value={form.cupos || ""}
            onChange={(event) => actualizarForm("cupos", event.target.value)}
            placeholder="Ej. 55"
          />
        </div>

        <div className="coord-field">
          <label>Nivel Cambridge</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={esOtro ? "Otro" : (form.nivelCambridge || "")}
              onChange={(event) => {
                const val = event.target.value;
                if (val === "Otro") {
                  setEsOtro(true);
                  actualizarForm("nivelCambridge", "");
                } else {
                  setEsOtro(false);
                  actualizarForm("nivelCambridge", val);
                }
              }}
              style={{ flex: 1 }}
            >
              <option value="">— Seleccionar nivel —</option>
              {listadoCambridgeLevels.map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
              <option value="Otro">Otro (Especificar...)</option>
            </select>

            <button
              type="button"
              className="coord-add-option-btn"
              onClick={handleAgregarNivelPrompt}
              title="Agregar nuevo nivel"
            >
              <Plus size={18} />
            </button>

            {form.nivelCambridge && form.nivelCambridge !== "Otro" && (
              <button
                type="button"
                onClick={handleQuitarNivelSelect}
                title="Eliminar nivel seleccionado"
                style={{
                  height: "38px",
                  width: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fee2e2",
                  color: "#ef4444",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            )}

            {esOtro && (
              <input
                type="text"
                value={form.nivelCambridge || ""}
                onChange={(event) => actualizarForm("nivelCambridge", event.target.value)}
                placeholder="Escriba nivel..."
                style={{ width: "140px" }}
              />
            )}
          </div>
        </div>

        <div className="coord-field">
          <label>Precio por ciclo (S/)</label>
          <input
            inputMode="decimal"
            value={form.costoCiclo || form.costo || ""}
            onChange={(event) => {
              actualizarForm("costoCiclo", event.target.value);
              actualizarForm("costo", event.target.value);
            }}
            placeholder="150"
          />
        </div>

        <div className="coord-field">
          <label>Primer pago solicitado (S/)</label>
          <input
            inputMode="decimal"
            value={form.montoPrimerPago || ""}
            onChange={(event) => actualizarForm("montoPrimerPago", event.target.value)}
            placeholder="150"
          />
        </div>

        <div className="coord-field">
          <label>Horario (Inicio / Fin)</label>
          <div className="coord-flex-range">
            <input
              type="time"
              value={form.horaInicio || ""}
              onChange={(e) => actualizarForm("horaInicio", e.target.value)}
            />
            <span className="coord-flex-range-separator">a</span>
            <input
              type="time"
              value={form.horaFin || ""}
              onChange={(e) => actualizarForm("horaFin", e.target.value)}
            />
          </div>
        </div>

        <div className="coord-field coord-field-full">
          <label>Días de clase</label>
          <div className="coord-day-list" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {diasSemana.map((dia) => {
              const diasSeleccionados = Array.isArray(form.dias) ? form.dias : [];
              const isSelected = diasSeleccionados.includes(dia);
              return (
                <label
                  className={`coord-day-chip ${isSelected ? "is-selected" : ""}`}
                  key={dia}
                  style={{ minWidth: "40px", textAlign: "center", cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      const nuevosDias = isSelected
                        ? diasSeleccionados.filter((d) => d !== dia)
                        : [...diasSeleccionados, dia];
                      const diasOrdenados = diasSemana.filter(d => nuevosDias.includes(d));
                      actualizarForm("dias", diasOrdenados);
                    }}
                  />
                  <span title={dia}>{dia.substring(0, 2)}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="coord-field coord-field-full" style={{ marginTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <label style={{ fontSize: "13.5px", color: "#0f766e" }}>
              <strong>📝 Indicaciones de inscripción y pago</strong>
            </label>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "500" }}>
              {(form.detalleCosto || "").length} caracteres
            </span>
          </div>
          <textarea
            rows={5}
            value={form.detalleCosto || ""}
            onChange={(event) => actualizarForm("detalleCosto", event.target.value)}
            placeholder="Ej. Opcion A: inscripcion presencial en Caja. Opcion B: inscripcion virtual por Yape al numero 970 836 322..."
            style={{
              width: "100%",
              padding: "12px 14px",
              resize: "vertical",
              borderRadius: "8px",
              border: "2px solid #ccfbf1",
              fontSize: "13px",
              lineHeight: "1.6",
              fontFamily: "inherit",
              background: "#f0fdfa",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
            }}
            onFocus={e => {
              e.target.style.borderColor = "#0d9488";
              e.target.style.boxShadow = "0 0 0 3px rgba(13, 148, 136, 0.1)";
              e.target.style.background = "#ffffff";
            }}
            onBlur={e => {
              e.target.style.borderColor = "#ccfbf1";
              e.target.style.boxShadow = "none";
              e.target.style.background = "#f0fdfa";
            }}
          />
          <p className="coord-field-hint" style={{ color: "#0d9488", fontWeight: "500", marginTop: "4px" }}>
            Este texto acompaña la información de pago que se muestra en la carta para los padres de familia.
          </p>
        </div>
      </div>

      {modalDialog && modalDialog.show && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "400px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2ece9"
          }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "700", color: "#102035" }}>
              {modalDialog.title}
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13.5px", color: "#475467", lineHeight: "1.5" }}>
              {modalDialog.message}
            </p>
            {modalDialog.type === "prompt" && (
              <input
                type="text"
                value={modalDialog.value || ""}
                onChange={(e) => setModalDialog(prev => prev ? { ...prev, value: e.target.value } : null)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  marginBottom: "20px",
                  outline: "none"
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    modalDialog.onConfirm(modalDialog.value);
                    setModalDialog(null);
                  }
                }}
              />
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setModalDialog(null)}
                style={{
                  padding: "8px 16px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  modalDialog.onConfirm(modalDialog.value);
                  setModalDialog(null);
                }}
                style={{
                  padding: "8px 16px",
                  background: modalDialog.type === "confirm" ? "#ef4444" : "#449d44",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default SeccionCambridge;
