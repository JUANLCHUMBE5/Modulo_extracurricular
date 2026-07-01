import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  listarProgramas,
  listarCategorias,
  obtenerConfiguracionInstitucional,
} from "../services/coordinacionService";
import { puedeVerVista } from "../utils/coordinacionPermissions";

import useCoordinacionCarga from "./useCoordinacionCarga";
import useCoordinacionDocumentos from "./useCoordinacionDocumentos";
import useCoordinacionInvitados from "./useCoordinacionInvitados";
import useCoordinacionConfiguracion from "./programas/useCoordinacionConfiguracion";
import useCoordinacionCategorias from "./programas/useCoordinacionCategorias";
import useCoordinacionProgramas from "./programas/useCoordinacionProgramas";

const vistasNav = [
  {
    id: "programas",
    label: "Gestion de Programas",
    icon: null,
    permissions: ["coordinacion.programas"],
  },
  {
    id: "historial",
    label: "Historial / Archivados",
    icon: null,
    permissions: ["coordinacion.historial"],
  },
  {
    id: "carga",
    label: "Carga Excel",
    icon: null,
    permissions: ["coordinacion.carga"],
  },
  {
    id: "documentos",
    label: "Plantillas / Documentos",
    icon: null,
    permissions: ["coordinacion.documentos"],
  },
  {
    id: "asistencias",
    label: "Asistencias",
    icon: null,
    permissions: ["coordinacion.asistencia"],
  },
];

/**
 * Hook orquestador principal del módulo de Coordinación.
 * Centraliza los sub-hooks de programas, categorías, configuraciones, carga de alumnos y plantillas.
 * Mantiene la compatibilidad total de firmas de métodos con Coordinacion.jsx.
 */
