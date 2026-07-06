import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  listarProgramas,
  crearPrograma,
  editarPrograma,
  cambiarEstadoPrograma,
  eliminarPrograma,
  listarCategorias,
  crearCategoria,
  eliminarCategoria,
  obtenerConfiguracionInstitucional,
  guardarConfiguracionInstitucional,
  listarHistorialCargas,
  listarAsistenciasPrograma,
  listarMatriculados,
} from "../services/coordinacionService";
import { calcularDuracionTexto, normalizarDuracionAvisoDias, fechaActualInput } from "../../../services/dateService";
import { formInicial, horarioGrupoInicial, TEMPLATES_POR_TIPO } from "../constants/coordinacionFormDefaults";
import { esCostoValido } from "../utils/coordinacionFormatters";
import { puedeVerVista, tienePermisoAsignado } from "../utils/coordinacionPermissions";
import {
  calcularRangoEdades,
  comprimirImagenAnuncio,
  esProgramaCambridge,
  esProgramaDeportivo,
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
  calcularTextoCiclosCambridge,
  obtenerDiasEntreFechas,
} from "../utils/coordinacionProgramUtils";

import useCoordinacionCarga from "./useCoordinacionCarga";
import useCoordinacionDocumentos from "./useCoordinacionDocumentos";
import useCoordinacionInvitados from "./useCoordinacionInvitados";

const sugerirNumeroDocumento = (tipoDoc, programasList = []) => {
  const anio = new Date().getFullYear();
  const prefix = tipoDoc === "Carta" ? "CAR" : "COM";
  const count = (programasList || []).filter(p => {
    const pAnio = p.fechaInicio ? new Date(p.fechaInicio).getFullYear() : anio;
    const pTipo = p.tipoDocumento || "Comunicado";
    return pTipo === tipoDoc && pAnio === anio;
  }).length;

  const correlativo = String(count + 1).padStart(3, "0");
  return `${prefix}-${correlativo}-${anio}`;
};

const tallerDepFormInicial = {
  deporte: "Vóley",
  custom: "",
  minEdad: "6",
  maxEdad: "9",
  dias: ["Jueves"],
  horaInicio: "15:50",
  horaFin: "16:50",
  cupos: "20",
  nivel: "Formativo",
  docente: "",
};

export function parseRangeTimes(rango) {
  if (!rango) return { inicio: "", fin: "" };
  const matches = rango.match(/(\d{1,2}:\d{2})/g);
  if (matches && matches.length >= 2) {
    const pad = (str) => str.split(":").map(s => s.padStart(2, "0")).join(":");
    return {
      inicio: pad(matches[0]),
      fin: pad(matches[1])
    };
  }
  const matchesHours = rango.match(/(\d{1,2})/g);
  if (matchesHours && matchesHours.length >= 2) {
    const padHour = (h) => `${h.padStart(2, "0")}:00`;
    return {
      inicio: padHour(matchesHours[0]),
      fin: padHour(matchesHours[1])
    };
  }
  return { inicio: "", fin: "" };
}

