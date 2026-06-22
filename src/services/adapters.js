/**
 * Adaptadores de datos para migración de API
 * Módulo Extracurricular - IEP San Rafael S.A.C.
 *
 * Traducen objetos en formato de la API (generalmente snake_case y/o nombres oficiales)
 * al formato esperado por el frontend (generalmente camelCase y/o nombres mock), y viceversa.
 */

/**
 * Adapta un programa/taller desde el formato API al formato del frontend
 */
export function adaptarPrograma(apiPrograma) {
  if (!apiPrograma) return null;
  return {
    id: apiPrograma.id || apiPrograma.programa_id || apiPrograma.programaId || "",
    programaId: apiPrograma.programa_id || apiPrograma.programaId || apiPrograma.id || "",
    nombre: apiPrograma.nombre_programa || apiPrograma.nombre || apiPrograma.programa || "",
    categoria: apiPrograma.categoria || "General",
    fechaInicio: apiPrograma.fecha_inicio || apiPrograma.fechaInicio || "",
    fechaFin: apiPrograma.fecha_fin || apiPrograma.fechaFin || "",
    horaInicio: apiPrograma.hora_inicio || apiPrograma.horaInicio || "",
    horaFin: apiPrograma.hora_fin || apiPrograma.horaFin || "",
    precio: apiPrograma.monto !== undefined ? Number(apiPrograma.monto) : (apiPrograma.precio !== undefined ? Number(apiPrograma.precio) : Number(apiPrograma.costo || 0)),
    costo: apiPrograma.monto !== undefined ? Number(apiPrograma.monto) : (apiPrograma.precio !== undefined ? Number(apiPrograma.precio) : Number(apiPrograma.costo || 0)),
    cupos: apiPrograma.cupos_disponibles !== undefined ? Number(apiPrograma.cupos_disponibles) : Number(apiPrograma.cupos || 0),
    cuposOcupados: apiPrograma.cupos_ocupados !== undefined ? Number(apiPrograma.cupos_ocupados) : Number(apiPrograma.cuposOcupados || 0),
    cuposDisponibles: (apiPrograma.cupos_disponibles !== undefined ? Number(apiPrograma.cupos_disponibles) : Number(apiPrograma.cupos || 0)) - (apiPrograma.cupos_ocupados !== undefined ? Number(apiPrograma.cupos_ocupados) : Number(apiPrograma.cuposOcupados || 0)),
    estado: apiPrograma.estado_programa || apiPrograma.estado || "Habilitado",
    requiereReconfiguracion: Boolean(apiPrograma.requiere_reconfiguracion ?? apiPrograma.requiereReconfiguracion),
    gradosAplicables: apiPrograma.grados || apiPrograma.gradosAplicables || (apiPrograma.grado ? [apiPrograma.grado] : []),
    responsable: apiPrograma.responsable || apiPrograma.docente || "",
    horario: apiPrograma.horario || "",
    grupo: apiPrograma.grupo || "",
    edadMinima: apiPrograma.edad_minima || apiPrograma.edadMinima || "",
    edadMaxima: apiPrograma.edad_maxima || apiPrograma.edadMaxima || "",
    grupoEtario: apiPrograma.grupo_etario || apiPrograma.grupoEtario || "",
    periodo: apiPrograma.periodo || "escolar",
    modalidadCobro: apiPrograma.modalidad_cobro || apiPrograma.modalidadCobro || "Mensual",
    duracionAvisoDias: apiPrograma.duracion_aviso_dias || apiPrograma.duracionAvisoDias || "",
    horaLimiteAviso: apiPrograma.hora_limite_aviso || apiPrograma.horaLimiteAviso || "23:59",
    requiereUniforme: apiPrograma.requiere_uniforme !== undefined ? Boolean(apiPrograma.requiere_uniforme) : Boolean(apiPrograma.requiereUniforme),
    requiereIndumentaria: apiPrograma.requiere_indumentaria !== undefined ? Boolean(apiPrograma.requiere_indumentaria) : Boolean(apiPrograma.requiereIndumentaria),
    anuncioImagen: apiPrograma.anuncio_imagen || apiPrograma.anuncioImagen || "",
    anuncioImagenNombre: apiPrograma.anuncio_imagen_nombre || apiPrograma.anuncioImagenNombre || "",
    talleresDeportivos: apiPrograma.talleres_deportivos || apiPrograma.talleresDeportivos || [],
    horariosPorGrupo: apiPrograma.horarios_por_grupo || apiPrograma.horariosPorGrupo || [],
    requisitos: apiPrograma.requisitos || "",
    comunicado: apiPrograma.comunicado || "",
    comunicadoCompleto: apiPrograma.comunicado_completo || apiPrograma.comunicadoCompleto || "",
    detalleCosto: apiPrograma.detalle_costo || apiPrograma.detalleCosto || "",
    detalleAlmuerzo: apiPrograma.detalle_almuerzo || apiPrograma.detalleAlmuerzo || "",
    concesionarios: apiPrograma.concesionarios || "",
    invitacionMasiva: Boolean(apiPrograma.invitacion_masiva ?? apiPrograma.invitacionMasiva),
    alcanceInvitacionMasiva: apiPrograma.alcance_invitacion_masiva || apiPrograma.alcanceInvitacionMasiva || "colegio",
    plantilla: apiPrograma.plantilla || "",
    plantillaBase64: apiPrograma.plantilla_base64 || apiPrograma.plantillaBase64 || "",
    plantillaVariables: apiPrograma.plantilla_variables || apiPrograma.plantillaVariables || [],
    plantillaValidada: Boolean(apiPrograma.plantilla_validada ?? apiPrograma.plantillaValidada),
    creadoDesdeDocumento: Boolean(apiPrograma.creado_desde_documento ?? apiPrograma.creadoDesdeDocumento),
    codigoEstudiante: apiPrograma.codigo_estudiante || apiPrograma.codigoEstudiante || "",
    dni: apiPrograma.dni || apiPrograma.dni_estudiante || "",
    grado: apiPrograma.grado || apiPrograma.grado_nombre || "",
    seccion: apiPrograma.seccion || "",
    nivelEducativo: apiPrograma.nivel_educativo || apiPrograma.nivelEducativo || apiPrograma.nivel_nombre || "",
    seleccion: apiPrograma.seleccion || "",
    estadoInvitacion: apiPrograma.estado_invitacion || apiPrograma.estadoInvitacion || "",
    tipoComunicado: apiPrograma.tipo_comunicado || apiPrograma.tipoComunicado || "Otro genérico",
    tipoDocumento: apiPrograma.tipo_documento || apiPrograma.tipoDocumento || "Comunicado",
    numeroDocumento: apiPrograma.numero_documento || apiPrograma.numeroDocumento || "",
    areaTematica: apiPrograma.area_tematica || apiPrograma.areaTematica || "No aplica",
    motivoJustificacion: apiPrograma.motivo_justificacion || apiPrograma.motivoJustificacion || apiPrograma.comunicado || "",
    nombreCiclo: apiPrograma.nombre_ciclo || apiPrograma.nombreCiclo || "Ciclo I",
    duracion: apiPrograma.duracion || apiPrograma.duracionTaller || "",
    tablaHorariosNivel: apiPrograma.tabla_horarios_nivel || apiPrograma.tablaHorariosNivel || [],
    incluyeAlmuerzo: apiPrograma.incluye_almuerzo !== undefined ? Boolean(apiPrograma.incluye_almuerzo) : Boolean(apiPrograma.incluyeAlmuerzo),
    horarioRecepcionAlmuerzo: apiPrograma.horario_recepcion_almuerzo || apiPrograma.horarioRecepcionAlmuerzo || "",
    nivelCambridge: apiPrograma.nivel_cambridge || apiPrograma.nivelCambridge || "",
    modalidadesCambridge: apiPrograma.modalidades_cambridge || apiPrograma.modalidadesCambridge || [],
    costoCiclo: apiPrograma.costo_ciclo !== undefined ? String(apiPrograma.costo_ciclo) : (apiPrograma.costoCiclo !== undefined ? String(apiPrograma.costoCiclo) : (apiPrograma.costo !== undefined ? String(apiPrograma.costo) : (apiPrograma.monto !== undefined ? String(apiPrograma.monto) : ""))),
    montoPrimerPago: apiPrograma.monto_primer_pago !== undefined ? String(apiPrograma.monto_primer_pago) : (apiPrograma.montoPrimerPago !== undefined ? String(apiPrograma.montoPrimerPago) : ""),
  };
}

