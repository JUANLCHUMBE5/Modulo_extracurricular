import { apiDb as apiDbRaw, saveApiDb } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;
import {
  calcularDuracionTexto,
  fechaActualInput,
  fechaActualIso,
  normalizarDuracionAvisoDias,
  normalizarFecha,
  obtenerVentanaInscripcion,
} from "../../../services/dateService";
import {
  calcularCuposDisponibles,
  claveAlumno,
  clavesAlumnoInscripcion,
  extraerDiasHorario,
  normalizarEstadoPagoSecretaria,
  normalizarPeriodo,
  normalizarTexto,
  obtenerDiasCruzados,
  programaDisponibleParaGrado,
  resolverDocentePorGrado,
  resolverHorarioPorGrado,
  tieneHorariosPorGrupo,
} from "../services/secretariaServiceUtils";
import { debeArchivarPorFecha } from "../../coordinacion/services/coordinacionServiceUtils";

export function obtenerGradoCompleto(grado: any, nivel: any, respaldoGrado = "") {
  let g = String(grado || "").trim();
  if (!g) return String(respaldoGrado || "").trim();
  const gLower = g.toLowerCase();
  if (!gLower.includes("primaria") && !gLower.includes("secundaria") && !gLower.includes("inicial")) {
    const n = String(nivel || "").trim();
    if (n) {
      g = `${g} ${n}`;
    }
  }
  return g;
}

export function obtenerEstadoInscripcionPorPeriodo(dni: any, periodo: any) {
  if (!dni) return "No inscrito";
  const inscripcion = [...(apiDb.inscripciones || [])]
    .reverse()
    .find((item: any) =>
      item.dniEstudiante === dni &&
      normalizarPeriodo(item.periodo) === normalizarPeriodo(periodo)
    );

  return inscripcion?.estadoInscripcion || "No inscrito";
}

export function obtenerEstadoPagoPorPeriodo(dni: any, periodo: any) {
  if (!dni) return "Sin pago";
  const inscripcion = [...(apiDb.inscripciones || [])]
    .reverse()
    .find((item: any) =>
      item.dniEstudiante === dni &&
      normalizarPeriodo(item.periodo) === normalizarPeriodo(periodo)
    );

  return inscripcion?.estadoPago || "Sin pago";
}

export function buscarInvitacionEnMemoria(dni: any, periodo: any, gradoAlumno = "") {
  if (!dni) return null;
  const periodoNormalizado = normalizarPeriodo(periodo);

  for (const programa of apiDb.programas || []) {
    if (normalizarPeriodo(programa.periodo) !== periodoNormalizado) continue;
    const invitado = (apiDb.invitadosPorPrograma?.[programa.id] || []).find((item: any) => item.dni === dni);
    if (invitado) return { programaId: programa.id, programa, invitado };
  }

  return null;
}

export function obtenerPlantillaProgramaLocal(programa: any = null, programaId = "") {
  const id = programa?.id || programaId || "";
  const plantillaGuardada = apiDb.plantillasPorPrograma?.[id] || {};
  const variablesPrograma = Array.isArray(programa?.plantillaVariables) ? programa.plantillaVariables : [];
  const variablesGuardadas = Array.isArray(plantillaGuardada.plantillaVariables) ? plantillaGuardada.plantillaVariables : [];
  const plantillaBase64 = programa?.plantillaBase64 || plantillaGuardada.plantillaBase64 || "";

  return {
    plantilla: programa?.plantilla || plantillaGuardada.plantilla || "",
    plantillaBase64,
    plantillaVariables: variablesPrograma.length ? variablesPrograma : variablesGuardadas,
    plantillaValidada: Boolean(programa?.plantillaValidada || plantillaGuardada.plantillaValidada || plantillaBase64),
  };
}

export function obtenerPlantillaBase64(inscripcion: any, programa: any) {
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa, programa?.id || inscripcion?.programaId);
  return plantillaPrograma.plantillaBase64 || inscripcion?.plantillaBase64 || "";
}

export function obtenerPlantillaVariables(inscripcion: any, programa: any) {
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa, programmeId(inscripcion, programa));
  return plantillaPrograma.plantillaVariables.length ? plantillaPrograma.plantillaVariables : (inscripcion?.plantillaVariables || []);
}

function programmeId(inscripcion: any, programa: any) {
  return programa?.id || inscripcion?.programaId;
}

