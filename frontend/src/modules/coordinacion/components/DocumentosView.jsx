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

function normalizarNombrePlantilla(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}



function DocumentosView({
  abrirEditar,
  abrirCrearDesdeDocumento,
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
  categorias = [],
  configInstitucional = {},
  cargandoConfigInstitucional = false,
  guardandoConfigInstitucional = false,
  actualizarConfigInstitucionalImagen,
  quitarConfigInstitucionalImagen,
  guardarConfigInstitucional,
  toggleSidebarButton,
  embedded = false,
}) {
  const variablesRequeridasDocumento = lecturaDocumento?.variablesRequeridasModelo || variablesPlantillaRequeridas.map((item) => item.id);
  const variablesListasDocumento = lecturaDocumento?.variablesListasModelo ||
    (lecturaDocumento?.variables || []).filter((variable) => variablesRequeridasDocumento.includes(variable));
  const variablesFaltantesDocumento = lecturaDocumento?.variablesFaltantes || [];
  const plantillaYaGuardada = Boolean(form.plantilla && historialPlantillas.some((programa) =>
    normalizarNombrePlantilla(programa.plantilla) === normalizarNombrePlantilla(form.plantilla)
  ));
  const variablesPendientesTexto = variablesFaltantesDocumento.length
    ? `Faltan: ${variablesFaltantesDocumento.join(", ").toUpperCase()}`
    : "Formato completo";

  const renderContent = () => (
    <>
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

      <div className="coord-template-workspace" style={embedded ? { marginTop: "12px" } : {}}>
        <div className="coord-documents-simple-panel">
          {plantillaYaGuardada ? (
            <div className="coord-documents-saved-state">
              <CheckCircle2 size={18} />
              <div>
                <strong>Plantilla ya guardada</strong>
                <span>Este documento ya figura en el historial de plantillas subidas.</span>
              </div>
            </div>
          ) : (
            <div className="coord-documents-upload-row">
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
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
            <button
              className="coord-primary-button"
              type="button"
              onClick={guardarDocumentosPrograma}
              disabled={guardando || !form.plantilla || plantillaYaGuardada}
              style={{ flex: 1, minWidth: "150px" }}
            >
              {guardando ? (
                <>
                  <Loader2 className="coord-animate-spin" size={16} />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar plantilla</span>
              )}
            </button>
          </div>
        </div>

        {lecturaDocumento ? (
          <div className="coord-document-read-details coord-documents-preview">
            <div className="coord-document-read-head">
              <CheckCircle2 size={18} />
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
              <p className="coord-process-note">El Word conserva su diseno original; aqui solo se muestran los datos que el sistema pudo interpretar.</p>
            )}
          </div>
        ) : null}

        <div className="coord-template-history coord-documents-history">
          <div className="coord-document-read-head coord-documents-history-head">
            <div>
              <strong>Historial de plantillas subidas</strong>
            </div>
          </div>
          {historialPlantillas.length ? (
            <div className="coord-template-history-list coord-documents-history-list">
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
                    <span>Eliminar</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="coord-empty coord-template-history-empty">
              <FileText size={18} />
              <p>Aun no hay plantillas guardadas.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return renderContent();
  }

  return (
    <>
      <header className="coord-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {toggleSidebarButton}
          <h1>PLANTILLAS Y DOCUMENTOS</h1>
        </div>
      </header>
      <section className="coord-workspace coord-workspace-single">
        <article className="coord-card coord-search-card coord-documents-card">
          <div className="coord-card-title coord-documents-title">
            <span className="coord-title-icon"><FileText size={21} /></span>
            <div>
              <h2>Plantillas Word por programa</h2>
            </div>
          </div>
          {renderContent()}
        </article>
      </section>
    </>
  );
}

export default DocumentosView;
