/**
 * Normaliza las propiedades de un objeto de programa proveniente de una petición HTTP.
 */
export function normalizeIncomingProgram(body: any = {}): any {
  const result = { ...body };
  
  if (body.nombre_programa !== undefined) {
    result.nombre = body.nombre_programa;
    delete result.nombre_programa;
  }
  if (body.fecha_inicio !== undefined) {
    result.fechaInicio = body.fecha_inicio;
    delete result.fecha_inicio;
  }
  if (body.fecha_fin !== undefined) {
    result.fechaFin = body.fecha_fin;
    delete result.fecha_fin;
  }
  if (body.monto !== undefined) {
    result.costo = body.monto;
    delete result.monto;
  }
  if (body.grados !== undefined) {
    result.gradosAplicables = body.grados;
    delete result.grados;
  }
  if (body.modalidad_cobro !== undefined) {
    result.modalidadCobro = body.modalidad_cobro;
    delete result.modalidad_cobro;
  }
  if (body.requiere_uniforme !== undefined) {
    result.requiereUniforme = Boolean(body.requiere_uniforme);
    delete result.requiere_uniforme;
  }
  if (body.comunicado_completo !== undefined) {
    result.comunicadoCompleto = body.comunicado_completo;
    delete result.comunicado_completo;
  }
  if (body.detalle_costo !== undefined) {
    result.detalleCosto = body.detalle_costo;
    delete result.detalle_costo;
  }
  if (body.detalle_almuerzo !== undefined) {
    result.detalleAlmuerzo = body.detalle_almuerzo;
    delete result.detalle_almuerzo;
  }
  if (body.tipo_comunicado !== undefined) {
    result.tipoComunicado = body.tipo_comunicado;
    delete result.tipo_comunicado;
  }
  if (body.tipo_documento !== undefined) {
    result.tipoDocumento = body.tipo_documento;
    delete result.tipo_documento;
  }
  if (body.numero_documento !== undefined) {
    result.numeroDocumento = body.numero_documento;
    delete result.numero_documento;
  }
  if (body.area_tematica !== undefined) {
    result.areaTematica = body.area_tematica;
    delete result.area_tematica;
  }
  if (body.area__tematica !== undefined) {
    result.areaTematica = body.area__tematica;
    delete result.area__tematica;
  }

  return result;
}
