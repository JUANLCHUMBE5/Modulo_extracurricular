export function normalizePago(pago = {}) {
  return {
    id: pago.id || "",
    inscripcionId: pago.inscripcionId || "",
    dniEstudiante: pago.dniEstudiante || "",
    nombresEstudiante: pago.nombresEstudiante || "",
    programaId: pago.programaId || "",
    programa: pago.programa || "",
    periodo: pago.periodo || "escolar",
    monto: Number(pago.monto || 0),
    formaPago: pago.formaPago || "Efectivo",
    numeroOperacion: pago.numeroOperacion || "",
    telefonoOperacion: pago.telefonoOperacion || "",
    capturaPagoNombre: pago.capturaPagoNombre || "",
    capturaPagoBase64: pago.capturaPagoBase64 || "",
    estado: pago.estado || "completado",
    fechaPago: pago.fechaPago || "",
    origenRegistro: pago.origenRegistro || "Cajera",
    nroRecibo: pago.nroRecibo || ""
  };
}

export function buildPagoPayload(datos = {}) {
  return {
    ...datos,
    monto: Number(datos.monto || 0),
  };
}
