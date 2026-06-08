import {
  IconCircleCheck as CheckCircle2,
  IconPhoto as Photo,
  IconUpload as Upload,
  IconX as X,
} from "@tabler/icons-react";
import { formatearPesoArchivo } from "../utils/coordinacionProgramUtils";

export function obtenerEtiquetaAlcance(valor) {
  const etiquetas = {
    colegio: "Todo el colegio",
    primaria: "Solo nivel Primaria",
    secundaria: "Solo nivel Secundaria",
    grados: "Solo grados habilitados arriba",
  };
  return etiquetas[valor || "colegio"] || etiquetas.colegio;
}

export default function ProgramaInvitacionMasivaModal({
  actualizarForm,
  form,
  quitarImagenAnuncio,
  seleccionarImagenAnuncio,
  setMostrarInvitacionModal,
}) {
  if (!form.invitacionMasiva) return null;

  return (
    <div className="coord-modal-overlay" style={{ zIndex: 2200 }}>
      <div className="coord-modal" style={{ maxWidth: "720px" }} onClick={e => e.stopPropagation()}>
        <div className="coord-modal-header">
          <div className="coord-modal-title">
            <span className="coord-modal-icon"><Photo size={20} /></span>
            <div>
              <h2>Configurar invitación masiva</h2>
              <p>Defina a qué padres se mostrará el curso y agregue una imagen si corresponde.</p>
            </div>
          </div>
          <button className="coord-modal-close" type="button" onClick={() => setMostrarInvitacionModal(false)}><X size={20} /></button>
        </div>
        <div className="coord-program-form-main" style={{ padding: "16px 20px" }}>
          <section className="coord-form-section">
            <div className="coord-section-grid">
              <div className="coord-field coord-field-full">
                <label>Alcance de la invitación masiva</label>
                <select
                  value={form.alcanceInvitacionMasiva || "colegio"}
                  onChange={e => actualizarForm("alcanceInvitacionMasiva", e.target.value)}
                >
                  <option value="colegio">Todo el colegio</option>
                  <option value="primaria">Solo nivel Primaria</option>
                  <option value="secundaria">Solo nivel Secundaria</option>
                  <option value="grados">Solo grados habilitados arriba</option>
                </select>
                <small>
                  Use Primaria o Secundaria cuando el anuncio sea masivo para un nivel completo; use grados habilitados si debe respetar la selección del formulario.
                </small>
              </div>
              <div className="coord-field coord-field-full">
                <div className="coord-announcement-image-field">
                  <div className="coord-announcement-copy">
                    <Photo size={18} />
                    <div>
                      <strong>Imagen de anuncio para Padres</strong>
                    </div>
                  </div>
                  {form.anuncioImagen ? (
                    <div className="coord-announcement-preview">
                      <img src={form.anuncioImagen} alt="Anuncio para portal de padres" />
                      <div>
                        <strong>{form.anuncioImagenNombre || "Imagen de anuncio"}</strong>
                        <span>
                          {formatearPesoArchivo(form.anuncioImagenTamano)}
                          {form.anuncioImagenComprimida ? " · comprimida" : ""}
                        </span>
                        <button type="button" onClick={quitarImagenAnuncio}>
                          Quitar imagen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="coord-announcement-upload">
                      <input type="file" accept="image/*" onChange={seleccionarImagenAnuncio} />
                      <Upload size={18} />
                      <span>Agregar imagen</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="coord-modal-actions">
          <button type="button" className="coord-secondary-button" onClick={() => setMostrarInvitacionModal(false)}>Cerrar</button>
          <button type="button" className="coord-register-button" onClick={() => setMostrarInvitacionModal(false)}>
            <CheckCircle2 size={17} />
            <span>Guardar configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
}