export function adaptarInvitadoComoEstudiante(invitacionPeriodo: any, periodoNormalizado: any) {
  const { programa, invitado } = invitacionPeriodo;
  const student = apiDb.estudiantes?.[invitado.dni] || {};
  const gradoInvitado = obtenerGradoCompleto(
    invitado.grado,
    invitado.nivelEducativo || invitado.nivel || student.nivel || "",
    student.grado
  );
  const horarioResuelto = resolverHorarioPorGrado(programa, gradoInvitado);
  const horarioConfigurado = Boolean(horarioResuelto || !tieneHorariosPorGrupo(programa));
  const cuposDisponibles = calcularCuposDisponibles(programa);
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);
  return {
    dni: invitado.dni || "",
    codigoEstudiante: invitado.codigoEstudiante || "",
    nombres: invitado.nombres,
    grado: gradoInvitado || "No definido",
    seccion: invitado.seccion || "No definido",
    tipoAlumno: "Alumno invitado",
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(invitado.dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(invitado.dni, periodoNormalizado),
    origenRegistro: "Carga Excel de Coordinación",
    tieneInvitacion: true,
    programaAsignado: invitacionPeriodo.programaId,
    programaNombre: programa.nombre,
    programaGrupo: programa.grupo || "",
    programaGrupoEtario: programa.grupoEtario || programa.grupo || "",
    programaHorario: horarioResuelto || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario),
    programaDisponible: programaDisponibleParaGrado(programa, gradoInvitado),
    programaHorarioConfigurado: horarioConfigurado,
    programaDocente: resolverDocentePorGrado(programa, gradoInvitado),
    programaCosto: Number(programa.costo ?? 0),
    programaCupos: cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos",
    programaCuposDisponibles: cuposDisponibles,
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programa.requisitos || "",
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    programaDuracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    programaDuracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    programaHoraLimiteAviso: programa.horaLimiteAviso || "23:59",
    seleccion: invitado.seleccion || "",
    nivelCambridge: invitado.nivelCambridge || "",
    plantilla: plantillaPrograma.plantilla,
    plantillaBase64: plantillaPrograma.plantillaBase64,
    plantillaVariables: plantillaPrograma.plantillaVariables,
    plantillaValidada: plantillaPrograma.plantillaValidada,
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    telefonoApoderado: invitado.telefonoApoderado || "",
  };
}

export function adaptarEstudianteBase(estudiante: any, periodoNormalizado: any, invitacionPeriodo: any) {
  const { programa, invitado = {} } = invitacionPeriodo;
  const gradoInvitacion = obtenerGradoCompleto(
    invitado.grado,
    invitado.nivelEducativo || invitado.nivel || estudiante.nivel || "",
    estudiante.grado
  );
  const seccionInvitacion = invitado.seccion || estudiante.seccion;
  const nivelInvitacion = invitado.nivelEducativo || estudiante.nivel || "";
  const horarioResuelto = resolverHorarioPorGrado(programa, gradoInvitacion);
  const horarioConfigurado = Boolean(horarioResuelto || !tieneHorariosPorGrupo(programa));
  const cuposDisponibles = calcularCuposDisponibles(programa);
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);
  return {
    ...estudiante,
    codigoEstudiante: invitado.codigoEstudiante || estudiante.codigoEstudiante || "",
    nombres: invitado.nombres || estudiante.nombres,
    grado: gradoInvitacion,
    seccion: seccionInvitacion,
    nivel: nivelInvitacion,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
    "estadoInscripción": obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(estudiante.dni, periodoNormalizado),
    origenRegistro: "Base general de estudiantes + carga Excel de Coordinación",
    tieneInvitacion: true,
    programaAsignado: invitacionPeriodo.programaId,
    programaNombre: programa.nombre,
    programaGrupo: programa.grupo || "",
    programaGrupoEtario: programa.grupoEtario || programa.grupo || "",
    programaHorario: horarioResuelto || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programmeHorario(programa)),
    programaDisponible: programaDisponibleParaGrado(programa, gradoInvitacion),
    programaHorarioConfigurado: horarioConfigurado,
    programaDocente: resolverDocentePorGrado(programa, gradoInvitacion),
    programaCosto: Number(programa.costo ?? 0),
    programaCupos: cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos",
    programaCuposDisponibles: cuposDisponibles,
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programmeRequisitos(programa),
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    programaDuracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    programaDuracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    programaHoraLimiteAviso: programa.horaLimiteAviso || "23:59",
    seleccion: invitado.seleccion || "",
    nivelCambridge: invitado.nivelCambridge || "",
    plantilla: plantillaPrograma.plantilla,
    plantillaBase64: plantillaPrograma.plantillaBase64,
    plantillaVariables: plantillaPrograma.plantillaVariables,
    plantillaValidada: plantillaPrograma.plantillaValidada,
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
  };
}

function programmeHorario(p: any) {
  return p.horario;
}