export default function useCoordinacion({
  delegatedContent,
  embedded = false,
  initialView = "programas",
  user,
}) {
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

  const setVista = (newView) => {
    if (!embedded) {
      navigate(`/coordinacion/${newView}`);
    } else if (module && delegatedModule) {
      navigate(`/${module}/delegated/${delegatedModule}/${newView}`);
    }
  };

  const [programas, setProgramas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mensaje, setMensaje] = useState("");
  const [tipoMsg, setTipoMsg] = useState("error");
  const [cargando, setCargando] = useState(false);
  const lastFetchTimeRef = useRef(0);

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [guardando, setGuardando] = useState(false);
  const [alertaConfiguracion, setAlertaConfiguracion] = useState("");
  const [nuevaCat, setNuevaCat] = useState("");
  const [catAEliminar, setCatAEliminar] = useState("");
  const [mostrarGestorCategorias, setMostrarGestorCategorias] = useState(false);

  // Estado local unificado para añadir talleres deportivos
  const [tallerDepForm, setTallerDepForm] = useState(tallerDepFormInicial);
  const [indiceTallerEditando, setIndiceTallerEditando] = useState(null);
  const [ultimoLoteId, setUltimoLoteId] = useState("");
  const [programaCargaId, setProgramaCargaId] = useState("");
  const [historialCargas, setHistorialCargas] = useState([]);
  const [configInstitucional, setConfigInstitucional] = useState({});
  const [cargandoConfigInstitucional, setCargandoConfigInstitucional] = useState(false);
  const [guardandoConfigInstitucional, setGuardandoConfigInstitucional] = useState(false);
  const [programaAFinalizar, setProgramaAFinalizar] = useState(null);
  const [programaAArchivar, setProgramaAArchivar] = useState(null);

  const [sidebarAbierta, setSidebarAbierta] = useState(() => {
    try {
      const saved = localStorage.getItem("coord_sidebar_expanded");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleSetSidebarAbierta = (val) => {
    setSidebarAbierta((prev) => {
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

  // ── Delegated Custom Hooks ──
  const carga = useCoordinacionCarga({
    puedeCargarAlumnos,
    cargaPeriodo,
    programaCargaId,
    setProgramaCargaId,
    mostrarMsg,
    cargarDatos,
    setUltimoLoteId,
  });

  const documentos = useCoordinacionDocumentos({
    puedeCrearProgramas,
    puedeEditarProgramas,
    form,
    setForm,
    actualizarForm,
    programas,
    categorias,
    mostrarMsg,
    cargarDatos,
    datosProgramaAFormulario,
    setGuardando,
  });

  const invitadosState = useCoordinacionInvitados({
    puedeVerAlumnos,
    mostrarMsg,
  });

  function datosProgramaAFormulario(prog) {
    const nombrePrograma = prog.nombre || prog.nombre_programa || "";
    const talleres = Array.isArray(prog.talleresDeportivos || prog.talleres_deportivos) 
      ? (prog.talleresDeportivos || prog.talleres_deportivos) 
      : [];
    const esVerano = normalizarPeriodoVista(prog.periodo) === "verano";
    const catLower = String(prog.categoria || "").toLowerCase();
    const esDeportivo = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(nombrePrograma, prog.categoria);
    const usaTalleresPorEdad = esVerano
      ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
      : esDeportivo;

    let cuposCalculados = prog.cupos;
    if (usaTalleresPorEdad && talleres.length > 0) {
      cuposCalculados = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
    }

    let rawGroups = prog.horariosPorGrupo || prog.horarios_por_grupo || [];
    let horariosPorGrupo = normalizarHorariosPorGrupo(rawGroups);
    if (!usaTalleresPorEdad && horariosPorGrupo.length === 0) {
      const tablaRaw = prog.tablaHorariosNivel || prog.tabla_horarios_nivel || [];
      if (Array.isArray(tablaRaw) && tablaRaw.length > 0) {
        horariosPorGrupo = tablaRaw.map((row, idx) => {
          const claseTimes = parseRangeTimes(row.horarioClase || row.horario_clase);
          const almuerzoTimes = parseRangeTimes(row.horarioAlmuerzo || row.horario_almuerzo);
          const nivel = row.nivel || "";
          const gradosNivel = (normalizarListaGrados(prog.gradosAplicables || prog.grados) || [])
            .filter(g => g.startsWith(`${nivel}:`));
          return {
            id: `grupo-migrado-tabla-${idx}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            grados: gradosNivel,
            dia: row.dia || "Lunes",
            almuerzoInicio: almuerzoTimes.inicio || "14:20",
            almuerzoFin: almuerzoTimes.fin || "15:10",
            horaInicio: claseTimes.inicio || "15:20",
            horaFin: claseTimes.fin || "17:20",
            aula: row.aula || "",
            responsable: row.responsable || "",
            tutora: row.tutora || "",
            cupos: Number(prog.cupos) || 20,
          };
        });
      } else if (prog.horaInicio && prog.horaFin) {
        const diasArray = normalizarListaTexto(prog.dias);
        horariosPorGrupo = [
          {
            id: `grupo-migrado-${Date.now()}`,
            grados: normalizarListaGrados(prog.gradosAplicables || prog.grados),
            dia: diasArray.length > 0 ? diasArray.join(", ") : "Lunes",
            almuerzoInicio: prog.almuerzoInicio || "14:20",
            almuerzoFin: prog.almuerzoFin || "15:10",
            horaInicio: prog.horaInicio,
            horaFin: prog.horaFin,
            aula: prog.aula || "",
            responsable: prog.responsable || "",
            tutora: prog.tutora || "",
            cupos: Number(prog.cupos) || 20,
          },
        ];
      }
    }

    if (!usaTalleresPorEdad && horariosPorGrupo.length > 0) {
      cuposCalculados = String(horariosPorGrupo.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0));
    }

    return {
      nombre: nombrePrograma,
      periodo: normalizarPeriodoVista(prog.periodo),
      categoria: prog.categoria,
      grupo: prog.grupo,
      grupoEtario: prog.grupoEtario || prog.grupo_etario || "",
      horario: prog.horario,
      fechaInicio: prog.fechaInicio || prog.fecha_inicio,
      gradosAplicables: normalizarListaGrados(prog.gradosAplicables || prog.grados),
      edadMinima: prog.edadMinima || prog.edad_minima || "",
      edadMaxima: prog.edadMaxima || prog.edad_maxima || "",
      fechaNacimientoDesde: prog.fechaNacimientoDesde || prog.fecha_nacimiento_desde || "",
      fechaNacimientoHasta: prog.fechaNacimientoHasta || prog.fecha_nacimiento_hasta || "",
      dias: normalizarListaTexto(prog.dias),
      horaInicio: prog.horaInicio || prog.hora_inicio || "",
      horaFin: prog.horaFin || prog.hora_fin || "",
      almuerzoInicio: prog.almuerzoInicio || prog.almuerzo_inicio || "",
      almuerzoFin: prog.almuerzoFin || prog.almuerzo_fin || "",
      horariosPorGrupo: horariosPorGrupo,
      usaHorariosPorBloque: !usaTalleresPorEdad,
      talleresDeportivos: talleres,
      fechaFin: prog.fechaFin || prog.fecha_fin,
      cicloI: prog.cicloI || "",
      cicloII: prog.cicloII || "",
      duracionAvisoDias: String(normalizarDuracionAvisoDias(prog.duracionAvisoDias || prog.duracion_aviso_dias, 7)),
      horaLimiteAviso: prog.horaLimiteAviso || prog.hora_limite_aviso || "23:59",
      cupos: String(cuposCalculados),
      costo: String(prog.costo !== undefined ? prog.costo : (prog.monto !== undefined ? prog.monto : (prog.precio !== undefined ? prog.precio : 0))),
      modalidadCobro: prog.modalidadCobro || prog.modalidad_cobro || "Unico",
      responsable: prog.responsable || prog.docente || "",
      tutora: prog.tutora || "",
      plantilla: prog.plantilla || "",
      plantillaBase64: prog.plantillaBase64 || prog.plantilla_base64 || "",
      plantillaVariables: prog.plantillaVariables || prog.plantilla_variables || [],
      plantillaValidada: Boolean(prog.plantillaValidada ?? prog.plantilla_validada),
      plantillaActualizadaEn: prog.plantillaActualizadaEn || prog.plantilla_actualizada_en || "",
      requisitos: prog.requisitos || "",
      comunicado: prog.comunicado || "",
      comunicadoCompleto: prog.comunicadoCompleto || prog.comunicado_completo || "",
      detalleCosto: prog.detalleCosto || prog.detalle_costo || "",
      detalleAlmuerzo: prog.detalleAlmuerzo || prog.detalle_almuerzo || "",
      concesionarios: prog.concesionarios || "",
      requiereUniforme: Boolean(prog.requiereUniforme ?? prog.requiere_uniforme),
      requiereIndumentaria: Boolean(prog.requiereIndumentaria ?? prog.requiere_indumentaria),
      invitacionMasiva: Boolean(prog.invitacionMasiva ?? prog.invitacion_masiva),
      alcanceInvitacionMasiva: prog.alcanceInvitacionMasiva || prog.alcance_invitacion_masiva || "colegio",
      anuncioImagen: prog.anuncioImagen || prog.anuncio_imagen || "",
      anuncioImagenNombre: prog.anuncioImagenNombre || prog.anuncio_imagen_nombre || "",
      anuncioImagenTamano: prog.anuncioImagenTamano || prog.anuncio_imagen_tamano || 0,
      anuncioImagenComprimida: Boolean(prog.anuncioImagenComprimida ?? prog.anuncio_imagen_comprimida),
      usarFechaLimiteInscripcion: Boolean(prog.usarFechaLimiteInscripcion ?? prog.usar_fecha_limite_inscripcion),
      fechaAperturaInscripcion: prog.fechaAperturaInscripcion || prog.fecha_apertura_inscripcion || "",
      horaAperturaInscripcion: prog.horaAperturaInscripcion || prog.hora_apertura_inscripcion || "",
      fechaLimiteInscripcion: prog.fechaLimiteInscripcion || prog.fecha_limite_inscripcion || "",
      horaLimiteInscripcion: prog.horaLimiteInscripcion || prog.hora_limite_inscripcion || "",
      id: prog.id,
      tipoComunicado: prog.tipoComunicado || prog.tipo_comunicado || "Otro genérico",
      tipoDocumento: prog.tipoDocumento || prog.tipo_documento || "Comunicado",
      numeroDocumento: prog.numeroDocumento || prog.numero_documento || "",
      areaTematica: prog.areaTematica || prog.area_tematica || "No aplica",
      nombreCiclo: prog.nombreCiclo || prog.nombre_ciclo || "Ciclo I",
      duracionTaller: prog.duracionTaller || prog.duracion || "",
      tablaHorariosNivel: prog.tablaHorariosNivel || prog.tabla_horarios_nivel || [],
      incluyeAlmuerzo: Boolean(prog.incluyeAlmuerzo ?? prog.incluye_almuerzo),
      horarioRecepcionAlmuerzo: prog.horarioRecepcionAlmuerzo || prog.horario_recepcion_almuerzo || "",
      nivelCambridge: prog.nivelCambridge || prog.nivel_cambridge || "",
      modalidadesCambridge: prog.modalidadesCambridge || prog.modalidades_cambridge || [],
      costoCiclo: prog.costoCiclo !== undefined ? String(prog.costoCiclo) : (prog.costo_ciclo !== undefined ? String(prog.costo_ciclo) : (prog.costo !== undefined ? String(prog.costo) : (prog.monto !== undefined ? String(prog.monto) : ""))),
      montoPrimerPago: prog.montoPrimerPago !== undefined ? String(prog.montoPrimerPago) : (prog.monto_primer_pago !== undefined ? String(prog.monto_primer_pago) : ""),
    };
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      cargarDatos();
      if (invitadosState.progSeleccionado) {
        invitadosState.refrescarAlumnosModal(invitadosState.progSeleccionado);
      }
    };
    const handleFocusUpdate = () => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 30000) {
        handleUpdate();
      }
    };
    window.addEventListener("api-db-updated", handleUpdate);
    window.addEventListener("mock-db-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleFocusUpdate);
    return () => {
      window.removeEventListener("api-db-updated", handleUpdate);
      window.removeEventListener("mock-db-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleFocusUpdate);
    };
  }, [invitadosState.progSeleccionado]);

  useEffect(() => {
    if (!embedded || !initialView) return;
    setMensaje("");
  }, [embedded, initialView]);

  useEffect(() => {
    if (vista === "registrar-programa") {
      if (queryProgId) {
        const prog = programas.find((item) => item.id === queryProgId);
        if (prog) {
          if (form.id !== queryProgId) {
            setForm(datosProgramaAFormulario(prog));
            setModoEditar(true);
          }
        }
      } else {
        if (modoEditar || form.id) {
          const numSugerido = sugerirNumeroDocumento("Comunicado", programas);
          setForm({
            ...formInicial,
            numeroDocumento: numSugerido
          });
          setModoEditar(false);
          setIndiceTallerEditando(null);
          setTallerDepForm(tallerDepFormInicial);
          documentos.setProgramaDocsId("");
          documentos.setLecturaDocumento(null);
          setAlertaConfiguracion("");
        }
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
    } catch (err) {
      mostrarMsg(err.message || "No se pudieron cargar los datos de Coordinación Académica.");
    } finally {
      setCargando(false);
      setCargandoConfigInstitucional(false);
    }
  }

  function mostrarMsg(texto, tipo = "error") {
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
      ? `Complete la configuracion del taller antes de habilitarlo. ${detalle}`
      : "Complete la configuracion del taller antes de habilitarlo.";
    setAlertaConfiguracion(texto);
    return mostrarMsg(texto);
  }

  // ── Filtrar programas ──
  function actualizarConfigInstitucionalImagen(campo, imagen) {
    setConfigInstitucional((actual) => ({
      ...(actual || {}),
      [campo]: imagen,
    }));
  }

  function quitarConfigInstitucionalImagen(campo) {
    setConfigInstitucional((actual) => ({
      ...(actual || {}),
      [campo]: null,
    }));
  }

  async function guardarConfigInstitucional() {
    setGuardandoConfigInstitucional(true);
    try {
      const guardada = await guardarConfiguracionInstitucional(configInstitucional);
      setConfigInstitucional(guardada);
      mostrarMsg("Recursos institucionales guardados correctamente.", "success");
      return true;
    } catch (err) {
      mostrarMsg(err.message || "No se pudo guardar la configuracion institucional.");
      return false;
    } finally {
      setGuardandoConfigInstitucional(false);
    }
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
    (programa) => programa.plantilla && (programa.plantillaBase64 || window.apiDb?.plantillasPorPrograma?.[programa.id]?.plantillaBase64)
  );

  function abrirCrear() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento("Comunicado", programas);
    setForm({
      ...formInicial,
      numeroDocumento: numSugerido
    });
    setModoEditar(false);
    setIndiceTallerEditando(null);
    setTallerDepForm(tallerDepFormInicial);
    documentos.setProgramaDocsId("");
    documentos.setLecturaDocumento(null);
    documentos.setPlantillaInputKey((actual) => actual + 1);
    setAlertaConfiguracion("");
    setMensaje("");
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  function abrirCrearDesdeDocumento() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento("Comunicado", programas);
    setForm((actual) => ({
      ...actual,
      id: "",
      numeroDocumento: actual.numeroDocumento || numSugerido
    }));
    setModoEditar(false);
    setIndiceTallerEditando(null);
    setTallerDepForm(tallerDepFormInicial);
    setAlertaConfiguracion("");
    setMensaje("");
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  function abrirEditar(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    setForm(datosProgramaAFormulario(prog));
    setModoEditar(true);
    setIndiceTallerEditando(null);
    const esVerano = normalizarPeriodoVista(prog.periodo) === "verano";
    setTallerDepForm({
      ...tallerDepFormInicial,
      deporte: esVerano
        ? (prog.categoria === "Talleres Deportivos" ? "Fútbol" : "Danza")
        : "Vóley"
    });
    documentos.setProgramaDocsId("");
    documentos.setLecturaDocumento(null);
    documentos.setPlantillaInputKey((actual) => actual + 1);
    setAlertaConfiguracion("");
    setMensaje("");
    if (!embedded) {
      navigate(`/coordinacion/registrar-programa?id=${prog.id}`);
    } else {
      setShowModal(true);
    }
  }

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
    const esDeportivoGuardar = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(form.nombre, form.categoria);
    const esMaratonGuardar = catLower === "maraton" || catLower === "maratón";
    const usaTalleresPorEdad = esVeranoGuardar
      ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
      : esDeportivoGuardar;

    const talleres = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    if (usaTalleresPorEdad && talleres.length === 0) {
      return mostrarAlertaConfiguracion(
        esVeranoGuardar ? "Revise: talleres de verano, edades y horarios." : "Revise: talleres deportivos, edades y horarios."
      );
    }

    const gruposHorario = usaTalleresPorEdad || esMaratonGuardar ? [] : normalizarHorariosPorGrupo(form.horariosPorGrupo);
    const usaHorariosPorBloqueGuardar = !usaTalleresPorEdad && !esMaratonGuardar;

    let gradosFinales = [];
    if (usaTalleresPorEdad) {
      gradosFinales = obtenerGradosDeportivos(talleres);
    } else if (gruposHorario.length > 0) {
      gradosFinales = obtenerGradosFinales(form.gradosAplicables, gruposHorario);
    } else if (form.invitacionMasiva && form.alcanceInvitacionMasiva && ["inicial", "primaria", "secundaria", "colegio", "todos"].includes(form.alcanceInvitacionMasiva.toLowerCase())) {
      const alcanceLower = form.alcanceInvitacionMasiva.toLowerCase();
      if (alcanceLower === "inicial") {
        gradosFinales = ["Inicial:3 años", "Inicial:4 años", "Inicial:5 años"];
      } else if (alcanceLower === "primaria") {
        gradosFinales = ["Primaria:1", "Primaria:2", "Primaria:3", "Primaria:4", "Primaria:5", "Primaria:6"];
      } else if (alcanceLower === "secundaria") {
        gradosFinales = ["Secundaria:1", "Secundaria:2", "Secundaria:3", "Secundaria:4", "Secundaria:5"];
      } else if (alcanceLower === "colegio" || alcanceLower === "todos") {
        gradosFinales = [
          "Inicial:3 años", "Inicial:4 años", "Inicial:5 años",
          "Primaria:1", "Primaria:2", "Primaria:3", "Primaria:4", "Primaria:5", "Primaria:6",
          "Secundaria:1", "Secundaria:2", "Secundaria:3", "Secundaria:4", "Secundaria:5"
        ];
      }
    } else if (esMaratonGuardar) {
      gradosFinales = normalizarListaGrados(form.gradosAplicables);
    } else {
      gradosFinales = obtenerGradosFinales(form.gradosAplicables, gruposHorario);
    }

    let diasFinales = [];
    if (usaTalleresPorEdad) {
      const todosDias = talleres.flatMap((t) => String(t.dia || "").split(",").map(d => d.trim()).filter(Boolean));
      diasFinales = Array.from(new Set(todosDias));
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
    if (esCambridgeGuardar && !String(form.responsable || "").trim()) camposFaltantes.push("docente/profesor responsable");
    if (esMaratonGuardar) {
      if (!form.horaInicio || !form.horaFin) camposFaltantes.push("horario");
    } else if (esVeranoGuardar && usaTalleresPorEdad) {
      if (diasFinales.length === 0) camposFaltantes.push("dias de atencion");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && !usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (diasFinales.length === 0) camposFaltantes.push("dias del programa");
      if (!form.horaInicio || !form.horaFin) camposFaltantes.push("horario");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (form.tipoComunicado === "Otro genérico") {
        camposFaltantes.push("bloques por grado");
      }
    }

    if (!esCambridgeGuardar && form.tipoComunicado && form.tipoComunicado !== "Otro genérico") {
      if (gruposHorario.length === 0) {
        camposFaltantes.push("horarios por grado/bloque/docente");
      }
    }

    if (camposFaltantes.length > 0) {
      return mostrarAlertaConfiguracion(`Revise: ${camposFaltantes.join(", ")}.`);
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && gradosFinales.length === 0) {
      return mostrarAlertaConfiguracion("Revise: grados aplicables.");
    }
    if (esVeranoGuardar && usaTalleresPorEdad && diasFinales.length === 0) {
      return mostrarAlertaConfiguracion("Revise: seleccione al menos 1 dia de atencion para verano.");
    }

    if (esMaratonGuardar) {
      if (form.horaInicio >= form.horaFin) {
        return mostrarMsg("La hora de inicio de la maratón debe ser menor a la hora de fin.");
      }
    }

    if (esCambridgeGuardar) {
      if (diasFinales.length === 0) return mostrarMsg("Seleccione los días de clase del programa Cambridge.");
      if (!form.horaInicio || !form.horaFin) return mostrarMsg("Seleccione hora de inicio y fin del programa Cambridge.");
      if (form.horaInicio >= form.horaFin) return mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
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
      const grupoInvalido = gruposHorario.find(
        (grupo) =>
          grupo.grados.length === 0 || !grupo.dia || !grupo.horaInicio || !grupo.horaFin || grupo.horaInicio >= grupo.horaFin
      );
      if (grupoInvalido)
        return mostrarAlertaConfiguracion("Revise los grupos por dia: cada grupo debe tener grados, dia y hora valida.");
      const grupoAlmuerzoInvalido = gruposHorario.find(
        (grupo) =>
          (grupo.almuerzoInicio && !grupo.almuerzoFin) ||
          (!grupo.almuerzoInicio && grupo.almuerzoFin) ||
          (grupo.almuerzoInicio && grupo.almuerzoFin && grupo.almuerzoInicio >= grupo.almuerzoFin)
      );
      if (grupoAlmuerzoInvalido) return mostrarAlertaConfiguracion("Revise los grupos por grado: complete horarios de almuerzo validos.");
      const grupoSinDocente = gruposHorario.find((grupo) => !grupo.responsable);
      if (grupoSinDocente)
        return mostrarAlertaConfiguracion("Revise los grupos por grado: cada grupo debe tener docente o tutor responsable.");
    }

    if (!form.fechaInicio || !form.fechaFin) return mostrarAlertaConfiguracion("Revise: fechas de inicio y fin.");
    if (form.fechaInicio > form.fechaFin) return mostrarMsg("La fecha de inicio no puede ser mayor a la de fin.");
    const duracionAvisoDiasVal = normalizarDuracionAvisoDias(form.duracionAvisoDias, 7);
    if (String(duracionAvisoDiasVal) !== String(form.duracionAvisoDias)) {
      return mostrarMsg("El aviso de inscripción puede durar de 1 a 7 días como máximo.");
    }
    if (!form.cupos || Number(form.cupos) <= 0) return mostrarAlertaConfiguracion("Revise: cupos.");
    if (!esCostoValido(form.costo)) return mostrarMsg("Ingrese un costo válido en soles, con máximo dos decimales.");
    if (!form.modalidadCobro) return mostrarAlertaConfiguracion("Revise: modalidad de cobro.");
    if (form.modalidadCobro === "Mensual") return mostrarMsg("La modalidad \"Cuota mensual\" no está disponible todavía. Seleccione \"Pago único\".");
    if (form.plantilla && !form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    const ciclosCambridgeGuardar = calcularTextoCiclosCambridge(form.fechaInicio, form.fechaFin);
    const edadesTalleres = talleres.flatMap((taller) => [Number(taller.edadMinima), Number(taller.edadMaxima)]).filter(Number.isFinite);
    const edadMinimaVerano = edadesTalleres.length ? Math.min(...edadesTalleres) : "";
    const edadMaximaVerano = edadesTalleres.length ? Math.max(...edadesTalleres) : "";
    const datosGuardar = {
      ...form,
      modalidadCobro: form.modalidadCobro,
      responsable: usaTalleresPorEdad
        ? Array.from(new Set(talleres.map((t) => t.docente).filter(Boolean))).join(" · ") || form.responsable
        : gruposHorario.length > 0
        ? resumenResponsablesPorGrupo(gruposHorario, form.responsable)
        : (form.tablaHorariosNivel && form.tablaHorariosNivel.length > 0)
        ? resumenResponsablesPorGrupo(form.tablaHorariosNivel, form.responsable)
        : form.responsable,
      tutora: gruposHorario.length > 0
        ? resumenTutoraPorGrupo(gruposHorario, form.tutora)
        : (form.tablaHorariosNivel && form.tablaHorariosNivel.length > 0)
        ? resumenTutoraPorGrupo(form.tablaHorariosNivel, form.tutora)
        : form.tutora,
      costo: Number(form.costo).toFixed(2),
      gradosAplicables: esCambridgeGuardar ? [] : gradosFinales,
      edadMinima: usaTalleresPorEdad ? edadMinimaVerano : "",
      edadMaxima: usaTalleresPorEdad ? edadMaximaVerano : "",
      fechaNacimientoDesde: "",
      fechaNacimientoHasta: "",
      duracionTaller: calcularDuracionTexto(form.fechaInicio, form.fechaFin),
      cicloI: esCambridgeForm ? ciclosCambridgeGuardar.cicloI : form.cicloI || "",
      cicloII: esCambridgeForm ? ciclosCambridgeGuardar.cicloII : form.cicloII || "",
      modalidadesCambridge: [],
      duracionAvisoDias: duracionAvisoDiasVal,
      dias: diasFinales,
      horariosPorGrupo: gruposHorario,
      usaHorariosPorBloque: gruposHorario.length > 0,
      grupo: esCambridgeForm
        ? "Asignado por Excel"
        : usaTalleresPorEdad
        ? resumenGrupoDeportivo(talleres)
        : resumenGrados(gradosFinales),
      grupoEtario: usaTalleresPorEdad ? `Edades ${edadMinimaVerano} a ${edadMaximaVerano} anios` : "",
      requiereUniforme: false,
      requiereIndumentaria: Boolean(form.requiereIndumentaria),
      invitacionMasiva: esCambridgeGuardar ? false : Boolean(form.invitacionMasiva),
      alcanceInvitacionMasiva: !esCambridgeGuardar && form.invitacionMasiva ? form.alcanceInvitacionMasiva || "colegio" : "",
      anuncioImagen: !esCambridgeGuardar && form.invitacionMasiva ? form.anuncioImagen : "",
      anuncioImagenNombre: !esCambridgeGuardar && form.invitacionMasiva ? form.anuncioImagenNombre : "",
      anuncioImagenTamano: !esCambridgeGuardar && form.invitacionMasiva ? form.anuncioImagenTamano : 0,
      anuncioImagenComprimida: !esCambridgeGuardar && form.invitacionMasiva ? Boolean(form.anuncioImagenComprimida) : false,
      horario: esCambridgeForm
        ? (diasFinales.length && form.horaInicio && form.horaFin
            ? resumenHorario(diasFinales, form.horaInicio, form.horaFin)
            : "Asignado por carga Excel")
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

        // Limpiar el formulario y el estado del documento subido
        setForm(formInicial);
        documentos.setLecturaDocumento(null);
        documentos.setProgramaDocsId("");
        documentos.setPlantillaInputKey((actual) => actual + 1);

        if (!embedded) {
          navigate("/coordinacion/programas");
        }
      } else {
        const nuevoPrograma = await crearPrograma(datosGuardar);
        mostrarMsg("Programa creado correctamente.", "success");
        setProgramas((actuales) => [...actuales, nuevoPrograma]);
        setShowModal(false);

        // Limpiar el formulario y el estado del documento subido
        setForm(formInicial);
        documentos.setLecturaDocumento(null);
        documentos.setProgramaDocsId("");
        documentos.setPlantillaInputKey((actual) => actual + 1);

        if (!embedded) {
          navigate("/coordinacion/programas");
        }
      }
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

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
      mostrarMsg(`Programa "${prog.nombre}" finalizado. La inscripción se ha cerrado. Puede clonarlo para un nuevo ciclo.`, "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message || "No se pudo finalizar el programa.");
    }
  }

  async function eliminarCurso(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para archivar programas.");
    setProgramaAArchivar(prog);
  }

  async function confirmarArchivar() {
    if (!programaAArchivar) return;
    const prog = programaAArchivar;
    setProgramaAArchivar(null);
    try {
      await eliminarPrograma(prog.id);
      mostrarMsg("Programa archivado correctamente.", "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  async function restaurarPrograma(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para restaurar programas.");
    try {
      await cambiarEstadoPrograma(prog.id, "Deshabilitado");
      mostrarMsg(`Programa "${prog.nombre}" restaurado como Deshabilitado.`, "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message || "No se pudo restaurar el programa.");
    }
  }

  function clonarPrograma(prog) {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento(prog.tipoDocumento || "Comunicado", programas);
    const datos = datosProgramaAFormulario(prog);

    // Deep-clean talleres deportivos: reset occupied slots and assign fresh IDs
    if (Array.isArray(datos.talleresDeportivos)) {
      datos.talleresDeportivos = datos.talleresDeportivos.map((t, idx) => ({
        ...t,
        id: `taller-clon-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 6)}`,
        cuposOcupados: 0,
      }));
    }

    // Deep-clean horarios por grupo: assign fresh IDs and reset any occupied count
    if (Array.isArray(datos.horariosPorGrupo)) {
      datos.horariosPorGrupo = datos.horariosPorGrupo.map((g, idx) => ({
        ...g,
        id: `grupo-clon-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 6)}`,
        cuposOcupados: 0,
      }));
    }

    setForm({
      ...datos,
      id: "",
      fechaInicio: fechaActualInput(),
      fechaFin: fechaActualInput(),
      cuposOcupados: 0,
      estado: "Deshabilitado",
      numeroDocumento: numSugerido
    });
    setModoEditar(false);
    documentos.setProgramaDocsId("");
    documentos.setLecturaDocumento(null);
    documentos.setPlantillaInputKey((actual) => actual + 1);
    setAlertaConfiguracion("");
    setMensaje("");
    mostrarMsg(`Datos del taller "${prog.nombre}" clonados. Asigne las nuevas fechas y guarde.`, "success");
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  async function agregarCategoria() {
    if (!nuevaCat.trim()) return;
    try {
      await crearCategoria(nuevaCat.trim());
      const cats = await listarCategorias();
      setCategorias(cats);
      setForm((f) => ({ ...f, categoria: nuevaCat.trim() }));
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
      setForm((f) => ({ ...f, categoria: f.categoria === catAEliminar ? "" : f.categoria }));
      setCatAEliminar("");
      mostrarMsg("Categoría quitada correctamente.", "success");
    } catch (err) {
      mostrarMsg(err.message);
    }
  }

  function actualizarForm(campo, valor) {
    if (typeof campo === "object" && campo !== null) {
      setForm((f) => ({ ...f, ...campo }));
    } else {
      setForm((f) => ({ ...f, [campo]: valor }));
    }
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

  const iniciarEdicionTaller = (index) => {
    const lista = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const taller = lista[index];
    if (!taller) return;

    setIndiceTallerEditando(index);

    const deportesPorDefecto = normalizarPeriodoVista(form.periodo) === "verano"
      ? (form.categoria === "Talleres Deportivos"
          ? ["Fútbol", "Vóley", "Básquet"]
          : ["Danza", "Mini Chef", "Pintura", "Teatro", "Inglés", "Zancos", "Artes plásticas"])
      : ["Vóley", "Fútbol", "Básquet"];

    const esOtro = !deportesPorDefecto.includes(taller.deporte);

    setTallerDepForm({
      deporte: esOtro ? "Otro" : taller.deporte,
      custom: esOtro ? taller.deporte : "",
      minEdad: String(taller.edadMinima),
      maxEdad: String(taller.edadMaxima),
      dias: String(taller.dia || "").split(",").map(d => d.trim()).filter(Boolean),
      horaInicio: taller.horaInicio,
      horaFin: taller.horaFin,
      cupos: String(taller.cupos || 20),
      nivel: taller.nivel || "Formativo",
      docente: taller.docente || "",
    });
  };

  const cancelarEdicionTaller = () => {
    setIndiceTallerEditando(null);
    setTallerDepForm({
      ...tallerDepFormInicial,
      deporte: normalizarPeriodoVista(form.periodo) === "verano"
        ? (form.categoria === "Talleres Deportivos" ? "Fútbol" : "Danza")
        : "Vóley"
    });
  };

  const agregarTallerDeportivo = () => {
    const deporteFinal = tallerDepForm.deporte === "Otro" ? tallerDepForm.custom.trim() : tallerDepForm.deporte;
    if (!deporteFinal) {
      mostrarMsg("Ingrese el nombre del deporte.");
      return;
    }
    const minE = Number(tallerDepForm.minEdad);
    const maxE = Number(tallerDepForm.maxEdad);
    if (!tallerDepForm.minEdad || !tallerDepForm.maxEdad || minE > maxE) {
      mostrarMsg("Rango de edades inválido.");
      return;
    }
    if (!tallerDepForm.horaInicio || !tallerDepForm.horaFin) {
      mostrarMsg("Ingrese las horas de inicio y fin.");
      return;
    }
    if (tallerDepForm.horaInicio >= tallerDepForm.horaFin) {
      mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      return;
    }
    const cuposTaller = Number(tallerDepForm.cupos);
    if (Number.isNaN(cuposTaller) || cuposTaller <= 0) {
      mostrarMsg("Ingrese un número de cupos válido para el taller.");
      return;
    }
    const docenteFinal = tallerDepForm.docente.trim();
    if (!docenteFinal) {
      mostrarMsg("Ingrese el tutor o docente a cargo del taller.");
      return;
    }
    if (!tallerDepForm.dias || tallerDepForm.dias.length === 0) {
      mostrarMsg("Seleccione al menos un día de atención.");
      return;
    }

    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    let nuevaLista;
    if (indiceTallerEditando !== null) {
      const nuevoTaller = {
        deporte: deporteFinal,
        edadMinima: minE,
        edadMaxima: maxE,
        dia: tallerDepForm.dias.join(", "),
        horaInicio: tallerDepForm.horaInicio,
        horaFin: tallerDepForm.horaFin,
        cupos: cuposTaller,
        nivel: tallerDepForm.nivel,
        docente: docenteFinal,
      };
      nuevaLista = listaActual.map((taller, idx) => idx === indiceTallerEditando ? nuevoTaller : taller);
    } else {
      const nuevoTaller = {
        deporte: deporteFinal,
        edadMinima: minE,
        edadMaxima: maxE,
        dia: tallerDepForm.dias.join(", "),
        horaInicio: tallerDepForm.horaInicio,
        horaFin: tallerDepForm.horaFin,
        cupos: cuposTaller,
        nivel: tallerDepForm.nivel,
        docente: docenteFinal,
      };
      nuevaLista = [...listaActual, nuevoTaller];
    }
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm((prev) => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));

    setIndiceTallerEditando(null);

    setTallerDepForm((prev) => ({
      ...prev,
      custom: "",
      cupos: "20",
      nivel: "Formativo",
      docente: "",
      dias: ["Jueves"],
    }));
  };

  const quitarTallerDeportivo = (index) => {
    const listaActual = Array.isArray(form.talleresDeportivos) ? form.talleresDeportivos : [];
    const nuevaLista = listaActual.filter((_, idx) => idx !== index);
    const totalCupos = nuevaLista.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0);

    setForm((prev) => ({
      ...prev,
      talleresDeportivos: nuevaLista,
      cupos: String(totalCupos),
    }));

    if (indiceTallerEditando === index) {
      setIndiceTallerEditando(null);
      setTallerDepForm((prev) => ({
        ...prev,
        custom: "",
        cupos: "20",
        nivel: "Formativo",
        docente: "",
      }));
    } else if (indiceTallerEditando > index) {
      setIndiceTallerEditando((prev) => prev - 1);
    }
  };

  function actualizarNombrePrograma(valor) {
    setForm((actual) => {
      const esVerano = normalizarPeriodoVista(actual.periodo) === "verano";
      const catLower = String(actual.categoria || "").toLowerCase();
      const catClean = catLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esAcademicoLocal = catClean.includes("academico") || catClean.includes("reforzamiento") || catClean.includes("tareas") || catClean === "vacaciones utiles";
      const esDeportivo = catClean === "deportivo" || catClean === "talleres deportivos" || esProgramaDeportivo(valor, actual.categoria);
      const usaTalleresPorEdad = esVerano
        ? !esAcademicoLocal
        : esDeportivo;
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
      const catClean = catLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esAcademico = catClean.includes("academico") || catClean.includes("reforzamiento") || catClean.includes("tareas") || catClean === "vacaciones utiles";

      const esDeportivo = catClean === "deportivo" || catClean === "talleres deportivos" || esProgramaDeportivo(actual.nombre, valor);
      const usaTalleresPorEdad = esVerano ? !esAcademico : esDeportivo;
      const talleres = Array.isArray(actual.talleresDeportivos) ? actual.talleresDeportivos : [];
      let nuevosCupos = actual.cupos;
      if (usaTalleresPorEdad && talleres.length > 0) {
        nuevosCupos = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
      }

      let nuevosCamposAcademico = {};
      if (esAcademico) {
        let sugeridoTipo = actual.tipoComunicado || "Otro genérico";
        if (sugeridoTipo === "Otro genérico") {
          if (catClean.includes("reforzamiento") || catClean.includes("circulo")) {
            sugeridoTipo = "Reforzamiento (Circular)";
          } else if (catClean.includes("tareas") || catClean.includes("club")) {
            sugeridoTipo = "Club de Tareas";
          } else if (catClean.includes("cambridge") || catClean.includes("ingles")) {
            sugeridoTipo = "Cambridge";
          }
        }

        if (sugeridoTipo !== actual.tipoComunicado) {
          const template = TEMPLATES_POR_TIPO[sugeridoTipo] || { comunicado: "", requisitos: "" };
          const tipoDocSugerido = (sugeridoTipo === "Cambridge" || sugeridoTipo === "Certificación Cambridge") ? "Carta" : "Comunicado";
          const numDocSugerido = sugerirNumeroDocumento(tipoDocSugerido, programas);
          nuevosCamposAcademico = {
            tipoComunicado: sugeridoTipo,
            comunicado: "",
            comunicadoCompleto: "",
            requisitos: "",
            tipoDocumento: tipoDocSugerido,
            numeroDocumento: numDocSugerido,
          };
        }
      }

      const reseteosCircular = (!esAcademico) ? {
        tipoComunicado: "Otro genérico",
        tipoDocumento: "Comunicado",
        numeroDocumento: "",
        areaTematica: "No aplica",
        nombreCiclo: "Ciclo I",
        duracionTaller: "",
        tablaHorariosNivel: [],
        incluyeAlmuerzo: false,
        horarioRecepcionAlmuerzo: "",
        nivelCambridge: "",
        modalidadesCambridge: [],
        montoPrimerPago: "",
        comunicado: "",
        comunicadoCompleto: "",
        requisitos: "",
      } : {};

      return {
        ...actual,
        ...reseteosCircular,
        ...nuevosCamposAcademico,
        categoria: valor,
        cupos: nuevosCupos,
        requiereIndumentaria: esDeportivo ? actual.requiereIndumentaria : false,
      };
    });

    const esVerano = normalizarPeriodoVista(form.periodo) === "verano";
    if (esVerano) {
      setTallerDepForm(prev => ({
        ...prev,
        deporte: valor === "Talleres Deportivos" ? "Fútbol" : "Danza"
      }));
    }
  }

  function actualizarCosto(valor) {
    const limpio = valor.replace(",", ".").replace(/[^\d.]/g, "");
    const partes = limpio.split(".");
    const normalizado = partes.length > 1 ? `${partes[0]}.${partes.slice(1).join("").slice(0, 2)}` : partes[0];

    setForm((f) => ({ ...f, costo: normalizado }));
  }

  function formatearCostoFormulario() {
    if (form.costo === "") return;
    const numero = Number(form.costo);
    setForm((f) => ({ ...f, costo: Number.isFinite(numero) ? numero.toFixed(2) : "" }));
  }

  function cambiarPeriodoFormulario(valor) {
    const periodoNormalizado = normalizarPeriodoVista(valor);

    let nuevaCategoria = form.categoria;
    const catLowerNew = String(form.categoria || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (periodoNormalizado === "verano") {
      const esCatVerano = [
        "vacaciones utiles",
        "talleres recreativos",
        "talleres deportivos"
      ].includes(catLowerNew);
      if (!esCatVerano) {
        nuevaCategoria = "";
      }
    } else {
      const esCatVerano = [
        "vacaciones utiles",
        "talleres recreativos",
        "talleres deportivos",
        "deportivos",
        "taller recreativo",
        "vacaciones"
      ].includes(catLowerNew);
      if (esCatVerano) {
        nuevaCategoria = "";
      }
    }

    const catLowerFinal = String(nuevaCategoria || "").toLowerCase();
    const esDeportivo = catLowerFinal === "deportivo" || catLowerFinal === "talleres deportivos" || esProgramaDeportivo(form.nombre, nuevaCategoria);
    const usaTalleresPorEdad =
      periodoNormalizado === "verano"
        ? catLowerFinal !== "academico" && catLowerFinal !== "académico" && catLowerFinal !== "vacaciones utiles" && catLowerFinal !== "vacaciones útiles"
        : esDeportivo;

    if (periodoNormalizado === "verano") {
      setTallerDepForm((prev) => ({ ...prev, deporte: nuevaCategoria === "Talleres Deportivos" ? "Fútbol" : "Danza" }));
    } else {
      setTallerDepForm((prev) => {
        if (!["Vóley", "Fútbol", "Básquet", "Otro"].includes(prev.deporte)) {
          return { ...prev, deporte: "Vóley" };
        }
        return prev;
      });
    }
    setForm((f) => ({
      ...f,
      periodo: periodoNormalizado,
      categoria: nuevaCategoria,
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
    setForm((f) => {
      const yaExiste = normalizarListaGrados(f.gradosAplicables).includes(valor);
      const nuevosGrados = yaExiste
        ? normalizarListaGrados(f.gradosAplicables).filter((item) => item !== valor)
        : [...normalizarListaGrados(f.gradosAplicables), valor];

      let nuevosGrupos = f.horariosPorGrupo;
      if (yaExiste && Array.isArray(f.horariosPorGrupo)) {
        nuevosGrupos = f.horariosPorGrupo.map((grupo) => ({
          ...grupo,
          grados: normalizarListaGrados(grupo.grados).filter((item) => item !== valor),
        }));
      }

      let nuevaTabla = Array.isArray(f.tablaHorariosNivel) ? [...f.tablaHorariosNivel] : [];
      const [nivel] = valor.split(":");
      if (nivel) {
        const hasGradesForNivel = nuevosGrados.some((g) => g.startsWith(`${nivel}:`));
        const hasRowForNivel = nuevaTabla.some((row) => row.nivel === nivel);
        if (hasGradesForNivel && !hasRowForNivel) {
          nuevaTabla.push({ nivel, dia: "", horarioAlmuerzo: "", horarioClase: "" });
        } else if (!hasGradesForNivel && hasRowForNivel) {
          nuevaTabla = nuevaTabla.filter((row) => row.nivel !== nivel);
        }
      }

      return {
        ...f,
        gradosAplicables: nuevosGrados,
        horariosPorGrupo: nuevosGrupos,
        tablaHorariosNivel: nuevaTabla,
      };
    });
  }

  function toggleDia(valor) {
    setForm((f) => {
      const actuales = normalizarListaTexto(f.dias);
      const yaExiste = actuales.includes(valor);
      const catLower = String(f.categoria || "").toLowerCase();
      const esDeportivo = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(f.nombre, f.categoria);
      const usaTalleresPorEdad =
        normalizarPeriodoVista(f.periodo) === "verano"
          ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
          : esDeportivo;
      if (!yaExiste && normalizarPeriodoVista(f.periodo) === "verano" && usaTalleresPorEdad && actuales.length >= 7) {
        mostrarMsg("El taller de verano no puede exceder los 7 dias de atencion.");
        return f;
      }
      return {
        ...f,
        dias: yaExiste ? actuales.filter((item) => item !== valor) : [...actuales, valor],
      };
    });
  }

  function agregarGrupoHorario(grupo = horarioGrupoInicial) {
    setForm((actual) => {
      const nuevaLista = [...(Array.isArray(actual.horariosPorGrupo) ? actual.horariosPorGrupo : []), { ...grupo, id: grupo.id || `grupo-${Date.now()}` }];
      const totalCupos = nuevaLista.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0);
      return {
        ...actual,
        usaHorariosPorBloque: true,
        gradosAplicables: normalizarListaGrados([...normalizarListaGrados(actual.gradosAplicables), ...normalizarListaGrados(grupo.grados)]),
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
          grados: grados.includes(valor) ? grados.filter((item) => item !== valor) : [...grados, valor],
        };
      }),
    }));
  }

  // Computed Values
  const vistasDisponibles = vistasNav.filter((item) => puedeVerVista(user, item));
  const vistaActualDisponible = vistasDisponibles.some((item) => item.id === vista);
  const puedeVerProgramasVista = vistasDisponibles.some((item) => item.id === "programas");
  const puedeVerCargaVista = vistasDisponibles.some((item) => item.id === "carga");
  const puedeVerDocumentosVista = vistasDisponibles.some((item) => item.id === "documentos");
  const puedeVerAsistenciasVista = vistasDisponibles.some((item) => item.id === "asistencias");

  const formGradosAplicables = normalizarListaGrados(form.gradosAplicables);
  const formDias = normalizarListaTexto(form.dias);
  const formHorariosPorGrupo = Array.isArray(form.horariosPorGrupo) ? form.horariosPorGrupo : [];
  const esFormularioVerano = normalizarPeriodoVista(form.periodo) === "verano";
  const esDeportivoForm =
    String(form.categoria || "").toLowerCase() === "deportivo" || String(form.categoria || "").toLowerCase() === "talleres deportivos" || esProgramaDeportivo(form.nombre, form.categoria);
  const esCambridgeForm = esProgramaCambridge(form);

  const ciclosCambridgeFormulario = calcularTextoCiclosCambridge(form.fechaInicio, form.fechaFin);
  const catLower = String(form.categoria || "").toLowerCase();
  const usaTalleresPorEdad = esFormularioVerano
    ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
    : esDeportivoForm;
  const duracionTallerFormulario = calcularDuracionTexto(form.fechaInicio, form.fechaFin);
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
    form,
    setForm,
    guardando,
    tallerDepForm,
    setTallerDepForm,
    indiceTallerEditando,
    alertaConfiguracion,
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

    // Carga Excel Sub-hook delegates
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

    // Main hooks and methods
    cargarDatos,
    mostrarMsg,
    mostrarAlertaConfiguracion,
    actualizarConfigInstitucionalImagen,
    quitarConfigInstitucionalImagen,
    guardarConfigInstitucional,
    abrirCrear,
    abrirCrearDesdeDocumento,
    abrirEditar,
    guardar,
    toggleEstado,
    finalizarPrograma,
    confirmarFinalizar,
    confirmarArchivar,
    eliminarCurso,
    agregarCategoria,
    quitarCategoria,
    actualizarForm,
    actualizarInvitacionMasiva,
    seleccionarImagenAnuncio,
    quitarImagenAnuncio,
    agregarTallerDeportivo,
    quitarTallerDeportivo,
    iniciarEdicionTaller,
    cancelarEdicionTaller,
    actualizarNombrePrograma,
    actualizarCategoriaPrograma,
    actualizarCosto,
    formatearCostoFormulario,
    cambiarPeriodoFormulario,
    actualizarFechaNacimientoVerano,
    toggleGrado,
    toggleDia,
    agregarGrupoHorario,
    quitarGrupoHorario,
    actualizarGrupoHorario,
    toggleGradoGrupo,
    restaurarPrograma,
    clonarPrograma,
    listarAsistenciasPrograma,
    listarMatriculados,

    // Computed
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
    label: "Gestion de Programas",
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
