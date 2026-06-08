import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconEye as Eye,
  IconFileSpreadsheet as FileSpreadsheet,
  IconListCheck as ListCheck,
  IconLoader2 as Loader2,
  IconTrash as Trash,
  IconUserPlus as UserPlus,
  IconX as X,
} from "@tabler/icons-react";
import SummaryBox from "./SummaryBox";
import { textoEstadoCarga } from "../utils/coordinacionFormatters";

function obtenerResumenArchivos(archivosExcel = []) {
  if (!archivosExcel.length) return "Ningun archivo seleccionado";
  if (archivosExcel.length === 1) return archivosExcel[0].name;
  return `${archivosExcel.length} archivos seleccionados`;
}

function formatearFechaCarga(valor = "") {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

function resumirProgramasCarga(carga = {}) {
  const nombres = new Set((carga.registros || []).map((item) => item.programaNombre).filter(Boolean));
  if (!nombres.size) return "-";
  return Array.from(nombres).join(", ");
}

function resumirCampoCarga(carga = {}, resolver) {
  const valores = new Set((carga.registros || []).map(resolver).filter(Boolean));
  if (!valores.size) return "-";
  return Array.from(valores).join(", ");
}

function obtenerNivelDesdeGrado(grado = "") {
  const texto = normalizarTexto(grado);
  if (texto.includes("inicial")) return "Inicial";
  if (texto.includes("primaria")) return "Primaria";
  if (texto.includes("secundaria")) return "Secundaria";
  return "";
}

function normalizarTexto(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esCategoriaAcademica(programa = {}) {
  const categoria = normalizarTexto(programa.categoria);
  return categoria.includes("academ");
}

function programasDisponibles(programas = []) {
  return programas.filter((programa) =>
    String(programa.periodo || "escolar").toLowerCase().includes("escolar") &&
    String(programa.estado || "Habilitado") === "Habilitado" &&
    esCategoriaAcademica(programa)
  );
}

function CargaExcelView({
  archivoInputKey,
  archivosExcel,
  cargandoPreview,
  cancelarCargaExcel,
  confirmandoCarga,
  confirmarCargaExcel,
  eliminandoCargaId,
  eliminarCargaExcel,
  generarPreviewExcel,
  guardarAlumnoIndividual,
  guardandoIndividual,
  historialCargas = [],
  mensaje,
  modoCargaAlumnos,
  alumnoIndividual = { dni: "", nombre: "", grado: "" },
  estadoAlumnoIndividual = { buscando: false, mensaje: "", encontrado: false },
  previewCarga,
  programaCargaId,
  programas = [],
  progresoCarga,
  setModoCargaAlumnos = () => {},
  setProgramaCargaId = () => {},
  setArchivosExcel,
  actualizarAlumnoIndividual = () => {},
  setMensaje,
  setPreviewCarga,
  setProgresoCarga,
  tipoMsg,
}) {
  const programasCarga = programasDisponibles(programas);

  return (
    <>
      <header className="coord-topbar"><h1>CARGA MASIVA</h1></header>
      <section className="coord-workspace coord-workspace-single coord-workspace-upload">
        <article className="coord-card coord-search-card coord-upload-card">
          <div className="coord-upload-tabs" role="tablist" aria-label="Tipo de carga de alumnos">
            <button
              type="button"
              className={modoCargaAlumnos === "masiva" ? "is-active" : ""}
              onClick={() => {
                setModoCargaAlumnos("masiva");
                setMensaje("");
              }}
            >
              <FileSpreadsheet size={16} />
              Carga masiva
            </button>
            <button
              type="button"
              className={modoCargaAlumnos === "individual" ? "is-active" : ""}
              onClick={() => {
                setModoCargaAlumnos("individual");
                setPreviewCarga(null);
                setProgresoCarga(null);
                setMensaje("");
              }}
            >
              <UserPlus size={16} />
              Registro individual
            </button>
          </div>

          {modoCargaAlumnos === "individual" ? (
          <div className="coord-form coord-individual-clean-form">
            <div className="coord-field coord-individual-clean-program">
              <label htmlFor="coord-programa-carga">Codigo del programa o curso</label>
              <select
                id="coord-programa-carga"
                value={programaCargaId}
                onChange={(event) => {
                  setProgramaCargaId(event.target.value);
                  setPreviewCarga(null);
                  setProgresoCarga(null);
                  setMensaje("");
                }}
              >
                <option value="">Seleccione programa academico</option>
                {programasCarga.map((programa) => (
                  <option key={programa.id} value={programa.id}>
                    {programa.id} - {programa.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="coord-individual-clean-row">
              <div className="coord-field coord-individual-clean-dni">
                <label htmlFor="coord-individual-dni">DNI</label>
                <input
                  id="coord-individual-dni"
                  value={alumnoIndividual.dni}
                  onChange={(event) => actualizarAlumnoIndividual("dni", event.target.value)}
                  placeholder="8 digitos"
                  inputMode="numeric"
                  maxLength="8"
                />
              </div>
              <div className="coord-field coord-individual-clean-name">
                <label htmlFor="coord-individual-nombre">Nombre</label>
                <input
                  id="coord-individual-nombre"
                  value={alumnoIndividual.nombre}
                  onChange={(event) => actualizarAlumnoIndividual("nombre", event.target.value)}
                  placeholder="Nombre completo"
                  disabled={estadoAlumnoIndividual.buscando}
                />
              </div>
              <div className="coord-field coord-individual-clean-grade">
                <label htmlFor="coord-individual-grado">Grado</label>
                <input
                  id="coord-individual-grado"
                  value={alumnoIndividual.grado}
                  onChange={(event) => actualizarAlumnoIndividual("grado", event.target.value)}
                  placeholder="Ej: Primaria 4"
                  disabled={estadoAlumnoIndividual.buscando}
                />
              </div>
              <button className="coord-register-button coord-individual-clean-submit" type="button" onClick={guardarAlumnoIndividual} disabled={guardandoIndividual}>
                {guardandoIndividual ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                <span>{guardandoIndividual ? "Guardando" : "Agregar alumno"}</span>
              </button>
            </div>
            {estadoAlumnoIndividual.mensaje ? (
              <p className={`coord-individual-clean-status ${estadoAlumnoIndividual.encontrado ? "is-success" : "is-warning"}`}>
                {estadoAlumnoIndividual.mensaje}
              </p>
            ) : null}
          </div>
          ) : (
          <div className="coord-form coord-massive-clean-form">
            <div className="coord-field coord-massive-clean-program">
              <label htmlFor="coord-programa-carga">Codigo del programa o curso</label>
              <select
                id="coord-programa-carga"
                value={programaCargaId}
                onChange={(event) => {
                  setProgramaCargaId(event.target.value);
                  setPreviewCarga(null);
                  setProgresoCarga(null);
                  setMensaje("");
                }}
              >
                <option value="">Seleccione programa academico</option>
                {programasCarga.map((programa) => (
                  <option key={programa.id} value={programa.id}>
                    {programa.id} - {programa.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="coord-massive-clean-row">
              <div className="coord-field coord-massive-clean-file">
                <label>Archivo</label>
                <div className="coord-file-picker coord-massive-clean-picker">
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
              </div>

              <div className="coord-massive-clean-actions">
                <button className="coord-primary-button" type="button" onClick={generarPreviewExcel} disabled={!programaCargaId || !archivosExcel.length || cargandoPreview}>
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
                    <span>Cancelar</span>
                  </button>
                ) : null}
                <button className="coord-register-button" type="button" onClick={confirmarCargaExcel} disabled={!previewCarga || confirmandoCarga}>
                  {confirmandoCarga ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                  <span>{confirmandoCarga ? "Guardando" : "Guardar carga"}</span>
                </button>
              </div>
            </div>
            <p className="coord-massive-clean-hint">Formato esperado: DNI, NOMBRE y GRADO. No se requiere seccion ni curso en el Excel.</p>
          </div>
          )}

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

          {modoCargaAlumnos === "masiva" && progresoCarga ? (
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

          {modoCargaAlumnos === "masiva" && previewCarga ? (
            <>
              <div className="coord-load-summary">
                <SummaryBox label="Leidos" value={previewCarga.resumen.total} />
                <SummaryBox label="Validos" value={previewCarga.resumen.validos} tone="success" />
                <SummaryBox label="Errores" value={previewCarga.resumen.errores} tone="error" />
                <SummaryBox label="Duplicados" value={previewCarga.resumen.duplicados} tone="warning" />
              </div>
              <div className="coord-table-wrap">
                <table className="coord-table">
                  <thead>
                    <tr>
                      <th>DNI</th><th>Codigo</th><th>Alumno</th><th>Grado</th><th>Programa</th><th>Estado</th><th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewCarga.registros.map((reg) => (
                      <tr key={reg.fila}>
                        <td>{reg.dniOriginalExcel || reg.dni || "-"}</td>
                        <td>{reg.codigoEstudianteOriginalExcel || reg.codigoEstudiante || "-"}</td>
                        <td>{`${reg.nombres} ${reg.apellidos}`.trim() || "-"}</td>
                        <td>{reg.grado || "-"}</td>
                        <td>{reg.programaNombre || "-"}</td>
                        <td><span className={`coord-pill ${reg.estado === "Valido" ? "coord-pill-success" : reg.estado === "Duplicado" ? "coord-pill-warning" : "coord-pill-error"}`}>{textoEstadoCarga(reg.estado)}</span></td>
                        <td>{reg.errores?.length ? reg.errores.join(" ") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : modoCargaAlumnos === "masiva" ? (
            <div className="coord-empty coord-upload-empty">
              <ListCheck size={18} />
              <p>Seleccione programa, archivo y revise <b>Vista previa</b> antes de guardar.</p>
            </div>
          ) : null}

          <div className="coord-upload-history">
            <div className="coord-upload-history-header">
              <div>
                <h2>Historial de cargas</h2>
                <p>Desde aquí puede borrar una carga confirmada si sus alumnos aún no tienen inscripción activa.</p>
              </div>
            </div>

            {historialCargas.length ? (
              <div className="coord-table-wrap">
                <table className="coord-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Archivo</th>
                      <th>Nombre</th>
                      <th>Grado</th>
                      <th>Taller</th>
                      <th>Nivel</th>
                      <th>Importados</th>
                      <th>Errores</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialCargas.map((carga) => (
                      <tr key={carga.id}>
                        <td>{formatearFechaCarga(carga.fecha)}</td>
                        <td>{Array.isArray(carga.archivos) && carga.archivos.length ? carga.archivos.join(", ") : carga.archivoNombre || carga.id}</td>
                        <td>{resumirCampoCarga(carga, (item) => item.nombres)}</td>
                        <td>{resumirCampoCarga(carga, (item) => item.grado)}</td>
                        <td>{resumirProgramasCarga(carga)}</td>
                        <td>{resumirCampoCarga(carga, (item) => item.nivelEducativo || obtenerNivelDesdeGrado(item.grado))}</td>
                        <td>{carga.resumen?.importados ?? carga.resumen?.validos ?? carga.registros?.length ?? 0}</td>
                        <td>{carga.resumen?.errores ?? 0}</td>
                        <td>
                          <button
                            className="coord-danger-button coord-upload-history-delete"
                            type="button"
                            onClick={() => eliminarCargaExcel(carga)}
                            disabled={eliminandoCargaId === carga.id}
                          >
                            {eliminandoCargaId === carga.id ? <Loader2 className="coord-spin" size={15} /> : <Trash size={15} />}
                            <span>{eliminandoCargaId === carga.id ? "Borrando" : "Borrar"}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="coord-empty coord-upload-history-empty">
                <ListCheck size={18} />
                <p>Aún no hay cargas confirmadas para mostrar.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </>
  );
}

export default CargaExcelView;