/**
 * Adapta un estudiante desde el formato API al formato del frontend
 */
export function adaptarEstudiante(apiEstudiante) {
  if (!apiEstudiante) return null;

  let gradoCompleto = apiEstudiante.grado_nombre || apiEstudiante.grado || "";
  const nivel = apiEstudiante.nivel_nombre || apiEstudiante.nivel || "";
  if (gradoCompleto && /^\d+$/.test(String(gradoCompleto).trim()) && nivel) {
    if (nivel.toLowerCase().includes("inicial")) {
      gradoCompleto = `${gradoCompleto} inicial`;
    } else {
      gradoCompleto = `${gradoCompleto} ${nivel}`;
    }
  }

  return {
    id: apiEstudiante.estudiante_id || apiEstudiante.id || "",
    dni: apiEstudiante.dni_estudiante || apiEstudiante.dni || "",
    codigoEstudiante: apiEstudiante.codigo_estudiante || apiEstudiante.codigoEstudiante || "",
    nombres: apiEstudiante.nombres || "",
    apellidos: apiEstudiante.apellidos || "",
    fechaNacimiento: apiEstudiante.fecha_nacimiento || apiEstudiante.fechaNacimiento || "",
    grado: gradoCompleto,
    seccion: apiEstudiante.seccion || "",
    nivel: nivel,
    sexo: apiEstudiante.sexo || "",
    tipoAlumno: apiEstudiante.tipo_alumno || apiEstudiante.tipoAlumno || "Alumno interno",
    periodo: apiEstudiante.periodo || "",
    estadoMatricula: apiEstudiante.estado_matricula || apiEstudiante.estadoMatricula || "Activo",
    apoderado: apiEstudiante.apoderado || "",
    telefonoApoderado: apiEstudiante.telefono_apoderado || apiEstudiante.telefonoApoderado || "",
    correoApoderado: apiEstudiante.correo_apoderado || apiEstudiante.correoApoderado || "",
    tieneInvitacion: Boolean(apiEstudiante.tieneInvitacion || apiEstudiante.tiene_invitacion),
    programaAsignado: apiEstudiante.programaAsignado || apiEstudiante.programa_asignado || "",
    programaNombre: apiEstudiante.programaNombre || apiEstudiante.programa_nombre || "",
    programaGrupo: apiEstudiante.programaGrupo || apiEstudiante.programa_grupo || "",
    programaGrupoEtario: apiEstudiante.programaGrupoEtario || apiEstudiante.programa_grupo_etario || "",
    programaHorario: apiEstudiante.programaHorario || apiEstudiante.programa_horario || "",
    programaDisponible: apiEstudiante.programaDisponible ?? apiEstudiante.programa_disponible,
    programaHorarioConfigurado: apiEstudiante.programaHorarioConfigurado ?? apiEstudiante.programa_horario_configurado,
    programaDocente: apiEstudiante.programaDocente || apiEstudiante.programa_docente || "",
    programaCosto: Number(apiEstudiante.programaCosto ?? apiEstudiante.programa_costo ?? 0),
    programaCupos: apiEstudiante.programaCupos || apiEstudiante.programa_cupos || "",
    programaCuposDisponibles: Number(apiEstudiante.programaCuposDisponibles ?? apiEstudiante.programa_cupos_disponibles ?? 0),
    programaModalidadCobro: apiEstudiante.programaModalidadCobro || apiEstudiante.programa_modalidad_cobro || "",
    programaRequisitos: apiEstudiante.programaRequisitos || apiEstudiante.programa_requisitos || "",
    programaFechaInicio: apiEstudiante.programaFechaInicio || apiEstudiante.programa_fecha_inicio || "",
    programaFechaFin: apiEstudiante.programaFechaFin || apiEstudiante.programa_fecha_fin || "",
    programaDuracionTaller: apiEstudiante.programaDuracionTaller || apiEstudiante.programa_duracion_taller || "",
    programaDuracionAvisoDias: apiEstudiante.programaDuracionAvisoDias ?? apiEstudiante.programa_duracion_aviso_dias ?? "",
    programaHoraLimiteAviso: apiEstudiante.programaHoraLimiteAviso ?? apiEstudiante.programa_hora_limite_aviso ?? "23:59",
    seleccion: apiEstudiante.seleccion || "",
    nivelCambridge: apiEstudiante.nivelCambridge || apiEstudiante.nivel_cambridge || "",
    plantilla: apiEstudiante.plantilla || "",
    plantillaBase64: apiEstudiante.plantilla_base64 || apiEstudiante.plantillaBase64 || "",
    plantillaVariables: apiEstudiante.plantilla_variables || apiEstudiante.plantillaVariables || [],
    plantillaValidada: Boolean(apiEstudiante.plantilla_validada ?? apiEstudiante.plantillaValidada),
    requiereUniforme: Boolean(apiEstudiante.requiere_uniforme ?? apiEstudiante.requiereUniforme),
    requiereIndumentaria: Boolean(apiEstudiante.requiere_indumentaria ?? apiEstudiante.requiereIndumentaria)
  };
}

