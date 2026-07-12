import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  listarProgramas,
  listarCategorias,
  listarHistorialCargas,
  obtenerConfiguracionInstitucional,
} from "../services/coordinacionService";
import { tienePermisoAsignado, puedeVerVista } from "../utils/coordinacionPermissions";
import {
  esProgramaCambridge,
  esProgramaDeportivo,
  normalizarListaGrados,
  normalizarListaTexto,
  normalizarPeriodoVista,
  calcularTextoCiclosCambridge,
} from "../utils/coordinacionProgramUtils";
import { datosProgramaAFormulario } from "../utils/coordinacionFormHelpers";
import { calcularDuracionTexto } from "../../../services/dateService";

import useCoordinacionCarga from "./features/useCoordinacionCarga";
import useCoordinacionDocumentos from "./features/useCoordinacionDocumentos";
import useCoordinacionInvitados from "./features/useCoordinacionInvitados";
import useCoordinacionForm from "./forms/useCoordinacionForm";
import useCoordinacionCategorias from "./features/useCoordinacionCategorias";
import useCoordinacionConfig from "./features/useCoordinacionConfig";
import useCoordinacionAccionesPrograma from "./features/useCoordinacionAccionesPrograma";

export default function useCoordinacion({
  delegatedContent,
  embedded = false,
  initialView = "programas",
  user,
}: any) {
  const esProfesor = user?.username === "profe" || user?.name === "Profesor";
  const { subview, module, delegatedModule } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryProgId = useMemo(() => {
    try {
      return new URLSearchParams(location.search).get("id");
    } catch {
      return null;
    }
  }, [location.search]);

  const vista = embedded ? (initialView || "programas") : (subview || "programas");

  const setVista = (newView: string) => {
    if (!embedded) {
      navigate(`/coordinacion/${newView}`);
    } else if (module && delegatedModule) {
      navigate(`/${module}/delegated/${delegatedModule}/${newView}`);
    }
  };

  const [programas, setProgramas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [cargando, setCargando] = useState(false);
  const lastFetchTimeRef = useRef(0);

  const [showModal, setShowModal] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [mostrarGestorCategorias, setMostrarGestorCategorias] = useState(false);

  const [ultimoLoteId, setUltimoLoteId] = useState("");
  const [programaCargaId, setProgramaCargaId] = useState("");
  const [historialCargas, setHistorialCargas] = useState<any[]>([]);
  const [configInstitucional, setConfigInstitucional] = useState<any>({});
  const [cargandoConfigInstitucional, setCargandoConfigInstitucional] = useState(false);

  const [sidebarAbierta, setSidebarAbierta] = useState(() => {
    try {
      const saved = localStorage.getItem("coord_sidebar_expanded");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleSetSidebarAbierta = (val: any) => {
    setSidebarAbierta((prev: boolean) => {
      const newVal = typeof val === "function" ? val(prev) : val;
      try {
        localStorage.setItem("coord_sidebar_expanded", JSON.stringify(newVal));
      } catch (err) {
        console.warn("Storage write failed:", err);
      }
      return newVal;
    });
  };

  const cargaPeriodo = "escolar";

  const puedeCrearProgramas = tienePermisoAsignado(user, "coordinacion.programas") || tienePermisoAsignado(user, "coordinacion.documentos");
  const puedeEditarProgramas = tienePermisoAsignado(user, "coordinacion.programas");
  const puedeCrearGrupos = tienePermisoAsignado(user, "coordinacion.carga");
  const puedeEditarGrupos = tienePermisoAsignado(user, "coordinacion.carga");
  const puedeVerAlumnos = tienePermisoAsignado(user, "coordinacion.asistencia") || tienePermisoAsignado(user, "coordinacion.historial");
  const puedeCargarAlumnos = puedeCrearGrupos || puedeEditarGrupos;
  const puedeGestionarGruposFormulario = modoEditar ? puedeEditarGrupos : puedeCrearGrupos;
  const tieneAccionesPrograma = puedeEditarProgramas || puedeVerAlumnos;

  const carga = useCoordinacionCarga({
    puedeCargarAlumnos,
    cargaPeriodo,
    programaCargaId,
    setProgramaCargaId,
    mostrarMsg,
    cargarDatos,
    setUltimoLoteId,
    vista,
  });

  const invitadosState = useCoordinacionInvitados({
    puedeVerAlumnos,
    mostrarMsg,
  });

  let setAlertaConfiguracion = (val: string) => {};

  const coordinacionForm = useCoordinacionForm({
    puedeCrearProgramas,
    puedeEditarProgramas,
    modoEditar,
    setModoEditar,
    programas,
    setProgramas,
    setShowModal,
    embedded,
    navigate,
    mostrarMsg,
    mostrarAlertaConfiguracion,
    setAlertaConfiguracion: (val: string) => setAlertaConfiguracion(val),
    setMensaje,
  });

  const documentos = useCoordinacionDocumentos({
    puedeCrearProgramas,
    puedeEditarProgramas,
    form: coordinacionForm.form,
    setForm: coordinacionForm.setForm,
    actualizarForm: coordinacionForm.actualizarForm,
    programas,
    categorias,
    mostrarMsg,
    cargarDatos,
    datosProgramaAFormulario,
    setGuardando: coordinacionForm.setGuardando,
  });

  setAlertaConfiguracion = (val: string) => {
    coordinacionForm.actualizarForm("alertaConfiguracion", val);
  };

  const {
    nuevaCat,
    setNuevaCat,
    catAEliminar,
    setCatAEliminar,
    agregarCategoria,
    quitarCategoria,
  } = useCoordinacionCategorias({
    categorias,
    setCategorias,
    puedeEditarProgramas,
    mostrarMsg,
    setForm: coordinacionForm.setForm,
  });

  const {
    guardandoConfigInstitucional,
    actualizarConfigInstitucionalImagen,
    quitarConfigInstitucionalImagen,
    guardarConfigInstitucional,
  } = useCoordinacionConfig({
    configInstitucional,
    setConfigInstitucional,
    mostrarMsg,
  });

  const {
    programaAFinalizar,
    setProgramaAFinalizar,
    programaAArchivar,
    setProgramaAArchivar,
    abrirCrear,
    abrirCrearDesdeDocumento,
    abrirEditar,
    toggleEstado,
    finalizarPrograma,
    confirmarFinalizar,
    eliminarCurso,
    confirmarArchivar,
    restaurarPrograma,
    clonarPrograma,
  } = useCoordinacionAccionesPrograma({
    programas,
    puedeCrearProgramas,
    puedeEditarProgramas,
    mostrarMsg,
    coordinacionForm,
    setModoEditar,
    documentos,
    setAlertaConfiguracion,
    navigate,
    embedded,
    setShowModal,
    cargarDatos,
  });

  useEffect(() => {
    if (vista === "registrar-programa" && queryProgId && programas.length > 0) {
      const prog = programas.find((p) => String(p.id) === String(queryProgId));
      if (prog) {
        coordinacionForm.setForm(datosProgramaAFormulario(prog));
        setModoEditar(true);
      }
    }
  }, [vista, queryProgId, programas]);

  async function cargarDatos() {
    lastFetchTimeRef.current = Date.now();
    setCargando(true);
    setCargandoConfigInstitucional(true);
    try {
      const [progs, cats, cargas, config] = await Promise.all([
        listarProgramas(),
        listarCategorias(),
        listarHistorialCargas(),
        obtenerConfiguracionInstitucional().catch(() => null),
      ]);
      setProgramas(progs);
      setCategorias(cats);
      setHistorialCargas(cargas);
      if (config) setConfigInstitucional(config);
    } catch (err: any) {
      mostrarMsg(err.message || "No se pudieron cargar los datos de Coordinación Académica.");
    } finally {
      setCargando(false);
      setCargandoConfigInstitucional(false);
    }
  }

  function mostrarMsg(texto: string, tipo = "error") {
    setMensaje(texto);
    setTipoMsg(tipo);
    const titulo = tipo === "success" ? "Coordinación Académica" : "Revisar datos";
    if (tipo === "success") {
      toast.success(titulo, { description: texto });
    } else if (texto) {
      toast.warning(titulo, { description: texto });
    }
    if (tipo === "success") setTimeout(() => setMensaje(""), 4000);
  }

  function mostrarAlertaConfiguracion(detalle = "") {
    const texto = detalle
      ? `Complete la configuración del taller antes de habilitarlo. ${detalle}`
      : "Complete la configuración del taller antes de habilitarlo.";
    coordinacionForm.actualizarForm({ alertaConfiguracion: texto });
    return mostrarMsg(texto);
  }

  const programasFiltrados = programas.filter((p) => {
    if (p.estado === "Archivado") return false;
    const textoBusqueda = busqueda.trim().toLowerCase();
    const coincide =
      !textoBusqueda ||
      String(p.nombre || "").toLowerCase().includes(textoBusqueda) ||
      String(p.id || "").toLowerCase().includes(textoBusqueda);
    const filtraPeriodo = filtroPeriodo === "todos" || normalizarPeriodoVista(p.periodo) === filtroPeriodo;
    const filtraCategoria =
      filtroCategoria === "todos" || String(p.categoria || "").toLowerCase() === filtroCategoria.toLowerCase();
    const filtraEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "disponibles" && p.estado === "Habilitado") ||
      (filtroEstado === "deshabilitados" && p.estado === "Deshabilitado") ||
      (filtroEstado === "finalizados" && p.estado === "Finalizado");
    return coincide && filtraPeriodo && filtraCategoria && filtraEstado;
  });

  const programasArchivadosFiltrados = programas.filter((p) => {
    if (p.estado !== "Archivado") return false;
    const textoBusqueda = busqueda.trim().toLowerCase();
    const coincide =
      !textoBusqueda ||
      String(p.nombre || "").toLowerCase().includes(textoBusqueda) ||
      String(p.id || "").toLowerCase().includes(textoBusqueda);
    const filtraPeriodo = filtroPeriodo === "todos" || normalizarPeriodoVista(p.periodo) === filtroPeriodo;
    const filtraCategoria =
      filtroCategoria === "todos" || String(p.categoria || "").toLowerCase() === filtroCategoria.toLowerCase();
    return coincide && filtraPeriodo && filtraCategoria;
  });

  const programaDocs = programas.find((item) => item.id === documentos.programaDocsId);
  const historialPlantillas = programas.filter(
    (programa) =>
      programa.plantilla &&
      (programa.plantillaBase64 || (window as any).apiDb?.plantillasPorPrograma?.[programa.id]?.plantillaBase64)
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (window.apiDb) {
      const interval = setInterval(() => {
        if (Date.now() - lastFetchTimeRef.current > 4000) {
          listarProgramas()
            .then((list) => {
              const currentCount = list?.length || 0;
              const prevCount = programas?.length || 0;
              if (currentCount !== prevCount) {
                setProgramas(list);
              }
            })
            .catch(console.error);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [programas]);

  const vistasDisponibles = vistasNav.filter((item) => puedeVerVista(user, item));
  const vistaActualDisponible = vistasDisponibles.some((item) => item.id === vista);
  const puedeVerProgramasVista = vistasDisponibles.some((item) => item.id === "programas");
  const puedeVerCargaVista = vistasDisponibles.some((item) => item.id === "carga");
  const puedeVerDocumentosVista = vistasDisponibles.some((item) => item.id === "documentos");
  const puedeVerAsistenciasVista = vistasDisponibles.some((item) => item.id === "asistencias");

  const formGradosAplicables = normalizarListaGrados(coordinacionForm.form.gradosAplicables);
  const formDias = normalizarListaTexto(coordinacionForm.form.dias);
  const formHorariosPorGrupo = Array.isArray(coordinacionForm.form.horariosPorGrupo)
    ? coordinacionForm.form.horariosPorGrupo
    : [];
  const esFormularioVerano = normalizarPeriodoVista(coordinacionForm.form.periodo) === "verano";
  const esDeportivoForm =
    String(coordinacionForm.form.categoria || "").toLowerCase() === "deportivo" ||
    String(coordinacionForm.form.categoria || "").toLowerCase() === "talleres deportivos" ||
    esProgramaDeportivo(coordinacionForm.form.nombre, coordinacionForm.form.categoria);
  const esCambridgeForm = esProgramaCambridge(coordinacionForm.form);

  const ciclosCambridgeFormulario = calcularTextoCiclosCambridge(
    coordinacionForm.form.fechaInicio,
    coordinacionForm.form.fechaFin
  );
  const catLower = String(coordinacionForm.form.categoria || "").toLowerCase();
  const usaTalleresPorEdad = esFormularioVerano
    ? catLower !== "academico" &&
      catLower !== "académico" &&
      catLower !== "vacaciones utiles" &&
      catLower !== "vacaciones útiles"
    : esDeportivoForm;
  const duracionTallerFormulario = calcularDuracionTexto(
    coordinacionForm.form.fechaInicio,
    coordinacionForm.form.fechaFin
  );
  const mostrarIndumentariaDeportiva = esDeportivoForm;

  return {
    esProfesor,
    vista,
    setVista,
    programas,
    setProgramas,
    categorias,
    setCategorias,
    busqueda,
    setBusqueda,
    filtroPeriodo,
    setFiltroPeriodo,
    filtroCategoria,
    setFiltroCategoria,
    filtroEstado,
    setFiltroEstado,
    mensaje,
    setMensaje,
    tipoMsg,
    cargando,
    showModal,
    setShowModal,
    modoEditar,
    form: coordinacionForm.form,
    setForm: coordinacionForm.setForm,
    guardando: coordinacionForm.guardando,
    tallerDepForm: coordinacionForm.tallerDepForm,
    setTallerDepForm: coordinacionForm.setTallerDepForm,
    indiceTallerEditando: coordinacionForm.indiceTallerEditando,
    alertaConfiguracion: coordinacionForm.form.alertaConfiguracion || "",
    setAlertaConfiguracion,
    nuevaCat,
    setNuevaCat,
    catAEliminar,
    setCatAEliminar,
    mostrarGestorCategorias,
    setMostrarGestorCategorias,
    sidebarAbierta,
    setSidebarAbierta: handleSetSidebarAbierta,
    programaAFinalizar,
    setProgramaAFinalizar,
    programaAArchivar,
    setProgramaAArchivar,
    ultimoLoteId,
    setUltimoLoteId,
    programaCargaId,
    setProgramaCargaId,
    configInstitucional,
    cargandoConfigInstitucional,
    guardandoConfigInstitucional,

    archivosExcel: carga.archivosExcel,
    setArchivosExcel: carga.setArchivosExcel,
    archivoInputKey: carga.archivoInputKey,
    previewCarga: carga.previewCarga,
    setPreviewCarga: carga.setPreviewCarga,
    cargandoPreview: carga.cargandoPreview,
    progresoCarga: carga.progresoCarga,
    setProgresoCarga: carga.setProgresoCarga,
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
    busquedaAlumno: carga.busquedaAlumno,
    setBusquedaAlumno: carga.setBusquedaAlumno,
    resultadosAlumnos: carga.resultadosAlumnos,
    buscandoAlumnos: carga.buscandoAlumnos,
    setAlumnoIndividual: carga.setAlumnoIndividual,
    setEstadoAlumnoIndividual: carga.setEstadoAlumnoIndividual,
    registrarAlumnoDirecto: carga.registrarAlumnoDirecto,

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

    cargarDatos,
    mostrarMsg,
    mostrarAlertaConfiguracion,
    actualizarConfigInstitucionalImagen,
    quitarConfigInstitucionalImagen,
    guardarConfigInstitucional,
    abrirCrear,
    abrirCrearDesdeDocumento,
    abrirEditar,
    guardar: coordinacionForm.guardar,
    toggleEstado,
    finalizarPrograma,
    confirmarFinalizar,
    confirmarArchivar,
    eliminarCurso,
    agregarCategoria,
    quitarCategoria,
    actualizarForm: coordinacionForm.actualizarForm,
    actualizarInvitacionMasiva: coordinacionForm.actualizarInvitacionMasiva,
    seleccionarImagenAnuncio: coordinacionForm.seleccionarImagenAnuncio,
    quitarImagenAnuncio: coordinacionForm.quitarImagenAnuncio,
    agregarTallerDeportivo: coordinacionForm.agregarTallerDeportivo,
    quitarTallerDeportivo: coordinacionForm.quitarTallerDeportivo,
    iniciarEdicionTaller: coordinacionForm.iniciarEdicionTaller,
    cancelarEdicionTaller: coordinacionForm.cancelarEdicionTaller,
    actualizarNombrePrograma: coordinacionForm.actualizarNombrePrograma,
    actualizarCategoriaPrograma: coordinacionForm.actualizarCategoriaPrograma,
    actualizarCosto: coordinacionForm.actualizarCosto,
    formatearCostoFormulario: coordinacionForm.formatearCostoFormulario,
    cambiarPeriodoFormulario: coordinacionForm.cambiarPeriodoFormulario,
    actualizarFechaNacimientoVerano: coordinacionForm.actualizarFechaNacimientoVerano,
    toggleGrado: coordinacionForm.toggleGrado,
    toggleDia: coordinacionForm.toggleDia,
    agregarGrupoHorario: coordinacionForm.agregarGrupoHorario,
    quitarGrupoHorario: coordinacionForm.quitarGrupoHorario,
    actualizarGrupoHorario: coordinacionForm.actualizarGrupoHorario,
    toggleGradoGrupo: coordinacionForm.toggleGradoGrupo,
    restaurarPrograma,
    clonarPrograma,

    puedeCrearProgramas,
    puedeEditarProgramas,
    puedeCrearGrupos,
    puedeEditarGrupos,
    puedeVerAlumnos,
    puedeCargarAlumnos,
    puedeGestionarGruposFormulario,
    tieneAccionesPrograma,
    vistasDisponibles,
    vistaActualDisponible,
    puedeVerProgramasVista,
    puedeVerCargaVista,
    puedeVerDocumentosVista,
    puedeVerAsistenciasVista,
    programasFiltrados,
    programasArchivadosFiltrados,
    programaDocs,
    historialPlantillas,

    formGradosAplicables,
    formDias,
    formHorariosPorGrupo,
    esFormularioVerano,
    esDeportivoForm,
    esCambridgeForm,
    ciclosCambridgeFormulario,
    usaTalleresPorEdad,
    duracionTallerFormulario,
    mostrarIndumentariaDeportiva,
  };
}

const vistasNav = [
  {
    id: "programas",
    label: "Gestión de Programas",
    icon: null,
    permissions: ["coordinacion.programas"],
  },
  {
    id: "carga",
    label: "Importar / Exportar",
    icon: null,
    permissions: ["coordinacion.carga"],
  },
  {
    id: "registro_individual",
    label: "Registro Individual",
    icon: null,
    permissions: ["coordinacion.carga"],
  },
  {
    id: "documentos",
    label: "Plantillas y Documentos",
    icon: null,
    permissions: ["coordinacion.documentos"],
  },
  {
    id: "asistencias",
    label: "Asistencia y Control",
    icon: null,
    permissions: ["coordinacion.asistencia"],
  },
  {
    id: "historial",
    label: "Historial / Archivo",
    icon: null,
    permissions: ["coordinacion.historial"],
  },
];
