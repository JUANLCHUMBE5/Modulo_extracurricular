import { useEffect, useState, useMemo, useRef } from "react";
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
  IconDownload as Download,
} from "@tabler/icons-react";
import { apiDb } from "../../../services/dbApi";
import { listarInvitados } from "../services/coordinacionService";
import { convertirWordOriginalAPdf, crearPdfInvitacionDocumento } from "../../secretaria/utils/secretariaDocumentoPdf";
import { generarComunicadoWordBlob, crearDocumentoInvitacion } from "../../secretaria/utils/secretariaDocumentoWord";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import SummaryBox from "./SummaryBox";
import { textoEstadoCarga } from "../utils/coordinacionFormatters";

async function combinarBlobsPdf(blobs) {
  const pdfCombinado = await PDFDocument.create();
  for (const blob of blobs) {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const paginasCopiadas = await pdfCombinado.copyPages(pdf, pdf.getPageIndices());
    paginasCopiadas.forEach((pagina) => pdfCombinado.addPage(pagina));
  }
  const bytesPdf = await pdfCombinado.save();
  return new Blob([bytesPdf], { type: "application/pdf" });
}

async function generarYDescargarPdfFichasLote({
  registros,
  programas,
  nombrePdf,
  setLoadingState = () => {},
}) {
  if (!registros || !registros.length) {
    toast.error("La carga no tiene alumnos registrados.");
    return;
  }

  setLoadingState(true);
  try {
    const resultados = new Array(registros.length).fill(null);
    const programasSinPlantilla = new Set();

    const procesarRegistro = async (reg, index) => {
      const programa = programas.find((p) => p.id === reg.programaId);
      if (!programa) return;

      const dbEstudiante = apiDb.estudiantes?.[reg.dni];
      const mockEstudiante = {
        dni: reg.dni,
        nombres: reg.nombres || reg.nombre,
        grado: reg.grado || "",
        seccion: reg.seccion || "",
        apoderado: dbEstudiante?.apoderado || "",
        telefonoApoderado: dbEstudiante?.telefonoApoderado || "",
        correoApoderado: dbEstudiante?.correoApoderado || "",
      };

      const mockInscripcion = {
        id: `INS-INV-${reg.dni}-${reg.programaId}`,
        dniEstudiante: reg.dni,
        nombresEstudiante: reg.nombres || reg.nombre,
        gradoEstudiante: reg.grado || "",
        seccion: reg.seccion || "",
        programaId: reg.programaId,
        programa: programa.nombre,
        horario: programa.horario || "",
        docente: programa.docente || "",
        costo: programa.costo || 0,
        modalidadCobro: programa.modalidadCobro || "",
        fechaInicio: programa.fechaInicio || "",
        fechaFin: programa.fechaFin || "",
        fechaRegistro: new Date().toISOString(),
        apoderado: dbEstudiante?.apoderado || "",
        telefono: dbEstudiante?.telefonoApoderado || "",
        correo: dbEstudiante?.correoApoderado || "",
        plantilla: programa.plantilla || "",
        plantillaBase64: programa.plantillaBase64 || "",
        requiereUniforme: programa.requiereUniforme || false,
        requiereIndumentaria: programa.requiereIndumentaria || false,
        cicloI: programa.cicloI || "",
        cicloII: programa.cicloII || "",
        horariosPorGrupo: programa.horariosPorGrupo || [],
        incluyeAlmuerzo: programa.incluyeAlmuerzo || false,
        detalleAlmuerzo: programa.detalleAlmuerzo || "",
        concesionarios: programa.concesionarios || "",
        horarioRecepcionAlmuerzo: programa.horarioRecepcionAlmuerzo || "",
        tipoComunicado: programa.tipoComunicado || "Otro genérico",
      };

      if (!programa.plantillaBase64) {
        try {
          const documentoFallback = await crearDocumentoInvitacion(mockEstudiante, mockInscripcion);
          const pdfBlob = (await crearPdfInvitacionDocumento(documentoFallback)).output("blob");
          resultados[index] = pdfBlob;
        } catch (err) {
          console.error(`Error generando ficha genérica para ${reg.nombres || reg.nombre}:`, err);
        }
        return;
      }

      try {
        const wordBlob = await generarComunicadoWordBlob({
          estudiante: mockEstudiante,
          inscripcion: mockInscripcion,
          omitirMarcaAguaVista: true,
        });

        const pdfBlob = await convertirWordOriginalAPdf(wordBlob);
        resultados[index] = pdfBlob;
      } catch (err) {
        console.error(`Error generando ficha para ${reg.nombres || reg.nombre}:`, err);
      }
    };

    const batchSize = 5;
    for (let i = 0; i < registros.length; i += batchSize) {
      const lote = registros.slice(i, i + batchSize);
      await Promise.all(lote.map((reg, offset) => procesarRegistro(reg, i + offset)));
    }

    const pdfBlobs = resultados.filter(Boolean);
    const archivosAgregados = pdfBlobs.length;

    if (archivosAgregados === 0) {
      if (programasSinPlantilla.size > 0) {
        alert(
          `No se pudo generar ninguna ficha porque los siguientes programas no tienen plantilla Word asignada:\n\n${Array.from(
            programasSinPlantilla
          ).join("\n")}\n\nPor favor, suba una plantilla en la sección "Importar Formato Taller" primero.`
        );
      } else {
        alert("No se encontraron registros válidos o plantillas para generar.");
      }
      return;
    }

    const pdfCombinadoBlob = await combinarBlobsPdf(pdfBlobs);
    const url = URL.createObjectURL(pdfCombinadoBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombrePdf;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    if (programasSinPlantilla.size > 0) {
      alert(
        `Se descargaron ${archivosAgregados} fichas en un único PDF. Sin embargo, no se generaron fichas para los siguientes programas por falta de plantilla:\n\n${Array.from(
          programasSinPlantilla
        ).join("\n")}`
      );
    }
  } catch (error) {
    console.error("Error al descargar fichas en lote:", error);
    alert("Ocurrió un error al generar las fichas en lote.");
  } finally {
    setLoadingState(false);
  }
}

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

function programasDisponibles(programas = []) {
  return programas.filter((programa) =>
    String(programa.estado || "").toLowerCase() !== "archivado"
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
  toggleSidebarButton,
  ultimoLoteId,
  setUltimoLoteId,
}) {
  const programasCarga = useMemo(() => programasDisponibles(programas), [programas]);

  const [paginaActual, setPaginaActual] = useState(1);
  const [descargandoCargaId, setDescargandoCargaId] = useState("");

  const descargarFichasLote = async (carga) => {
    const nombrePdf = `FICHAS - ${carga.archivoNombre || "CARGA"} - ${new Date()
      .toLocaleDateString("es-PE")
      .replace(/\//g, "-")}.pdf`;

    await generarYDescargarPdfFichasLote({
      registros: carga.registros || [],
      programas,
      nombrePdf,
      setLoadingState: (loading) => setDescargandoCargaId(loading ? carga.id : ""),
    });
  };

  const [seleccionExportarId, setSeleccionExportarId] = useState("all");
  const [exportando, setExportando] = useState(false);
  const [invitadosMap, setInvitadosMap] = useState({});
  const [cargandoInvitados, setCargandoInvitados] = useState(false);

  const invitadosMapRef = useRef(invitadosMap);
  useEffect(() => {
    invitadosMapRef.current = invitadosMap;
  }, [invitadosMap]);

  useEffect(() => {
    if (modoCargaAlumnos !== "exportar") return;

    let active = true;
    const cargarInvitadosExportar = async () => {
      const yaTenemosDatos = seleccionExportarId === "all"
        ? (programasCarga.length > 0 && programasCarga.every(prog => Array.isArray(invitadosMapRef.current[prog.id])))
        : Array.isArray(invitadosMapRef.current[seleccionExportarId]);

      if (!yaTenemosDatos) {
        setCargandoInvitados(true);
      }
      try {
        const map = {};
        if (seleccionExportarId === "all") {
          await Promise.all(
            programasCarga.map(async (prog) => {
              const list = await listarInvitados(prog.id);
              if (active) {
                map[prog.id] = list;
              }
            })
          );
        } else {
          const list = await listarInvitados(seleccionExportarId);
          if (active) {
            map[seleccionExportarId] = list;
          }
        }
        if (active) {
          setInvitadosMap(map);
        }
      } catch (error) {
        console.error("Error al cargar invitados para exportar:", error);
      } finally {
        if (active) {
          setCargandoInvitados(false);
        }
      }
    };

    cargarInvitadosExportar();

    return () => {
      active = false;
    };
  }, [seleccionExportarId, programasCarga, modoCargaAlumnos, historialCargas]);

  const cantidadAlumnosExportar = useMemo(() => {
    let count = 0;
    if (seleccionExportarId === "all") {
      programasCarga.forEach((prog) => {
        count += (invitadosMap[prog.id] || []).length;
      });
    } else {
      count = (invitadosMap[seleccionExportarId] || []).length;
    }
    return count;
  }, [seleccionExportarId, programasCarga, invitadosMap]);

  const descargarFichasExportarTab = async () => {
    let registros = [];

    if (seleccionExportarId === "all") {
      programasCarga.forEach((prog) => {
        const invitadosProg = invitadosMap[prog.id] || [];
        invitadosProg.forEach((inv) => {
          registros.push({
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado,
            seccion: inv.seccion || "",
            programaId: prog.id,
          });
        });
      });
    } else {
      const prog = programasCarga.find((p) => p.id === seleccionExportarId);
      if (prog) {
        const invitadosProg = invitadosMap[prog.id] || [];
        invitadosProg.forEach((inv) => {
          registros.push({
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado,
            seccion: inv.seccion || "",
            programaId: prog.id,
          });
        });
      }
    }

    const nombreTallerStr = seleccionExportarId === "all" ? "TODOS-LOS-TALLERES" : (programasCarga.find((p) => p.id === seleccionExportarId)?.nombre || "TALLER");
    const nombrePdf = `FICHAS - ${nombreTallerStr.toUpperCase()} - ${new Date()
      .toLocaleDateString("es-PE")
      .replace(/\//g, "-")}.pdf`;

    await generarYDescargarPdfFichasLote({
      registros,
      programas,
      nombrePdf,
      setLoadingState: setExportando,
    });
  };

  const historialFiltrado = historialCargas.filter((carga) => {
    const esIndividual =
      carga.archivoNombre === "Registro individual" ||
      (Array.isArray(carga.archivos) && carga.archivos.includes("Registro individual"));
    return modoCargaAlumnos === "individual" ? esIndividual : !esIndividual;
  });

  const itemsPorPagina = 10;
  const totalPaginas = Math.ceil(historialFiltrado.length / itemsPorPagina);

  useEffect(() => {
    setPaginaActual(1);
  }, [modoCargaAlumnos]);

  useEffect(() => {
    if (paginaActual > totalPaginas && totalPaginas > 0) {
      setPaginaActual(totalPaginas);
    }
  }, [totalPaginas, paginaActual]);

  const historialPaginado = historialFiltrado.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  return (
    <>
      <header className="coord-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {toggleSidebarButton}
          <h1>IMPORTAR/EXPORTAR EXCEL Y PDF</h1>
        </div>
      </header>
      <section className="coord-workspace coord-workspace-single coord-workspace-upload">
        <article className="coord-card coord-search-card coord-upload-card">
          <div className="coord-upload-tabs" role="tablist" aria-label="Tipo de carga de alumnos">
            <button
              type="button"
              className={`coord-upload-tab-masiva ${modoCargaAlumnos === "masiva" ? "is-active" : ""}`}
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
              className={`coord-upload-tab-individual ${modoCargaAlumnos === "individual" ? "is-active" : ""}`}
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
            <button
              type="button"
              className={`coord-upload-tab-exportar ${modoCargaAlumnos === "exportar" ? "is-active" : ""}`}
              onClick={() => {
                setModoCargaAlumnos("exportar");
                setPreviewCarga(null);
                setProgresoCarga(null);
                setMensaje("");
              }}
            >
              <Download size={16} />
              Exportar forma masiva
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
                <option value="">Seleccione programa o curso</option>
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
                  placeholder="Se autocompleta con el DNI"
                  disabled={true}
                />
              </div>
              <div className="coord-field coord-individual-clean-grade">
                <label htmlFor="coord-individual-grado">Grado</label>
                <input
                  id="coord-individual-grado"
                  value={alumnoIndividual.grado}
                  placeholder="Se autocompleta con el DNI"
                  disabled={true}
                />
              </div>
              <button
                className="coord-register-button coord-individual-clean-submit"
                type="button"
                onClick={guardarAlumnoIndividual}
                disabled={guardandoIndividual || !estadoAlumnoIndividual.encontrado}
              >
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
          ) : modoCargaAlumnos === "exportar" ? (
            <div className="coord-form coord-massive-clean-form">
              <div className="coord-field coord-massive-clean-program">
                <label htmlFor="coord-exportar-programa">Taller / Programa a exportar</label>
                <select
                  id="coord-exportar-programa"
                  value={seleccionExportarId}
                  onChange={(event) => setSeleccionExportarId(event.target.value)}
                >
                  <option value="all">Todos los talleres</option>
                  {programasCarga.map((programa) => (
                    <option key={programa.id} value={programa.id}>
                      {programa.id} - {programa.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: "8px", marginBottom: "12px" }}>
                <p style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>
                  Se generarán <b>{cargandoInvitados ? "..." : cantidadAlumnosExportar}</b> fichas/comunicados en total para los alumnos cargados en esta selección.
                </p>
                <p style={{ fontSize: "11px", color: "#000000", marginTop: "3px", fontWeight: 500 }}>
                  * Nota: Las fichas se rellenarán automáticamente con los nombres y grados de los alumnos. El campo del apoderado quedará en blanco si el estudiante no tiene un apoderado previamente registrado en el sistema.
                </p>
              </div>

              <div className="coord-massive-clean-actions">
                <button
                  className="coord-primary-button"
                  type="button"
                  onClick={descargarFichasExportarTab}
                  disabled={exportando || cargandoInvitados || cantidadAlumnosExportar === 0}
                  style={{ backgroundColor: "#2b8a3e", borderColor: "#2b8a3e" }}
                >
                  {exportando ? <Loader2 className="coord-spin" size={17} /> : <Download size={17} />}
                  <span>{exportando ? "Generando PDF..." : "Exportar PDF Único"}</span>
                </button>
              </div>
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
                <option value="">Seleccione programa o curso</option>
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
            <p className="coord-massive-clean-hint">Formato estandarizado esperado: DNI o Código, Alumno (Nombres y Apellidos), Grado, Nivel, y Selección (solo para Cambridge). No se requiere Sección en el Excel (se autocompletará automáticamente desde la base de datos).</p>
          </div>
          )}

          {mensaje && (
            <MantineAlert
              className="coord-message"
              color={tipoMsg === "success" ? "sanrafael" : "orange"}
              radius="md"
              icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "12px" }}>
                <span>{mensaje}</span>
                {tipoMsg === "success" && ultimoLoteId && (
                  <button
                    type="button"
                    className="coord-primary-button"
                    style={{
                      padding: "4px 12px",
                      fontSize: "13px",
                      height: "auto",
                      backgroundColor: "#2b8a3e",
                      borderColor: "#2b8a3e",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    onClick={() => {
                      const carga = historialCargas.find((c) => c.id === ultimoLoteId);
                      if (carga) {
                        descargarFichasLote(carga);
                      } else {
                        toast.error("No se encontró la carga actual en el historial.");
                      }
                    }}
                    disabled={descargandoCargaId === ultimoLoteId}
                  >
                    {descargandoCargaId === ultimoLoteId ? (
                      <Loader2 className="coord-spin" size={14} />
                    ) : (
                      <Download size={14} />
                    )}
                    <span>Descargar PDF Único</span>
                  </button>
                )}
              </div>
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


        </article>
      </section>
    </>
  );
}

export default CargaExcelView;
