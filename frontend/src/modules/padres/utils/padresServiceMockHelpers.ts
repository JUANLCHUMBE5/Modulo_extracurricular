import { apiDb as apiDbRaw, saveApiDb } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;
import { adaptarPrograma } from "../../../services/adapters";
import {
  calcularDuracionTexto,
  normalizarDuracionAvisoDias,
  obtenerVentanaInscripcion,
} from "../../../services/dateService";
import {
  esProgramaCambridgePadres,
  extraerDiasHorario,
  normalizarEstadoPagoPadres,
  normalizarPeriodoTexto,
  normalizarTexto,
  obtenerDiasCruzados,
  programaDisponibleParaGrado,
  programaVisibleEnPortalPadres,
  resolverDocentePorGrado,
  resolverHorarioPorGrado,
  tieneHorariosPorGrupo,
} from "../services/padresServiceUtils";
import { calcularCuposDisponibles } from "../../secretaria/services/secretariaServiceUtils";

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

export function programmeEstado(p: any) { return p.estado || "Habilitado"; }
export function programmeAnuncioImagenNombre(p: any) { return p.anuncioImagenNombre || ""; }

export function generarPagoIdPadres() {
  const usados = new Set((apiDb.pagos || []).map((pago: any) => String(pago.id || "")));
  let id = `PAG-${Date.now().toString().slice(-8)}`;
  while (usados.has(id)) {
    id = `PAG-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90) + 10}`;
  }
  return id;
}

export function obtenerInvitaciones(dni: string, estudiante: any = null) {
  const resultado: any[] = [];

  (apiDb.programas || []).map(adaptarPrograma).forEach((programa: any) => {
    if (!programaVisibleEnPortalPadres(programa)) return;

    if (programa.invitacionMasiva && programaDisponibleParaGrado(programa, estudiante?.grado)) {
      resultado.push({
        id: `${programa.id}-masiva-${dni}`,
        programaId: programmeId(programa),
        programa: programa.nombre,
        categoria: programa.categoria || "",
        alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "colegio",
        periodo: normalizarPeriodoTexto(programa.periodo),
        horario: resolverHorarioPorGrado(programa, estudiante?.grado) || programa.horario || "Horario por confirmar",
        responsable: resolverDocentePorGrado(programa, estudiante?.grado),
        costo: Number(programa.costo || 0),
        modalidadCobro: programa.modalidadCobro || "No definido",
        requisitos: programa.requisitos || "Sin requisitos adicionales",
        comunicado: programa.comunicado || "",
        comunicadoCompleto: programa.comunicadoCompleto || "",
        detalleCosto: programa.detalleCosto || "",
        detalleAlmuerzo: programa.detalleAlmuerzo || "",
        concesionarios: programa.concesionarios || "",
        anuncioImagen: programa.anuncioImagen || "",
        anuncioImagenNombre: programmeAnuncioImagenNombre(programa),
        talleresDeportivos: programa.talleresDeportivos || [],
        requiereUniforme: Boolean(programa.requiereUniforme),
        requiereIndumentaria: Boolean(programa.requiereIndumentaria),
        seleccion: estudiante?.seleccion || "",
        nivelCambridge: estudiante?.nivelCambridge || "",
        estadoPrograma: programmeEstado(programa),
        estadoInvitacion: "Invitacion masiva",
        fechaInicio: programa.fechaInicio || "",
        fechaFin: programa.fechaFin || "",
        cicloI: programa.cicloI || "",
        cicloII: programa.cicloII || "",
        duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
        duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
        horaLimiteAviso: programa.horaLimiteAviso || "23:59",
        ventanaInscripcion: obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias, programa.horaLimiteAviso, programa),
        creadoDesdeDocumento: Boolean(programa.creadoDesdeDocumento),
        plantilla: programa.plantilla || "",
        plantillaValidada: Boolean(programa.plantillaValidada),
        plantillaVariables: programa.plantillaVariables || []
      });
    }

    const invitados = apiDb.invitadosPorPrograma?.[programa.id] || [];
    const esCambridge = esProgramaCambridgePadres(programa);
    invitados
      .filter((invitado: any) => invitado.dni === dni)
      .forEach((invitado: any) => {
        if (resultado.some((item) => item.programaId === programa.id)) return;
        const gradoEstudiante = obtenerGradoCompleto(
          invitado.grado,
          invitado.nivelEducativo || invitado.nivel || estudiante?.nivel || "",
          estudiante?.grado
        );
        if (!esCambridge && !programaDisponibleParaGrado(programa, gradoEstudiante)) return;

        resultado.push({
          id: `${programa.id}-${invitado.dni || invitado.codigoEstudiante || invitado.nombres}`,
          programaId: programmeId(programa),
          programa: programa.nombre,
          categoria: programa.categoria || "",
          alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "colegio",
          periodo: normalizarPeriodoTexto(programa.periodo),
          horario: resolverHorarioPorGrado(programa, gradoEstudiante) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || "Horario por confirmar",
          responsable: resolverDocentePorGrado(programa, gradoEstudiante),
          costo: Number(programa.costo || 0),
          modalidadCobro: programa.modalidadCobro || "No definido",
          requisitos: programa.requisitos || "Sin requisitos adicionales",
          comunicado: programa.comunicado || "",
          comunicadoCompleto: programa.comunicadoCompleto || "",
          detalleCosto: programa.detalleCosto || "",
          detalleAlmuerzo: programa.detalleAlmuerzo || "",
          concesionarios: programa.concesionarios || "",
          anuncioImagen: programa.anuncioImagen || "",
          anuncioImagenNombre: programmeAnuncioImagenNombre(programa),
          talleresDeportivos: programa.talleresDeportivos || [],
          requiereUniforme: Boolean(programa.requiereUniforme),
          requiereIndumentaria: Boolean(programa.requiereIndumentaria),
          seleccion: invitado.seleccion || "",
          nivelCambridge: invitado.nivelCambridge || "",
          estadoPrograma: programmeEstado(programa),
          estadoInvitacion: invitado.estado || "Invitado",
          fechaInicio: programa.fechaInicio || "",
          fechaFin: programa.fechaFin || "",
          cicloI: programa.cicloI || "",
          cicloII: programa.cicloII || "",
          duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
          grado: gradoEstudiante,
          duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
          horaLimiteAviso: programmeHoraLimiteAviso(programa),
          ventanaInscripcion: obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias, programmeHoraLimiteAviso(programa), programa),
          creadoDesdeDocumento: Boolean(programa.creadoDesdeDocumento),
          plantilla: programa.plantilla || "",
          plantillaValidada: Boolean(programa.plantillaValidada),
          plantillaVariables: programa.plantillaVariables || []
        });
      });
  });

  return resultado;
}

