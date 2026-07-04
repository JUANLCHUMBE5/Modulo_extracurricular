import {
  resolverHorarioPorGradoApi,
  tieneHorariosPorGrupoApi,
  obtenerGradoCompletoApi
} from "../../../common/shared/mappers.js";
import {
  esDiaCorrecto,
  ordenarPorFecha,
  resolverEstadoPago
} from "./access-state.helpers.js";
import { mismoCodigo, normalizarTexto } from "./identity.helpers.js";
import {
  buscarProgramaPorNombre,
  nombreProgramaValido,
  obtenerHorarioDeInscripcion
} from "./program-resolution.helpers.js";

/**
 * Resuelve el programa asociado a una inscripcion, apoderado, pago o por horario.
 */
export function resolverProgramaAsociado(db: any, inscripcion: any = {}, estudiante: any = null, pago: any = null, horario: string = ""): any {
  const programas = db.programas || [];

  const porId = programas.find((programa: any) =>
    mismoCodigo(programa.id, inscripcion.programaId) ||
    mismoCodigo(programa.id, pago?.programaId) ||
    mismoCodigo(programa.programaId, inscripcion.programaId) ||
    mismoCodigo(programa.programaId, pago?.programaId)
  );
  if (porId) return porId;

  const porNombre = buscarProgramaPorNombre(db, inscripcion.programa) ||
    buscarProgramaPorNombre(db, inscripcion.programaNombre) ||
    buscarProgramaPorNombre(db, pago?.programa) ||
    buscarProgramaPorNombre(db, pago?.programaNombre);
  if (porNombre) return porNombre;

  const dni = String(inscripcion.dniEstudiante || pago?.dniEstudiante || pago?.estudianteDni || estudiante?.dni || "")
    .replace(/\D/g, "")
    .slice(0, 8);
  const inscripcionesDni = (db.inscripciones || [])
    .filter((item: any) => {
      const itemDni = String(item.dniEstudiante || "").replace(/\D/g, "").slice(0, 8);
      return dni && itemDni === dni && normalizarTexto(item.estadoInscripcion) !== "anulada";
    })
    .map((item: any) => {
      const itemPago = encontrarPagoInscripcion(db, item, { dni });
      const itemPrograma = programas.find((programa: any) =>
        mismoCodigo(programa.id, item.programaId) ||
        normalizarTexto(programa.nombre) === normalizarTexto(nombreProgramaValido(item.programa))
      );
      return { item, itemPago, itemPrograma };
    })
    .filter((item: any) => item.itemPrograma);

  const pagada = inscripcionesDni.find(({ item, itemPago }: any) => resolverEstadoPago(item, itemPago) === "pagado");
  if (pagada?.itemPrograma) return pagada.itemPrograma;
  if (inscripcionesDni[0]?.itemPrograma) return inscripcionesDni[0].itemPrograma;

  const pagoDni = ordenarPorFecha((db.pagos || []).filter((item: any) => {
    const itemDni = String(item.dniEstudiante || item.estudianteDni || "").replace(/\D/g, "").slice(0, 8);
    return dni && itemDni === dni && !["cancelado", "anulado", "rechazado"].includes(normalizarTexto(item.estado));
  }), "fechaPago").find((item: any) => item.programaId || nombreProgramaValido(item.programa || item.programaNombre));
  const programaPago = pagoDni
    ? programas.find((programa: any) => mismoCodigo(programa.id, pagoDni.programaId)) || buscarProgramaPorNombre(db, pagoDni.programa || pagoDni.programaNombre)
    : null;
  if (programaPago) return programaPago;

  const horarioNormalizado = normalizarTexto(horario || inscripcion.horario);
  if (horarioNormalizado) {
    const gradoEstudiante = inscripcion.gradoEstudiante || inscripcion.grado || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "");
    const porHorario = programas.find((programa: any) => {
      const horarioPrograma = resolverHorarioPorGradoApi(programa, gradoEstudiante) ||
        (tieneHorariosPorGrupoApi(programa) ? "" : programa.horario);
      const horarioProgNormalizado = normalizarTexto(horarioPrograma);
      return horarioProgNormalizado && (horarioProgNormalizado === horarioNormalizado || horarioProgNormalizado.includes(horarioProgNormalizado) || horarioProgNormalizado.includes(horarioNormalizado));
    });
    if (porHorario) return porHorario;
  }

  return null;
}

/**
 * Busca y retorna la transaccion de pago valida asociada a una inscripcion.
 */
