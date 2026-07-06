import { useEffect, useState, useMemo, useRef } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconCloudUpload as CloudUpload,
  IconEye as Eye,
  IconFileSpreadsheet as FileSpreadsheet,
  IconInfoCircle as InfoCircle,
  IconListCheck as ListCheck,
  IconLoader2 as Loader2,
  IconTrash as Trash,
  IconUserPlus as UserPlus,
  IconX as X,
  IconDownload as Download,
  IconFileText as FileText,
} from "@tabler/icons-react";
import { apiDb } from "../../../services/dbApi";
import { listarInvitados } from "../services/coordinacionService";
import { convertirWordOriginalAPdf, crearPdfInvitacionDocumento } from "../../secretaria/utils/secretariaDocumentoPdf";
import { generarComunicadoWordBlob, crearDocumentoInvitacion } from "../../secretaria/utils/secretariaDocumentoWord";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import SummaryBox from "./SummaryBox";
import { textoEstadoCarga } from "../utils/coordinacionFormatters";
import DocumentosView from "./DocumentosView";
import { formInicial } from "../constants/coordinacionFormDefaults";

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

  // DocumentosView props
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
  plantillaInputKey,
  programaDocs,
  quitarPlantilla,
  seleccionarPlantilla,
  setForm,
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
  ocultarTabs = false,
  abrirDocumentosPrograma,
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
    if (programasCarga.length === 0) return;

    let active = true;
    const cargarInvitadosExportar = async () => {
      const yaTenemosDatos = seleccionExportarId === "all"
        ? (programasCarga.every(prog => Array.isArray(invitadosMapRef.current[prog.id])))
        : Array.isArray(invitadosMapRef.current[seleccionExportarId]);

      if (yaTenemosDatos) return;

      setCargandoInvitados(true);
      try {
        const map = { ...invitadosMapRef.current };
        if (seleccionExportarId === "all") {
          await Promise.all(
            programasCarga.map(async (prog) => {
              if (!Array.isArray(invitadosMapRef.current[prog.id])) {
                const list = await listarInvitados(prog.id);
                if (active) {
                  map[prog.id] = list;
                }
              }
            })
          );
        } else {
          if (!Array.isArray(invitadosMapRef.current[seleccionExportarId])) {
            const list = await listarInvitados(seleccionExportarId);
            if (active) {
              map[seleccionExportarId] = list;
            }
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

  const estadisticasExportar = useMemo(() => {
    let total = 0;
    let conApoderado = 0;
    let sinApoderado = 0;

    const contarInvitado = (invitado) => {
      total++;
      const dbEstudiante = apiDb.estudiantes?.[invitado.dni] || invitado;
      const tieneApoderado = Boolean(
        (dbEstudiante.apoderado && dbEstudiante.apoderado.trim() !== "") ||
        (dbEstudiante.telefonoApoderado && dbEstudiante.telefonoApoderado.trim() !== "")
      );
      if (tieneApoderado) {
        conApoderado++;
      } else {
        sinApoderado++;
      }
    };

    if (seleccionExportarId === "all") {
      programasCarga.forEach((prog) => {
        const list = invitadosMap[prog.id] || [];
        list.forEach(contarInvitado);
      });
    } else {
      const list = invitadosMap[seleccionExportarId] || [];
      list.forEach(contarInvitado);
    }

    return { total, conApoderado, sinApoderado };
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
          <h1>{ocultarTabs ? "REGISTRO INDIVIDUAL DE ALUMNOS" : "IMPORTAR / REGISTRAR"}</h1>
        </div>
      </header>
      <section className="coord-workspace coord-workspace-single coord-workspace-upload">
        <article className="coord-card coord-search-card coord-upload-card">
          {!ocultarTabs && (
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
              <button
                type="button"
                className={`coord-upload-tab-plantillas ${modoCargaAlumnos === "plantillas" ? "is-active" : ""}`}
                onClick={() => {
                  setModoCargaAlumnos("plantillas");
                  setPreviewCarga(null);
                  setProgresoCarga(null);
                  setMensaje("");
                }}
              >
                <FileText size={16} />
                Plantillas / Documentos
              </button>
            </div>
          )}

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
            <div className="coord-export-box" style={{ animation: "coord-fade-in 0.25s ease" }}>
              <div className="coord-export-box-header">
                <Download size={22} />
                <span>Exportar forma masiva</span>
              </div>

              <div className="coord-form-group-green">
                <label htmlFor="coord-exportar-programa">
                  <FileSpreadsheet size={16} />
                  Taller / Programa a exportar
                </label>
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

              <div className="coord-counter-grid">
                <div className="coord-counter-item">
                  <div className="coord-counter-num">{cargandoInvitados ? "..." : estadisticasExportar.total}</div>
                  <div className="coord-counter-label">👥 Total alumnos</div>
                </div>
                <div className="coord-counter-item coord-counter-green">
                  <div className="coord-counter-num">{cargandoInvitados ? "..." : estadisticasExportar.total}</div>
                  <div className="coord-counter-label">📄 Fichas a generar</div>
                </div>
                <div className="coord-counter-item coord-counter-warning">
                  <div className="coord-counter-num">{cargandoInvitados ? "..." : (seleccionExportarId === "all" ? programasCarga.length : 1)}</div>
                  <div className="coord-counter-label">📋 Talleres incluidos</div>
                </div>
              </div>

              <div className="coord-export-actions">
                <button
                  className="coord-btn-full coord-btn-validate"
                  type="button"
                  onClick={descargarFichasExportarTab}
                  disabled={exportando || cargandoInvitados || estadisticasExportar.total === 0}
                >
                  {exportando ? <Loader2 className="coord-spin" size={17} /> : <Download size={17} />}
                  <span>{exportando ? "Generando PDF..." : "Exportar PDF Único"}</span>
                </button>
              </div>

              <div className="coord-note-box">
                <InfoCircle size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                Las fichas se rellenarán automáticamente con los nombres y grados de los alumnos. El campo <strong>apoderado</strong> quedará en blanco si el estudiante no tiene un apoderado previamente registrado en el sistema.
              </div>
            </div>
          ) : modoCargaAlumnos === "plantillas" ? (
            <div className="coord-export-box" style={{ animation: "coord-fade-in 0.25s ease" }}>
              <div className="coord-export-box-header">
                <FileText size={22} />
                <span>Plantillas / Documentos</span>
              </div>

              <DocumentosView
                abrirEditar={abrirEditar}
                abrirCrearDesdeDocumento={abrirCrearDesdeDocumento}
                autocompletarDesdePlantilla={autocompletarDesdePlantilla}
                eliminarPlantillaHistorial={eliminarPlantillaHistorial}
                form={form}
                guardando={guardando}
                guardarDocumentoComoPrograma={guardarDocumentoComoPrograma}
                guardarDocumentosPrograma={guardarDocumentosPrograma}
                historialPlantillas={historialPlantillas}
                lecturaDocumento={lecturaDocumento}
                mensaje={mensaje}
                plantillaInputKey={plantillaInputKey}
                programaDocs={programaDocs}
                programas={programas}
                quitarPlantilla={quitarPlantilla}
                seleccionarPlantilla={seleccionarPlantilla}
                setForm={setForm}
                tipoMsg={tipoMsg}
                usarPlantillaExistente={usarPlantillaExistente}
                variablesPlantillaAceptadas={variablesPlantillaAceptadas}
                variablesPlantillaRequeridas={variablesPlantillaRequeridas}
                categorias={categorias}
                configInstitucional={configInstitucional}
                cargandoConfigInstitucional={cargandoConfigInstitucional}
                guardandoConfigInstitucional={guardandoConfigInstitucional}
                actualizarConfigInstitucionalImagen={actualizarConfigInstitucionalImagen}
                quitarConfigInstitucionalImagen={quitarConfigInstitucionalImagen}
                guardarConfigInstitucional={guardarConfigInstitucional}
                embedded={true}
              />
            </div>
          ) : (
          <div className="coord-export-box" style={{ animation: "coord-fade-in 0.25s ease" }}>
            <div className="coord-export-box-header">
              <FileSpreadsheet size={22} />
              <span>Carga masiva de alumnos</span>
            </div>
            {/* Selector de programa */}
            <div className="coord-form-group-green">
              <label htmlFor="coord-programa-carga">
                <FileSpreadsheet size={16} />
                Código del programa o curso
              </label>
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

            {/* Zona de Drag & Drop */}
            <div className="coord-form-group-green">
              <label>
                <FileSpreadsheet size={16} />
                Archivo (Excel)
              </label>
              <div
                className="coord-file-drop"
                onClick={() => document.getElementById("coord-excel-upload")?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
                onDragLeave={(e) => e.currentTarget.classList.remove("dragover")}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("dragover");
                  if (e.dataTransfer.files.length) {
                    setArchivosExcel(Array.from(e.dataTransfer.files));
                    setPreviewCarga(null);
                    setProgresoCarga(null);
                    setMensaje("");
                  }
                }}
              >
                <CloudUpload size={32} className="coord-drop-icon" />
                <p className="coord-drop-text">
                  Arrastra tu archivo o <span className="coord-drop-highlight">haz clic para elegir</span>
                </p>
                <div className="coord-drop-sub">.xlsx, .xls — máx 5 MB</div>
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
              </div>

              {archivosExcel.length > 0 && (
                <div className="coord-file-info-bar">
                  <CheckCircle2 size={18} />
                  <span>{obtenerResumenArchivos(archivosExcel)}</span>
                  <span className="coord-file-size">
                    ({(archivosExcel.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    className="coord-file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelarCargaExcel();
                    }}
                  >
                    <X size={14} /> Quitar
                  </button>
                </div>
              )}

              <div className="coord-chip-group">
                <span className="coord-chip">DNI o Código</span>
                <span className="coord-chip">Alumno (Nombres y Apellidos)</span>
                <span className="coord-chip">Grado</span>
                <span className="coord-chip">Nivel</span>
                <span className="coord-chip coord-chip-optional">Selección (solo Cambridge)</span>
              </div>
              <div className="coord-chip-hint">
                <InfoCircle size={14} />
                La <strong>Sección</strong> se autocompleta desde la base de datos.
              </div>
            </div>

            {/* Botón principal: Validar y Previsualizar */}
            <button
              className="coord-btn-full coord-btn-validate"
              type="button"
              onClick={generarPreviewExcel}
              disabled={!programaCargaId || !archivosExcel.length || cargandoPreview}
            >
              {cargandoPreview ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
              <span>{cargandoPreview ? "Validando..." : "Validar y Previsualizar"}</span>
            </button>

            {/* Botón Guardar carga (aparece solo con preview) */}
            {previewCarga && (
              <button
                className="coord-btn-full coord-btn-save"
                type="button"
                onClick={confirmarCargaExcel}
                disabled={confirmandoCarga}
              >
                {confirmandoCarga ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                <span>{confirmandoCarga ? "Guardando..." : "Guardar en Base de Datos"}</span>
              </button>
            )}

            {/* Botón Cancelar (aparece con archivos o preview) */}
            {(archivosExcel.length > 0 || previewCarga) && (
              <button
                className="coord-btn-full coord-btn-cancel"
                type="button"
                onClick={cancelarCargaExcel}
                disabled={cargandoPreview || confirmandoCarga}
              >
                <X size={17} />
                <span>Cancelar</span>
              </button>
            )}
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