export function programmeId(p: any) { return p.id || ""; }
export function programmeHoraLimiteAviso(p: any) { return p.horaLimiteAviso || "23:59"; }

export function obtenerInscripciones(estudiante: any, dni: string) {
  const claves = new Set([
    dni ? `dni:${dni}` : "",
    estudiante.codigoEstudiante ? `codigo:${normalizarTexto(estudiante.codigoEstudiante)}` : "",
    estudiante.nombres ? `nombre:${normalizarTexto(estudiante.nombres)}` : "",
  ].filter(Boolean));

  return [...(apiDb.inscripciones || [])]
    .filter((inscripcion: any) => {
      const clavesInscripcion = [
        inscripcion.dniEstudiante ? `dni:${inscripcion.dniEstudiante}` : "",
        inscripcion.codigoEstudiante ? `codigo:${normalizarTexto(inscripcion.codigoEstudiante)}` : "",
        inscripcion.nombresEstudiante ? `nombre:${normalizarTexto(inscripcion.nombresEstudiante)}` : "",
      ].filter(Boolean);

      return clavesInscripcion.some((clave) => claves.has(clave));
    })
    .map(sincronizarInscripcionConPrograma)
    .filter((inscripcion: any) => inscripcion.estadoInscripcion !== "Requiere revision")
    .sort((a, b) => new Date(b.fechaRegistro || 0).getTime() - new Date(a.fechaRegistro || 0).getTime());
}

export function obtenerPagos(dni: string, inscripciones: any[]) {
  const idsInscripcion = new Set(inscripciones.map((item) => item.id));
  return [...(apiDb.pagos || [])]
    .filter((pago: any) => pago.dniEstudiante === dni || idsInscripcion.has(pago.inscripcionId))
    .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
}

export function obtenerDocumentos(dni: string, estudiante: any) {
  const nombre = normalizarTexto(estudiante.nombres);
  return [...(apiDb.documentosGenerados || [])]
    .filter((documento: any) =>
      documento.dniEstudiante === dni ||
      normalizarTexto(documento.alumno) === nombre
    )
    .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
}