/**
 * Adapta una inscripción desde el formato API al formato del frontend
 */
export function adaptarInscripcion(apiInscripcion) {
  if (!apiInscripcion) return null;

  let gradoCompleto = apiInscripcion.grado_estudiante || apiInscripcion.gradoEstudiante || apiInscripcion.grado || "";
  const nivel = apiInscripcion.nivel_educativo || apiInscripcion.nivelEducativo || apiInscripcion.nivel_nombre || apiInscripcion.nivel || "";
  if (gradoCompleto && /^\d+$/.test(String(gradoCompleto).trim()) && nivel) {
    if (nivel.toLowerCase().includes("inicial")) {
      gradoCompleto = `${gradoCompleto} inicial`;
    } else {
      gradoCompleto = `${gradoCompleto} ${nivel}`;
    }
  }

  return {
    id: apiInscripcion.inscripcion_id || apiInscripcion.id || "",
    estudianteId: apiInscripcion.estudiante_id || apiInscripcion.estudianteId || "",
    programaId: apiInscripcion.programa_id || apiInscripcion.programaId || "",
    fechaRegistro: apiInscripcion.creado_en || apiInscripcion.fechaRegistro || "",
    origen: apiInscripcion.origen_inscripcion || apiInscripcion.origen || apiInscripcion.origenRegistro || "Portal padres",
    estado: apiInscripcion.estado_inscripcion || apiInscripcion.estado || apiInscripcion.estadoInscripcion || "Pendiente de pago",

    // Propiedades heredadas y calculadas para compatibilidad con vistas React
    dniEstudiante: apiInscripcion.dni_estudiante || apiInscripcion.dniEstudiante || "",
    dni: apiInscripcion.dni || apiInscripcion.dni_estudiante || apiInscripcion.dniEstudiante || "",
    codigoEstudiante: apiInscripcion.codigo_estudiante || apiInscripcion.codigoEstudiante || "",
    nombresEstudiante: apiInscripcion.nombres_estudiante || apiInscripcion.nombresEstudiante || "",
    nombres: apiInscripcion.nombres || apiInscripcion.nombres_estudiante || apiInscripcion.nombresEstudiante || "",
    gradoEstudiante: gradoCompleto,
    grado: gradoCompleto,
    seccion: apiInscripcion.seccion || "",
    programa: apiInscripcion.nombre_programa || apiInscripcion.programa || "",
    categoria: apiInscripcion.categoria || "",
    horario: apiInscripcion.horario || "",
    docente: apiInscripcion.docente || apiInscripcion.responsable || "No definido",
    tutora: apiInscripcion.tutora || "No definido",
    costo: apiInscripcion.monto !== undefined ? Number(apiInscripcion.monto) : Number(apiInscripcion.costo || 0),
    modalidadCobro: apiInscripcion.modalidad_cobro || apiInscripcion.modalidadCobro || "Mensual",
    fechaInicio: apiInscripcion.fecha_inicio || apiInscripcion.fechaInicio || "",
    fechaFin: apiInscripcion.fecha_fin || apiInscripcion.fechaFin || "",
    apoderado: apiInscripcion.apoderado || "",
    telefono: apiInscripcion.telefono_apoderado || apiInscripcion.telefono || "",
    correo: apiInscripcion.correo_apoderado || apiInscripcion.correo || "",
    estadoInscripcion: apiInscripcion.estado_inscripcion || apiInscripcion.estadoInscripcion || "Pendiente de pago",
    estadoPago: apiInscripcion.estado_pago || apiInscripcion.estadoPago || "Pendiente",
    pagoId: apiInscripcion.pago_id || apiInscripcion.pagoId || null,
    pagoReferencia: apiInscripcion.pago_referencia || apiInscripcion.pagoReferencia || "",
    pagoTelefono: apiInscripcion.pago_telefono || apiInscripcion.pagoTelefono || "",
    pagoCapturaNombre: apiInscripcion.pago_captura_nombre || apiInscripcion.pagoCapturaNombre || "",
    pagoObservacionCaja: apiInscripcion.pago_observacion_caja || apiInscripcion.pagoObservacionCaja || "",
    fechaPago: apiInscripcion.fecha_pago || apiInscripcion.fechaPago || "",
    origenRegistro: apiInscripcion.origen_inscripcion || apiInscripcion.origen || apiInscripcion.origenRegistro || "Portal padres",
    requisitos: apiInscripcion.requisitos || "",
    comunicado: apiInscripcion.comunicado || "",
    comunicadoCompleto: apiInscripcion.comunicado_completo || apiInscripcion.comunicadoCompleto || "",
    detalleCosto: apiInscripcion.detalle_costo || apiInscripcion.detalleCosto || "",
    detalleAlmuerzo: apiInscripcion.detalle_almuerzo || apiInscripcion.detalleAlmuerzo || "",
    concesionarios: apiInscripcion.concesionarios || "",
    plantilla: apiInscripcion.plantilla || "",
    plantillaBase64: apiInscripcion.plantilla_base64 || apiInscripcion.plantillaBase64 || "",
    plantillaVariables: apiInscripcion.plantilla_variables || apiInscripcion.plantillaVariables || [],
    plantillaValidada: Boolean(apiInscripcion.plantilla_validada ?? apiInscripcion.plantillaValidada),
    derivadoCaja: Boolean(apiInscripcion.derivado_caja ?? apiInscripcion.derivadoCaja),
    estadoCaja: apiInscripcion.estado_caja || apiInscripcion.estadoCaja || "",
    periodo: apiInscripcion.periodo || "",
    duracionAvisoDias: apiInscripcion.duracion_aviso_dias || apiInscripcion.duracionAvisoDias || "",
    horaLimiteAviso: apiInscripcion.hora_limite_aviso || apiInscripcion.horaLimiteAviso || "23:59",
    tipoComunicado: apiInscripcion.tipo_comunicado || apiInscripcion.tipoComunicado || "",
    tipoDocumento: apiInscripcion.tipo_documento || apiInscripcion.tipoDocumento || "",
    numeroDocumento: apiInscripcion.numero_documento || apiInscripcion.numeroDocumento || "",
    areaTematica: apiInscripcion.area_tematica || apiInscripcion.areaTematica || "",
    motivoJustificacion: apiInscripcion.motivo_justificacion || apiInscripcion.motivoJustificacion || apiInscripcion.comunicado || apiInscripcion.comunicadoCompleto || "",
    nombreCiclo: apiInscripcion.nombre_ciclo || apiInscripcion.nombreCiclo || "",
    duracion: apiInscripcion.duracion || apiInscripcion.duracionTaller || "",
    tablaHorariosNivel: apiInscripcion.tabla_horarios_nivel || apiInscripcion.tablaHorariosNivel || [],
    incluyeAlmuerzo: apiInscripcion.incluye_almuerzo !== undefined ? Boolean(apiInscripcion.incluye_almuerzo) : Boolean(apiInscripcion.incluyeAlmuerzo),
    horarioRecepcionAlmuerzo: apiInscripcion.horario_recepcion_almuerzo || apiInscripcion.horarioRecepcionAlmuerzo || "",
    nivelCambridge: apiInscripcion.nivel_cambridge || apiInscripcion.nivelCambridge || "",
    modalidadesCambridge: apiInscripcion.modalidades_cambridge || apiInscripcion.modalidadesCambridge || [],
    costoCiclo: apiInscripcion.costo_ciclo !== undefined ? String(apiInscripcion.costo_ciclo) : (apiInscripcion.costoCiclo !== undefined ? String(apiInscripcion.costoCiclo) : (apiInscripcion.costo !== undefined ? String(apiInscripcion.costo) : "")),
    montoPrimerPago: apiInscripcion.monto_primer_pago !== undefined ? String(apiInscripcion.monto_primer_pago) : (apiInscripcion.montoPrimerPago !== undefined ? String(apiInscripcion.montoPrimerPago) : ""),
    costoOriginal: apiInscripcion.costoOriginal !== undefined ? Number(apiInscripcion.costoOriginal) : (apiInscripcion.costo_original !== undefined ? Number(apiInscripcion.costo_original) : undefined),
    descuentoMonto: apiInscripcion.descuentoMonto !== undefined ? Number(apiInscripcion.descuentoMonto) : (apiInscripcion.descuento_monto !== undefined ? Number(apiInscripcion.descuento_monto) : undefined),
    descuentoTipo: apiInscripcion.descuentoTipo || apiInscripcion.descuento_tipo || undefined,
    descuentoValor: apiInscripcion.descuentoValor !== undefined ? Number(apiInscripcion.descuentoValor) : (apiInscripcion.descuento_valor !== undefined ? Number(apiInscripcion.descuento_valor) : undefined),
    descuentoJustificacion: apiInscripcion.descuentoJustificacion || apiInscripcion.descuento_justificacion || undefined,
    descuentoAprobado: apiInscripcion.descuentoAprobado !== undefined ? Boolean(apiInscripcion.descuentoAprobado) : (apiInscripcion.descuento_aprobado !== undefined ? Boolean(apiInscripcion.descuento_aprobado) : false),
    descuentoAprobadoPor: apiInscripcion.descuentoAprobadoPor || apiInscripcion.descuento_aprobado_por || undefined,
    descuentoFechaAprobacion: apiInscripcion.descuentoFechaAprobacion || apiInscripcion.descuento_fecha_aprobacion || undefined,
  };
}

