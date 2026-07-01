import { useState, useMemo } from "react";
import {
  crearPrograma,
  editarPrograma,
  cambiarEstadoPrograma,
  eliminarPrograma
} from "../../services/coordinacionService";
import { calcularDuracionTexto, normalizarDuracionAvisoDias, fechaActualInput } from "../../../../services/dateService";
import { tienePermisoAsignado } from "../../utils/coordinacionPermissions";
import {
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
} from "../../utils/coordinacionProgramUtils";
import { esCostoValido } from "../../utils/coordinacionFormatters";

/**
 * Genera un código correlativo sugerido para el número de documento de la circular o comunicado.
 */
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

/**
 * Hook para manejar las acciones CRUD y ciclo de vida de los talleres extracurriculares.
 * 
 * @param {Object} params Parámetros de inicialización.
 * @param {Object} params.user Objeto del usuario autenticado.
 * @param {boolean} params.embedded Indica si la vista está incrustada en un modal o en pantalla completa.
 * @param {Array} params.categorias Lista de categorías disponibles.
 * @param {Function} params.mostrarMsg Callback para alertas toast.
 * @param {Function} params.cargarDatos Callback para refrescar los datos globales.
 * @param {Function} params.navigate Función de enrutamiento.
 * @param {Function} params.onAbrirFormulario Callback para limpiar el estado de documentos.
 * @param {Object} params.formState Estado y manejadores expuestos por el hook useCoordinacionProgramasForm.
 */