export function encontrarPagoInscripcion(db: any, inscripcion: any, ids: any = {}): any {
  const pagos = db.pagos || [];
  if (ids.pagoId) {
    const pagoDirecto = pagos.find((pago: any) => mismoCodigo(pago.id, ids.pagoId));
    if (pagoDirecto) return pagoDirecto;
  }
  if (inscripcion?.pagoId) {
    const pagoPorId = pagos.find((pago: any) => mismoCodigo(pago.id, inscripcion.pagoId));
    if (pagoPorId) return pagoPorId;
  }
  const pagoPorInscripcionValido = pagos.find((pago: any) =>
    pago.inscripcionId && inscripcion?.id && mismoCodigo(pago.inscripcionId, inscripcion.id) &&
    !["cancelado", "anulado", "rechazado"].includes(String(pago.estado || "").toLowerCase().trim())
  );
  if (pagoPorInscripcionValido) return pagoPorInscripcionValido;

  const pagoPorInscripcion = pagos.find((pago: any) =>
    pago.inscripcionId && inscripcion?.id && mismoCodigo(pago.inscripcionId, inscripcion.id)
  );
  if (pagoPorInscripcion) return pagoPorInscripcion;
  const coincidencias = pagos.filter((pago: any) => {
    const pagoDni = pago.dniEstudiante || pago.estudianteDni;
    const cleanPagoDni = pagoDni ? String(pagoDni).replace(/\D/g, "").slice(0, 8) : "";
    const cleanInsDni = inscripcion?.dniEstudiante ? String(inscripcion.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
    const mismoDni = cleanPagoDni === cleanInsDni;
    const mismoPrograma = mismoCodigo(pago.programaId, inscripcion?.programaId)
      || normalizarTexto(pago.programa || pago.programaNombre) === normalizarTexto(inscripcion?.programa);
    return mismoDni && mismoPrograma;
  });
  const coincidenciasOrdenadas = ordenarPorFecha(coincidencias, "fechaPago");
  const coincidenciaValida = coincidenciasOrdenadas.find((pago) =>
    !["cancelado", "anulado", "rechazado"].includes(String(pago.estado || "").toLowerCase().trim())
  );
  return coincidenciaValida || coincidenciasOrdenadas[0] || null;
}

/**
 * Busca y retorna la informacion de un estudiante en la base de datos por DNI o codigo.
 */
export function buscarEstudiante(db: any, ids: any, inscripcion: any): any {
  let estudiantes: any[] = [];
  if (Array.isArray(db.estudiantes)) estudiantes = db.estudiantes;
  else if (db.estudiantes && typeof db.estudiantes === "object") estudiantes = Object.values(db.estudiantes);
  const insDni = inscripcion?.dniEstudiante ? String(inscripcion.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
  const dni = ids.dni || insDni;
  const codigo = ids.codigoEstudiante || inscripcion?.codigoEstudiante || "";
  return estudiantes.find((estudiante: any) => {
    const estDni = estudiante.dni ? String(estudiante.dni).replace(/\D/g, "").slice(0, 8) : "";
    return estDni === dni;
  }) || estudiantes.find((estudiante: any) => codigo && mismoCodigo(estudiante.codigoEstudiante, codigo)) || null;
}

/**
 * Busca la inscripcion mas prioritaria o valida que corresponda a los identificadores dados.
 */
export function buscarInscripcion(db: any, ids: any): any {
  const inscripciones = (db.inscripciones || []).filter((item: any) => normalizarTexto(item.estadoInscripcion) !== "anulada");
  const pagos = db.pagos || [];
  if (ids.inscripcionId) {
    const directa = inscripciones.find((item: any) => mismoCodigo(item.id, ids.inscripcionId));
    if (directa) return directa;
  }
  if (ids.pagoId) {
    const pago = pagos.find((item: any) => mismoCodigo(item.id, ids.pagoId));
    if (pago?.inscripcionId) {
      const directa = inscripciones.find((item: any) => mismoCodigo(item.id, pago.inscripcionId));
      if (directa) return directa;
    }
  }
  const candidatas = inscripciones.filter((item: any) => coincideInscripcion(item, ids));
  if (candidatas.length === 0) return null;

  if (ids.programaId) {
    const porPrograma = candidatas.filter((item: any) => mismoCodigo(item.programaId, ids.programaId));
    if (porPrograma.length) return ordenarPorFecha(porPrograma)[0] || null;
  }

  const candidatasHoy = candidatas.filter((item: any) => {
    const estudiante = buscarEstudiante(db, ids, item);
    const horario = obtenerHorarioDeInscripcion(db, item, estudiante);
    return esDiaCorrecto(horario);
  });
  if (candidatasHoy.length > 0) {
    const paid = candidatasHoy.filter((ins: any) => {
      const p = encontrarPagoInscripcion(db, ins, ids);
      const estNorm = resolverEstadoPago(ins, p);
      return estNorm === "pagado";
    });
    if (paid.length > 0) return ordenarPorFecha(paid)[0];

    const processing = candidatasHoy.filter((ins: any) => {
      const p = encontrarPagoInscripcion(db, ins, ids);
      return p && (p.estado === "Por Verificar" || p.estado === "Por verificar" || p.estado === "Pago en proceso");
    });
    if (processing.length > 0) return ordenarPorFecha(processing)[0];

    return ordenarPorFecha(candidatasHoy)[0];
  }

  const paid = candidatas.filter((ins: any) => {
    const p = encontrarPagoInscripcion(db, ins, ids);
    const estNorm = resolverEstadoPago(ins, p);
    return estNorm === "pagado";
  });
  if (paid.length > 0) return ordenarPorFecha(paid)[0];

  const processing = candidatas.filter((ins: any) => {
    const p = encontrarPagoInscripcion(db, ins, ids);
    return p && (p.estado === "Por Verificar" || p.estado === "Por verificar" || p.estado === "Pago en proceso");
  });
  if (processing.length > 0) return ordenarPorFecha(processing)[0];

  return ordenarPorFecha(candidatas)[0] || null;
}

/**
 * Comprueba si los campos clave de una inscripcion coinciden con los identificadores de busqueda.
 */
export function coincideInscripcion(inscripcion: any, ids: any): boolean {
  if (!inscripcion) return false;
  const insDni = inscripcion.dniEstudiante ? String(inscripcion.dniEstudiante).replace(/\D/g, "").slice(0, 8) : "";
  if (ids.dni && insDni === ids.dni) return true;
  if (ids.codigoEstudiante && mismoCodigo(inscripcion.codigoEstudiante, ids.codigoEstudiante)) return true;
  if (ids.codigoOriginal && mismoCodigo(inscripcion.id, ids.codigoOriginal)) return true;
  if (ids.codigoOriginal && mismoCodigo(inscripcion.codigoEstudiante, ids.codigoOriginal)) return true;
  return false;
}
