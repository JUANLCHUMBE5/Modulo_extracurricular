import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconEye as Eye,
  IconFileSpreadsheet as FileSpreadsheet,
  IconListCheck as ListCheck,
  IconLoader2 as Loader2,
  IconX as X,
} from "@tabler/icons-react";
import SummaryBox from "./SummaryBox";
import { textoEstadoCarga } from "../utils/coordinacionFormatters";

function obtenerResumenArchivos(archivosExcel = []) {
  if (!archivosExcel.length) return "Seleccione uno o varios archivos .xlsx o .xls";
  if (archivosExcel.length === 1) return archivosExcel[0].name;
  return `${archivosExcel.length} archivos seleccionados`;
}

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
          <div className="coord-form">
            <div className="coord-upload-grid">
              <div className="coord-field">
                <label>Periodo</label>
                <div className="coord-readonly-field">Año escolar</div>
              </div>
              <div className="coord-field coord-field-full">
                <label>Archivo Excel</label>
                <div className="coord-file-picker">
                  <input
                    id="coord-excel-upload"
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
                  <label htmlFor="coord-excel-upload">
                    <FileSpreadsheet size={17} />
                    Elegir Excel
                  </label>
                  <span>{obtenerResumenArchivos(archivosExcel)}</span>
                </div>
                {archivosExcel.length ? (
                  <small>Puede cargar hasta 6 archivos. Tamaño máximo por archivo: 5 MB.</small>
                ) : null}
                <small>
                  Para Cambridge incluya las columnas <b>grado</b>, <b>seccion</b> y <b>seleccion</b>. La columna <b>nivel_cambridge</b> es opcional. Use A para certificado oficial, B para Admission Test o C para desempeño académico.
                </small>
              </div>
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
                      : "Preparando validación"}
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
                      <th>DNI</th><th>Código</th><th>Alumno</th><th>Grado</th><th>Sección</th><th>Selección</th><th>Curso / nivel</th><th>Estado</th><th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewCarga.registros.map((reg) => (
                      <tr key={reg.fila}>
                        <td>{reg.dniOriginalExcel || reg.dni || "-"}</td>
                        <td>{reg.codigoEstudianteOriginalExcel || reg.codigoEstudiante || "-"}</td>
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
              <ListCheck size={18} />
              <p>Seleccione un Excel y presione <b>Vista previa</b>. Todavía no se guarda nada hasta que revise los resultados y confirme la carga.</p>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default CargaExcelView;