function programmeRequisitos(p: any) {
  return p.requisitos || "";
}

export function finalizarProgramasVencidos() {
  const hoy = normalizarFecha(fechaActualInput());
  if (!hoy) return;

  let cambio = false;
  apiDb.programas.forEach((programa: any) => {
    if (!debeArchivarPorFecha(programa, hoy)) return;
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    programa.archivadoAutomaticamenteEn = programa.archivadoAutomaticamenteEn || fechaActualIso();
    programa.estado = "Archivado";
    cambio = true;
  });

  if (cambio) {
    saveApiDb();
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "secretaria" } }));
  }
}

export function validarVentanaInscripcionRegular(programa: any, payload: any = {}) {
  if (payload.registroCaja) return;

  const ventana = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias, programa.horaLimiteAviso, programa);
  if (ventana.permitida) return;

  throw new Error("El aviso de inscripcion regular cerro. Derive al padre a Cajera para evaluar y registrar la matricula.");
}

export function validarCruceHorarioAlumno(payload: any, horarioNuevo = "") {
  const diasNuevo = extraerDiasHorario(horarioNuevo);
  if (!diasNuevo.size) return;

  const clavesPayload = clavesAlumnoInscripcion(payload);
  const periodoPayload = normalizarPeriodo(payload.periodo);
  const cruce = apiDb.inscripciones
    .map((item: any) => ({
      item,
      diasExistentes: extraerDiasHorario(item.horario),
      diasCruzados: obtenerDiasCruzados(diasNuevo, extraerDiasHorario(item.horario)),
    }))
    .find(({ item, diasCruzados }: any) =>
      item.estadoInscripcion !== "Anulada" &&
      item.programaId !== payload.programaId &&
      normalizarPeriodo(item.periodo) === periodoPayload &&
      clavesAlumnoInscripcion(item).some((clave) => clavesPayload.includes(clave)) &&
      diasCruzados.length > 0
    );

  if (cruce) {
    throw new Error(`El alumno ya tiene una inscripcion con cruce de dia (${cruce.diasCruzados.join(", ")}) en ${cruce.item.programa || "otro programa"}.`);
  }
}

export function encontrarPagoActivoInscripcion(inscripcion: any = {}) {
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const programaNombre = normalizarTexto(inscripcion.programa);

  return pagos.find((pago: any) => {
    const estado = normalizarEstadoPagoSecretaria([pago.estado, pago.estadoPago, pago.estadoVerificacion].join(" "));
    if (estado.includes("observado") || estado.includes("rechazado") || estado.includes("anulado") || estado.includes("cancelado")) {
      return false;
    }
    if (pago.inscripcionId && pago.inscripcionId === inscripcion.id) return true;

    const mismoDni = (pago.dniEstudiante || pago.estudianteDni) === inscripcion.dniEstudiante;
    if (!mismoDni) return false;
    if (pago.programaId && pago.programaId === inscripcion.programaId) return true;
    return programaNombre && normalizarTexto(pago.programa || pago.programaNombre) === programaNombre;
  }) || null;
}

