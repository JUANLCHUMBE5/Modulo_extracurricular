import { normalizarTextoApi } from "../../../common/shared/mappers.js";

/**
 * Normaliza y deduce el estado de pago de una transacción para el reporte consolidado de caja.
 */
export function normalizarEstadoPagoReporteCaja(pago: any = null, inscripcion: any = null): string {
  if (pago) {
    const estadoPago = normalizarTextoApi(pago.estado);
    if (["completado", "pagado", "validado"].includes(estadoPago)) return "pagado";
    if (["por verificar", "verificando", "verificacion"].includes(estadoPago)) return "verificando";
    if (["observado", "rechazado", "no coincide"].includes(estadoPago)) return "observado";
    if (["anulado", "cancelado"].includes(estadoPago)) return "anulado";

    const origen = normalizarTextoApi(pago.origenRegistro);
    const tieneComprobante = Boolean(
      pago.numeroOperacion ||
      pago.telefonoOperacion ||
      pago.capturaPagoBase64 ||
      pago.capturaPagoNombre
    );
    if (origen.includes("portal") && tieneComprobante) return "verificando";
  }

  const estadoInscripcion = normalizarTextoApi(inscripcion?.estadoPago);
  if (["pagado", "completado", "validado"].includes(estadoInscripcion)) return "pagado";
  return "pendiente";
}

/**
 * Evalúa si una transacción de pago coincide con una determinada inscripción del estudiante.
 */
export function pagoPerteneceAInscripcionReporte(pay: any = {}, item: any = {}): boolean {
  if (pay.inscripcionId && item.id) return pay.inscripcionId === item.id;
  if (pay.inscripcionId && item.inscripcionId) return pay.inscripcionId === item.inscripcionId;
  if (pay.dniEstudiante !== item.dniEstudiante) return false;
  return pay.programaId === item.programaId;
}

/**
 * Mapea y da formato a una transacción de pago para una fila del reporte de caja.
 */
export function mapPaymentToReportRow(p: any, prog: any, student: any, e: any, period: string): any {
  return {
    id: p.id,
    pagoId: p.id,
    inscripcionId: p.inscripcionId || "",
    dniEstudiante: p.dniEstudiante,
    estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : p.nombresEstudiante || "",
    programaId: prog ? prog.id : p.programaId || "",
    programa: prog ? prog.nombre : p.programa || "",
    periodo: period,
    monto: p.monto,
    estadoPago: normalizarEstadoPagoReporteCaja(p),
    estadoInscripcion: "",
    formaPago: p.formaPago,
    numeroOperacion: p.numeroOperacion || "",
    telefonoOperacion: p.telefonoOperacion || "",
    origen: p.origenRegistro || "Portal parents",
    fuente: "pago",
    fecha: p.fechaPago || p.fecha || "",
    fechaRegistro: p.fecha || "",
    fechaPago: p.fechaPago || "",
    apoderado: student ? student.apoderado : "",
    telefono: student ? student.telefonoApoderado : "",
    nroRecibo: p.nroRecibo || p.nro_recibo || "",
    grado: e ? (e.gradoEstudiante || e.grado || (student ? student.grado : "")) : (student ? student.grado : ""),
    seccion: e ? (e.seccionEstudiante || e.seccion || (student ? student.seccion : "")) : (student ? student.seccion : ""),
    descuentoAprobado: e ? (e.descuentoAprobado || false) : false,
    descuentoTipo: e ? (e.descuentoTipo || "") : "",
    descuentoMonto: e ? (e.descuentoMonto || 0) : 0,
    costoOriginal: e ? (e.costoOriginal ?? prog?.costo ?? 0) : (prog?.costo ?? 0),
    descuentoJustificacion: e ? (e.descuentoJustificacion || "") : "",
    observaciones: p.observaciones || p.observacion || p.pagoObservacionCaja || ""
  };
}

/**
 * Mapea y da formato a una inscripción para una fila del reporte de caja.
 */
export function mapEnrollmentToReportRow(e: any, p: any, prog: any, student: any, period: string): any {
  const baseCosto = e.costoOriginal !== undefined && e.costoOriginal !== null
    ? Number(e.costoOriginal)
    : (prog ? Number(prog.costo || 0) : 0);
  const finalCosto = e.descuentoAprobado
    ? Math.max(0, baseCosto - Number(e.descuentoMonto || 0))
    : baseCosto;
  const monto = p ? p.monto : finalCosto;
  const statePay = normalizarEstadoPagoReporteCaja(p, e);

  return {
    id: e.id,
    inscripcionId: e.id,
    dniEstudiante: e.dniEstudiante,
    estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : e.nombresEstudiante || "",
    programaId: prog ? prog.id : e.programaId || "",
    programa: prog ? prog.nombre : e.programa || "",
    periodo: period,
    monto,
    estadoPago: statePay,
    estadoInscripcion: e.estadoInscripcion || "",
    formaPago: p ? p.formaPago : "Sin pago",
    numeroOperacion: p ? p.numeroOperacion : "",
    telefonoOperacion: p ? p.telefonoOperacion : "",
    origen: p ? p.origenRegistro : e.origenRegistro || "Presencial",
    fuente: "inscripcion",
    pagoId: p ? p.id : "",
    fecha: p ? (p.fechaPago || p.fecha) : e.fechaRegistro || "",
    fechaRegistro: e.fechaRegistro || "",
    fechaPago: p ? (p.fechaPago || p.fecha) : "",
    apoderado: e.apoderado || "",
    telefono: e.telefono || "",
    puedePagarCaja: true,
    nroRecibo: p ? (p.nroRecibo || p.nro_recibo || "") : "",
    grado: e.gradoEstudiante || e.grado || (student ? student.grado : ""),
    seccion: e.seccionEstudiante || e.seccion || (student ? student.seccion : ""),
    descuentoAprobado: e.descuentoAprobado || false,
    descuentoTipo: e.descuentoTipo || "",
    descuentoMonto: e.descuentoMonto || 0,
    costoOriginal: e.costoOriginal ?? (prog ? prog.costo : 0),
    descuentoJustificacion: e.descuentoJustificacion || "",
    observaciones: p ? (p.observaciones || p.observacion || p.pagoObservacionCaja || "") : (e.pagoObservacionCaja || "")
  };
}
