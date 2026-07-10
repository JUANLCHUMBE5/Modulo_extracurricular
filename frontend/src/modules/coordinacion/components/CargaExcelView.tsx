import { useEffect, useState, useMemo, useRef } from "react";
import { Alert as MantineAlert } from "@mantine/core";
import {
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle2,
  IconFileSpreadsheet as FileSpreadsheet,
  IconListCheck as ListCheck,
  IconLoader2 as Loader2,
  IconX as X,
  IconDownload as Download,
  IconFileText as FileText,
  IconBell as Megaphone,
} from "@tabler/icons-react";
import { apiDb } from "../../../services/dbApi";
import { listarInvitados } from "../services/coordinacionService";
import { toast } from "sonner";
import DocumentosView from "./DocumentosView";
import {
  generarYDescargarPdfFichasLote,
  programasDisponibles,
} from "../utils/cargaExcelHelpers";
import CargaHistorialTable from "./CargaHistorialTable";
import CargaPreviewTable from "./CargaPreviewTable";
import CargaIndividualTab from "./CargaIndividualTab";
import CargaExportarTab from "./CargaExportarTab";
import CargaAnunciosTab from "./CargaAnunciosTab";
import CargaMasivaTab from "./CargaMasivaTab";

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
  busquedaAlumno = "",
  setBusquedaAlumno = () => {},
  resultadosAlumnos = [],
  buscandoAlumnos = false,
  setAlumnoIndividual = () => {},
  setEstadoAlumnoIndividual = () => {},
  registrarAlumnoDirecto = () => {},
}: any) {
  const programasCarga = useMemo(() => programasDisponibles(programas), [programas]);

  const [paginaActual, setPaginaActual] = useState(1);
  const [descargandoCargaId, setDescargandoCargaId] = useState("");

  const descargarFichasLote = async (carga: any) => {
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
  const [invitadosMap, setInvitadosMap] = useState<any>({});
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
      const yaTenemosDatos =
        seleccionExportarId === "all"
          ? programasCarga.every((prog) => Array.isArray(invitadosMapRef.current[prog.id]))
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

  const estadisticasExportar = useMemo(() => {
    let total = 0;
    let conApoderado = 0;
    let sinApoderado = 0;

    const contarInvitado = (invitado: any) => {
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
    let registros: any[] = [];

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

    const nombreTallerStr =
      seleccionExportarId === "all"
        ? "TODOS-LOS-TALLERES"
        : programasCarga.find((p) => p.id === seleccionExportarId)?.nombre || "TALLER";
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

  const historialFiltrado = historialCargas.filter((carga: any) => {
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
      <section
        className="coord-workspace coord-workspace-single coord-workspace-upload"
        style={{ display: "flex", flexDirection: "column", gap: "12px", background: "transparent", border: "none", boxShadow: "none", padding: 0 }}
      >
        <div className="coord-export-box" style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "coord-fade-in 0.25s ease", width: "100%" }}>
          {!ocultarTabs && (
            <div className="coord-upload-tabs" role="tablist" aria-label="Tipo de carga de alumnos" style={{ marginTop: "-8px", marginBottom: "8px" }}>
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

            <button
              type="button"
              className={`coord-upload-tab-anuncios ${modoCargaAlumnos === "anuncios" ? "is-active" : ""}`}
              onClick={() => {
                setModoCargaAlumnos("anuncios");
                setPreviewCarga(null);
                setProgresoCarga(null);
                setMensaje("");
              }}
            >
              <Megaphone size={16} />
              Anuncios
            </button>
          </div>
        )}

        <article className="coord-card coord-search-card coord-upload-card" style={{ marginTop: 0 }}>
          {modoCargaAlumnos === "individual" ? (
            <CargaIndividualTab
              programaCargaId={programaCargaId}
              setProgramaCargaId={setProgramaCargaId}
              programasCarga={programasCarga}
              busquedaAlumno={busquedaAlumno}
              setBusquedaAlumno={setBusquedaAlumno}
              resultadosAlumnos={resultadosAlumnos}
              buscandoAlumnos={buscandoAlumnos}
              registrarAlumnoDirecto={registrarAlumnoDirecto}
              alumnoIndividual={alumnoIndividual}
              actualizarAlumnoIndividual={actualizarAlumnoIndividual}
              setAlumnoIndividual={setAlumnoIndividual}
              setEstadoAlumnoIndividual={setEstadoAlumnoIndividual}
              guardarAlumnoIndividual={guardarAlumnoIndividual}
              guardandoIndividual={guardandoIndividual}
              estadoAlumnoIndividual={estadoAlumnoIndividual}
              setPreviewCarga={setPreviewCarga}
              setProgresoCarga={setProgresoCarga}
              setMensaje={setMensaje}
            />
          ) : modoCargaAlumnos === "exportar" ? (
            <CargaExportarTab
              seleccionExportarId={seleccionExportarId}
              setSeleccionExportarId={setSeleccionExportarId}
              programasCarga={programasCarga}
              cargandoInvitados={cargandoInvitados}
              estadisticasExportar={estadisticasExportar}
              descargarFichasExportarTab={descargarFichasExportarTab}
              exportando={exportando}
            />
          ) : modoCargaAlumnos === "plantillas" ? (
            <div style={{ animation: "coord-fade-in 0.25s ease" }}>
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

          ) : modoCargaAlumnos === "anuncios" ? (
            <CargaAnunciosTab />
          ) : (
            <CargaMasivaTab
              programaCargaId={programaCargaId}
              setProgramaCargaId={setProgramaCargaId}
              programasCarga={programasCarga}
              setPreviewCarga={setPreviewCarga}
              setProgresoCarga={setProgresoCarga}
              setMensaje={setMensaje}
              archivoInputKey={archivoInputKey}
              archivosExcel={archivosExcel}
              setArchivosExcel={setArchivosExcel}
              cancelarCargaExcel={cancelarCargaExcel}
              previewCarga={previewCarga}
              generarPreviewExcel={generarPreviewExcel}
              cargandoPreview={cargandoPreview}
              confirmarCargaExcel={confirmarCargaExcel}
              confirmandoCarga={confirmandoCarga}
            />
          )}

          {mensaje && (
            <MantineAlert
              className="coord-message"
              color={tipoMsg === "success" ? "sanrafael" : "orange"}
              radius="md"
              icon={tipoMsg === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
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
                      gap: "6px",
                    }}
                    onClick={() => {
                      const carga = historialCargas.find((c: any) => c.id === ultimoLoteId);
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
              {progresoCarga.archivo ? <p>{progresoCarga.archivo}</p> : null}
            </div>
          ) : null}

          {modoCargaAlumnos === "masiva" && previewCarga ? (
            <CargaPreviewTable previewCarga={previewCarga} />
          ) : modoCargaAlumnos === "masiva" ? (
            <div className="coord-empty coord-upload-empty">
              <ListCheck size={18} />
              <p>
                Seleccione programa, archivo y revise <b>Vista previa</b> antes de guardar.
              </p>
            </div>
          ) : null}
        </article>

        {/* Historial de Cargas Masivas */}
        {modoCargaAlumnos === "masiva" && historialFiltrado.length > 0 && !previewCarga && (
          <CargaHistorialTable
            historialPaginado={historialPaginado}
            historialFiltrado={historialFiltrado}
            paginaActual={paginaActual}
            setPaginaActual={setPaginaActual}
            totalPaginas={totalPaginas}
            descargandoCargaId={descargandoCargaId}
            eliminandoCargaId={eliminandoCargaId}
            descargarFichasLote={descargarFichasLote}
            eliminarCargaExcel={eliminarCargaExcel}
          />
        )}
        </div>
      </section>
    </>
  );
}

export default CargaExcelView;
