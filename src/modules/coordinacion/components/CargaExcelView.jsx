import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconEye as Eye,
  IconLoader2 as Loader2,
  IconUpload as Upload,
  IconX as X,
} from "@tabler/icons-react";
import SummaryBox from "./SummaryBox";
import { textoEstadoCarga } from "../utils/coordinacionFormatters";

function CargaExcelView({
  archivoInputKey,
  archivosExcel,
  cargandoPreview,
  cancelarCargaExcel,
  confirmandoCarga,
  confirmarCargaExcel,
  generarPreviewExcel,
  mensaje,
  previewCarga,
  progresoCarga,
  setArchivosExcel,
  setMensaje,
  setPreviewCarga,
  setProgresoCarga,
  tipoMsg,
}) {
  return (
    <>
      <header className="coord-topbar"><h1>CARGA MASIVA DE ALUMNOS DESDE EXCEL</h1></header>
      <section className="coord-workspace coord-workspace-single coord-workspace-upload">
        <article className="coord-card coord-search-card coord-upload-card">
          <div className="coord-card-title">
            <span className="coord-title-icon"><Upload size={21} /></span>
            <div>
              <h2>Importar alumnos invitados - Año escolar</h2>
              <p>Suba el Excel con los alumnos invitados del periodo escolar. El sistema reconocerá automáticamente el programa mediante la columna curso_programa.</p>
            </div>
          </div>

          <div className="coord-form">
            <div className="coord-upload-grid">
              <div className="coord-field">
                <label>Periodo</label>
                <div className="coord-readonly-field">Año escolar</div>
              </div>
              <div className="coord-field coord-field-full">
                <label>Archivos Excel (.xlsx o .xls) - maximo 6</label>
                <input
                  key={archivoInputKey}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={(event) => {
                    setArchivosExcel(Array.from(event.target.files || []));
                    setPreviewCarga(null);
                    setProgresoCarga(null);
                    setMensaje("");
                  }}
                />
                {archivosExcel.length ? (
                  <small>{archivosExcel.length} archivo(s) seleccionado(s)</small>
                ) : null}
              </div>
            </div>
            <div className="coord-upload-format-row" aria-label="Columnas aceptadas">
              <span>ID</span>
              <span>CÃ³d. Estudiante</span>
              <span>Nombres</span>
              <span>Grado</span>
              <span>SecciÃ³n</span>
              <span>Curso/Taller</span>
            </div>
            <div className="coord-upload-actions">
              <button className="coord-primary-button" type="button" onClick={generarPreviewExcel} disabled={!archivosExcel.length || cargandoPreview}>
                {cargandoPreview ? <Loader2 className="coord-spin" size={17} /> : <Eye size={17} />}
                <span>{cargandoPreview ? "Validando" : "Vista previa"}</span>
              </button>
              {(archivosExcel.length > 0 || previewCarga) ? (
                <button
                  className={previewCarga ? "coord-danger-button" : "coord-secondary-button"}
                  type="button"
                  onClick={cancelarCargaExcel}
                  disabled={cargandoPreview || confirmandoCarga}
                >
                  <X size={17} />
                  <span>Cancelar carga</span>
                </button>
              ) : null}
              <button className="coord-register-button" type="button" onClick={confirmarCargaExcel} disabled={!previewCarga || confirmandoCarga}>
                {confirmandoCarga ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                <span>{confirmandoCarga ? "Guardando" : "Guardar carga"}</span>
              </button>
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

          {progresoCarga ? (
            <div className="coord-upload-progress" aria-live="polite">
              <div className="coord-upload-progress-header">
                <strong>
                  {progresoCarga.estado === "listo"
                    ? "Vista previa lista"
                    : progresoCarga.actual > 0
                      ? `Validando archivo ${progresoCarga.actual} de ${progresoCarga.total}`
                      : "Preparando validacion"}
                </strong>
                <span>{progresoCarga.porcentaje}%</span>
              </div>
              <div className="coord-upload-progress-bar">
                <span style={{ width: `${progresoCarga.porcentaje}%` }} />
              </div>
              {progresoCarga.archivo ? (
                <p>{progresoCarga.archivo}</p>
              ) : null}
            </div>
          ) : null}

          {previewCarga ? (
            <>
              <div className="coord-load-summary">
                <SummaryBox label="Leidos" value={previewCarga.resumen.total} />
                <SummaryBox label="Válidos" value={previewCarga.resumen.validos} tone="success" />
                <SummaryBox label="Errores" value={previewCarga.resumen.errores} tone="error" />
                <SummaryBox label="Duplicados" value={previewCarga.resumen.duplicados} tone="warning" />
              </div>
              <div className="coord-table-wrap">
                <table className="coord-table">
                  <thead>
                    <tr>
                      <th>Alumno</th><th>Grado</th><th>Sección</th><th>Selección</th><th>Curso / nivel</th><th>Estado</th><th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewCarga.registros.map((reg) => (
                      <tr key={reg.fila}>
                        <td>{`${reg.nombres} ${reg.apellidos}`.trim() || "-"}</td>
                        <td>{reg.grado || "-"}</td>
                        <td>{reg.seccion || "-"}</td>
                        <td>{reg.seleccion || "-"}</td>
                        <td>{reg.curso || reg.nivelCambridge || "-"}</td>
                        <td><span className={`coord-pill ${reg.estado === "Valido" ? "coord-pill-success" : reg.estado === "Duplicado" ? "coord-pill-warning" : "coord-pill-error"}`}>{textoEstadoCarga(reg.estado)}</span></td>
                        <td>{reg.errores?.length ? reg.errores.join(" ") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="coord-empty">
              <Upload size={18} />
              <p>Suba un Excel con alumnos del programa. Para Cambridge se aceptan columnas como Alumno, Grado, Sección, Selección y Nivel Cambridge.</p>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default CargaExcelView;
