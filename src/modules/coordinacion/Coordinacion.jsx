import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  IconBook as BookOpen,
  IconFileText as FileText,
  IconUpload as Upload,
  IconUserCheck as UserCheck,
  IconMenu2 as Menu,
} from "@tabler/icons-react";
import {
  diasSemana,
  nivelesGrados,
  variablesPlantillaAceptadas,
  variablesPlantillaRequeridas,
} from "./constants/coordinacionConstants";
import {
  listarProgramas, crearPrograma, crearProgramaDesdeDocumento, editarPrograma, cambiarEstadoPrograma,
  eliminarPrograma,
  listarCategorias, crearCategoria, eliminarCategoria, listarInvitados, listarMatriculados, listarAsistenciasPrograma,
  previsualizarCargaAlumnosMasiva, confirmarCargaAlumnos, listarHistorialCargas, eliminarCargaAlumnos, obtenerActividadPrograma,
  registrarAlumnoIndividualCarga, buscarAlumnoCargaPorDni,
} from "./services/coordinacionService";
import { calcularDuracionTexto, fechaActualIso, normalizarDuracionAvisoDias } from "../../services/dateService";
import AlumnosProgramaModal from "./components/AlumnosProgramaModal";
import CargaExcelView from "./components/CargaExcelView";
import CoordinacionSidebar from "./components/CoordinacionSidebar";
import DocumentosView from "./components/DocumentosView";
import FinalizarProgramaModal from "./components/FinalizarProgramaModal";
import ProgramaFormModal from "./components/ProgramaFormModal";
import ProgramasView from "./components/ProgramasView";
import AsistenciasView from "./components/AsistenciasView";
import { formInicial, horarioGrupoInicial } from "./constants/coordinacionFormDefaults";
import { esCostoValido, normalizarComparacion } from "./utils/coordinacionFormatters";
import { puedeVerVista, tienePermisoAsignado } from "./utils/coordinacionPermissions";
import {
  calcularRangoEdades,
  comprimirImagenAnuncio,
  esProgramaCambridge,
  esProgramaDeportivo,
  nombreProgramaDesdeArchivo,
  normalizarHorariosPorGrupo,
  normalizarListaGrados,
  normalizarListaTexto,
  normalizarPeriodoVista,
  obtenerGradosDeportivos,
  obtenerGradosFinales,
  resumenGrupoDeportivo,
  resumenGrados,
  resumenHorario,
  resumenHorarioDeportivo,
  resumenHorariosPorGrupo,
  resumenResponsablesPorGrupo,
  resumenTutoraPorGrupo,
} from "./utils/coordinacionProgramUtils";
import { descargarListaAlumnosExcel } from "./utils/excelUtils";
import { descargarListaAlumnosPdf } from "./utils/pdfUtils";
import {
  contarDatosDetectados,
  extraerDatosProgramaDesdeWord,
  filtrarDatosDocumento,
  leerArchivoBase64,
  leerDocumentoWordDesdeBase64,
  leerPlantillaWord,
} from "./utils/wordTemplateUtils";
import { apiDb } from "../../services/dbApi";
import "./Coordinacion.css";

const vistasNav = [
  { id: "programas", label: "Gestion de Programas", icon: BookOpen, permissions: ["programas.crear", "programas.editar", "alumnos.historial.ver"] },
  { id: "carga", label: "Carga Excel", icon: Upload, permissions: ["grupos.crear", "grupos.editar"] },
  { id: "documentos", label: "Plantillas / Documentos", icon: FileText, permissions: ["programas.crear", "programas.editar"] },
  { id: "asistencias", label: "Asistencia y Control", icon: UserCheck, permissions: ["programas.crear", "programas.editar", "alumnos.historial.ver"] },
];

const mesesCambridge = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function leerFechaInput(valor) {
  const partes = String(valor || "").split("-").map(Number);
  if (partes.length !== 3 || partes.some((parte) => !Number.isFinite(parte))) return null;
  const [anio, mes, dia] = partes;
  return new Date(anio, mes - 1, dia);
}

function obtenerDiasEntreFechas(fechaInicio, fechaFin) {
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const inicio = leerFechaInput(fechaInicio);
  const fin = leerFechaInput(fechaFin);
  if (!inicio || !fin || inicio > fin) return [];
  const diasSet = new Set();
  let act = new Date(inicio);
  let limit = 0;
  while (act <= fin && limit < 15) {
    diasSet.add(diasSemana[act.getDay()]);
    act.setDate(act.getDate() + 1);
    limit++;
  }
  const orden = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  return orden.filter(d => diasSet.has(d));
}

function calcularTextoCiclosCambridge(fechaInicio, fechaFin) {
  const inicio = leerFechaInput(fechaInicio);
  const fin = leerFechaInput(fechaFin);
  if (!inicio || !fin || inicio > fin) return { cicloI: "", cicloII: "" };

  const anio = inicio.getFullYear();
  const calcularRango = (mesInicio, mesFin) => {
    const rangoInicio = new Date(anio, mesInicio - 1, 1);
    const rangoFin = new Date(anio, mesFin, 0);
    const desde = inicio > rangoInicio ? inicio : rangoInicio;
    const hasta = fin < rangoFin ? fin : rangoFin;
    if (desde > hasta) return "";
    return `De ${mesesCambridge[desde.getMonth()]} a ${mesesCambridge[hasta.getMonth()]}`;
  };

  return {
    cicloI: calcularRango(4, 7),
    cicloII: calcularRango(8, 11),
  };
}