export function sincronizarInscripcionConProgramaActual(inscripcion: any) {
  if (!inscripcion) return null;

  const programa = apiDb.programas.find((item: any) =>
    item.id === inscripcion.programaId ||
    normalizarTexto(item.nombre) === normalizarTexto(inscripcion.programa)
  );
  if (!programa) {
    const plantillaInscripcion = obtenerPlantillaProgramaLocal(null, inscripcion?.programaId);
    return {
      ...inscripcion,
      plantilla: plantillaInscripcion.plantilla || inscripcion.plantilla || "",
      plantillaBase64: obtenerPlantillaBase64(inscripcion, null),
      plantillaVariables: obtenerPlantillaVariables(inscripcion, null),
      plantillaValidada: Boolean(plantillaInscripcion.plantillaValidada || inscripcion.plantillaValidada),
    };
  }
  if (!programaDisponibleParaGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado)) return null;
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);

  return {
    ...inscripcion,
    programa: programa.nombre || inscripcion.programa,
    horario: resolverHorarioPorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || inscripcion.horario,
    docente: resolverDocentePorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || inscripcion.docente || "No definido",
    costo: Number(programa.costo ?? inscripcion.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || inscripcion.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || inscripcion.fechaInicio || "",
    fechaFin: programa.fechaFin || inscripcion.fechaFin || "",
    cicloI: programa.cicloI || inscripcion.cicloI || "",
    cicloII: programa.cicloII || inscripcion.cicloII || "",
    duracionTaller: programa.duracionTaller || inscripcion.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias || inscripcion.duracionAvisoDias, 7),
    horaLimiteAviso: programa.horaLimiteAviso || inscripcion.horaLimiteAviso || "23:59",
    gradosAplicables: programa.gradosAplicables || inscripcion.gradosAplicables || [],
    horariosPorGrupo: programa.horariosPorGrupo || inscripcion.horariosPorGrupo || [],
    grupo: programa.grupo || inscripcion.grupo || "",
    grupoEtario: programa.grupoEtario || inscripcion.grupoEtario || programa.grupo || "",
    requisitos: programa.requisitos || inscripcion.requisitos || "",
    plantilla: plantillaPrograma.plantilla || inscripcion.plantilla || "",
    plantillaBase64: obtenerPlantillaBase64(inscripcion, programa),
    plantillaVariables: obtenerPlantillaVariables(inscripcion, programa),
    plantillaValidada: Boolean(plantillaPrograma.plantillaValidada || inscripcion.plantillaValidada),
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    tipoComunicado: programa.tipoComunicado || inscripcion.tipoComunicado || "Otro genérico",
    tipoDocumento: programa.tipoDocumento || inscripcion.tipoDocumento || "Comunicado",
    numeroDocumento: programa.numeroDocumento || inscripcion.numeroDocumento || "",
    areaTematica: programa.areaTematica || inscripcion.areaTematica || "No aplica",
    motivoJustificacion: programa.motivoJustificacion || inscripcion.motivoJustificacion || programa.comunicado || inscripcion.comunicado || "",
    nombreCiclo: programa.nombreCiclo || inscripcion.nombreCiclo || "Ciclo I",
    duracion: programa.duracion || inscripcion.duracion || programa.duracionTaller || inscripcion.duracionTaller || "",
    tablaHorariosNivel: programa.tablaHorariosNivel || inscripcion.tablaHorariosNivel || [],
    incluyeAlmuerzo: programa.incluyeAlmuerzo !== undefined ? Boolean(programa.incluyeAlmuerzo) : Boolean(inscripcion.incluyeAlmuerzo),
    horarioRecepcionAlmuerzo: programa.horarioRecepcionAlmuerzo || inscripcion.horarioRecepcionAlmuerzo || "",
    nivelCambridge: programa.nivelCambridge || inscripcion.nivelCambridge || "",
    modalidadesCambridge: programa.modalidadesCambridge || inscripcion.modalidadesCambridge || [],
    costoCiclo: programa.costoCiclo || inscripcion.costoCiclo || programa.costo || inscripcion.costo || "",
    montoPrimerPago: programa.montoPrimerPago || inscripcion.montoPrimerPago || "",
    comunicado: programa.comunicado || inscripcion.comunicado || "",
    comunicadoCompleto: programa.comunicadoCompleto || inscripcion.comunicadoCompleto || "",
  };
}

export function adaptarProgramaCoordinacion(programa: any, gradoAlumno = "") {
  const periodoNormalizado = normalizarPeriodo(programa.periodo);
  const cuposDisponibles = calcularCuposDisponibles(programa);
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);
  return {
    id: programa.id,
    nombre: programa.nombre,
    grupo: programa.grupo || "",
    grupoEtario: programa.grupoEtario || programa.grupo || "",
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    horario: resolverHorarioPorGrado(programa, gradoAlumno) || programa.horario,
    horariosPorGrupo: programa.horariosPorGrupo || [],
    gradosAplicables: programa.gradosAplicables || [],
    docente: resolverDocentePorGrado(programa, gradoAlumno),
    costo: Number(programa.costo ?? 0),
    cupos: cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos",
    cuposDisponibles,
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    uniforme: programa.requiereUniforme ? "Sí" : "No",
    modalidadCobro: programa.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programa.fechaFin || "",
    cicloI: programa.cicloI || "",
    cicloII: programa.cicloII || "",
    duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    horaLimiteAviso: programa.horaLimiteAviso || "23:59",
    edadMinima: programa.edadMinima || "",
    edadMaxima: programa.edadMaxima || "",
    fechaNacimientoDesde: programa.fechaNacimientoDesde || "",
    fechaNacimientoHasta: programmeFechaNacimientoHasta(programa),
    requisitos: programmeRequisitos(programa),
    plantilla: plantillaPrograma.plantilla,
    plantillaBase64: plantillaPrograma.plantillaBase64,
    plantillaVariables: plantillaPrograma.plantillaVariables,
    plantillaValidada: plantillaPrograma.plantillaValidada,
    invitacionMasiva: Boolean(programa.invitacionMasiva),
    estado: programa.estado,
  };
}

function programmeFechaNacimientoHasta(p: any) {
  return p.fechaNacimientoHasta || "";
}
