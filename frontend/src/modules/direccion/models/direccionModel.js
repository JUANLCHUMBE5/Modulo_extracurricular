export function normalizeDescuento(descuento = {}) {
  return {
    tipo: descuento.descuentoTipo || "",
    valor: Number(descuento.descuentoValor || 0),
    monto: Number(descuento.descuentoMonto || 0),
    justificacion: descuento.descuentoJustificacion || "",
    aprobadoPor: descuento.descuentoAprobadoPor || "",
    fechaAprobacion: descuento.descuentoFechaAprobacion || ""
  };
}

export function buildDescuentoPayload(datos = {}) {
  return {
    descuentoTipo: datos.tipo || datos.descuentoTipo || "Beca Completa",
    descuentoValor: Number(datos.valor || datos.descuentoValor || 0),
    descuentoJustificacion: datos.justificacion || datos.descuentoJustificacion || "",
    descuentoAprobadoPor: datos.aprobadoPor || datos.descuentoAprobadoPor || "Director"
  };
}
