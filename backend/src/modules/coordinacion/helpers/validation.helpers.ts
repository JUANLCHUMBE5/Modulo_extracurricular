import {
  esDiaCorrecto,
  obtenerMinutosRestantesIngresoReciente,
  resolverEstadoPago
} from "./access-state.helpers.js";
import { mismoCodigo, normalizarIdentificadores, normalizarTexto } from "./identity.helpers.js";
import {
  buscarEstudiante,
  buscarInscripcion,
  encontrarPagoInscripcion,
  resolverProgramaAsociado
} from "./lookup.helpers.js";
import { nombreProgramaValido, obtenerHorarioDeInscripcion } from "./program-resolution.helpers.js";

import { crearRespuestaInscripcion, crearRespuestaNoRegistrado } from "./response.helpers.js";

/**
 * Valida los identificadores de un estudiante para determinar si tiene permitido el ingreso hoy.
 */
export function resolverValidacion(db: any, identificadores: any = {}): any {
  const ids = normalizarIdentificadores(identificadores);
  const inscripcion = buscarInscripcion(db, ids);
  const estudiante = buscarEstudiante(db, ids, inscripcion);
  
  if (!inscripcion) {
    const studentDni = ids.dni || (estudiante?.dni ? String(estudiante.dni).replace(/\D/g, "").slice(0, 8) : "");
    let programaPreInscrito = null;
    
    if (studentDni) {
      for (const [progId, listaInvitados] of Object.entries(db.invitadosPorPrograma || {}) as any) {
        const esInvitado = (listaInvitados || []).some((inv: any) => {
          const invDni = String(inv?.dni || "").replace(/\D/g, "").slice(0, 8);
          const targetDniStr = String(studentDni || "").replace(/\D/g, "").slice(0, 8);
          return invDni === targetDniStr && invDni !== "";
        });
        if (esInvitado) {
          const prog = (db.programas || []).find((p: any) => p.id === progId);
          if (prog) {
            programaPreInscrito = prog;
            break;
          }
        }
      }
    }
    
    if (programaPreInscrito) {
      return {
        dni: studentDni || ids.codigoOriginal || "",
        codigoEstudiante: ids.codigoEstudiante || estudiante?.codigoEstudiante || "",
        nombres: estudiante?.nombres || ids.codigoOriginal || "Estudiante",
        grado: estudiante?.grado || "",
        seccion: estudiante?.seccion || "",
        programa: programaPreInscrito.nombre,
        programaId: programaPreInscrito.id,
        horario: programaPreInscrito.horario || "No registrado",
        inscripcionId: "",
        estadoInscripcion: "Pre-inscrito",
        estadoPago: "Pendiente",
        estadoAcceso: "pre_inscrito",
        accesoPermitido: false,
        mensajeAcceso: "No inscrito",
        accion: `No estÃ¡ inscrito. Acercarse a Caja o Asistente para proceder con la matrÃ­cula en ${programaPreInscrito.nombre}.`,
        color: "rojo",
        pagoId: "",
        fechaPago: "",
        monto: Number(programaPreInscrito.costo || 0),
      };
    }
    
    return crearRespuestaNoRegistrado(ids, estudiante);
  }
  
  const pago = encontrarPagoInscripcion(db, inscripcion, ids);
  const estadoNormalizado = resolverEstadoPago(inscripcion, pago);
  const horario = obtenerHorarioDeInscripcion(db, inscripcion, estudiante);
  
  const dbProg = resolverProgramaAsociado(db, inscripcion, estudiante, pago, horario);
  const programaNombre = nombreProgramaValido(dbProg?.nombre) ||
    nombreProgramaValido(inscripcion.programa) ||
    nombreProgramaValido(pago?.programa) ||
    nombreProgramaValido(pago?.programaNombre) ||
    "Sin programa";
  const programaId = dbProg?.id || inscripcion.programaId || pago?.programaId || "";

  if (estadoNormalizado === "pagado") {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const hoyStr = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);

    if (inscripcion.fechaInicio && hoyStr < inscripcion.fechaInicio) {
      const fechaFmt = inscripcion.fechaInicio.split("-").reverse().join("/");
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Taller no iniciado",
        accion: `El taller aÃºn no ha iniciado. La fecha de inicio es el ${fechaFmt}.`,
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }

    if (inscripcion.fechaFin && hoyStr > inscripcion.fechaFin) {
      const fechaFmt = inscripcion.fechaFin.split("-").reverse().join("/");
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Taller finalizado",
        accion: `El taller ya ha finalizado (finalizÃ³ el ${fechaFmt}).`,
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }

    if (!esDiaCorrecto(horario)) {
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Hoy no le toca este taller",
        accion: "El alumno estÃ¡ matriculado en este taller, pero las clases corresponden a otros dÃ­as de la semana.",
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }

    const minsRestantes = obtenerMinutosRestantesIngresoReciente(
      db.asistencias || [],
      ids.dni || estudiante?.dni,
      ids.codigoEstudiante || estudiante?.codigoEstudiante,
      inscripcion.programaId
    );

    if (minsRestantes > 0) {
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "ya_registrado",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Ya registrado",
        accion: `Este estudiante ya registrÃ³ su ingreso hace poco. PodrÃ¡ registrarse nuevamente en ${minsRestantes} minuto(s).`,
        color: "rojo",
        horario,
        programa: programaNombre,
        programaId,
      });
    }
    
    return crearRespuestaInscripcion({
      inscripcion,
      estudiante,
      pago,
      estadoAcceso: "pagado",
      estadoPago: "Pagado",
      accesoPermitido: true,
      mensajeAcceso: "Pago validado",
      accion: "Ingreso permitido.",
      color: "verde",
      horario,
      programa: programaNombre,
      programaId,
    });
  }
  
  if (estadoNormalizado === "anulado") {
    return crearRespuestaInscripcion({
      inscripcion,
      estudiante,
      pago,
      estadoAcceso: "anulado",
      estadoPago: "Anulado",
      accesoPermitido: false,
      mensajeAcceso: "Pago anulado",
      accion: "Registro anulado. Verificar en Asistente o Cajera antes de permitir el ingreso.",
      color: "rojo",
      horario,
      programa: programaNombre,
      programaId,
    });
  }
  
  const esProceso = pago && (pago.estado === "Por Verificar" || pago.estado === "Por verificar" || pago.estado === "Pago en proceso");
  return crearRespuestaInscripcion({
    inscripcion,
    estudiante,
    pago,
    estadoAcceso: "pendiente",
    estadoPago: esProceso ? "Pago en proceso" : "Pendiente",
    accesoPermitido: false,
    mensajeAcceso: esProceso ? "Pago en proceso" : "Pago pendiente",
    accion: esProceso
      ? "Tiene un pago en proceso de verificaciÃ³n. Debe acercarse a Caja para su aprobaciÃ³n."
      : "Falta pagar. Debe acercarse a Caja para regularizar el pago.",
    color: "rojo",
    horario,
    programa: programaNombre,
    programaId,
  });
}

