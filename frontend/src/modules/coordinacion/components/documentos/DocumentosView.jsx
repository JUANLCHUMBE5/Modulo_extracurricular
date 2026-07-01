import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconPhoto as Photo,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import SummaryBox from "../shared/SummaryBox";
import TemplateUploadField from "./TemplateUploadField";
import { etiquetaCampoDocumento, resumirTextoDocumento } from "../../utils/wordTemplateUtils";

function normalizarNombrePlantilla(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const recursosInstitucionales = [
  { id: "logoInstitucion", label: "Logo del colegio", hint: "Encabezado de comunicados y cartas." },
  { id: "logoCambridge", label: "Logo Cambridge", hint: "Solo para formatos Cambridge." },
  { id: "firmaCoordinacion", label: "Firma de Coordinacion", hint: "Firma que aparece como Coordinacion." },
  { id: "firmaDireccion", label: "Firma de Direccion", hint: "Firma del Director General." },
  { id: "selloInstitucion", label: "Sello institucional", hint: "Opcional para documentos impresos." },
];

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

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
  categorias = [],
  configInstitucional = {},
  cargandoConfigInstitucional = false,
  guardandoConfigInstitucional = false,
  actualizarConfigInstitucionalImagen,
  quitarConfigInstitucionalImagen,
  guardarConfigInstitucional,
  toggleSidebarButton,
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

  const seleccionarRecursoInstitucional = (campo, event) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      window.alert("Seleccione una imagen PNG, JPG o WebP.");
      return;
    }
    if (archivo.size > MAX_IMAGE_BYTES) {
      window.alert("La imagen no debe superar 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      actualizarConfigInstitucionalImagen?.(campo, {
        nombre: archivo.name,
        tipo: archivo.type,
        dataUrl: String(reader.result || ""),
        actualizadoEn: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(archivo);
  };

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
            <div className="coord-document-read coord-institution-assets">
              <div className="coord-document-read-head">
                <div>
                  <strong>Recursos institucionales para documentos</strong>
                  <span>Firmas, logos y sello disponibles para los formatos institucionales.</span>
                </div>
                <button
                  className="coord-register-button coord-assets-save"
                  type="button"
                  onClick={guardarConfigInstitucional}
                  disabled={guardandoConfigInstitucional || cargandoConfigInstitucional}
                >
                  {guardandoConfigInstitucional ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                  <span>{guardandoConfigInstitucional ? "Guardando" : "Guardar recursos"}</span>
                </button>
              </div>

              <div className="coord-assets-grid">
                {recursosInstitucionales.map((recurso) => {
                  const item = configInstitucional?.[recurso.id];
                  const tieneImagen = Boolean(item?.dataUrl);
                  return (
                    <div className="coord-asset-tile" key={recurso.id}>
                      <div className="coord-asset-preview">
                        {tieneImagen ? (
                          <img src={item.dataUrl} alt={recurso.label} />
                        ) : (
                          <Photo size={28} />
                        )}
                      </div>
                      <div className="coord-asset-info">
                        <strong>{recurso.label}</strong>
                        <span>{tieneImagen ? item.nombre : recurso.hint}</span>
                      </div>
                      <div className="coord-asset-actions">
                        <label className="coord-secondary-button coord-asset-upload">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => seleccionarRecursoInstitucional(recurso.id, event)}
                          />
                          <span>{tieneImagen ? "Cambiar" : "Subir"}</span>
                        </label>
                        {tieneImagen ? (
                          <button
                            className="coord-danger-button coord-asset-remove"
                            type="button"
                            onClick={() => quitarConfigInstitucionalImagen?.(recurso.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                  <div className="coord-documents-program-field">
                    <label>Nombre para guardar</label>
                    <input
                      value={form.nombre}
                      onChange={(event) => setForm((actual) => ({ ...actual, nombre: event.target.value }))}
                      placeholder="Ejemplo: Club de tareas Matematica"
                    />
                  </div>
                  <div className="coord-documents-category-field">
                    <label>Categoría</label>
                    <select
                      value={form.categoria}
                      onChange={(event) => setForm((actual) => ({ ...actual, categoria: event.target.value }))}
                    >
                      <option value="">Seleccione una categoría</option>
                      {(categorias || [])
                        .filter(c => {
                          const norm = String(c || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          return !(
                            norm === "vacaciones utiles" ||
                            norm === "talleres recreativos" ||
                            norm === "talleres deportivos" ||
                            norm === "deportivos" ||
                            norm === "taller recreativo" ||
                            norm === "vacaciones"
                          );
                        })
                        .map(cat => {
                          let label = cat;
                          if (cat === "Academico") label = "Académico";
                          if (cat === "Maraton") label = "Maratón";
                          return <option key={cat} value={cat}>{label}</option>;
                        })
                      }
                    </select>
                  </div>
                  <button
                    className="coord-register-button"
                    type="button"
                    onClick={programaDocs ? guardarDocumentosPrograma : guardarDocumentoComoPrograma}
                    disabled={guardando || !form.plantillaValidada}
                  >
                    {guardando ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                    <span>{guardando ? "Guardando" : programaDocs ? "Actualizar documento" : "Guardar plantilla"}</span>
                  </button>
                </div>
              )}

              {programaDocs && !plantillaYaGuardada ? (
                <button className="coord-secondary-button coord-documents-edit-button" type="button" onClick={() => abrirEditar(programaDocs)}>
                  <Edit3 size={17} />
                  <span>Editar datos del programa</span>
                </button>
              ) : null}
            </div>

            {lecturaDocumento ? (
              <div className="coord-document-read coord-documents-validation">
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
        </article>
      </section>
    </>
  );
}

export default DocumentosView;