export default function useCoordinacionProgramasCrud({
  user,
  embedded,
  categorias,
  mostrarMsg,
  cargarDatos,
  navigate,
  onAbrirFormulario,
  formState
}) {
  const [programas, setProgramas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [programaAFinalizar, setProgramaAFinalizar] = useState(null);
  const [programaAArchivar, setProgramaAArchivar] = useState(null);

  // Filtros de búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // --- CÁLCULO DE PERMISOS BASADO EN ROLES ---
  const puedeCrearProgramas = tienePermisoAsignado(user, "coordinacion.programas.crear");
  const puedeEditarProgramas = tienePermisoAsignado(user, "coordinacion.programas.editar");
  const puedeCrearGrupos = tienePermisoAsignado(user, "coordinacion.grupos.crear");
  const puedeEditarGrupos = tienePermisoAsignado(user, "coordinacion.grupos.editar");
  const puedeVerAlumnos = tienePermisoAsignado(user, "coordinacion.alumnos.ver");
  const puedeCargarAlumnos = tienePermisoAsignado(user, "coordinacion.carga.confirmar");
  const puedeGestionarGruposFormulario = puedeCrearGrupos || puedeEditarGrupos;
  const tieneAccionesPrograma = puedeEditarProgramas || puedeVerAlumnos;

  const modoEditar = Boolean(formState.form.id);

  /**
   * Transforma un objeto de programa de BD a los campos planos del formulario.
   */
  function datosProgramaAFormulario(prog) {
    const talleres = Array.isArray(prog.talleresDeportivos) ? prog.talleresDeportivos : [];
    const esVerano = normalizarPeriodoVista(prog.periodo) === "verano";
    const catLower = String(prog.categoria || "").toLowerCase();
    const esDeportivo = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(prog.nombre, prog.categoria);
    const usaTalleresPorEdad = esVerano
      ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
      : esDeportivo;

    let cuposCalculados = prog.cupos;
    if (usaTalleresPorEdad && talleres.length > 0) {
      cuposCalculados = String(talleres.reduce((sum, t) => sum + (Number(t.cupos) || 20), 0));
    }

    let horariosPorGrupo = normalizarHorariosPorGrupo(prog.horariosPorGrupo);
    if (!usaTalleresPorEdad && horariosPorGrupo.length === 0) {
      if (Array.isArray(prog.tablaHorariosNivel) && prog.tablaHorariosNivel.length > 0) {
        horariosPorGrupo = prog.tablaHorariosNivel.map((row, idx) => {
          const claseTimes = parseRangeTimes(row.horarioClase);
          const almuerzoTimes = parseRangeTimes(row.horarioAlmuerzo);
          const nivel = row.nivel || "";
          const gradosNivel = (normalizarListaGrados(prog.gradosAplicables) || [])
            .filter(g => g.startsWith(`${nivel}:`));
          return {
            id: `grupo-migrado-tabla-${idx}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            grados: gradosNivel,
            dia: row.dia || "Lunes",
            almuerzoInicio: almuerzoTimes.inicio || "14:20",
            almuerzoFin: almuerzoTimes.fin || "15:10",
            horaInicio: claseTimes.inicio || "15:20",
            horaFin: claseTimes.fin || "17:20",
            aula: "",
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
          },
        ];
      }
    }

    if (!usaTalleresPorEdad && horariosPorGrupo.length > 0) {
      cuposCalculados = String(horariosPorGrupo.reduce((sum, g) => sum + (Number(g.cupos) || 20), 0));
    }

    return {
      nombre: prog.nombre,
      periodo: normalizarPeriodoVista(prog.periodo),
      categoria: prog.categoria,
      grupo: prog.grupo,
      grupoEtario: prog.grupoEtario || "",
      horario: prog.horario,
      fechaInicio: prog.fechaInicio,
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
      cupos: String(cuposCalculados),
      costo: String(prog.costo),
      modalidadCobro: prog.modalidadCobro,
      responsable: prog.responsable,
      tutora: prog.tutora,
      plantilla: prog.plantilla || "",
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
      requiereUniforme: Boolean(prog.requiereUniforme),
      requiereIndumentaria: Boolean(prog.requiereIndumentaria),
      invitacionMasiva: Boolean(prog.invitacionMasiva),
      alcanceInvitacionMasiva: prog.alcanceInvitacionMasiva || "colegio",
      anuncioImagen: prog.anuncioImagen || "",
      anuncioImagenNombre: prog.anuncioImagenNombre || "",
      anuncioImagenTamano: prog.anuncioImagenTamano || 0,
      anuncioImagenComprimida: Boolean(prog.anuncioImagenComprimida),
      usarFechaLimiteInscripcion: Boolean(prog.usarFechaLimiteInscripcion),
      fechaAperturaInscripcion: prog.fechaAperturaInscripcion || "",
      horaAperturaInscripcion: prog.horaAperturaInscripcion || "",
      fechaLimiteInscripcion: prog.fechaLimiteInscripcion || "",
      horaLimiteInscripcion: prog.horaLimiteInscripcion || "",
      id: prog.id,
      tipoComunicado: prog.tipoComunicado || "Otro genérico",
      tipoDocumento: prog.tipoDocumento || "Comunicado",
      numeroDocumento: prog.numeroDocumento || "",
      areaTematica: prog.areaTematica || "No aplica",
      nombreCiclo: prog.nombreCiclo || "Ciclo I",
      duracionTaller: prog.duracionTaller || "",
      tablaHorariosNivel: prog.tablaHorariosNivel || [],
      incluyeAlmuerzo: Boolean(prog.incluyeAlmuerzo),
      horarioRecepcionAlmuerzo: prog.horarioRecepcionAlmuerzo || "",
      nivelCambridge: prog.nivelCambridge || "",
      modalidadesCambridge: prog.modalidadesCambridge || [],
      costoCiclo: prog.costoCiclo || "",
      montoPrimerPago: prog.montoPrimerPago || "",
    };
  }

  /**
   * Prepara y abre el formulario para la creación de un nuevo taller.
   */
  function abrirCrear() {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento("Comunicado", programas);
    formState.setForm({
      ...formState.form,
      ...datosProgramaAFormulario({ id: "" }),
      numeroDocumento: numSugerido
    });
    formState.setIndiceTallerEditando(null);
    formState.setAlertaConfiguracion("");
    
    if (typeof onAbrirFormulario === "function") {
      onAbrirFormulario(null);
    }
    
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  /**
   * Carga los datos de un taller y abre el formulario de edición.
   */
  function abrirEditar(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    formState.setForm(datosProgramaAFormulario(prog));
    formState.setIndiceTallerEditando(null);
    const esVerano = normalizarPeriodoVista(prog.periodo) === "verano";
    formState.setTallerDepForm({
      deporte: esVerano
        ? (prog.categoria === "Talleres Deportivos" ? "Fútbol" : "Danza")
        : "Vóley",
      custom: "",
      minEdad: "6",
      maxEdad: "9",
      dias: ["Jueves"],
      horaInicio: "15:50",
      horaFin: "16:50",
      cupos: "20",
      nivel: "Formativo",
      docente: "",
    });
    formState.setAlertaConfiguracion("");
    
    if (typeof onAbrirFormulario === "function") {
      onAbrirFormulario(prog);
    }

    if (!embedded) {
      navigate(`/coordinacion/registrar-programa?id=${prog.id}`);
    } else {
      setShowModal(true);
    }
  }

  /**
   * Guarda o edita el taller actual validando todos los campos y enviándolos al Backend.
   */
  async function guardar(e) {
    e.preventDefault();
    formState.setAlertaConfiguracion("");
    if (!modoEditar && !puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    if (modoEditar && !puedeEditarProgramas) return mostrarMsg("No tiene permiso para editar programas.");
    if (!formState.form.nombre.trim()) return formState.mostrarAlertaConfiguracion("Revise: nombre del programa.");
    if (!formState.form.categoria) return formState.mostrarAlertaConfiguracion("Revise: categoria.");

    const esVeranoGuardar = normalizarPeriodoVista(formState.form.periodo) === "verano";
    const catLower = String(formState.form.categoria || "").toLowerCase();
    const esCambridgeGuardar = esProgramaCambridge(formState.form);
    const esDeportivoGuardar = catLower === "deportivo" || catLower === "talleres deportivos" || esProgramaDeportivo(formState.form.nombre, formState.form.categoria);
    const esMaratonGuardar = catLower === "maraton" || catLower === "maratón";
    const usaTalleresPorEdad = esVeranoGuardar
      ? catLower !== "academico" && catLower !== "académico" && catLower !== "vacaciones utiles" && catLower !== "vacaciones útiles"
      : esDeportivoGuardar;

    const talleres = Array.isArray(formState.form.talleresDeportivos) ? formState.form.talleresDeportivos : [];
    if (usaTalleresPorEdad && talleres.length === 0) {
      return formState.mostrarAlertaConfiguracion(
        esVeranoGuardar ? "Revise: talleres de verano, edades y horarios." : "Revise: talleres deportivos, edades y horarios."
      );
    }

    const gruposHorario = usaTalleresPorEdad || esMaratonGuardar ? [] : normalizarHorariosPorGrupo(formState.form.horariosPorGrupo);
    const usaHorariosPorBloqueGuardar = !usaTalleresPorEdad && !esMaratonGuardar;

    let gradosFinales = [];
    if (usaTalleresPorEdad) {
      gradosFinales = obtenerGradosDeportivos(talleres);
    } else if (gruposHorario.length > 0) {
      gradosFinales = obtenerGradosFinales(formState.form.gradosAplicables, gruposHorario);
    } else if (formState.form.invitacionMasiva && formState.form.alcanceInvitacionMasiva && ["inicial", "primaria", "secundaria", "colegio", "todos"].includes(formState.form.alcanceInvitacionMasiva.toLowerCase())) {
      const alcanceLower = formState.form.alcanceInvitacionMasiva.toLowerCase();
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
      gradosFinales = normalizarListaGrados(formState.form.gradosAplicables);
    } else {
      gradosFinales = obtenerGradosFinales(formState.form.gradosAplicables, gruposHorario);
    }

    let diasFinales = [];
    if (usaTalleresPorEdad) {
      diasFinales = Array.from(new Set(talleres.map((t) => t.dia)));
    } else if (esMaratonGuardar) {
      diasFinales = obtenerDiasEntreFechas(formState.form.fechaInicio, formState.form.fechaFin);
    } else {
      diasFinales = normalizarListaTexto(formState.form.dias);
    }

    if (formState.form.fechaInicio && formState.form.fechaFin && formState.form.fechaInicio > formState.form.fechaFin) {
      return formState.mostrarAlertaConfiguracion("Revise: la fecha de inicio no puede ser posterior a la fecha de fin.");
    }

    const camposFaltantes = [];
    if (!formState.form.fechaInicio || !formState.form.fechaFin) camposFaltantes.push("fechas de vigencia");
    if (!formState.form.cupos || Number(formState.form.cupos) <= 0) camposFaltantes.push("cupos");
    if (!String(formState.form.costo || "").trim()) camposFaltantes.push("costo");
    if (!formState.form.modalidadCobro) camposFaltantes.push("modalidad de cobro");
    if (esCambridgeGuardar && !String(formState.form.responsable || "").trim()) camposFaltantes.push("docente/profesor responsable");
    if (esMaratonGuardar) {
      if (!formState.form.horaInicio || !formState.form.horaFin) camposFaltantes.push("horario");
    } else if (esVeranoGuardar && usaTalleresPorEdad) {
      if (diasFinales.length === 0) camposFaltantes.push("dias de atencion");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && !usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (diasFinales.length === 0) camposFaltantes.push("dias del programa");
      if (!formState.form.horaInicio || !formState.form.horaFin) camposFaltantes.push("horario");
    } else if (!esCambridgeGuardar && !usaTalleresPorEdad && usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (formState.form.tipoComunicado === "Otro genérico") {
        camposFaltantes.push("bloques por grado");
      }
    }

    if (!esCambridgeGuardar && formState.form.tipoComunicado && formState.form.tipoComunicado !== "Otro genérico") {
      if (gruposHorario.length === 0) {
        camposFaltantes.push("horarios por grado/bloque/docente");
      }
    }

    if (camposFaltantes.length > 0) {
      return formState.mostrarAlertaConfiguracion(`Revise: ${camposFaltantes.join(", ")}.`);
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && gradosFinales.length === 0) {
      return formState.mostrarAlertaConfiguracion("Revise: grados aplicables.");
    }
    if (esVeranoGuardar && usaTalleresPorEdad && diasFinales.length === 0) {
      return formState.mostrarAlertaConfiguracion("Revise: seleccione al menos 1 dia de atencion para verano.");
    }

    if (esMaratonGuardar) {
      if (formState.form.horaInicio >= formState.form.horaFin) {
        return mostrarMsg("La hora de inicio de la maratón debe ser menor a la hora de fin.");
      }
    }

    if (esCambridgeGuardar) {
      if (diasFinales.length === 0) return mostrarMsg("Seleccione los días de clase del programa Cambridge.");
      if (!formState.form.horaInicio || !formState.form.horaFin) return mostrarMsg("Seleccione hora de inicio y fin del programa Cambridge.");
      if (formState.form.horaInicio >= formState.form.horaFin) return mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && !esMaratonGuardar && usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      return formState.mostrarAlertaConfiguracion("Revise: agregue al menos un bloque con grados, docente y horario.");
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad && !usaHorariosPorBloqueGuardar && gruposHorario.length === 0) {
      if (diasFinales.length === 0) return mostrarMsg("Seleccione los días del programa.");
      if (!formState.form.horaInicio || !formState.form.horaFin) return mostrarMsg("Seleccione hora de inicio y fin del programa.");
      if (formState.form.horaInicio >= formState.form.horaFin) return mostrarMsg("La hora de inicio debe ser menor a la hora de fin.");
      if ((formState.form.almuerzoInicio && !formState.form.almuerzoFin) || (!formState.form.almuerzoInicio && formState.form.almuerzoFin)) {
        return mostrarMsg("Complete hora de inicio y fin del almuerzo.");
      }
      if (formState.form.almuerzoInicio && formState.form.almuerzoFin && formState.form.almuerzoInicio >= formState.form.almuerzoFin) {
        return mostrarMsg("La hora de inicio del almuerzo debe ser menor a la hora de fin.");
      }
    }

    if (!esCambridgeGuardar && !usaTalleresPorEdad) {
      const grupoInvalido = gruposHorario.find(
        (grupo) =>
          grupo.grados.length === 0 || !grupo.dia || !grupo.horaInicio || !grupo.horaFin || grupo.horaInicio >= grupo.horaFin
      );
      if (grupoInvalido)
        return formState.mostrarAlertaConfiguracion("Revise los grupos por dia: cada grupo debe tener grados, dia y hora valida.");
      const grupoAlmuerzoInvalido = gruposHorario.find(
        (grupo) =>
          (grupo.almuerzoInicio && !grupo.almuerzoFin) ||
          (!grupo.almuerzoInicio && grupo.almuerzoFin) ||
          (grupo.almuerzoInicio && grupo.almuerzoFin && grupo.almuerzoInicio >= grupo.almuerzoFin)
      );
      if (grupoAlmuerzoInvalido) return formState.mostrarAlertaConfiguracion("Revise los grupos por grado: complete horarios de almuerzo validos.");
      const grupoSinDocente = gruposHorario.find((grupo) => !grupo.responsable);
      if (grupoSinDocente)
        return formState.mostrarAlertaConfiguracion("Revise los grupos por grado: cada grupo debe tener docente o tutor responsable.");
    }

    if (!formState.form.fechaInicio || !formState.form.fechaFin) return formState.mostrarAlertaConfiguracion("Revise: fechas de inicio y fin.");
    if (formState.form.fechaInicio > formState.form.fechaFin) return mostrarMsg("La fecha de inicio no puede ser mayor a la de fin.");
    const duracionAvisoDiasVal = normalizarDuracionAvisoDias(formState.form.duracionAvisoDias, 7);
    if (String(duracionAvisoDiasVal) !== String(formState.form.duracionAvisoDias)) {
      return mostrarMsg("El aviso de inscripción puede durar de 1 a 7 días como máximo.");
    }
    if (!formState.form.cupos || Number(formState.form.cupos) <= 0) return formState.mostrarAlertaConfiguracion("Revise: cupos.");
    if (!esCostoValido(formState.form.costo)) return mostrarMsg("Ingrese un costo válido en soles, con máximo dos decimales.");
    if (!formState.form.modalidadCobro) return formState.mostrarAlertaConfiguracion("Revise: modalidad de cobro.");
    if (formState.form.plantilla && !formState.form.plantillaValidada) return mostrarMsg("La plantilla Word debe estar validada antes de guardar.");

    setGuardando(true);
    const ciclosCambridgeGuardar = calcularTextoCiclosCambridge(formState.form.fechaInicio, formState.form.fechaFin);
    const edadesTalleres = talleres.flatMap((taller) => [Number(taller.edadMinima), Number(taller.edadMaxima)]).filter(Number.isFinite);
    const edadMinimaVerano = edadesTalleres.length ? Math.min(...edadesTalleres) : "";
    const edadMaximaVerano = edadesTalleres.length ? Math.max(...edadesTalleres) : "";
    const datosGuardar = {
      ...formState.form,
      responsable: usaTalleresPorEdad
        ? Array.from(new Set(talleres.map((t) => t.docente).filter(Boolean))).join(" · ") || formState.form.responsable
        : gruposHorario.length > 0
        ? resumenResponsablesPorGrupo(gruposHorario, formState.form.responsable)
        : (formState.form.tablaHorariosNivel && formState.form.tablaHorariosNivel.length > 0)
        ? resumenResponsablesPorGrupo(formState.form.tablaHorariosNivel, formState.form.responsable)
        : formState.form.responsable,
      tutora: gruposHorario.length > 0
        ? resumenTutoraPorGrupo(gruposHorario, formState.form.tutora)
        : (formState.form.tablaHorariosNivel && formState.form.tablaHorariosNivel.length > 0)
        ? resumenTutoraPorGrupo(formState.form.tablaHorariosNivel, formState.form.tutora)
        : formState.form.tutora,
      costo: Number(formState.form.costo).toFixed(2),
      gradosAplicables: esCambridgeGuardar ? [] : gradosFinales,
      edadMinima: usaTalleresPorEdad ? edadMinimaVerano : "",
      edadMaxima: usaTalleresPorEdad ? edadMaximaVerano : "",
      fechaNacimientoDesde: "",
      fechaNacimientoHasta: "",
      duracionTaller: calcularDuracionTexto(formState.form.fechaInicio, formState.form.fechaFin),
      cicloI: esCambridgeGuardar ? ciclosCambridgeGuardar.cicloI : formState.form.cicloI || "",
      cicloII: esCambridgeGuardar ? ciclosCambridgeGuardar.cicloII : formState.form.cicloII || "",
      modalidadesCambridge: [],
      duracionAvisoDias: duracionAvisoDiasVal,
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
      requiereIndumentaria: Boolean(formState.form.requiereIndumentaria),
      invitacionMasiva: esCambridgeGuardar ? false : Boolean(formState.form.invitacionMasiva),
      alcanceInvitacionMasiva: !esCambridgeGuardar && formState.form.invitacionMasiva ? formState.form.alcanceInvitacionMasiva || "colegio" : "",
      anuncioImagen: !esCambridgeGuardar && formState.form.invitacionMasiva ? formState.form.anuncioImagen : "",
      anuncioImagenNombre: !esCambridgeGuardar && formState.form.invitacionMasiva ? formState.form.anuncioImagenNombre : "",
      anuncioImagenTamano: !esCambridgeGuardar && formState.form.invitacionMasiva ? formState.form.anuncioImagenTamano : 0,
      anuncioImagenComprimida: !esCambridgeGuardar && formState.form.invitacionMasiva ? Boolean(formState.form.anuncioImagenComprimida) : false,
      horario: esCambridgeGuardar
        ? (diasFinales.length && formState.form.horaInicio && formState.form.horaFin
            ? resumenHorario(diasFinales, formState.form.horaInicio, formState.form.horaFin)
            : "Asignado por carga Excel")
        : usaTalleresPorEdad
        ? resumenHorarioDeportivo(talleres)
        : gruposHorario.length
        ? resumenHorariosPorGrupo(gruposHorario)
        : resumenHorario(diasFinales, formState.form.horaInicio, formState.form.horaFin, formState.form.almuerzoInicio, formState.form.almuerzoFin),
    };
    try {
      if (modoEditar) {
        await editarPrograma(formState.form.id, datosGuardar);
        mostrarMsg("Actualizado exitosamente.", "success");
        setProgramas((actuales) =>
          actuales.map((programa) => {
            if (programa.id !== formState.form.id) return programa;
            return {
              ...programa,
              ...datosGuardar,
              id: formState.form.id,
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
        if (!embedded) {
          navigate("/coordinacion/programas");
        }
      } else {
        const nuevoPrograma = await crearPrograma(datosGuardar);
        mostrarMsg("Programa creado correctamente.", "success");
        setProgramas((actuales) => [...actuales, nuevoPrograma]);
        if (!embedded) {
          navigate("/coordinacion/programas");
        } else {
          formState.setForm(datosProgramaAFormulario(nuevoPrograma));
          setShowModal(true);
        }
      }
    } catch (err) {
      mostrarMsg(err.message);
    } finally {
      setGuardando(false);
    }
  }

  /**
   * Cambia el estado de un programa (Habilitado/Deshabilitado).
   */
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

  /**
   * Prepara y define el programa a finalizar.
   */
  async function finalizarPrograma(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para finalizar programas.");
    setProgramaAFinalizar(prog);
  }

  /**
   * Finaliza el programa previamente seleccionado.
   */
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

  /**
   * Prepara y define el programa a archivar.
   */
  async function eliminarCurso(prog) {
    if (!puedeEditarProgramas) return mostrarMsg("No tiene permiso para archivar programas.");
    setProgramaAArchivar(prog);
  }

  /**
   * Confirma la eliminación y archivado definitivo del programa.
   */
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

  /**
   * Restaura un programa archivado a estado Deshabilitado.
   */
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

  /**
   * Clona un programa de periodos pasados, generando nuevos IDs e incrementando correlativos.
   */
  function clonarPrograma(prog) {
    if (!puedeCrearProgramas) return mostrarMsg("No tiene permiso para crear programas.");
    const numSugerido = sugerirNumeroDocumento(prog.tipoDocumento || "Comunicado", programas);
    const datos = datosProgramaAFormulario(prog);

    if (Array.isArray(datos.talleresDeportivos)) {
      datos.talleresDeportivos = datos.talleresDeportivos.map((t, idx) => ({
        ...t,
        id: `taller-clon-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 6)}`,
        cuposOcupados: 0,
      }));
    }

    if (Array.isArray(datos.horariosPorGrupo)) {
      datos.horariosPorGrupo = datos.horariosPorGrupo.map((g, idx) => ({
        ...g,
        id: `grupo-clon-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 6)}`,
        cuposOcupados: 0,
      }));
    }

    formState.setForm({
      ...datos,
      id: "",
      fechaInicio: fechaActualInput(),
      fechaFin: fechaActualInput(),
      cuposOcupados: 0,
      estado: "Deshabilitado",
      numeroDocumento: numSugerido
    });
    formState.setAlertaConfiguracion("");
    
    if (typeof onAbrirFormulario === "function") {
      onAbrirFormulario(null);
    }
    
    mostrarMsg(`Datos del taller "${prog.nombre}" clonados. Asigne las nuevas fechas y guarde.`, "success");
    if (!embedded) {
      navigate("/coordinacion/registrar-programa");
    } else {
      setShowModal(true);
    }
  }

  // --- VALORES CALCULADOS DE BÚSQUEDA ---
  const programasFiltrados = useMemo(() => {
    return (programas || []).filter((p) => {
      if (p.estado === "Finalizado" || p.estado === "Archivado") return false;
      const coincide =
        !busqueda.trim() ||
        String(p.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        String(p.responsable || "").toLowerCase().includes(busqueda.toLowerCase());
      
      const filtraPeriodo =
        filtroPeriodo === "todos" || normalizarPeriodoVista(p.periodo) === normalizarPeriodoVista(filtroPeriodo);
      
      const filtraCategoria =
        filtroCategoria === "todos" || String(p.categoria || "").toLowerCase() === filtroCategoria.toLowerCase();
      
      const filtraEstado =
        filtroEstado === "todos" || String(p.estado || "Habilitado").toLowerCase() === filtroEstado.toLowerCase();

      return coincide && filtraPeriodo && filtraCategoria && filtraEstado;
    });
  }, [programas, busqueda, filtroPeriodo, filtroCategoria, filtroEstado]);

  const programasArchivadosFiltrados = useMemo(() => {
    return (programas || []).filter((p) => {
      if (p.estado !== "Finalizado" && p.estado !== "Archivado") return false;
      const coincide =
        !busqueda.trim() ||
        String(p.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        String(p.responsable || "").toLowerCase().includes(busqueda.toLowerCase());
      
      const filtraPeriodo =
        filtroPeriodo === "todos" || normalizarPeriodoVista(p.periodo) === normalizarPeriodoVista(filtroPeriodo);
      
      const filtraCategoria =
        filtroCategoria === "todos" || String(p.categoria || "").toLowerCase() === filtroCategoria.toLowerCase();

      return coincide && filtraPeriodo && filtraCategoria;
    });
  }, [programas, busqueda, filtroPeriodo, filtroCategoria]);

  return {
    programas,
    setProgramas,
    showModal,
    setShowModal,
    guardando,
    setGuardando,
    programaAFinalizar,
    setProgramaAFinalizar,
    programaAArchivar,
    setProgramaAArchivar,

    // Filtros
    busqueda,
    setBusqueda,
    filtroPeriodo,
    setFiltroPeriodo,
    filtroCategoria,
    setFiltroCategoria,
    filtroEstado,
    setFiltroEstado,

    // Permisos
    puedeCrearProgramas,
    puedeEditarProgramas,
    puedeCrearGrupos,
    puedeEditarGrupos,
    puedeVerAlumnos,
    puedeCargarAlumnos,
    puedeGestionarGruposFormulario,
    tieneAccionesPrograma,

    // Métodos
    datosProgramaAFormulario,
    abrirCrear,
    abrirEditar,
    guardar,
    toggleEstado,
    finalizarPrograma,
    confirmarFinalizar,
    eliminarCurso,
    confirmarArchivar,
    restaurarPrograma,
    clonarPrograma,
    
    // Computados
    programasFiltrados,
    programasArchivadosFiltrados,
  };
}