/**
 * Adapta un pago desde el formato API al formato del frontend
 */
export function adaptarPago(apiPago) {
  if (!apiPago) return null;
  const idPago = apiPago.pago_id || apiPago.pagoId || apiPago.id || "";
  const nombreEstudiante = apiPago.estudiante || apiPago.nombres_estudiante || apiPago.nombresEstudiante || apiPago.estudianteNombre || "";
  const estadoPago = apiPago.estadoPago || apiPago.estado_pago || apiPago.estado || "pendiente";
  const origen = apiPago.origen || apiPago.origen_registro || apiPago.origenRegistro || "Portal padres";

  return {
    id: idPago,
    pagoId: apiPago.pago_id || apiPago.pagoId || null,
    inscripcionId: apiPago.inscripcion_id || apiPago.inscripcionId || null,
    monto: apiPago.monto_pago !== undefined ? Number(apiPago.monto_pago) : Number(apiPago.monto || 0),
    metodo: apiPago.metodo_pago || apiPago.metodo || apiPago.formaPago || apiPago.medioPago || "Yape",
    formaPago: apiPago.metodo_pago || apiPago.metodo || apiPago.formaPago || apiPago.medioPago || "Yape",
    estado: estadoPago,
    estadoPago,
    estadoInscripcion: apiPago.estadoInscripcion || apiPago.estado_inscripcion || "",
    estadoVerificacion: apiPago.estadoVerificacion || apiPago.estado_verificacion || "",
    comprobante: apiPago.comprobante_url || apiPago.comprobante || apiPago.capturaPagoBase64 || "",
    capturaPagoBase64: apiPago.comprobante_url || apiPago.comprobante || apiPago.capturaPagoBase64 || "",
    capturaPagoNombre: apiPago.capturaPagoNombre || apiPago.captura_pago_nombre || "",
    observacion: apiPago.motivo_observacion || apiPago.observacion || apiPago.observaciones || "",
    observaciones: apiPago.motivo_observacion || apiPago.observacion || apiPago.observaciones || "",
    validadoPor: apiPago.usuario_validacion || apiPago.validadoPor || "",
    validadoEn: apiPago.fecha_validacion || apiPago.validadoEn || "",

    // Campos extendidos para bandeja y reportes de Caja
    dniEstudiante: apiPago.dni_estudiante || apiPago.dniEstudiante || apiPago.estudianteDni || "",
    estudianteDni: apiPago.dni_estudiante || apiPago.dniEstudiante || apiPago.estudianteDni || "",
    estudiante: nombreEstudiante,
    nombresEstudiante: nombreEstudiante,
    estudianteNombre: nombreEstudiante,
    programaId: apiPago.programa_id || apiPago.programaId || "",
    programa: apiPago.nombre_programa || apiPago.programa || apiPago.programaNombre || "",
    programaNombre: apiPago.nombre_programa || apiPago.programa || apiPago.programaNombre || "",
    periodo: apiPago.periodo || "escolar",
    fecha: apiPago.fecha || apiPago.fechaPago || apiPago.creado_en || "",
    fechaRegistro: apiPago.fechaRegistro || apiPago.fecha_registro || apiPago.creado_en || "",
    fechaPago: apiPago.fecha || apiPago.fechaPago || "",
    numeroOperacion: apiPago.numero_operacion || apiPago.numeroOperacion || apiPago.referenciaPago || "",
    telefonoOperacion: apiPago.telefono_operacion || apiPago.telefonoOperacion || "",
    origen,
    origenRegistro: origen,
    fuente: apiPago.fuente || "",
    apoderado: apiPago.apoderado || "",
    telefono: apiPago.telefono || apiPago.telefono_apoderado || "",
    puedePagarCaja: Boolean(apiPago.puedePagarCaja),
    nroRecibo: apiPago.nro_recibo || apiPago.nroRecibo || "",
    descuentoAprobado: Boolean(apiPago.descuento_aprobado || apiPago.descuentoAprobado),
    descuentoTipo: apiPago.descuento_tipo || apiPago.descuentoTipo || "",
    descuentoMonto: apiPago.descuento_monto !== undefined ? Number(apiPago.descuento_monto) : Number(apiPago.descuentoMonto || 0),
    descuentoJustificacion: apiPago.descuento_justificacion || apiPago.descuentoJustificacion || ""
  };
}