export default function useCoordinacion({
  delegatedContent,
  embedded = false,
  initialView = "programas",
  user,
}) {
  const navigate = useNavigate();

  // --- ESTADOS LOCALES GLOBALES ---
  const [vista, setVista] = useState(initialView);
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [cargando, setCargando] = useState(false);
  const [sidebarAbierta, setSidebarAbierta] = useState(true);
  const [ultimoLoteId, setUltimoLoteId] = useState(null);
  const [programaCargaId, setProgramaCargaId] = useState("");

  // Permisos computados para vistas
  const puedeCrearProgramas = useMemo(() => {
    return user?.roles?.some(r => ["Administrador", "coordinacion"].includes(r)) || false;
  }, [user]);

  const puedeEditarProgramas = puedeCrearProgramas;
  const puedeVerAlumnos = puedeCrearProgramas;
  const puedeCargarAlumnos = puedeCrearProgramas;

  /**
   * Muestra notificaciones visuales (toast) y setea el estado de mensaje local.
   */
  function mostrarMsg(text, type = "error") {
    setMensaje(text);
    setTipoMsg(type);
    if (text) {
      if (type === "success") {
        toast.success(text);
      } else {
        toast.error(text);
      }
    }
  }

  // --- INICIALIZACIÓN DE SUB-HOOKS ---

  // 1. Configuración Institucional
  const config = useCoordinacionConfiguracion({ mostrarMsg });

  // 2. Gestión de Categorías
  const categoriasState = useCoordinacionCategorias({
    mostrarMsg,
    onCategoriaAgregada: (nuevaCat) => {
      programasState.setForm((f) => ({ ...f, categoria: nuevaCat }));
    },
    onCategoriaEliminada: (catEliminada) => {
      programasState.setForm((f) => ({
        ...f,
        categoria: f.categoria === catEliminada ? "" : f.categoria,
      }));
    },
  });

  // 3. Gestión de Programas
  const programasState = useCoordinacionProgramas({
    user,
    embedded,
    categorias: categoriasState.categorias,
    mostrarMsg,
    cargarDatos,
    navigate,
    onAbrirFormulario: (prog) => {
      documentos.setProgramaDocsId("");
      documentos.setLecturaDocumento(null);
      documentos.setPlantillaInputKey((actual) => actual + 1);
    },
  });

  // 4. Gestión de Documentos y Plantillas Word
  const documentos = useCoordinacionDocumentos({
    puedeCrearProgramas,
    puedeEditarProgramas,
    form: programasState.form,
    setForm: programasState.setForm,
    actualizarForm: programasState.actualizarForm,
    programas: programasState.programas,
    categorias: categoriasState.categorias,
    mostrarMsg,
    cargarDatos,
    datosProgramaAFormulario: programasState.datosProgramaAFormulario,
    setGuardando: programasState.setGuardando,
  });

  // 5. Carga Masiva y Procesamiento de Excel
  const carga = useCoordinacionCarga({
    puedeCargarAlumnos,
    cargaPeriodo: "escolar",
    programaCargaId,
    setProgramaCargaId,
    mostrarMsg,
    cargarDatos,
    setUltimoLoteId,
  });

  // 6. Reportes, Matriculados e Invitados de un Taller
  const invitadosState = useCoordinacionInvitados({
    puedeVerAlumnos,
    mostrarMsg,
  });

  /**
   * Carga de manera síncrona y paralela toda la información inicial requerida por el módulo.
   */
  async function cargarDatos() {
    programasState.setAlertaConfiguracion("");
    setCargando(true);
    try {
      const [progs, cats, configData] = await Promise.all([
        listarProgramas().catch(() => []),
        listarCategorias().catch(() => []),
        obtenerConfiguracionInstitucional().catch(() => null),
      ]);
      programasState.setProgramas(progs);
      categoriasState.setCategorias(cats);
      if (configData) {
        config.setConfigInstitucional(configData);
      }
    } catch (err) {
      mostrarMsg(err.message || "Error al cargar los datos de Coordinación.");
    } finally {
      setCargando(false);
    }
  }

  // --- EFECTOS INICIALES ---
  useEffect(() => {
    cargarDatos();
  }, []);

  // --- MANEJADORES LOCALES ---
  const handleSetSidebarAbierta = (abierta) => {
    setSidebarAbierta(abierta);
  };

  // --- VALORES CALCULADOS DE VISTA ---
  const vistasDisponibles = useMemo(() => vistasNav.filter((item) => puedeVerVista(user, item)), [user]);
  const vistaActualDisponible = useMemo(() => vistasDisponibles.some((item) => item.id === vista), [vistasDisponibles, vista]);
  const puedeVerProgramasVista = useMemo(() => vistasDisponibles.some((item) => item.id === "programas"), [vistasDisponibles]);
  const puedeVerCargaVista = useMemo(() => vistasDisponibles.some((item) => item.id === "carga"), [vistasDisponibles]);
  const puedeVerDocumentosVista = useMemo(() => vistasDisponibles.some((item) => item.id === "documentos"), [vistasDisponibles]);
  const puedeVerAsistenciasVista = useMemo(() => vistasDisponibles.some((item) => item.id === "asistencias"), [vistasDisponibles]);

  // Unifica el objeto de retorno para que Coordinacion.jsx lo use exactamente igual que antes
  return {
    esProfesor: false,
    vista,
    setVista,
    mensaje,
    setMensaje,
    tipoMsg,
    cargando,
    sidebarAbierta,
    setSidebarAbierta: handleSetSidebarAbierta,
    ultimoLoteId,
    setUltimoLoteId,
    programaCargaId,
    setProgramaCargaId,
    
    // Configuración
    configInstitucional: config.configInstitucional,
    cargandoConfigInstitucional: config.cargandoConfigInstitucional,
    guardandoConfigInstitucional: config.guardandoConfigInstitucional,
    alertaConfiguracion: programasState.alertaConfiguracion,
    setAlertaConfiguracion: programasState.setAlertaConfiguracion,
    mostrarAlertaConfiguracion: programasState.mostrarAlertaConfiguracion,
    actualizarConfigInstitucionalImagen: config.actualizarConfigInstitucionalImagen,
    quitarConfigInstitucionalImagen: config.quitarConfigInstitucionalImagen,
    guardarConfigInstitucional: config.guardarConfigInstitucional,

    // Categorías
    categorias: categoriasState.categorias,
    setCategorias: categoriasState.setCategorias,
    nuevaCat: categoriasState.nuevaCat,
    setNuevaCat: categoriasState.setNuevaCat,
    catAEliminar: categoriasState.catAEliminar,
    setCatAEliminar: categoriasState.setCatAEliminar,
    mostrarGestorCategorias: categoriasState.mostrarGestorCategorias,
    setMostrarGestorCategorias: categoriasState.setMostrarGestorCategorias,
    agregarCategoria: categoriasState.agregarCategoria,
    quitarCategoria: categoriasState.quitarCategoria,

    // Programas
    programas: programasState.programas,
    setProgramas: programasState.setProgramas,
    showModal: programasState.showModal,
    setShowModal: programasState.setShowModal,
    modoEditar: () => Boolean(programasState.form.id),
    form: programasState.form,
    setForm: programasState.setForm,
    guardando: programasState.guardando,
    tallerDepForm: programasState.tallerDepForm,
    setTallerDepForm: programasState.setTallerDepForm,
    indiceTallerEditando: programasState.indiceTallerEditando,
    programaAFinalizar: programasState.programaAFinalizar,
    setProgramaAFinalizar: programasState.setProgramaAFinalizar,
    programaAArchivar: programasState.programaAArchivar,
    setProgramaAArchivar: programasState.setProgramaAArchivar,

    // Filtros de búsqueda
    busqueda: programasState.busqueda,
    setBusqueda: programasState.setBusqueda,
    filtroPeriodo: programasState.filtroPeriodo,
    setFiltroPeriodo: programasState.setFiltroPeriodo,
    filtroCategoria: programasState.filtroCategoria,
    setFiltroCategoria: programasState.setFiltroCategoria,
    filtroEstado: programasState.filtroEstado,
    setFiltroEstado: programasState.setFiltroEstado,

    // Carga Excel Sub-hook delegates
    archivosExcel: carga.archivosExcel,
    setArchivosExcel: carga.setArchivosExcel,
    archivoInputKey: carga.archivoInputKey,
    previewCarga: carga.previewCarga,
    setPreviewCarga: carga.setPreviewCarga,
    cargandoPreview: carga.cargandoPreview,
    progresoCarga: carga.progresoCarga,
    confirmandoCarga: carga.confirmandoCarga,
    eliminandoCargaId: carga.eliminandoCargaId,
    modoCargaAlumnos: carga.modoCargaAlumnos,
    setModoCargaAlumnos: carga.setModoCargaAlumnos,
    alumnoIndividual: carga.alumnoIndividual,
    estadoAlumnoIndividual: carga.estadoAlumnoIndividual,
    guardandoIndividual: carga.guardandoIndividual,
    actualizarAlumnoIndividual: carga.actualizarAlumnoIndividual,
    guardarAlumnoIndividual: carga.guardarAlumnoIndividual,
    generarPreviewExcel: carga.generarPreviewExcel,
    confirmarCargaExcel: carga.confirmarCargaExcel,
    eliminarCargaExcel: carga.eliminarCargaExcel,
    cancelarCargaExcel: carga.cancelarCargaExcel,

    // Documentos/Word Sub-hook delegates
    programaDocsId: documentos.programaDocsId,
    lecturaDocumento: documentos.lecturaDocumento,
    plantillaInputKey: documentos.plantillaInputKey,
    abrirDocumentosPrograma: documentos.abrirDocumentosPrograma,
    guardarDocumentoComoPrograma: documentos.guardarDocumentoComoPrograma,
    guardarDocumentosPrograma: documentos.guardarDocumentosPrograma,
    seleccionarPlantilla: documentos.seleccionarPlantilla,
    autocompletarDesdePlantilla: documentos.autocompletarDesdePlantilla,
    quitarPlantilla: documentos.quitarPlantilla,
    eliminarPlantillaHistorial: documentos.eliminarPlantillaHistorial,
    usarPlantillaExistente: documentos.usarPlantillaExistente,

    // Invitados Sub-hook delegates
    showInvitados: invitadosState.showInvitados,
    setShowInvitados: invitadosState.setShowInvitados,
    invitados: invitadosState.invitados,
    matriculados: invitadosState.matriculados,
    asistenciasPrograma: invitadosState.asistenciasPrograma,
    subVistaAlumnos: invitadosState.subVistaAlumnos,
    setSubVistaAlumnos: invitadosState.setSubVistaAlumnos,
    progSeleccionado: invitadosState.progSeleccionado,
    refrescarAlumnosModal: invitadosState.refrescarAlumnosModal,
    verInvitados: invitadosState.verInvitados,
    descargarPdfAlumnos: invitadosState.descargarPdfAlumnos,
    exportarAExcel: invitadosState.exportarAExcel,

    // Métodos CRUD & Formulario
    cargarDatos,
    mostrarMsg,
    abrirCrear: programasState.abrirCrear,
    abrirEditar: programasState.abrirEditar,
    guard: programasState.guardar, // se expone como guardar
    guardar: programasState.guardar,
    toggleEstado: programasState.toggleEstado,
    finalizarPrograma: programasState.finalizarPrograma,
    confirmarFinalizar: programasState.confirmarFinalizar,
    eliminarCurso: programasState.eliminarCurso,
    confirmarArchivar: programasState.confirmarArchivar,
    restaurarPrograma: programasState.restaurarPrograma,
    clonarPrograma: programasState.clonarPrograma,
    actualizarForm: programasState.actualizarForm,
    actualizarInvitacionMasiva: programasState.actualizarInvitacionMasiva,
    seleccionarImagenAnuncio: programasState.seleccionarImagenAnuncio,
    quitarImagenAnuncio: programasState.quitarImagenAnuncio,
    iniciarEdicionTaller: programasState.iniciarEdicionTaller,
    cancelarEdicionTaller: programasState.cancelarEdicionTaller,
    agregarTallerDeportivo: programasState.agregarTallerDeportivo,
    quitarTallerDeportivo: programasState.quitarTallerDeportivo,
    actualizarNombrePrograma: programasState.actualizarNombrePrograma,
    actualizarCategoriaPrograma: programasState.actualizarCategoriaPrograma,
    actualizarCosto: programasState.actualizarCosto,
    formatearCostoFormulario: programasState.formatearCostoFormulario,
    cambiarPeriodoFormulario: programasState.cambiarPeriodoFormulario,
    actualizarFechaNacimientoVerano: programasState.actualizarFechaNacimientoVerano,
    toggleGrado: programasState.toggleGrado,
    toggleDia: programasState.toggleDia,
    agregarGrupoHorario: programasState.agregarGrupoHorario,
    quitarGrupoHorario: programasState.quitarGrupoHorario,
    actualizarGrupoHorario: programasState.actualizarGrupoHorario,
    toggleGradoGrupo: programasState.toggleGradoGrupo,
    listarAsistenciasPrograma: invitadosState.listarAsistenciasPrograma,
    listarMatriculados: invitadosState.listarMatriculados,

    // Permisos
    puedeCrearProgramas,
    puedeEditarProgramas,
    puedeCrearGrupos: programasState.puedeCrearGrupos,
    puedeEditarGrupos: programasState.puedeEditarGrupos,
    puedeVerAlumnos,
    puedeCargarAlumnos,
    puedeGestionarGruposFormulario: programasState.puedeGestionarGruposFormulario,
    tieneAccionesPrograma: programasState.tieneAccionesPrograma,
    vistasDisponibles,
    vistaActualDisponible,
    puedeVerProgramasVista,
    puedeVerCargaVista,
    puedeVerDocumentosVista,
    puedeVerAsistenciasVista,
    
    // Listados Filtrados
    programasFiltrados: programasState.programasFiltrados,
    programasArchivadosFiltrados: programasState.programasArchivadosFiltrados,
    programaDocs: documentos.programaDocs,
    historialPlantillas: documentos.historialPlantillas,

    // Reactivo del formulario
    formGradosAplicables: programasState.formGradosAplicables,
    formDias: programasState.formDias,
    formHorariosPorGrupo: programasState.formHorariosPorGrupo,
    esFormularioVerano: programasState.esFormularioVerano,
    esDeportivoForm: programasState.esDeportivoForm,
    esCambridgeForm: programasState.esCambridgeForm,
    ciclosCambridgeFormulario: programasState.ciclosCambridgeFormulario,
    usaTalleresPorEdad: programasState.usaTalleresPorEdad,
    duracionTallerFormulario: programasState.duracionTallerFormulario,
    mostrarIndumentariaDeportiva: programasState.mostrarIndumentariaDeportiva,
  };
}