function Coordinacion({
  delegatedContent,
  embedded = false,
  initialView = "programas",
  moduleSwitcher,
  onClearDelegatedModule,
  user,
  onLogout,
}) {
  const esProfesor = user?.username === "profe" || user?.name === "Profesor";
  const [vista, setVista] = useState(initialView || "programas");
  const [programas, setProgramas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [cargando, setCargando] = useState(false);


  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [guardando, setGuardando] = useState(false);
  const [alertaConfiguracion, setAlertaConfiguracion] = useState("");
  const [nuevaCat, setNuevaCat] = useState("");
  const [catAEliminar, setCatAEliminar] = useState("");
  const [mostrarGestorCategorias, setMostrarGestorCategorias] = useState(false);
  const [plantillaInputKey, setPlantillaInputKey] = useState(0);

  // Estados locales para añadir talleres deportivos
  const [tallerDepDeporte, setTallerDepDeporte] = useState("Vóley");
  const [tallerDepCustom, setTallerDepCustom] = useState("");
  const [tallerDepMinEdad, setTallerDepMinEdad] = useState("6");
  const [tallerDepMaxEdad, setTallerDepMaxEdad] = useState("9");
  const [tallerDepDia, setTallerDepDia] = useState("Jueves");
  const [tallerDepHoraInicio, setTallerDepHoraInicio] = useState("15:50");
  const [tallerDepHoraFin, setTallerDepHoraFin] = useState("16:50");
  const [tallerDepCupos, setTallerDepCupos] = useState("20");
  const [tallerDepNivel, setTallerDepNivel] = useState("Formativo");
  const [tallerDepDocente, setTallerDepDocente] = useState("");
  const [programaDocsId, setProgramaDocsId] = useState("");
  const [lecturaDocumento, setLecturaDocumento] = useState(null);
  const [sidebarAbierta, setSidebarAbierta] = useState(() => {
    const saved = localStorage.getItem("coord_sidebar_expanded");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const handleSetSidebarAbierta = (val) => {
    setSidebarAbierta((prev) => {
      const newVal = typeof val === "function" ? val(prev) : val;
      localStorage.setItem("coord_sidebar_expanded", JSON.stringify(newVal));
      return newVal;
    });
  };

  const toggleSidebarButton = !sidebarAbierta && (
    <button 
      className="coord-menu-toggle-btn-header" 
      type="button" 
      onClick={() => handleSetSidebarAbierta(true)} 
      aria-label="Mostrar barra lateral"
      title="Mostrar barra lateral"
    >
      <Menu size={22} />
    </button>
  );

  // Modal invitados
  const [showInvitados, setShowInvitados] = useState(false);
  const [invitados, setInvitados] = useState([]);
  const [matriculados, setMatriculados] = useState([]);
  const [asistenciasPrograma, setAsistenciasPrograma] = useState([]);
  const [subVistaAlumnos, setSubVistaAlumnos] = useState("preinscritos");
  const [progSeleccionado, setProgSeleccionado] = useState(null);
  const [programaAFinalizar, setProgramaAFinalizar] = useState(null);

  // Carga Excel
  const cargaPeriodo = "escolar";
  const [archivosExcel, setArchivosExcel] = useState([]);
  const [archivoInputKey, setArchivoInputKey] = useState(0);
  const [previewCarga, setPreviewCarga] = useState(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(null);
  const [confirmandoCarga, setConfirmandoCarga] = useState(false);
  const [historialCargas, setHistorialCargas] = useState([]);
  const [eliminandoCargaId, setEliminandoCargaId] = useState("");
  const [modoCargaAlumnos, setModoCargaAlumnos] = useState("masiva");
  const [alumnoIndividual, setAlumnoIndividual] = useState({ dni: "", nombre: "", grado: "" });
  const [programaCargaId, setProgramaCargaId] = useState("");
  const [guardandoIndividual, setGuardandoIndividual] = useState(false);
  const [estadoAlumnoIndividual, setEstadoAlumnoIndividual] = useState({ buscando: false, mensaje: "", encontrado: false });
  const [ultimoLoteId, setUltimoLoteId] = useState("");

  function actualizarAlumnoIndividual(campo, valor) {
    if (campo === "dni") {
      const dni = String(valor || "").replace(/\D/g, "").slice(0, 8);
      setAlumnoIndividual((prev) => ({ ...prev, dni }));
      return;
    }
    setAlumnoIndividual((prev) => ({ ...prev, [campo]: valor }));
  }

  useEffect(() => {
    if (modoCargaAlumnos !== "individual") return;
    const dni = String(alumnoIndividual.dni || "").replace(/\D/g, "");
    if (dni.length !== 8) {
      setEstadoAlumnoIndividual({ buscando: false, mensaje: "", encontrado: false });
      return;
    }

    let activo = true;
    const timer = setTimeout(async () => {
      setEstadoAlumnoIndividual({ buscando: true, mensaje: "Buscando alumno en la base de datos...", encontrado: false });
      try {
        const alumno = await buscarAlumnoCargaPorDni(dni, cargaPeriodo);
        if (!activo) return;
        if (alumno) {
          setAlumnoIndividual((prev) => {
            if (String(prev.dni || "").replace(/\D/g, "") !== dni) return prev;
            return {
              ...prev,
              nombre: alumno.nombre || prev.nombre,
              grado: alumno.grado || prev.grado,
            };
          });
          setEstadoAlumnoIndividual({ buscando: false, mensaje: "Datos encontrados y completados automaticamente.", encontrado: true });
          return;
        }
        setEstadoAlumnoIndividual({ buscando: false, mensaje: "DNI no encontrado. Complete nombre y grado manualmente.", encontrado: false });
      } catch (err) {
        if (!activo) return;
        setEstadoAlumnoIndividual({ buscando: false, mensaje: err.message || "No se pudo consultar el DNI.", encontrado: false });
      }
    }, 250);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [alumnoIndividual.dni, modoCargaAlumnos]);

  async function guardarAlumnoIndividual() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para registrar alumnos.");
    if (!programaCargaId) return mostrarMsg("Seleccione un programa académico.");
    if (!alumnoIndividual.dni || alumnoIndividual.dni.length !== 8) {
      return mostrarMsg("El DNI debe tener exactamente 8 dígitos.");
    }
    if (!alumnoIndividual.nombre.trim()) {
      return mostrarMsg("Ingrese el nombre completo del alumno.");
    }
    if (!alumnoIndividual.grado.trim()) {
      return mostrarMsg("Ingrese el grado del alumno.");
    }

    setGuardandoIndividual(true);
    try {
      const resultado = await registrarAlumnoIndividualCarga({
        periodo: cargaPeriodo,
        programaId: programaCargaId,
        dni: alumnoIndividual.dni,
        nombre: alumnoIndividual.nombre,
        grado: alumnoIndividual.grado,
      });
      await cargarDatos();
      setAlumnoIndividual({ dni: "", nombre: "", grado: "" });
      setEstadoAlumnoIndividual({ buscando: false, mensaje: "", encontrado: false });
      if (resultado && resultado.cargaId) {
        setUltimoLoteId(resultado.cargaId);
      } else if (resultado && resultado.cargaIds && resultado.cargaIds.length > 0) {
        setUltimoLoteId(resultado.cargaIds[0]);
      }
      mostrarMsg("Alumno registrado individualmente con éxito.", "success");
    } catch (err) {
      mostrarMsg(err.message || "Error al registrar el alumno.");
    } finally {
      setGuardandoIndividual(false);
    }
  }
  const puedeCrearProgramas = tienePermisoAsignado(user, "programas.crear");
  const puedeEditarProgramas = tienePermisoAsignado(user, "programas.editar");
  const puedeCrearGrupos = tienePermisoAsignado(user, "grupos.crear");
  const puedeEditarGrupos = tienePermisoAsignado(user, "grupos.editar");
  const puedeVerAlumnos = tienePermisoAsignado(user, "alumnos.historial.ver");
  const puedeCargarAlumnos = puedeCrearGrupos || puedeEditarGrupos;
  const puedeGestionarGruposFormulario = modoEditar ? puedeEditarGrupos : puedeCrearGrupos;
  const tieneAccionesPrograma = puedeEditarProgramas || puedeVerAlumnos;
  const vistasDisponibles = vistasNav.filter((item) => puedeVerVista(user, item));
  const vistaActualDisponible = vistasDisponibles.some((item) => item.id === vista);
  const puedeVerProgramasVista = vistasDisponibles.some((item) => item.id === "programas");
  const puedeVerCargaVista = vistasDisponibles.some((item) => item.id === "carga");
  const puedeVerDocumentosVista = vistasDisponibles.some((item) => item.id === "documentos");
  const puedeVerAsistenciasVista = vistasDisponibles.some((item) => item.id === "asistencias");

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    if (!embedded || !initialView) return;
    setVista(initialView);
    setMensaje("");
  }, [embedded, initialView]);

  useEffect(() => {
    if (vistaActualDisponible || vistasDisponibles.length === 0) return;
    setVista(vistasDisponibles[0].id);
    setMensaje("");
  }, [vistaActualDisponible, vistasDisponibles, vista]);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [progs, cats, cargas] = await Promise.all([
        listarProgramas(),
        listarCategorias(),
        listarHistorialCargas(),
      ]);
      setProgramas(progs);
      setCategorias(cats);
      setHistorialCargas(cargas);
    } catch (err) {
      mostrarMsg(err.message || "No se pudieron cargar los datos de Coordinación Académica.");
    } finally {
      setCargando(false);
    }
  }



  function mostrarMsg(texto, tipo = "error") {
    setMensaje(texto);
    setTipoMsg(tipo);
    const titulo = tipo === "success" ? "Coordinación Académica" : "Revisar datos";
    if (tipo === "success") {
      toast.success(titulo, { description: texto });
    } else {
      toast.warning(titulo, { description: texto });
    }
    if (tipo === "success") setTimeout(() => setMensaje(""), 4000);
  }

  function mostrarAlertaConfiguracion(detalle = "") {
    const texto = detalle
      ? `Complete la configuracion del taller antes de habilitarlo. ${detalle}`
      : "Complete la configuracion del taller antes de habilitarlo.";
    setAlertaConfiguracion(texto);
    return mostrarMsg(texto);
  }

  // ── Filtrar programas ──
  const programasFiltrados = programas.filter(p => {
    const textoBusqueda = busqueda.trim().toLowerCase();
    const coincide = !textoBusqueda ||
      String(p.nombre || "").toLowerCase().includes(textoBusqueda) ||
      String(p.id || "").toLowerCase().includes(textoBusqueda);
    const filtraPeriodo = filtroPeriodo === "todos" || normalizarPeriodoVista(p.periodo) === filtroPeriodo;
    const filtraCategoria = filtroCategoria === "todos" || String(p.categoria || "").toLowerCase() === filtroCategoria.toLowerCase();
    const filtraEstado = filtroEstado === "todos" || 
      (filtroEstado === "disponibles" && p.estado === "Habilitado") ||
      (filtroEstado === "deshabilitados" && p.estado === "Deshabilitado") ||
      (filtroEstado === "finalizados" && p.estado === "Finalizado");
    return coincide && filtraPeriodo && filtraCategoria && filtraEstado;
  });
  const programaDocs = programas.find((item) => item.id === programaDocsId);
  const historialPlantillas = programas.filter((programa) =>
    programa.plantilla && (programa.plantillaBase64 || apiDb.plantillasPorPrograma?.[programa.id]?.plantillaBase64)
  );

  // ── Abrir modal crear ──
  function abrirCrear() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    setForm(formInicial);
    setModoEditar(false);
    setProgramaDocsId("");
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setShowModal(true);
    setAlertaConfiguracion("");
    setMensaje("");
  }

  function datosProgramaAFormulario(prog) {
    const talleres = Array.isArray(prog.talleresDeportivos) ? prog.talleresDeportivos : [];
    const esVerano = normalizarPeriodoVista(prog.periodo) === "verano";
    const catLower = String(prog.categoria || "").toLowerCase();
    const esDeportivo = catLower === "deportivo" || esProgramaDeportivo(prog.nombre, prog.categoria);
    const usaTalleresPorEdad = esVerano ? (catLower !== "academico" && catLower !== "ingles" && catLower !== "académico" && catLower !== "inglés") : esDeportivo;

    let cuposCalculados = prog.cupos;
    if (usaTalleresPorEdad && talleres.length > 0) {
      cuposCalculados = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
    }

    let horariosPorGrupo = normalizarHorariosPorGrupo(prog.horariosPorGrupo);
    if (!usaTalleresPorEdad && horariosPorGrupo.length === 0 && prog.horaInicio && prog.horaFin) {
      const diasArray = normalizarListaTexto(prog.dias);
      horariosPorGrupo = [{
        id: `grupo-migrado-${Date.now()}`,
        grados: normalizarListaGrados(prog.gradosAplicables),
        dia: diasArray.length > 0 ? diasArray.join(", ") : "Lunes",
        almuerzoInicio: prog.almuerzoInicio || "14:20",
        almuerzoFin: prog.almuerzoFin || "15:10",
        horaInicio: prog.horaInicio,
        horaFin: prog.horaFin,
        aula: prog.aula || "",
        responsable: prog.responsable || "",
        tutora: prog.tutora || "",
        cupos: Number(prog.cupos) || 20,
      }];
    }

    if (!usaTalleresPorEdad && horariosPorGrupo.length > 0) {
      cuposCalculados = String(horariosPorGrupo.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0));
    }

    return {
      nombre: prog.nombre, periodo: normalizarPeriodoVista(prog.periodo), categoria: prog.categoria,
      grupo: prog.grupo, grupoEtario: prog.grupoEtario || "", horario: prog.horario, fechaInicio: prog.fechaInicio,
      gradosAplicables: normalizarListaGrados(prog.gradosAplicables),
      edadMinima: prog.edadMinima || "",
      edadMaxima: prog.edadMaxima || "",
      fechaNacimientoDesde: prog.fechaNacimientoDesde || "",
      fechaNacimientoHasta: prog.fechaNacimientoHasta || "",
      dias: normalizarListaTexto(prog.dias),
      horaInicio: prog.horaInicio || "",
      horaFin: prog.horaFin || "",
      almuerzoInicio: prog.almuerzoInicio || "",
      almuerzoFin: prog.almuerzoFin || "",
      horariosPorGrupo: horariosPorGrupo,
      usaHorariosPorBloque: !usaTalleresPorEdad,
      talleresDeportivos: talleres,
      fechaFin: prog.fechaFin,
      cicloI: prog.cicloI || "",
      cicloII: prog.cicloII || "",
      duracionAvisoDias: String(normalizarDuracionAvisoDias(prog.duracionAvisoDias, 7)),
      horaLimiteAviso: prog.horaLimiteAviso || "23:59",
      cupos: String(cuposCalculados), costo: String(prog.costo),
      modalidadCobro: prog.modalidadCobro, responsable: prog.responsable,
      tutora: prog.tutora, plantilla: prog.plantilla || "",
      plantillaBase64: prog.plantillaBase64 || "",
      plantillaVariables: prog.plantillaVariables || [],
      plantillaValidada: Boolean(prog.plantillaValidada),
      plantillaActualizadaEn: prog.plantillaActualizadaEn || "",
      requisitos: prog.requisitos || "",
      comunicado: prog.comunicado || "",
      comunicadoCompleto: prog.comunicadoCompleto || "",
      detalleCosto: prog.detalleCosto || "",
      detalleAlmuerzo: prog.detalleAlmuerzo || "",
      concesionarios: prog.concesionarios || "",
      requiereUniforme: false,
      requiereIndumentaria: Boolean(prog.requiereIndumentaria),
      invitacionMasiva: Boolean(prog.invitacionMasiva),
      alcanceInvitacionMasiva: prog.alcanceInvitacionMasiva || "colegio",
      anuncioImagen: prog.anuncioImagen || "",
      anuncioImagenNombre: prog.anuncioImagenNombre || "",
      anuncioImagenTamano: prog.anuncioImagenTamano || 0,
      anuncioImagenComprimida: Boolean(prog.anuncioImagenComprimida),
      id: prog.id,
    };
  }

  // ── Abrir modal editar ──
  function abrirEditar(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    setProgramaDocsId("");
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setShowModal(true);
    setAlertaConfiguracion("");
    setMensaje("");
  }

  // ── Validar y guardar ──
  async function guardar(e) {
    e.preventDefault();
    setAlertaConfiguracion("");
    if (!modoEditar && !puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    if (modoEditar && !puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    if (!form.nombre.trim()) return mostrarAlertaConfiguracion("Revise: nombre del programa.");
    if (!form.categoria) return mostrarAlertaConfiguracion("Revise: categoria.");
    
    const esVeranoGuardar = normalizarPeriodoVista(form.periodo) === "verano";
    const catLower = String(form.categoria || "").toLowerCase();
    const esCambridgeGuardar = esProgramaCambridge(form);
    const esDeportivoGuardar = catLower === "deportivo" || esProgramaDeportivo(form.nombre, form.categoria);
    const esMaratonGuardar = catLower === "maraton" || catLower === "maratón";
    const usaTalleresPorEdad = esVeranoGuardar ? (catLower !== "academico" && catLower !== "ingles" && catLower !== "académico" && catLower !== "inglés") : esDeportivoGuardar;
    
    const talleres = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    if (usaTalleresPorEdad && talleres.length === 0) {
      return mostrarAlertaConfiguracion(esVeranoGuardar
        ? "Revise: talleres de verano, edades y horarios."
        : "Revise: talleres deportivos, edades y horarios.");
    }

    const gruposHorario = (usaTalleresPorEdad || esMaratonGuardar) ? [] : normalizarHorariosPorGrupo(form.horariosPorGrupo);
    const usaHorariosPorBloqueGuardar = !usaTalleresPorEdad && !esMaratonGuardar;
    
    let gradosFinales = [];
    if (usaTalleresPorEdad) {
      gradosFinales = obtenerGradosDeportivos(talleres);
    } else if (esMaratonGuardar) {
      gradosFinales = normalizarListaGrados(form.gradosAplicables);
    } else {
      gradosFinales = obtenerGradosFinales(form.gradosAplicables, gruposHorario);
    }

    let diasFinales = [];
    if (usaTalleresPorEdad) {
      diasFinales = Array.from(new Set(talleres.map(t => t.dia)));
    } else if (esMaratonGuardar) {
      diasFinales = obtenerDiasEntreFechas(form.fechaInicio, form.fechaFin);
    } else {
      diasFinales = normalizarListaTexto(form.dias);
    }

    if (form.fechaInicio && form.fechaFin && form.fechaInicio > form.fechaFin) {
      return mostrarAlertaConfiguracion("Revise: la fecha de inicio no puede ser posterior a la fecha de fin.");
    }

    const camposFaltantes = [];
    if (!form.fechaInicio || !form.fechaFin) camposFaltantes.push("fechas de vigencia");
    if (!form.cupos || Number(form.cupos) <= 0) camposFaltantes.push("cupos");
    if (!String(form.costo || "").trim()) camposFaltantes.push("costo");
    if (!form.modalidadCobro) camposFaltantes.push("modalidad de cobro");
    if (esMaratonGuardar) {
      if (!form.horaInicio || !form.horaFin) camposFaltantes.push("horario");
    } else if (esVeranoGuardar && usaTalleresPorEdad) {
      if (diasFinales.length !== 3) camposFaltantes.push("3 dias de atencion");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && !usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (diasFinales.length === 0) camposFaltantes.push("dias del programa");
      if (!form.horaInicio || !form.horaFin) camposFaltantes.push("horario");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      camposFaltantes.push("bloques por grado");
    }
    if (camposFaltantes.length > 0) {
      return mostrarAlertaConfiguracion(`Revise: ${camposFaltantes.join(", ")}.`);
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && gradosFinales.length === 0) {
      return mostrarAlertaConfiguracion("Revise: grados aplicables.");
    }
    if (esVeranoGuardar && usaTalleresPorEdad && diasFinales.length !== 3) {
      return mostrarAlertaConfiguracion("Revise: seleccione exactamente 3 dias de atencion para verano.");
    }

    if (esMaratonGuardar) {
      if (form.horaInicio >= form.horaFin) {
        return mostrarMsg("La hora de inicio de la maratón debe ser menor a la hora de fin.");
      }
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && !esMaratonGuardar && usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      return mostrarAlertaConfiguracion("Revise: agregue al menos un bloque con grados, docente y horario.");
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && !usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (diasFinales.length === 0) return mostrarMsg("Seleccione los días del programa.");
      if (!form.horaInicio || !form.horaFin) return mostrarMsg("Seleccione hora de inicio y fin del programa.");
      if (form.horaInicio >= form.horaFin) return mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      if ((form.almuerzoInicio && !form.almuerzoFin) || (!form.almuerzoInicio && form.almuerzoFin)) {
        return mostrarMsg("Complete hora de inicio y fin del almuerzo.");
      }
      if (form.almuerzoInicio && form.almuerzoFin && form.almuerzoInicio >= form.almuerzoFin) {
        return mostrarMsg("La hora de inicio del almuerzo debe ser menor a la hora de fin.");
      }
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad) {
      const grupoInvalido = gruposHorario.find((grupo) =>
        grupo.grados.length === 0 || !grupo.dia || !grupo.horaInicio || !grupo.horaFin || grupo.horaInicio >= grupo.horaFin
      );
      if (grupoInvalido) return mostrarAlertaConfiguracion("Revise los grupos por dia: cada grupo debe tener grados, dia y hora valida.");
      const grupoAlmuerzoInvalido = gruposHorario.find((grupo) =>
        (grupo.almuerzoInicio && !grupo.almuerzoFin) ||
        (!grupo.almuerzoInicio && grupo.almuerzoFin) ||
        (grupo.almuerzoInicio && grupo.almuerzoFin && grupo.almuerzoInicio >= grupo.almuerzoFin)
      );
      if (grupoAlmuerzoInvalido) return mostrarAlertaConfiguracion("Revise los grupos por grado: complete horarios de almuerzo validos.");
      const grupoSinDocente = gruposHorario.find((grupo) => !grupo.responsable);
      if (grupoSinDocente) return mostrarAlertaConfiguracion("Revise los grupos por grado: cada grupo debe tener docente o tutor responsable.");
    }

    if (!form.fechaInicio || !form.fechaFin) return mostrarAlertaConfiguracion("Revise: fechas de inicio y fin.");
    if (form.fechaInicio > form.fechaFin) return mostrarMsg("La fecha de inicio no puede ser mayor a la de fin.");
    const duracionAvisoDias = normalizarDuracionAvisoDias(form.duracionAvisoDias, 7);
    if (String(duracionAvisoDias) !== String(form.duracionAvisoDias)) {
      return mostrarMsg("El aviso de inscripción puede durar de 1 a 7 días como máximo.");
    }
    if (!form.cupos || Number(form.cupos) <= 0) return mostrarAlertaConfiguracion("Revise: cupos.");
    if (!esCostoValido(form.costo)) return mostrarMsg("Ingrese un costo válido en soles, con máximo dos decimales.");
    if (!form.modalidadCobro) return mostrarAlertaConfiguracion("Revise: modalidad de cobro.");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    const ciclosCambridgeGuardar = calcularTextoCiclosCambridge(form.fechaInicio, form.fechaFin);
    const edadesTalleres = talleres.flatMap((taller) => [Number(taller.edadMinima), Number(taller.edadMaxima)]).filter(Number.isFinite);
    const edadMinimaVerano = edadesTalleres.length ? Math.min(...edadesTalleres) : "";
    const edadMaximaVerano = edadesTalleres.length ? Math.max(...edadesTalleres) : "";
    const datosGuardar = {
      ...form,
      responsable: usaTalleresPorEdad
        ? (Array.from(new Set(talleres.map(t => t.docente).filter(Boolean))).join(" · ") || form.responsable)
        : (gruposHorario.length > 0 ? resumenResponsablesPorGrupo(gruposHorario, form.responsable) : form.responsable),
      tutora: gruposHorario.length > 0 ? resumenTutoraPorGrupo(gruposHorario, form.tutora) : form.tutora,
      costo: Number(form.costo).toFixed(2),
      gradosAplicables: gradosFinales,
      edadMinima: usaTalleresPorEdad ? edadMinimaVerano : "",
      edadMaxima: usaTalleresPorEdad ? edadMaximaVerano : "",
      fechaNacimientoDesde: "",
      fechaNacimientoHasta: "",
      duracionTaller: calcularDuracionTexto(form.fechaInicio, form.fechaFin),
      cicloI: esCambridgeGuardar ? ciclosCambridgeGuardar.cicloI : form.cicloI || "",
      cicloII: esCambridgeGuardar ? ciclosCambridgeGuardar.cicloII : form.cicloII || "",
      duracionAvisoDias,
      dias: diasFinales,
      horariosPorGrupo: gruposHorario,
      usaHorariosPorBloque: gruposHorario.length > 0,
      grupo: esCambridgeGuardar
        ? "Asignado por Excel"
        : usaTalleresPorEdad
        ? resumenGrupoDeportivo(talleres)
        : resumenGrados(gradosFinales),
      grupoEtario: usaTalleresPorEdad ? `Edades ${edadMinimaVerano} a ${edadMaximaVerano} anios` : "",
      requiereUniforme: false,
      requiereIndumentaria: Boolean(form.requiereIndumentaria),
      alcanceInvitacionMasiva: form.invitacionMasiva ? form.alcanceInvitacionMasiva || "colegio" : "",
      anuncioImagen: form.invitacionMasiva ? form.anuncioImagen : "",
      anuncioImagenNombre: form.invitacionMasiva ? form.anuncioImagenNombre : "",
      anuncioImagenTamano: form.invitacionMasiva ? form.anuncioImagenTamano : 0,
      anuncioImagenComprimida: form.invitacionMasiva ? Boolean(form.anuncioImagenComprimida) : false,
      horario: esCambridgeGuardar
        ? "Asignado por carga Excel"
        : usaTalleresPorEdad
        ? resumenHorarioDeportivo(talleres)
        : gruposHorario.length
          ? resumenHorariosPorGrupo(gruposHorario)
          : resumenHorario(diasFinales, form.horaInicio, form.horaFin, form.almuerzoInicio, form.almuerzoFin),
    };
    try {
      if (modoEditar) {
        await editarPrograma(form.id, datosGuardar);
        mostrarMsg("Actualizado exitosamente.", "success");
        setProgramas((actuales) =>
          actuales.map((programa) => {
            if (programa.id !== form.id) return programa;
            return {
              ...programa,
              ...datosGuardar,
              id: form.id,
              periodo: normalizarPeriodoVista(datosGuardar.periodo),
              cupos: Number(datosGuardar.cupos),
              costo: Number(datosGuardar.costo),
              cuposOcupados: programa.cuposOcupados || 0,
              cuposDisponibles: Number(datosGuardar.cupos) - Number(programa.cuposOcupados || 0),
              estado: programa.estado || "Habilitado",
            };
          })
        );
        setShowModal(false);
      } else {
        const nuevoPrograma = await crearPrograma(datosGuardar);
        mostrarMsg("Programa creado correctamente.", "success");
        setProgramas((actuales) => [...actuales, nuevoPrograma]);
        setModoEditar(true);
        setForm(datosProgramaAFormulario(nuevoPrograma));
        setShowModal(true);
      }
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ── Cambiar estado ──
  async function toggleEstado(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para cambiar el estado de programas.");
    const nuevo = prog.estado === "Habilitado" ? "Deshabilitado" : "Habilitado";
    try {
      await cambiarEstadoPrograma(prog.id, nuevo);
      mostrarMsg(`Programa ${nuevo.toLowerCase()}.`, "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message || "No se pudo cambiar el estado del programa.");
    }
  }

  async function finalizarPrograma(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para finalizar programas.");
    setProgramaAFinalizar(prog);
  }

  async function confirmarFinalizar() {
    if (!programaAFinalizar) return;
    const prog = programaAFinalizar;
    setProgramaAFinalizar(null);
    try {
      await cambiarEstadoPrograma(prog.id, "Finalizado");
      mostrarMsg("Programa finalizado correctamente.", "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message || "No se pudo finalizar el programa.");
    }
  }

  // ── Ver invitados ──
  async function eliminarCurso(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar programas.");
    const confirmado = window.confirm(`Eliminar ${prog.nombre}? Tambien se retirara su lista de invitados cargada.`);
    if (!confirmado) return;

    try {
      await eliminarPrograma(prog.id);
      mostrarMsg("Programa eliminado correctamente.", "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  async function verInvitados(prog) {
    if (!puedeVerAlumnos) return mostrarMsg("No tiene permiso para ver alumnos.");
    setProgSeleccionado(prog);
    setSubVistaAlumnos("preinscritos");
    const lista = await listarInvitados(prog.id);
    const listaMatriculados = await listarMatriculados(prog.id);
    const listaAsistencias = await listarAsistenciasPrograma(prog.id);
    setInvitados(lista);
    setMatriculados(listaMatriculados);
    setAsistenciasPrograma(listaAsistencias);
    setShowInvitados(true);
  }

  function descargarPdfAlumnos(tipo) {
    if (!progSeleccionado) return;
    if (tipo === "preinscritos") {
      mostrarMsg("Solo se puede descargar la lista de alumnos matriculados.", "warning");
      return;
    }
    const isPre = tipo === "preinscritos";
    const lista = isPre ? invitados : matriculados;
    if (!lista.length) {
      mostrarMsg("No hay alumnos en esta lista para descargar.", "warning");
      return;
    }

    descargarListaAlumnosPdf(progSeleccionado, lista);
    mostrarMsg("Lista de alumnos descargada en PDF.", "success");
  }

  async function exportarAExcel(tipo) {
    if (!progSeleccionado) return;
    if (tipo === "preinscritos") {
      mostrarMsg("Solo se puede exportar la lista de alumnos matriculados.", "warning");
      return;
    }
    const isPre = tipo === "preinscritos";
    const data = isPre ? invitados : matriculados;
    if (!data.length) {
      mostrarMsg("No hay datos para exportar.", "warning");
      return;
    }

    try {
      await descargarListaAlumnosExcel(progSeleccionado, tipo, data);
      mostrarMsg("Archivo Excel descargado.", "success");
    } catch (err) {
      mostrarMsg(err.message || "No se pudo exportar el archivo Excel.");
    }
  }

  function abrirDocumentosPrograma(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar documentos del programa.");
    setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    setProgramaDocsId(prog.id);
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);
    setMensaje("");
  }

  async function guardarDocumentoComoPrograma() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas desde documentos.");
    if (!form.plantillaBase64) return mostrarMsg("Primero suba el documento Word.");
    if (!form.plantillaValidada) return mostrarMsg("El Word debe tener variables editables antes de guardarlo.");
    const nombreDocumento = form.nombre.trim() || nombreProgramaDesdeArchivo(form.plantilla);
    if (!nombreDocumento) return mostrarMsg("Ingrese el nombre del programa.");

    setGuardando(true);
    try {
      const creado = await crearProgramaDesdeDocumento({
        ...form,
        nombre: nombreDocumento,
        categoria: form.categoria || categorias[0] || "General",
      });
      await cargarDatos();
      setProgramaDocsId("");
      setForm(formInicial);
      setLecturaDocumento(null);
      setPlantillaInputKey((actual) => actual + 1);
      mostrarMsg(`Plantilla de ${creado.nombre} guardada en el historial.`, "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarDocumentosPrograma() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar documentos del programa.");
    if (!form.id) return mostrarMsg("Seleccione un programa para gestionar sus documentos.");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    try {
      await editarPrograma(form.id, form);
      await cargarDatos();
      mostrarMsg("Documentos del programa actualizados correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  // ── Agregar categoría ──
  async function agregarCategoria() {
    if (!nuevaCat.trim()) return;
    try {
      await crearCategoria(nuevaCat.trim());
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm(f => ({ ...f, categoria: nuevaCat.trim() }));
      setNuevaCat("");
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  async function quitarCategoria() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar categorías.");
    if (!catAEliminar) return mostrarMsg("Seleccione una categoría para quitar.");
    const confirmado = window.confirm(`Quitar la categoría "${catAEliminar}"?`);
    if (!confirmado) return;

    try {
      await eliminarCategoria(catAEliminar);
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm(f => ({ ...f, categoria: f.categoria === catAEliminar ? "" : f.categoria }));
      setCatAEliminar("");
      mostrarMsg("Categoría quitada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  function actualizarForm(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function actualizarInvitacionMasiva(activa) {
    setForm((actual) => ({
      ...actual,
      invitacionMasiva: activa,
      alcanceInvitacionMasiva: activa ? actual.alcanceInvitacionMasiva || "colegio" : "colegio",
      anuncioImagen: activa ? actual.anuncioImagen : "",
      anuncioImagenNombre: activa ? actual.anuncioImagenNombre : "",
      anuncioImagenTamano: activa ? actual.anuncioImagenTamano : 0,
      anuncioImagenComprimida: activa ? actual.anuncioImagenComprimida : false,
    }));
  }

  async function seleccionarImagenAnuncio(event) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      event.target.value = "";
      mostrarMsg("Seleccione una imagen valida para el anuncio.");
      return;
    }

    if (archivo.size > 8 * 1024 * 1024) {
      event.target.value = "";
      mostrarMsg("La imagen no debe superar 8 MB antes de comprimir.");
      return;
    }

    try {
      const resultado = await comprimirImagenAnuncio(archivo);
      setForm((actual) => ({
        ...actual,
        anuncioImagen: resultado.dataUrl,
        anuncioImagenNombre: archivo.name,
        anuncioImagenTamano: resultado.bytes,
        anuncioImagenComprimida: resultado.comprimida,
      }));
      mostrarMsg(
        resultado.comprimida
          ? "Imagen agregada y comprimida para el portal de padres."
          : "Imagen agregada para el portal de padres.",
        "success"
      );
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      event.target.value = "";
    }
  }

  function quitarImagenAnuncio() {
    setForm((actual) => ({
      ...actual,
      anuncioImagen: "",
      anuncioImagenNombre: "",
      anuncioImagenTamano: 0,
      anuncioImagenComprimida: false,
    }));
  }

  const agregarTallerDeportivo = () => {
    const deporteFinal = tallerDepDeporte === "Otro" ? tallerDepCustom.trim() : tallerDepDeporte;
    if (!deporteFinal) {
      mostrarMsg("Ingrese el nombre del deporte.");
      return;
    }
    const minE = Number(tallerDepMinEdad);
    const maxE = Number(tallerDepMaxEdad);
    if (!tallerDepMinEdad || !tallerDepMaxEdad || minE > maxE) {
      mostrarMsg("Rango de edades inválido.");
      return;
    }
    if (!tallerDepHoraInicio || !tallerDepHoraFin) {
      mostrarMsg("Ingrese las horas de inicio y fin.");
      return;
    }
    if (tallerDepHoraInicio >= tallerDepHoraFin) {
      mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      return;
    }
    const cuposTaller = Number(tallerDepCupos);
    if (Number.isNaN(cuposTaller) || cuposTaller <= 0) {
      mostrarMsg("Ingrese un número de cupos válido para el taller.");
      return;
    }
    const docenteFinal = tallerDepDocente.trim();
    if (!docenteFinal) {
      mostrarMsg("Ingrese el tutor o docente a cargo del taller.");
      return;
    }

    const nuevoTaller = {
      deporte: deporteFinal,
      edadMinima: minE,
      edadMaxima: maxE,
      dia: tallerDepDia,
      horaInicio: tallerDepHoraInicio,
      horaFin: tallerDepHoraFin,
      cupos: cuposTaller,
      nivel: tallerDepNivel,
      docente: docenteFinal,
    };

    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const nuevaLista = [...listaActual, nuevoTaller];
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm(prev => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));

    setTallerDepCustom("");
    setTallerDepCupos("20");
    setTallerDepNivel("Formativo");
    setTallerDepDocente("");
  };

  const quitarTallerDeportivo = (index) => {
    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const nuevaLista = listaActual.filter((_, idx) => idx !== index);
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm(prev => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));
  };

  function actualizarNombrePrograma(valor) {
    setForm((actual) => {
      const esVerano = normalizarPeriodoVista(actual.periodo) === "verano";
      const catLower = String(actual.categoria || "").toLowerCase();
      const esDeportivo = catLower === "deportivo" || esProgramaDeportivo(valor, actual.categoria);
      const usaTalleresPorEdad = esVerano ? (catLower !== "academico" && catLower !== "ingles" && catLower !== "académico" && catLower !== "inglés") : esDeportivo;
      const talleres = Array.isArray(actual.talleresDeportivos) ? actual.talleresDeportivos : [];
      let nuevosCupos = actual.cupos;
      if (usaTalleresPorEdad && talleres.length > 0) {
        nuevosCupos = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
      }
      return {
        ...actual,
        nombre: valor,
        cupos: nuevosCupos,
        requiereIndumentaria: esDeportivo ? actual.requiereIndumentaria : false,
      };
    });
  }

  function actualizarCategoriaPrograma(valor) {
    setForm((actual) => {
      const esVerano = normalizarPeriodoVista(actual.periodo) === "verano";
      const catLower = String(valor || "").toLowerCase();
      const esDeportivo = catLower === "deportivo" || esProgramaDeportivo(actual.nombre, valor);
      const usaTalleresPorEdad = esVerano ? (catLower !== "academico" && catLower !== "ingles" && catLower !== "académico" && catLower !== "inglés") : esDeportivo;
      const talleres = Array.isArray(actual.talleresDeportivos) ? actual.talleresDeportivos : [];
      let nuevosCupos = actual.cupos;
      if (usaTalleresPorEdad && talleres.length > 0) {
        nuevosCupos = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
      }
      return {
        ...actual,
        categoria: valor,
        cupos: nuevosCupos,
        requiereIndumentaria: esDeportivo ? actual.requiereIndumentaria : false,
      };
    });
  }

  function actualizarCosto(valor) {
    const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
    const partes = limpio.split(".");
    const normalizado = partes.length > 1
      ? `${partes[0]}.${partes.slice(1).join("").slice(0, 2)}`
      : partes[0];

    setForm(f => ({ ...f, costo: normalizado }));
  }

  function formatearCostoFormulario() {
    if (form.costo === "") return;
    const numero = Number(form.costo);
    setForm(f => ({ ...f, costo: Number.isFinite(numero) ? numero.toFixed(2) : "" }));
  }

  async function seleccionarPlantilla(event) {
    if (modoEditar && !puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar plantillas.");
    if (!modoEditar && !puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear plantillas.");
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!/\.docx$/i.test(archivo.name)) {
      setPlantillaInputKey((actual) => actual + 1);
      return mostrarMsg("Solo se permiten plantillas Word en formato .docx.");
    }

    if (modoEditar && form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.tieneActividad) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) {
          setPlantillaInputKey((actual) => actual + 1);
          return;
        }
      }
    }

    try {
      const lectura = await leerPlantillaWord(archivo);
      const { variablesDetectadas, textoPlano } = lectura;
      const plantillaBase64 = await leerArchivoBase64(archivo);
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, archivo.name, categorias);
      const datosAplicables = vista === "documentos" ? filtrarDatosDocumento(datosDetectados) : datosDetectados;
      if (vista === "documentos" && textoPlano) datosAplicables.comunicadoCompleto = textoPlano;
      const nombreDocumento = datosDetectados.nombre || nombreProgramaDesdeArchivo(archivo.name);
      const plantillaExistente = vista === "documentos"
        ? programas.find((programa) =>
            normalizarComparacion(programa.plantilla) === normalizarComparacion(archivo.name)
          )
        : null;
      const totalDetectados = contarDatosDetectados(datosAplicables);
      if (vista === "documentos") {
        setLecturaDocumento({
          archivo: archivo.name,
          texto: textoPlano,
          datos: datosAplicables,
          variables: variablesDetectadas,
          variablesListasModelo: lectura.variablesListasModelo,
          variablesRequeridasModelo: lectura.variablesRequeridasModelo,
          variablesFaltantes: lectura.variablesFaltantes,
          plantillaModelo: lectura.plantillaModelo,
        });
      }
      if (plantillaExistente) {
        setProgramaDocsId(plantillaExistente.id);
        setModoEditar(true);
      }
      setForm((actual) => ({
        ...actual,
        ...(plantillaExistente ? datosProgramaAFormulario(plantillaExistente) : {}),
        ...datosAplicables,
        nombre: vista === "documentos" && !programaDocsId
          ? plantillaExistente?.nombre || nombreDocumento || actual.nombre
          : actual.nombre || plantillaExistente?.nombre || nombreDocumento,
        categoria: plantillaExistente?.categoria || actual.categoria || datosDetectados.categoria || categorias[0] || "",
        plantilla: archivo.name,
        plantillaBase64,
        plantillaVariables: variablesDetectadas,
        plantillaValidada: lectura.plantillaValida,
        plantillaActualizadaEn: fechaActualIso(),
      }));
      mostrarMsg(
        plantillaExistente
          ? `La plantilla ya estaba guardada como ${plantillaExistente.nombre}. No es necesario volver a subirla.`
          : totalDetectados > 0
          ? `Plantilla validada. Se autocompletaron ${totalDetectados} dato(s) del programa.`
          : "Plantilla validada. No se encontraron datos del programa para autocompletar.",
        "success"
      );
    } catch (err) {
      setLecturaDocumento(null);
      setForm((actual) => ({
        ...actual,
        plantilla: archivo.name,
        plantillaBase64: "",
        plantillaVariables: [],
        plantillaValidada: false,
        plantillaActualizadaEn: "",
      }));
      mostrarMsg(err.message || "No se pudo validar la plantilla Word.");
    }
  }

  async function autocompletarDesdePlantilla() {
    if (!form.plantillaBase64) {
      return mostrarMsg(vista === "documentos" ? "Primero suba un documento Word." : "Primero suba y valide una plantilla Word.");
    }

    try {
      const lectura = await leerDocumentoWordDesdeBase64(form.plantillaBase64);
      const { textoPlano, variablesDetectadas } = lectura;
      const datosDetectados = extraerDatosProgramaDesdeWord(textoPlano, form.plantilla, categorias);
      const datosAplicables = vista === "documentos" ? filtrarDatosDocumento(datosDetectados) : datosDetectados;
      if (vista === "documentos" && textoPlano) datosAplicables.comunicadoCompleto = textoPlano;
      const totalDetectados = contarDatosDetectados(datosAplicables);
      if (vista === "documentos") {
        setLecturaDocumento({
          archivo: form.plantilla,
          texto: textoPlano,
          datos: datosAplicables,
          variables: variablesDetectadas,
          variablesListasModelo: lectura.variablesListasModelo,
          variablesRequeridasModelo: lectura.variablesRequeridasModelo,
          variablesFaltantes: lectura.variablesFaltantes,
          plantillaModelo: lectura.plantillaModelo,
        });
      }

      if (totalDetectados === 0) {
        return mostrarMsg(vista === "documentos"
          ? "Documento leído. No se detectaron secciones automáticas para guardar."
          : "No se encontraron datos del programa dentro del Word. Complete los campos manualmente.");
      }

      setForm((actual) => ({
        ...actual,
        ...datosAplicables,
        ...(vista === "documentos" && !programaDocsId
          ? { nombre: datosDetectados.nombre || nombreProgramaDesdeArchivo(form.plantilla) || actual.nombre }
          : {}),
      }));
      return mostrarMsg(`Se autocompletaron ${totalDetectados} dato(s) del programa.`, "success");
    } catch (err) {
      return mostrarMsg(err.message || "No se pudo leer la plantilla guardada.");
    }
  }

  async function quitarPlantilla() {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar plantillas.");
    if (vista === "documentos" && form.id && form.plantilla) {
      const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${form.plantilla}`);
      if (!confirmado) return;
    }

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      comunicadoCompleto: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    const siguienteForm = {
      ...form,
      ...datosLimpios,
    };

    setForm((actual) => ({
      ...actual,
      ...datosLimpios,
    }));
    setLecturaDocumento(null);
    setPlantillaInputKey((actual) => actual + 1);

    if (vista !== "documentos" || !form.id) return;

    setGuardando(true);
    try {
      await editarPrograma(form.id, siguienteForm);
      await cargarDatos();
      mostrarMsg("Documento eliminado del programa.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarPlantillaHistorial(programa) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para eliminar plantillas.");
    const confirmado = window.confirm(`¿Está seguro que desea eliminar esta plantilla?\n\n${programa.plantilla}`);
    if (!confirmado) return;

    const datosLimpios = {
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      plantillaActualizadaEn: "",
      requisitos: "",
      comunicado: "",
      comunicadoCompleto: "",
      detalleCosto: "",
      detalleAlmuerzo: "",
      concesionarios: "",
    };

    setGuardando(true);
    try {
      await editarPrograma(programa.id, {
        ...datosProgramaAFormulario(programa),
        ...datosLimpios,
      });
      if (programaDocsId === programa.id) {
        setProgramaDocsId("");
        setForm(formInicial);
        setLecturaDocumento(null);
      }
      await cargarDatos();
      mostrarMsg("Plantilla eliminada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function usarPlantillaExistente(programaId) {
    const programa = programas.find((item) => item.id === programaId);
    if (!programa || !programa.plantillaBase64) {
      return mostrarMsg("Seleccione un programa con plantilla validada.");
    }

    if (modoEditar && form.id && form.plantilla) {
      const actividad = await obtenerActividadPrograma(form.id);
      if (actividad.alumnos || actividad.inscripciones || actividad.documentos) {
        const confirmado = window.confirm(
          `Este programa ya tiene ${actividad.alumnos} alumno(s), ${actividad.inscripciones} inscripción(es) y ${actividad.documentos} documento(s). ¿Desea reemplazar la plantilla?`
        );
        if (!confirmado) return;
      }
    }

    setForm((actual) => ({
      ...actual,
      plantilla: programa.plantilla || "",
      plantillaBase64: programa.plantillaBase64 || "",
      plantillaVariables: programa.plantillaVariables || [],
      plantillaValidada: Boolean(programa.plantillaValidada),
      plantillaActualizadaEn: fechaActualIso(),
    }));
    setPlantillaInputKey((actual) => actual + 1);
    mostrarMsg(`Se usará la plantilla de ${programa.nombre}.`, "success");
  }

  function cambiarPeriodoFormulario(valor) {
    const periodoNormalizado = normalizarPeriodoVista(valor);
    const catLower = String(form.categoria || "").toLowerCase();
    const esDeportivo = catLower === "deportivo" || esProgramaDeportivo(form.nombre, form.categoria);
    const usaTalleresPorEdad = periodoNormalizado === "verano" ? (catLower !== "academico" && catLower !== "ingles" && catLower !== "académico" && catLower !== "inglés") : esDeportivo;

    if (periodoNormalizado === "verano") {
      setTallerDepDeporte("Danza");
    } else if (!["Vóley", "Fútbol", "Básquet", "Otro"].includes(tallerDepDeporte)) {
      setTallerDepDeporte("Vóley");
    }
    setForm(f => ({
      ...f,
      periodo: periodoNormalizado,
      modalidadCobro: periodoNormalizado === "verano" ? "Unico" : f.modalidadCobro,
      invitacionMasiva: periodoNormalizado === "verano" ? false : f.invitacionMasiva,
      requiereIndumentaria: periodoNormalizado === "verano" ? false : f.requiereIndumentaria,
      horariosPorGrupo: usaTalleresPorEdad ? [] : f.horariosPorGrupo,
      usaHorariosPorBloque: usaTalleresPorEdad ? false : f.usaHorariosPorBloque,
    }));
  }

  function actualizarFechaNacimientoVerano(campo, valor) {
    setForm((actual) => {
      const siguiente = { ...actual, [campo]: valor };
      const rango = calcularRangoEdades(siguiente.fechaNacimientoDesde, siguiente.fechaNacimientoHasta);
      return {
        ...siguiente,
        edadMinima: rango.edadMinima,
        edadMaxima: rango.edadMaxima,
      };
    });
  }

  function toggleGrado(valor) {
    setForm(f => {
      const yaExiste = normalizarListaGrados(f.gradosAplicables).includes(valor);
      const nuevosGrados = yaExiste
        ? normalizarListaGrados(f.gradosAplicables).filter(item => item !== valor)
        : [...normalizarListaGrados(f.gradosAplicables), valor];
        
      // Sincronizar con los grupos de horarios abajo
      let nuevosGrupos = f.horariosPorGrupo;
      if (yaExiste && Array.isArray(f.horariosPorGrupo)) {
        nuevosGrupos = f.horariosPorGrupo.map(grupo => ({
          ...grupo,
          grados: normalizarListaGrados(grupo.grados).filter(item => item !== valor)
        }));
      }
      
      return {
        ...f,
        gradosAplicables: nuevosGrados,
        horariosPorGrupo: nuevosGrupos
      };
    });
  }

  function toggleDia(valor) {
    setForm(f => {
      const actuales = normalizarListaTexto(f.dias);
      const yaExiste = actuales.includes(valor);
      const catLower = String(f.categoria || "").toLowerCase();
      const esDeportivo = catLower === "deportivo" || esProgramaDeportivo(f.nombre, f.categoria);
      const usaTalleresPorEdad = normalizarPeriodoVista(f.periodo) === "verano" ? (catLower !== "academico" && catLower !== "ingles" && catLower !== "académico" && catLower !== "inglés") : esDeportivo;
      if (!yaExiste && normalizarPeriodoVista(f.periodo) === "verano" && usaTalleresPorEdad && actuales.length >= 3) {
        mostrarMsg("El taller de verano debe tener 3 dias de atencion.");
        return f;
      }
      return {
        ...f,
        dias: yaExiste
          ? actuales.filter(item => item !== valor)
          : [...actuales, valor],
      };
    });
  }

  function agregarGrupoHorario(grupo = horarioGrupoInicial) {
    setForm((actual) => {
      const nuevaLista = [
        ...(Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []),
        { ...grupo, id: grupo.id || `grupo-${Date.now()}` },
      ];
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        usaHorariosPorBloque: true,
        gradosAplicables: normalizarListaGrados([
          ...normalizarListaGrados(actual.gradosAplicables),
          ...normalizarListaGrados(grupo.grados),
        ]),
        horariosPorGrupo: nuevaLista,
        cupos: String(totalCupos),
      };
    });
  }

  function quitarGrupoHorario(index) {
    setForm((actual) => {
      const nuevaLista = (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).filter((_, itemIndex) => itemIndex !== index);
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        horariosPorGrupo: nuevaLista,
        cupos: nuevaLista.length > 0 ? String(totalCupos) : actual.cupos,
      };
    });
  }

  function actualizarGrupoHorario(index, campo, valor) {
    setForm((actual) => {
      const lista = Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : [];
      const nuevaLista = lista.map((grupo, itemIndex) => {
        if (itemIndex !== index) return grupo;
        if (campo && typeof campo === "object") {
          return { ...campo, id: grupo.id || campo.id || `grupo-${Date.now()}` };
        }
        return { ...grupo, [campo]: valor };
      });
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        horariosPorGrupo: nuevaLista,
        cupos: String(totalCupos),
      };
    });
  }

  function toggleGradoGrupo(index, valor) {
    setForm((actual) => ({
      ...actual,
      horariosPorGrupo: (Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []).map((grupo, itemIndex) => {
        if (itemIndex !== index) return grupo;
        const grados = normalizarListaGrados(grupo.grados);
        return {
          ...grupo,
          grados: grados.includes(valor)
            ? grados.filter((item) => item !== valor)
            : [...grados, valor],
        };
      }),
    }));
  }

  async function generarPreviewExcel() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para cargar alumnos.");
    setMensaje("");
    setPreviewCarga(null);
    setProgresoCarga(null);

    if (!archivosExcel.length) return mostrarMsg("Seleccione al menos un archivo Excel.");
    if (archivosExcel.length > 6) return mostrarMsg("Puede subir hasta 6 archivos Excel por carga.");

    const invalido = archivosExcel.find((archivo) => !/\.(xlsx|xls)$/i.test(archivo.name));
    const pesado = archivosExcel.find((archivo) => archivo.size > 5 * 1024 * 1024);
    const totalBytes = archivosExcel.reduce((total, archivo) => total + Number(archivo.size || 0), 0);
    const extensionValida = !invalido;
    if (!extensionValida) return mostrarMsg("Solo se permiten archivos .xlsx o .xls.");
    if (pesado) return mostrarMsg("Cada archivo no debe superar 5 MB.");
    if (totalBytes > 25 * 1024 * 1024) return mostrarMsg("La carga masiva no debe superar 25 MB en total.");

    setCargandoPreview(true);
    setProgresoCarga({
      actual: 0,
      total: archivosExcel.length,
      porcentaje: 0,
      archivo: "",
      estado: "preparando",
    });
    try {
      const preview = await previsualizarCargaAlumnosMasiva({
        periodo: cargaPeriodo,
        archivos: archivosExcel,
        programaId: programaCargaId,
        onProgress: setProgresoCarga,
      });
      setPreviewCarga(preview);
      setProgresoCarga({
        actual: archivosExcel.length,
        total: archivosExcel.length,
        porcentaje: 100,
        archivo: "",
        estado: "listo",
      });
      if (preview.resumen.validos === 0) {
        mostrarMsg("La vista previa no tiene alumnos listos para guardar. Revise la columna Detalle y confirme que curso_programa coincida con un programa habilitado de Año escolar.");
      } else {
        mostrarMsg(`Vista previa generada: ${preview.resumen.validos} alumno(s) listos para guardar.`, "success");
      }
    } catch (err) {
      mostrarMsg(err.message || "No se pudo leer el archivo Excel.");
      setProgresoCarga(null);
    } finally {
      setCargandoPreview(false);
    }
  }

  async function confirmarCargaExcel() {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para confirmar cargas de alumnos.");
    if (!previewCarga || previewCarga.resumen.validos === 0) {
      return mostrarMsg("No hay registros válidos para confirmar.");
    }

    setConfirmandoCarga(true);
    try {
      const resultado = await confirmarCargaAlumnos(previewCarga);
      await cargarDatos();
      setPreviewCarga(null);
      setProgresoCarga(null);
      setArchivosExcel([]);
      setArchivoInputKey((actual) => actual + 1);
      if (resultado && resultado.cargaId) {
        setUltimoLoteId(resultado.cargaId);
      } else if (resultado && resultado.cargaIds && resultado.cargaIds.length > 0) {
        setUltimoLoteId(resultado.cargaIds[0]);
      }
      mostrarMsg("Carga confirmada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setConfirmandoCarga(false);
    }
  }

  async function eliminarCargaExcel(carga) {
    if (!puedeCargarAlumnos) return mostrarMsg("No tiene permiso para borrar cargas.");
    const nombreCarga = Array.isArray(carga.archivos) && carga.archivos.length
      ? carga.archivos.join(", ")
      : carga.id;
    const confirmado = window.confirm(
      `¿Borrar esta carga de Excel?\n\n${nombreCarga}\n\nSe retirarán los alumnos importados mientras no tengan inscripción activa.`
    );
    if (!confirmado) return;

    setEliminandoCargaId(carga.id);
    try {
      const resultado = await eliminarCargaAlumnos(carga.id);
      await cargarDatos();
      mostrarMsg(`Carga eliminada. Alumnos retirados: ${resultado.eliminados || 0}.`, "success");
    } catch (err) {
      mostrarMsg(err.message || "No se pudo borrar la carga.");
    } finally {
      setEliminandoCargaId("");
    }
  }

  function cancelarCargaExcel() {
    setArchivosExcel([]);
    setPreviewCarga(null);
    setProgresoCarga(null);
    setMensaje("");
    setArchivoInputKey((actual) => actual + 1);
  }

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  const formGradosAplicables = normalizarListaGrados(form.gradosAplicables);
  const formDias = normalizarListaTexto(form.dias);
  const formHorariosPorGrupo = Array.isArray(form.horariosPorGrupo) ? form.horariosPorGrupo : [];
  const esFormularioVerano = normalizarPeriodoVista(form.periodo) === "verano";
  const esDeportivoForm = String(form.categoria || "").toLowerCase() === "deportivo" || esProgramaDeportivo(form.nombre, form.categoria);
  const esCambridgeForm = esProgramaCambridge(form);
  const ciclosCambridgeFormulario = calcularTextoCiclosCambridge(form.fechaInicio, form.fechaFin);
  const catLower = String(form.categoria || "").toLowerCase();
  const usaTalleresPorEdad = esFormularioVerano ? (catLower !== "academico" && catLower !== "ingles" && catLower !== "académico" && catLower !== "inglés") : esDeportivoForm;
  const duracionTallerFormulario = calcularDuracionTexto(form.fechaInicio, form.fechaFin);
  const mostrarIndumentariaDeportiva = esDeportivoForm;

  return (
    <div className={embedded ? "coord-embedded" : `coord-layout ${esProfesor ? "coord-layout-profesor" : ""} ${sidebarAbierta ? "" : "coord-layout-collapsed"}`}>
      {/* ── SIDEBAR ── */}
      {!embedded ? (
        <CoordinacionSidebar
          delegatedContent={delegatedContent}
          esProfesor={esProfesor}
          moduleSwitcher={moduleSwitcher}
          onClearDelegatedModule={onClearDelegatedModule}
          onLogout={onLogout}
          setMensaje={setMensaje}
          setSidebarAbierta={handleSetSidebarAbierta}
          setVista={setVista}
          sidebarAbierta={sidebarAbierta}
          vista={vista}
          vistasDisponibles={vistasDisponibles}
        />
      ) : null}

      {/* ── MAIN ── */}
      <main className={embedded ? "coord-main coord-main-embedded" : "coord-main"}>
        {!embedded && !sidebarAbierta && (
          <button 
            className="coord-global-menu-toggle-btn" 
            type="button" 
            onClick={() => handleSetSidebarAbierta(true)} 
            aria-label="Mostrar barra lateral"
            title="Mostrar barra lateral"
          >
            <Menu size={22} />
          </button>
        )}
        {delegatedContent ? (
          delegatedContent
        ) : (
          <>
        {vista === "programas" && puedeVerProgramasVista && (
          <ProgramasView
            abrirCrear={abrirCrear}
            abrirEditar={abrirEditar}
            cargando={cargando}
            eliminarCurso={eliminarCurso}
            filtroPeriodo={filtroPeriodo}
            finalizarPrograma={finalizarPrograma}
            mensaje={mensaje}
            programas={programasFiltrados}
            puedeCrearProgramas={puedeCrearProgramas}
            puedeEditarProgramas={puedeEditarProgramas}
            puedeVerAlumnos={puedeVerAlumnos}
            setFiltroPeriodo={setFiltroPeriodo}
            tieneAccionesPrograma={tieneAccionesPrograma}
            tipoMsg={tipoMsg}
            toggleEstado={toggleEstado}
            verInvitados={verInvitados}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            categorias={categorias}
            filtroCategoria={filtroCategoria}
            setFiltroCategoria={setFiltroCategoria}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            todosLosProgramas={programas}
            toggleSidebarButton={toggleSidebarButton}
          />
        )}

        {vista === "carga" && puedeVerCargaVista && (
          <CargaExcelView
            archivoInputKey={archivoInputKey}
            archivosExcel={archivosExcel}
            cargandoPreview={cargandoPreview}
            cancelarCargaExcel={cancelarCargaExcel}
            confirmandoCarga={confirmandoCarga}
            confirmarCargaExcel={confirmarCargaExcel}
            eliminandoCargaId={eliminandoCargaId}
            eliminarCargaExcel={eliminarCargaExcel}
            generarPreviewExcel={generarPreviewExcel}
            historialCargas={historialCargas}
            mensaje={mensaje}
            previewCarga={previewCarga}
            progresoCarga={progresoCarga}
            setArchivosExcel={setArchivosExcel}
            setMensaje={setMensaje}
            setPreviewCarga={setPreviewCarga}
            setProgresoCarga={setProgresoCarga}
            tipoMsg={tipoMsg}
            modoCargaAlumnos={modoCargaAlumnos}
            setModoCargaAlumnos={setModoCargaAlumnos}
            alumnoIndividual={alumnoIndividual}
            estadoAlumnoIndividual={estadoAlumnoIndividual}
            actualizarAlumnoIndividual={actualizarAlumnoIndividual}
            guardarAlumnoIndividual={guardarAlumnoIndividual}
            guardandoIndividual={guardandoIndividual}
            programaCargaId={programaCargaId}
            setProgramaCargaId={setProgramaCargaId}
            programas={programas}
            toggleSidebarButton={toggleSidebarButton}
            ultimoLoteId={ultimoLoteId}
            setUltimoLoteId={setUltimoLoteId}
          />
        )}

        {vista === "documentos" && puedeVerDocumentosVista && (
          <DocumentosView
            abrirEditar={abrirEditar}
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
            toggleSidebarButton={toggleSidebarButton}
          />
        )}

        {vista === "asistencias" && puedeVerAsistenciasVista && (
          <AsistenciasView
            programas={programas}
            listarAsistenciasPrograma={listarAsistenciasPrograma}
            listarMatriculados={listarMatriculados}
            toggleSidebarButton={toggleSidebarButton}
          />
        )}

        {/* ─── MODAL: CREAR / EDITAR PROGRAMA ─── */}
                <ProgramaFormModal
          actualizarCategoriaPrograma={actualizarCategoriaPrograma}
          actualizarCosto={actualizarCosto}
          actualizarForm={actualizarForm}
          actualizarGrupoHorario={actualizarGrupoHorario}
          actualizarInvitacionMasiva={actualizarInvitacionMasiva}
          actualizarNombrePrograma={actualizarNombrePrograma}
          agregarCategoria={agregarCategoria}
          agregarGrupoHorario={agregarGrupoHorario}
          agregarTallerDeportivo={agregarTallerDeportivo}
          alertaConfiguracion={alertaConfiguracion}
          cambiarPeriodoFormulario={cambiarPeriodoFormulario}
          catAEliminar={catAEliminar}
          categorias={categorias}
          ciclosCambridgeFormulario={ciclosCambridgeFormulario}
          diasSemana={diasSemana}
          duracionTallerFormulario={duracionTallerFormulario}
          esDeportivoForm={esDeportivoForm}
          esCambridgeForm={esCambridgeForm}
          esFormularioVerano={esFormularioVerano}
          usaTalleresPorEdad={usaTalleresPorEdad}
          form={form}
          formHorariosPorGrupo={formHorariosPorGrupo}
          formatearCostoFormulario={formatearCostoFormulario}
          guardar={guardar}
          guardando={guardando}
          mostrarGestorCategorias={mostrarGestorCategorias}
          mostrarIndumentariaDeportiva={mostrarIndumentariaDeportiva}
          modoEditar={modoEditar}
          nivelesGrados={nivelesGrados}
          nuevaCat={nuevaCat}
          puedeGestionarGruposFormulario={puedeGestionarGruposFormulario}
          quitarCategoria={quitarCategoria}
          quitarGrupoHorario={quitarGrupoHorario}
          quitarImagenAnuncio={quitarImagenAnuncio}
          quitarTallerDeportivo={quitarTallerDeportivo}
          seleccionarImagenAnuncio={seleccionarImagenAnuncio}
          setCatAEliminar={setCatAEliminar}
          setMostrarGestorCategorias={setMostrarGestorCategorias}
          setNuevaCat={setNuevaCat}
          setTallerDepMaxEdad={setTallerDepMaxEdad}
          setTallerDepMinEdad={setTallerDepMinEdad}
          setTallerDepCupos={setTallerDepCupos}
          setTallerDepNivel={setTallerDepNivel}
          setTallerDepDocente={setTallerDepDocente}
          setShowModal={(visible) => {
            if (!visible) setAlertaConfiguracion("");
            setShowModal(visible);
          }}
          setTallerDepCustom={setTallerDepCustom}
          setTallerDepDeporte={setTallerDepDeporte}
          setTallerDepDia={setTallerDepDia}
          setTallerDepHoraFin={setTallerDepHoraFin}
          setTallerDepHoraInicio={setTallerDepHoraInicio}
          show={showModal}
          tallerDepCustom={tallerDepCustom}
          tallerDepDeporte={tallerDepDeporte}
          tallerDepDia={tallerDepDia}
          tallerDepHoraFin={tallerDepHoraFin}
          tallerDepHoraInicio={tallerDepHoraInicio}
          tallerDepMaxEdad={tallerDepMaxEdad}
          tallerDepMinEdad={tallerDepMinEdad}
          tallerDepCupos={tallerDepCupos}
          tallerDepNivel={tallerDepNivel}
          tallerDepDocente={tallerDepDocente}
          toggleGradoGrupo={toggleGradoGrupo}
          toggleGrado={toggleGrado}
          toggleDia={toggleDia}
        />

        {showInvitados && (
          <AlumnosProgramaModal
            asistencias={asistenciasPrograma}
            descargarPdfAlumnos={descargarPdfAlumnos}
            exportarAExcel={exportarAExcel}
            invitados={invitados}
            matriculados={matriculados}
            onClose={() => setShowInvitados(false)}
            programa={progSeleccionado}
            setSubVistaAlumnos={setSubVistaAlumnos}
            subVistaAlumnos={subVistaAlumnos}
          />
        )}

        <FinalizarProgramaModal
          onClose={() => setProgramaAFinalizar(null)}
          onConfirm={confirmarFinalizar}
          programa={programaAFinalizar}
        />
          </>
        )}
      </main>
    </div>
  );
}

export default Coordinacion;