/**
 * Adapta una asistencia desde el formato API al formato del frontend
 */
export function adaptarAsistencia(apiAsistencia) {
  if (!apiAsistencia) return null;
  return {
    id: apiAsistencia.asistencia_id || apiAsistencia.id || "",
    estudianteId: apiAsistencia.estudiante_id || apiAsistencia.estudianteId || apiAsistencia.dniEstudiante || "",
    programaId: apiAsistencia.programa_id || apiAsistencia.programaId || "",
    fecha: apiAsistencia.fecha_asistencia || apiAsistencia.fecha || apiAsistencia.fechaRegistro || "",
    estado: apiAsistencia.estado_asistencia || apiAsistencia.estado || apiAsistencia.estadoAcceso || "presente",
    registradoPor: apiAsistencia.usuario_registro || apiAsistencia.registradoPor || apiAsistencia.origen || "Auxiliar",

    // Atributos de compatibilidad frontend
    dniEstudiante: apiAsistencia.dni_estudiante || apiAsistencia.estudianteId || apiAsistencia.dni || "",
    codigoEstudiante: apiAsistencia.codigo_estudiante || apiAsistencia.codigoEstudiante || "",
    nombresEstudiante: apiAsistencia.nombres_estudiante || apiAsistencia.nombresEstudiante || apiAsistencia.nombres || "",
    programa: apiAsistencia.nombre_programa || apiAsistencia.programa || "",
    horario: apiAsistencia.horario || "",
    observacion: apiAsistencia.observacion || "",
    estadoPago: apiAsistencia.estado_pago || apiAsistencia.estadoPago || "Pendiente"
  };
}

