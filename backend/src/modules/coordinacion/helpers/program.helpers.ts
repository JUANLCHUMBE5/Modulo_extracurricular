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
  if (body.requiere_indumentaria !== undefined) {
    result.requiereIndumentaria = Boolean(body.requiere_indumentaria);
    delete result.requiere_indumentaria;
  }
  if (body.usar_fecha_limite_inscripcion !== undefined) {
    result.usarFechaLimiteInscripcion = Boolean(body.usar_fecha_limite_inscripcion);
    delete result.usar_fecha_limite_inscripcion;
  }
  if (body.fecha_apertura_inscripcion !== undefined) {
    result.fechaAperturaInscripcion = body.fecha_apertura_inscripcion;
    delete result.fecha_apertura_inscripcion;
  }
  if (body.hora_apertura_inscripcion !== undefined) {
    result.horaAperturaInscripcion = body.hora_apertura_inscripcion;
    delete result.hora_apertura_inscripcion;
  }
  if (body.fecha_limite_inscripcion !== undefined) {
    result.fechaLimiteInscripcion = body.fecha_limite_inscripcion;
    delete result.fecha_limite_inscripcion;
  }
  if (body.hora_limite_inscripcion !== undefined) {
    result.horaLimiteInscripcion = body.hora_limite_inscripcion;
    delete result.hora_limite_inscripcion;
  }
  if (body.anuncio_imagen !== undefined) {
    result.anuncioImagen = body.anuncio_imagen;
    delete result.anuncio_imagen;
  }
  if (body.anuncio_imagen_nombre !== undefined) {
    result.anuncioImagenNombre = body.anuncio_imagen_nombre;
    delete result.anuncio_imagen_nombre;
  }
  if (body.talleres_deportivos !== undefined) {
    result.talleresDeportivos = body.talleres_deportivos;
    delete result.talleres_deportivos;
  }
  if (body.horarios_por_grupo !== undefined) {
    result.horariosPorGrupo = body.horarios_por_grupo;
    delete result.horarios_por_grupo;
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
  if (body.nombre_ciclo !== undefined) {
    result.nombreCiclo = body.nombre_ciclo;
    delete result.nombre_ciclo;
  }
  if (body.duracion !== undefined) {
    result.duracionTaller = body.duracion;
    delete result.duracion;
  }
  if (body.tabla_horarios_nivel !== undefined) {
    result.tablaHorariosNivel = body.tabla_horarios_nivel;
    delete result.tabla_horarios_nivel;
  }
  if (body.incluye_almuerzo !== undefined) {
    result.incluyeAlmuerzo = Boolean(body.incluye_almuerzo);
    delete result.incluye_almuerzo;
  }
  if (body.horario_recepcion_almuerzo !== undefined) {
    result.horarioRecepcionAlmuerzo = body.horario_recepcion_almuerzo;
    delete result.horario_recepcion_almuerzo;
  }
  if (body.nivel_cambridge !== undefined) {
    result.nivelCambridge = body.nivel_cambridge;
    delete result.nivel_cambridge;
  }
  if (body.modalidades_cambridge !== undefined) {
    result.modalidadesCambridge = body.modalidades_cambridge;
    delete result.modalidades_cambridge;
  }
  if (body.costo_ciclo !== undefined) {
    result.costoCiclo = body.costo_ciclo;
    delete result.costo_ciclo;
  }
  if (body.monto_primer_pago !== undefined) {
    result.montoPrimerPago = body.monto_primer_pago;
    delete result.monto_primer_pago;
  }
  if (body.duracion_aviso_dias !== undefined) {
    result.duracionAvisoDias = body.duracion_aviso_dias;
    delete result.duracion_aviso_dias;
  }
  if (body.hora_limite_aviso !== undefined) {
    result.horaLimiteAviso = body.hora_limite_aviso;
    delete result.hora_limite_aviso;
  }
  if (body.invitacion_masiva !== undefined) {
    result.invitacionMasiva = Boolean(body.invitacion_masiva);
    delete result.invitacion_masiva;
  }
  if (body.alcance_invitacion_masiva !== undefined) {
    result.alcanceInvitacionMasiva = body.alcance_invitacion_masiva;
    delete result.alcance_invitacion_masiva;
  }
  if (body.plantilla_base64 !== undefined) {
    result.plantillaBase64 = body.plantilla_base64;
    delete result.plantilla_base64;
  }
  if (body.plantilla_variables !== undefined) {
    result.plantillaVariables = body.plantilla_variables;
    delete result.plantilla_variables;
  }
  if (body.plantilla_validada !== undefined) {
    result.plantillaValidada = Boolean(body.plantilla_validada);
    delete result.plantilla_validada;
  }

  return result;
}