export function sincronizarInscripcionConPrograma(inscripcion: any) {
  const rawPrograma = (apiDb.programas || []).find((item: any) => {
    if (inscripcion.programaId) return item.id === inscripcion.programaId;
    return normalizarTexto(item.nombre || item.nombre_programa) === normalizarTexto(inscripcion.programa);
  });
  const programa: any = rawPrograma ? adaptarPrograma(rawPrograma) : null;

  if (!programa || programa.estado === "Archivado") {
    return normalizarInscripcion({
      ...inscripcion,
      estadoInscripcion: "Requiere revision",
      estadoPago: inscripcion.estadoPago || "Pendiente",
      estadoPrograma: "Programa archivado",
      horario: "Programa archivado por Coordinación Académica",
    });
  }

  if (!programaDisponibleParaGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado)) {
    return normalizarInscripcion({
      ...inscripcion,
      estadoInscripcion: "Requiere revision",
      estadoPago: inscripcion.estadoPago || "Pendiente",
      costo: 0,
      horario: "Programa no disponible para este grado",
      estadoPrograma: programmeEstado(programa),
      programa: programa.nombre || inscripcion.programa,
    });
  }

  return normalizarInscripcion({
    ...inscripcion,
    programa: programa.nombre || inscripcion.programa,
    horario: resolverHorarioPorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || (programa.invitacionMasiva ? programa.horario : "") || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || inscripcion.horario,
    docente: resolverDocentePorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || inscripcion.docente || "No definido",
    costo: Number(programa.costo ?? inscripcion.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || inscripcion.modalidadCobro,
    fechaInicio: programa.fechaInicio || inscripcion.fechaInicio,
    fechaFin: programa.fechaFin || inscripcion.fechaFin,
    cicloI: programa.cicloI || inscripcion.cicloI || "",
    cicloII: programa.cicloII || inscripcion.cicloII || "",
    duracionTaller: programa.duracionTaller || inscripcion.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias || inscripcion.duracionAvisoDias, 7),
    requisitos: programa.requisitos || inscripcion.requisitos,
    comunicado: programa.comunicado || inscripcion.comunicado || "",
    detalleCosto: programa.detalleCosto || inscripcion.detalleCosto || "",
    detalleAlmuerzo: programa.detalleAlmuerzo || inscripcion.detalleAlmuerzo || "",
    concesionarios: programa.concesionarios || inscripcion.concesionarios || "",
    requiereUniforme: Boolean(programa.requiereUniforme),
    estadoPrograma: programmeEstado(programa),
    horaLimiteAviso: programmeHoraLimiteAviso(programa),
  });
}

export function normalizarInscripcion(inscripcion: any) {
  return {
    ...inscripcion,
    estadoInscripcion: obtenerEstadoInscripcion(inscripcion),
    estadoPago: inscripcion.estadoPago || "Pendiente",
    costo: Number(inscripcion.costo || 0),
  };
}

export function obtenerEstadoInscripcion(inscripcion: any) {
  return inscripcion.estadoInscripcion ||
    inscripcion["estadoInscripción"] ||
    "Pendiente";
}

export function encontrarPagoActivoPadres(inscripcion: any = {}) {
  const registro = inscripcion || {};
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const programaNombre = normalizarTexto(registro.programa);

  return pagos.find((pago: any) => {
    const estado = normalizarEstadoPagoPadres(pago.estado, pago.estadoPago, pago.estadoVerificacion);
    if (["observado", "anulado"].includes(estado)) return false;
    if (pago.inscripcionId && pago.inscripcionId === registro.id) return true;
    if (pago.inscripcionId && registro.id && pago.inscripcionId !== registro.id) return false;

    const mismoDni = (pago.dniEstudiante || pago.estudianteDni) === registro.dniEstudiante;
    if (!mismoDni) return false;
    if (pago.programaId && pago.programaId === registro.programaId) return true;
    if (pago.programaId && registro.programaId && pago.programaId !== registro.programaId) return false;
    return programaNombre && normalizarTexto(pago.programa || pago.programaNombre) === programaNombre;
  }) || null;
}

export function validarCruceHorarioPadres(dni: any, programaId: any, periodo: any, horarioNuevo = "") {
  const diasNuevo = extraerDiasHorario(horarioNuevo);
  if (!diasNuevo.size) return;

  const periodoNormalizado = normalizarPeriodoTexto(periodo);
  const cruce = apiDb.inscripciones
    .map((item: any) => ({
      item,
      diasCruzados: obtenerDiasCruzados(diasNuevo, extraerDiasHorario(item.horario)),
    }))
    .find(({ item, diasCruzados }: any) =>
      item.estadoInscripcion !== "Anulada" &&
      item.programaId !== programaId &&
      item.dniEstudiante === dni &&
      normalizarPeriodoTexto(item.periodo) === periodoNormalizado &&
      diasCruzados.length > 0
    );

  if (cruce) {
    throw new Error(`El estudiante ya tiene una inscripcion con cruce de dia (${cruce.diasCruzados.join(", ")}) en ${cruce.item.programa || "otro programa"}.`);
  }
}
