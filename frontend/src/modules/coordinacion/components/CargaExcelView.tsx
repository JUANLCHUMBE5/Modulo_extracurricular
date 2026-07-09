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
  IconChevronLeft as ChevronLeft,
  IconChevronRight as ChevronRight,
  IconBell as Megaphone,
} from "@tabler/icons-react";
import { apiDb } from "../../../services/dbApi";
import { listarInvitados } from "../services/coordinacionService";
import { toast } from "sonner";
import SummaryBox from "./SummaryBox";
import { textoEstadoCarga } from "../utils/coordinacionFormatters";
import DocumentosView from "./DocumentosView";
import { formInicial } from "../constants/coordinacionFormDefaults";
import {
  generarYDescargarPdfFichasLote,
  obtenerResumenArchivos,
  formatearFechaCarga,
  resumirProgramasCarga,
  resumirCampoCarga,
  obtenerNivelDesdeGrado,
  normalizarTexto,
  programasDisponibles,
} from "../utils/cargaExcelHelpers";
import CargaHistorialTable from "./CargaHistorialTable";

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

  const [anunciosList, setAnunciosList] = useState(() => {
    try {
      const stored = localStorage.getItem("san_rafael_anuncios_list");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [tituloAnuncio, setTituloAnuncio] = useState("");
  const [imagenAnuncio, setImagenAnuncio] = useState(null);
  const [fechaHasta, setFechaHasta] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen original no debe superar los 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setImagenAnuncio(compressedDataUrl);
          const approxSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          toast.success(`Imagen optimizada y comprimida exitosamente (~${approxSizeKb} KB).`);
        } else {
          setImagenAnuncio(event.target?.result);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handlePublicarAnuncio = () => {
    if (!imagenAnuncio) {
      toast.error("Por favor, sube una imagen para el anuncio.");
      return;
    }
    if (!fechaHasta) {
      toast.error("Por favor, selecciona la fecha y hora de expiración.");
      return;
    }
    const nuevoAnuncio = {
      id: `ANUNCIO-${Date.now()}`,
      nombre: tituloAnuncio.trim() || "Anuncio General",
      imagen: imagenAnuncio,
      fechaHasta: fechaHasta,
      fechaCreado: new Date().toISOString(),
      activo: true
    };
    const newList = [nuevoAnuncio, ...anunciosList];
    localStorage.setItem("san_rafael_anuncios_list", JSON.stringify(newList));
    setAnunciosList(newList);

    setTituloAnuncio("");
    setImagenAnuncio(null);
    setFechaHasta("");
    toast.success("¡Anuncio publicado correctamente!");
  };

  const handleEliminarAnuncio = (id) => {
    const newList = anunciosList.filter((item) => item.id !== id);
    localStorage.setItem("san_rafael_anuncios_list", JSON.stringify(newList));
    setAnunciosList(newList);
    toast.success("Anuncio eliminado.");
  };

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
      <section className="coord-workspace coord-workspace-single coord-workspace-upload" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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

            <div className="coord-individual-search-bar" style={{ marginBottom: "20px", position: "relative" }}>
              <label htmlFor="coord-individual-search-input" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold", color: "#374151" }}>
                Buscar Alumno (DNI, Código de estudiante o Nombre/Apellido)
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="coord-individual-search-input"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", backgroundColor: "#ffffff" }}
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                  placeholder="Escriba DNI, Código de alumno, Nombres o Apellidos para buscar..."
                />
                {busquedaAlumno && (
                  <button
                    type="button"
                    onClick={() => {
                      setBusquedaAlumno("");
                      setAlumnoIndividual({ dni: "", nombre: "", grado: "" });
                      setEstadoAlumnoIndividual({ buscando: false, mensaje: "", encontrado: false });
                    }}
                    style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "#f3f4f6", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {resultadosAlumnos.length > 0 ? (
                <ul style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  maxHeight: "220px",
                  overflowY: "auto",
                  padding: "4px 0",
                  margin: "4px 0 0 0",
                  listStyle: "none"
                }}>
                  {resultadosAlumnos.map((item: any) => {
                    const studentCode = item.codigoEstudiante || item.codigo_estudiante || item.codigo || "";
                    return (
                      <li
                        key={item.dni}
                        onClick={() => {
                          registrarAlumnoDirecto(item);
                        }}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f3f4f6",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "13px"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
                      >
                        <div>
                          <strong style={{ display: "block", color: "#111827" }}>{item.nombres || item.nombre}</strong>
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>DNI: {item.dni} {studentCode ? `| Cód: ${studentCode}` : ""}</span>
                        </div>
                        <span style={{ fontSize: "11px", backgroundColor: "#e5e7eb", color: "#374151", padding: "2px 6px", borderRadius: "4px" }}>
                          {item.grado}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : busquedaAlumno.trim().length >= 3 && !buscandoAlumnos ? (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "12px",
                  margin: "4px 0 0 0",
                  fontSize: "13px",
                  color: "#6b7280",
                  textAlign: "center",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}>
                  No se encontraron alumnos con esa búsqueda. Ingrese los datos manualmente a continuación.
                </div>
              ) : buscandoAlumnos ? (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "12px",
                  margin: "4px 0 0 0",
                  fontSize: "13px",
                  color: "#6b7280",
                  textAlign: "center",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}>
                  Buscando...
                </div>
              ) : null}
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
                  placeholder="Nombre completo del alumno"
                />
              </div>
              <div className="coord-field coord-individual-clean-grade">
                <label htmlFor="coord-individual-grado">Grado</label>
                <input
                  id="coord-individual-grado"
                  value={alumnoIndividual.grado}
                  onChange={(event) => actualizarAlumnoIndividual("grado", event.target.value)}
                  placeholder="Ej: 2 Primaria"
                />
              </div>
              <button
                className="coord-register-button coord-individual-clean-submit"
                type="button"
                onClick={guardarAlumnoIndividual}
                disabled={guardandoIndividual || !alumnoIndividual.dni || !alumnoIndividual.nombre || !alumnoIndividual.grado}
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
          ) : modoCargaAlumnos === "anuncios" ? (
            <div className="coord-export-box" style={{ animation: "coord-fade-in 0.25s ease", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                {/* COLUMNA 1: Formulario de Publicación */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                    Gestión de Anuncios y Comunicados (Portal de Padres)
                  </h3>
                  
                  <div className="coord-form-group-green" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="anuncio-titulo" style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                      Título del Anuncio
                    </label>
                    <input
                      id="anuncio-titulo"
                      type="text"
                      placeholder="Ej. Matrículas Abiertas Ciclo Vacacional"
                      value={tituloAnuncio}
                      onChange={(e) => setTituloAnuncio(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        width: "100%",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>

                  <div className="coord-form-group-green" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label htmlFor="anuncio-fecha" style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                      Mostrar hasta (Expiración)
                    </label>
                    <input
                      id="anuncio-fecha"
                      type="datetime-local"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        width: "100%",
                        fontFamily: "inherit"
                      }}
                    />
                  </div>

                  <div className="coord-form-group-green" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                      Imagen del Anuncio
                    </label>
                    <div
                      className="coord-file-drop"
                      onClick={() => document.getElementById("coord-anuncio-image-upload")?.click()}
                      style={{
                        border: "2px dashed #9ac6bd",
                        borderRadius: "8px",
                        padding: "16px",
                        textAlign: "center",
                        cursor: "pointer",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      {imagenAnuncio ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <img src={imagenAnuncio} alt="Vista previa" style={{ maxHeight: "120px", maxWidth: "100%", objectFit: "contain", borderRadius: "4px" }} />
                          <span style={{ fontSize: "11px", color: "#0c8569", fontWeight: 600 }}>Cambiar imagen</span>
                        </div>
                      ) : (
                        <>
                          <CloudUpload size={24} style={{ color: "#0c8569", marginBottom: "4px" }} />
                          <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                            Arrastra una imagen o <span style={{ color: "#0c8569", fontWeight: 600 }}>haz clic</span>
                          </p>
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>PNG, JPG — máx 10 MB</span>
                        </>
                      )}
                      <input
                        id="coord-anuncio-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePublicarAnuncio}
                    disabled={!imagenAnuncio || !fechaHasta}
                    style={{
                      marginTop: "4px",
                      padding: "10px 16px",
                      backgroundColor: !imagenAnuncio || !fechaHasta ? "#cbd5e1" : "#0c8569",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: !imagenAnuncio || !fechaHasta ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                      transition: "background 0.2s",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (imagenAnuncio && fechaHasta) e.currentTarget.style.backgroundColor = "#0a7058";
                    }}
                    onMouseLeave={(e) => {
                      if (imagenAnuncio && fechaHasta) e.currentTarget.style.backgroundColor = "#0c8569";
                    }}
                  >
                    <CheckCircle2 size={15} />
                    Publicar Anuncio
                  </button>
                </div>

                {/* COLUMNA 2: Historial y Anuncios Activos */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                    Historial de Anuncios Publicados
                  </h3>

                  {anunciosList.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "180px", color: "#64748b", gap: "8px" }}>
                      <Megaphone size={28} style={{ opacity: 0.3 }} />
                      <span style={{ fontSize: "13px" }}>No se han publicado anuncios aún.</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
                      {anunciosList.map((item) => {
                        const isExpired = new Date(item.fechaHasta) <= new Date();
                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: "12px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              background: isExpired ? "#f8fafc" : "#f0fdf4",
                              display: "flex",
                              gap: "12px",
                              alignItems: "center"
                            }}
                          >
                            <img src={item.imagen} alt={item.nombre} style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "4px", background: "#ffffff", border: "1px solid #cbd5e1", padding: "2px" }} />
                            
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{
                                alignSelf: "flex-start",
                                fontSize: "9px",
                                fontWeight: 700,
                                color: isExpired ? "#64748b" : "#166534",
                                backgroundColor: isExpired ? "#e2e8f0" : "#dcfce7",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                textTransform: "uppercase"
                              }}>
                                {isExpired ? "Expirado" : "Vigente"}
                              </span>
                              <strong style={{ fontSize: "13px", color: "#1e293b", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {item.nombre}
                              </strong>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>
                                Expira: {new Date(item.fechaHasta).toLocaleDateString("es-PE")} {new Date(item.fechaHasta).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleEliminarAnuncio(item.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#ef4444",
                                padding: "8px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              title="Eliminar anuncio"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
                <CloudUpload size={22} className="coord-drop-icon" />
                <div className="coord-drop-text-group">
                  <p className="coord-drop-text">
                    Arrastra tu archivo o <span className="coord-drop-highlight">haz clic para elegir</span>
                  </p>
                  <div className="coord-drop-sub">.xlsx, .xls — máx 5 MB</div>
                </div>
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

            {/* Fila de acciones agrupadas */}
            <div className="coord-export-actions">
              {/* Botón principal: Validar y Previsualizar (solo si no hay previsualización activa) */}
              {!previewCarga && (
                <button
                  className="coord-btn-full coord-btn-validate"
                  type="button"
                  onClick={generarPreviewExcel}
                  disabled={!programaCargaId || !archivosExcel.length || cargandoPreview}
                >
                  {cargandoPreview ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                  <span>{cargandoPreview ? "Validando..." : "Validar y Previsualizar"}</span>
                </button>
              )}

              {/* Botón Guardar carga (aparece solo con preview) */}
              {previewCarga && (
                <button
                  className="coord-btn-full coord-btn-save"
                  type="button"
                  onClick={confirmarCargaExcel}
                  disabled={confirmandoCarga}
                >
                  {confirmandoCarga ? <Loader2 className="coord-spin" size={17} /> : <CheckCircle2 size={17} />}
                  <span>{confirmandoCarga ? "Guardando..." : "Guardar"}</span>
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
      </section>
    </>
  );
}

export default CargaExcelView;
