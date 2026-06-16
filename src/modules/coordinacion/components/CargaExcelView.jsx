import { useEffect, useState, useMemo } from "react";
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
import { generarComunicadoWordBlob } from "../../secretaria/utils/secretariaDocumentoWord";
import JSZip from "jszip";
import { toast } from "sonner";
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
  return categoria.includes("academ") || categoria.includes("ingles") || categoria.includes("ingl");
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
  toggleSidebarButton,
  ultimoLoteId,
  setUltimoLoteId,
}) {
  const programasCarga = programasDisponibles(programas);

  const [paginaActual, setPaginaActual] = useState(1);
  const [descargandoCargaId, setDescargandoCargaId] = useState("");

  const descargarFichasLote = async (carga) => {
    setDescargandoCargaId(carga.id);
    try {
      const registros = carga.registros || [];
      if (!registros.length) {
        toast.error("La carga no tiene alumnos registrados.");
        setDescargandoCargaId("");
        return;
      }

      const zip = new JSZip();
      let archivosAgregados = 0;
      const programasSinPlantilla = new Set();

      for (const reg of registros) {
        const programa = programas.find((p) => p.id === reg.programaId);
        if (!programa) continue;

        if (!programa.plantillaBase64) {
          programasSinPlantilla.add(programa.nombre);
          continue;
        }

        const dbEstudiante = apiDb.estudiantes?.[reg.dni];
        const mockEstudiante = {
          dni: reg.dni,
          nombres: reg.nombres,
          grado: reg.grado || "",
          seccion: reg.seccion || "",
          apoderado: dbEstudiante?.apoderado || "",
          telefonoApoderado: dbEstudiante?.telefonoApoderado || "",
          correoApoderado: dbEstudiante?.correoApoderado || "",
        };

        const mockInscripcion = {
          id: `INS-INV-${reg.dni}-${reg.programaId}`,
          dniEstudiante: reg.dni,
          nombresEstudiante: reg.nombres,
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
        };

        try {
          const wordBlob = await generarComunicadoWordBlob({
            estudiante: mockEstudiante,
            inscripcion: mockInscripcion,
            omitirMarcaAguaVista: true,
          });

          const fechaActualStr = new Date().toLocaleDateString("es-PE").replace(/\//g, "-");
          const nombreArchivo = `${reg.nombres.toUpperCase()} - ${String(reg.grado || "GRADO").toUpperCase()} - ${String(programa.nombre || "TALLER").toUpperCase()} - ${fechaActualStr}.docx`;
          zip.file(nombreArchivo, wordBlob);
          archivosAgregados++;
        } catch (err) {
          console.error(`Error generando ficha para ${reg.nombres}:`, err);
        }
      }

      if (archivosAgregados === 0) {
        if (programasSinPlantilla.size > 0) {
          alert(
            `No se pudo generar ninguna ficha porque los siguientes programas no tienen plantilla Word asignada:\n\n${Array.from(
              programasSinPlantilla
            ).join("\n")}\n\nPor favor, suba una plantilla en la sección "Plantillas / Documentos" primero.`
          );
        } else {
          alert("No se encontraron registros válidos o plantillas para generar.");
        }
        setDescargandoCargaId("");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const nombreZip = `FICHAS - ${carga.archivoNombre || "CARGA"} - ${new Date()
        .toLocaleDateString("es-PE")
        .replace(/\//g, "-")}.zip`;

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nombreZip;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      if (programasSinPlantilla.size > 0) {
        alert(
          `Se descargaron ${archivosAgregados} fichas. Sin embargo, no se generaron fichas para los siguientes programas por falta de plantilla:\n\n${Array.from(
            programasSinPlantilla
          ).join("\n")}`
        );
      }
    } catch (error) {
      console.error("Error al descargar fichas en lote:", error);
      alert("Ocurrió un error al generar las fichas en lote.");
    } finally {
      setDescargandoCargaId("");
    }
  };

  const [seleccionExportarId, setSeleccionExportarId] = useState("all");
  const [exportando, setExportando] = useState(false);

  const cantidadAlumnosExportar = useMemo(() => {
    let count = 0;
    if (seleccionExportarId === "all") {
      programasCarga.forEach((prog) => {
        count += (apiDb.invitadosPorPrograma?.[prog.id] || []).length;
      });
    } else {
      count = (apiDb.invitadosPorPrograma?.[seleccionExportarId] || []).length;
    }
    return count;
  }, [seleccionExportarId, programasCarga, programas, historialCargas]);

  const descargarFichasExportarTab = async () => {
    setExportando(true);
    try {
      let registros = [];
      
      if (seleccionExportarId === "all") {
        programasCarga.forEach((prog) => {
          const invitadosProg = apiDb.invitadosPorPrograma?.[prog.id] || [];
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
          const invitadosProg = apiDb.invitadosPorPrograma?.[prog.id] || [];
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

      if (!registros.length) {
        alert("No se encontraron alumnos registrados para exportar en el taller seleccionado.");
        setExportando(false);
        return;
      }

      const zip = new JSZip();
      let archivosAgregados = 0;
      const programasSinPlantilla = new Set();

      for (const reg of registros) {
        const programa = programas.find((p) => p.id === reg.programaId);
        if (!programa) continue;

        if (!programa.plantillaBase64) {
          programasSinPlantilla.add(programa.nombre);
          continue;
        }

        const dbEstudiante = apiDb.estudiantes?.[reg.dni];
        const mockEstudiante = {
          dni: reg.dni,
          nombres: reg.nombres,
          grado: reg.grado || "",
          seccion: reg.seccion || "",
          apoderado: dbEstudiante?.apoderado || "",
          telefonoApoderado: dbEstudiante?.telefonoApoderado || "",
          correoApoderado: dbEstudiante?.correoApoderado || "",
        };

        const mockInscripcion = {
          id: `INS-INV-${reg.dni}-${reg.programaId}`,
          dniEstudiante: reg.dni,
          nombresEstudiante: reg.nombres,
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
        };

        try {
          const wordBlob = await generarComunicadoWordBlob({
            estudiante: mockEstudiante,
            inscripcion: mockInscripcion,
            omitirMarcaAguaVista: true,
          });

          const fechaActualStr = new Date().toLocaleDateString("es-PE").replace(/\//g, "-");
          const nombreArchivo = `${reg.nombres.toUpperCase()} - ${String(reg.grado || "GRADO").toUpperCase()} - ${String(programa.nombre || "TALLER").toUpperCase()} - ${fechaActualStr}.docx`;
          zip.file(nombreArchivo, wordBlob);
          archivosAgregados++;
        } catch (err) {
          console.error(`Error generando ficha para ${reg.nombres}:`, err);
        }
      }

      if (archivosAgregados === 0) {
        if (programasSinPlantilla.size > 0) {
          alert(
            `No se pudo generar ninguna ficha porque los siguientes programas no tienen plantilla Word asignada:\n\n${Array.from(
              programasSinPlantilla
            ).join("\n")}\n\nPor favor, suba una plantilla en la sección "Plantillas / Documentos" primero.`
          );
        } else {
          alert("No se encontraron registros válidos o plantillas para generar.");
        }
        setExportando(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const nombreTallerStr = seleccionExportarId === "all" ? "TODOS-LOS-TALLERES" : (programasCarga.find((p) => p.id === seleccionExportarId)?.nombre || "TALLER");
      const nombreZip = `FICHAS - ${nombreTallerStr.toUpperCase()} - ${new Date()
        .toLocaleDateString("es-PE")
        .replace(/\//g, "-")}.zip`;

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nombreZip;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      if (programasSinPlantilla.size > 0) {
        alert(
          `Se descargaron ${archivosAgregados} fichas. Sin embargo, no se generaron fichas para los siguientes programas por falta de plantilla:\n\n${Array.from(
            programasSinPlantilla
          ).join("\n")}`
        );
      }
    } catch (error) {
      console.error("Error al descargar fichas en lote:", error);
      alert("Ocurrió un error al generar las fichas en lote.");
    } finally {
      setExportando(false);
    }
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
          <h1>CARGAR INVITADOS</h1>
        </div>
      </header>
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
            <button
              type="button"
              className={modoCargaAlumnos === "exportar" ? "is-active" : ""}
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
          ) : modoCargaAlumnos === "exportar" ? (
            <div className="coord-form coord-massive-clean-form">
              <div className="coord-field coord-massive-clean-program">
                <label htmlFor="coord-exportar-programa">Taller / Programa a exportar</label>
                <select
                  id="coord-exportar-programa"
                  value={seleccionExportarId}
                  onChange={(event) => setSeleccionExportarId(event.target.value)}
                >
                  <option value="all">Todos los talleres académicos</option>
                  {programasCarga.map((programa) => (
                    <option key={programa.id} value={programa.id}>
                      {programa.id} - {programa.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: "16px", marginBottom: "20px" }}>
                <p style={{ fontSize: "14px", color: "#4b5563" }}>
                  Se generarán <b>{cantidadAlumnosExportar}</b> fichas/comunicados en total para los alumnos cargados en esta selección.
                </p>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                  * Nota: Las fichas se rellenarán automáticamente con los nombres y grados de los alumnos. El campo del apoderado quedará en blanco si el estudiante no tiene un apoderado previamente registrado en el sistema.
                </p>
              </div>

              <div className="coord-massive-clean-actions">
                <button 
                  className="coord-primary-button" 
                  type="button" 
                  onClick={descargarFichasExportarTab} 
                  disabled={exportando || cantidadAlumnosExportar === 0}
                  style={{ backgroundColor: "#2b8a3e", borderColor: "#2b8a3e" }}
                >
                  {exportando ? <Loader2 className="coord-spin" size={17} /> : <Download size={17} />}
                  <span>{exportando ? "Generando ZIP..." : "Exportar Fichas (.zip)"}</span>
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
                    <span>Descargar Fichas (.zip)</span>
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

          {modoCargaAlumnos !== "exportar" && (
            <div className="coord-upload-history">
              <div className="coord-upload-history-header">
                <div>
                  <h2>Historial de cargas</h2>
                  <p>Desde aquí puede borrar una carga confirmada si sus alumnos aún no tienen inscripción activa.</p>
                </div>
              </div>

              {historialFiltrado.length ? (
                <>
                  <div className="coord-table-wrap">
                    <table className="coord-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Archivo</th>
                          <th>Grado</th>
                          <th>Taller</th>
                          <th>Nivel</th>
                          <th>Importados</th>
                          <th>Errores</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historialPaginado.map((carga) => (
                          <tr key={carga.id}>
                            <td>{formatearFechaCarga(carga.fecha)}</td>
                            <td>{Array.isArray(carga.archivos) && carga.archivos.length ? carga.archivos.join(", ") : carga.archivoNombre || carga.id}</td>
                            <td>{resumirCampoCarga(carga, (item) => item.grado)}</td>
                            <td>{resumirProgramasCarga(carga)}</td>
                            <td>{resumirCampoCarga(carga, (item) => item.nivelEducativo || obtenerNivelDesdeGrado(item.grado))}</td>
                            <td>{carga.resumen?.importados ?? carga.resumen?.validos ?? carga.registros?.length ?? 0}</td>
                            <td>{carga.resumen?.errores ?? 0}</td>
                             <td style={{ display: "flex", gap: "8px", justifyContent: "flex-start", alignItems: "center" }}>
                               <button
                                 className="coord-primary-button coord-upload-history-download"
                                 type="button"
                                 onClick={() => descargarFichasLote(carga)}
                                 disabled={descargandoCargaId === carga.id}
                                 style={{ 
                                   padding: "6px 12px", 
                                   fontSize: "13px", 
                                   height: "auto", 
                                   backgroundColor: "#2b8a3e", 
                                   borderColor: "#2b8a3e",
                                   display: "inline-flex",
                                   alignItems: "center",
                                   gap: "6px"
                                 }}
                               >
                                 {descargandoCargaId === carga.id ? (
                                   <Loader2 className="coord-spin" size={14} />
                                 ) : (
                                   <Download size={14} />
                                 )}
                                 <span>{descargandoCargaId === carga.id ? "Generando..." : "Descargar Fichas"}</span>
                               </button>
                               <button
                                 className="coord-danger-button coord-upload-history-delete"
                                 type="button"
                                 onClick={() => eliminarCargaExcel(carga)}
                                 disabled={eliminandoCargaId === carga.id}
                                 style={{ 
                                   padding: "6px 12px", 
                                   fontSize: "13px", 
                                   height: "auto",
                                   display: "inline-flex",
                                   alignItems: "center",
                                   gap: "6px"
                                 }}
                               >
                                 {eliminandoCargaId === carga.id ? <Loader2 className="coord-spin" size={14} /> : <Trash size={14} />}
                                 <span>{eliminandoCargaId === carga.id ? "Borrando" : "Borrar"}</span>
                               </button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPaginas > 1 && (
                    <div className="coord-pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "20px" }}>
                      <button
                        type="button"
                        className="coord-secondary-button"
                        style={{ minWidth: "100px", padding: "6px 12px" }}
                        onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                        disabled={paginaActual === 1}
                      >
                        Anterior
                      </button>
                      <span style={{ fontSize: "14px", fontWeight: "500", color: "#4b5563" }}>
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <button
                        type="button"
                        className="coord-secondary-button"
                        style={{ minWidth: "100px", padding: "6px 12px" }}
                        onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                        disabled={paginaActual === totalPaginas}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="coord-empty coord-upload-history-empty">
                  <ListCheck size={18} />
                  <p>Aún no hay cargas confirmadas para mostrar.</p>
                </div>
              )}
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default CargaExcelView;
