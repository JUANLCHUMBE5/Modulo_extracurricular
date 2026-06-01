import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import SummaryBox from "./SummaryBox";
import TemplateUploadField from "./TemplateUploadField";
import { etiquetaCampoDocumento, resumirTextoDocumento } from "../utils/wordTemplateUtils";

function DocumentosView({
  abrirEditar,
  autocompletarDesdePlantilla,
  eliminarPlantillaHistorial,
  form,
  guardando,
  guardarDocumentoComoPrograma,
  guardarDocumentosPrograma,
  historialPlantillas,
  lecturaDocumento,
  mensaje,
  plantillaInputKey,
  programaDocs,
  programas,
  quitarPlantilla,
  seleccionarPlantilla,
  setForm,
  tipoMsg,
  usarPlantillaExistente,
  variablesPlantillaAceptadas,
  variablesPlantillaRequeridas,
}) {
  const variablesRequeridasDocumento = lecturaDocumento?.variablesRequeridasModelo || variablesPlantillaRequeridas.map((item) => item.id);
  const variablesListasDocumento = lecturaDocumento?.variablesListasModelo ||
    (lecturaDocumento?.variables || []).filter((variable) => variablesRequeridasDocumento.includes(variable));
  const variablesFaltantesDocumento = lecturaDocumento?.variablesFaltantes || [];
  const variablesPendientesTexto = variablesFaltantesDocumento.length
    ? `Faltan: ${variablesFaltantesDocumento.join(", ").toUpperCase()}`
    : "Formato completo";

  return (
    <>
      <header className="coord-topbar"><h1>PLANTILLAS Y DOCUMENTOS</h1></header>
      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card">
          <div className="coord-card-title">
            <span className="coord-title-icon"><FileText size={21} /></span>
            <div>
              <h2>Plantillas Word por programa</h2>
              <p>Suba primero el Word, valide sus variables y guarde el nombre para usarlo luego en Gestión de Programas.</p>
            </div>
          </div>

          {mensaje && (
            <MantineAlert
              className="coord-message"
              color={tipoMsg === "success" ? "sanrafael" : "orange"}
              radius="md"
              icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            >
              {mensaje}
            </MantineAlert>
          )}

          <div className="coord-template-workspace">
            <div className="coord-template-upload-row">
              <TemplateUploadField
                plantillaInputKey={plantillaInputKey}
                form={form}
                programas={programas}
                variablesPlantillaRequeridas={variablesPlantillaAceptadas}
                onSelect={seleccionarPlantilla}
                onRemove={quitarPlantilla}
                onAutoFill={autocompletarDesdePlantilla}
                onUseExisting={usarPlantillaExistente}
                modoDocumentos
              />
              <div className="coord-upload-actions">
                <button
                  className="coord-register-button"
                  type="button"
                  onClick={programaDocs ? guardarDocumentosPrograma : guardarDocumentoComoPrograma}
                  disabled={guardando || !form.plantillaValidada}
                >
                  {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                  <span>{guardando ? "Guardando" : programaDocs ? "Actualizar documento" : "Guardar plantilla"}</span>
                </button>
                {programaDocs ? (
                  <button className="coord-secondary-button" type="button" onClick={() => abrirEditar(programaDocs)}>
                    <Edit3 size={17} />
                    <span>Editar datos del programa</span>
                  </button>
                ) : null}
              </div>
            </div>
            {form.plantillaValidada ? (
              <div className="coord-section-grid">
                <div className="coord-field coord-field-full">
                  <label>Nombre del programa</label>
                  <input
                    value={form.nombre}
                    onChange={(event) => setForm((actual) => ({ ...actual, nombre: event.target.value }))}
                    placeholder="Ejemplo: Taller de danza primaria"
                  />
                </div>
              </div>
            ) : null}
            {lecturaDocumento ? (
              <div className="coord-document-read">
                <div className="coord-document-read-head">
                  <div>
                    <strong>Documento validado</strong>
                    <span>{lecturaDocumento.archivo}</span>
                  </div>
                  <span>Word apto para completar datos</span>
                </div>
                <div className="coord-document-detected">
                  <SummaryBox label="Datos interpretados" value={Object.keys(lecturaDocumento.datos || {}).length} />
                  <SummaryBox
                    label="Variables del formato"
                    value={`${variablesListasDocumento.length}/${variablesRequeridasDocumento.length}`}
                    tone={variablesFaltantesDocumento.length ? "warning" : "success"}
                  />
                  <SummaryBox
                    label={lecturaDocumento.plantillaModelo ? `Modelo ${lecturaDocumento.plantillaModelo}` : "Estado"}
                    value={variablesPendientesTexto}
                    tone={variablesFaltantesDocumento.length ? "warning" : "success"}
                  />
                </div>
                {Object.keys(lecturaDocumento.datos || {}).length ? (
                  <dl className="coord-document-fields coord-document-preview-fields">
                    {Object.entries(lecturaDocumento.datos).map(([campo, valor]) => (
                      <div key={campo}>
                        <dt>{etiquetaCampoDocumento(campo)}</dt>
                        <dd>{resumirTextoDocumento(valor)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="coord-process-note">El Word conserva su diseño original; aquí solo se muestran los datos que el sistema pudo interpretar.</p>
                )}
              </div>
            ) : null}
            <div className="coord-template-history">
              <div className="coord-document-read-head">
                <div>
                  <strong>Historial de plantillas subidas</strong>
                </div>
              </div>
              {historialPlantillas.length ? (
                <div className="coord-template-history-list">
                  {historialPlantillas.map((programa) => (
                    <div className="coord-template-history-item" key={programa.id}>
                      <div className="coord-template-history-main">
                        <FileText size={17} />
                        <div>
                          <strong>{programa.nombre}</strong>
                          <span>{programa.plantilla}</span>
                        </div>
                      </div>
                      <span className={`coord-pill ${programa.plantillaValidada ? "coord-pill-success" : "coord-pill-error"}`}>
                        {programa.plantillaValidada ? "Validada" : "Pendiente"}
                      </span>
                      <button
                        className="coord-danger-button coord-template-history-delete"
                        type="button"
                        onClick={() => eliminarPlantillaHistorial(programa)}
                        disabled={guardando}
                      >
                        <Trash2 size={16} />
                        <span>Eliminar plantilla</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="coord-empty coord-template-history-empty">
                  <FileText size={18} />
                  <p>Aún no hay plantillas guardadas.</p>
                </div>
              )}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

export default DocumentosView;
