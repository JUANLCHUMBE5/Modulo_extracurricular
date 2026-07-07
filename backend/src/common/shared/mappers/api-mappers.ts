import { normalizeAttendanceStateToFrontend, normalizeEnrollmentStateToFrontend, normalizePaymentStateToFrontend, normalizeProgramStateToFrontend, normalizarTextoApi } from "./normalization.js";
import { esProgramaCambridgeApi, obtenerGradoCompletoApi, obtenerPlantillaProgramaApi, resolverDocentePorGradoApi, resolverHorarioPorGradoApi, tieneHorariosPorGrupoApi } from "./programs.js";

/**
 * Obtiene la configuración de la plantilla y variables unificada para una inscripción/matrícula.
 * @param db Instancia de la base de datos
 * @param inscripcion Registro de inscripción
 */
function obtenerPlantillaInscripcionApi(db: any, inscripcion: any = {}): any {
  const programa = (db?.programas || []).find((p: any) => p.id === inscripcion.programaId) || {};
  const guardada = db?.plantillasPorPrograma?.[inscripcion.programaId] || {};
  const variablesInscripcion = Array.isArray(inscripcion.plantillaVariables) ? inscripcion.plantillaVariables : [];
  const variablesPrograma = Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [];
  const variablesGuardadas = Array.isArray(guardada.plantillaVariables) ? guardada.plantillaVariables : [];
  const plantillaBase64 = inscripcion.plantillaBase64 || programa.plantillaBase64 || guardada.plantillaBase64 || "";

  return {
    programa,
    plantilla: inscripcion.plantilla || programa.plantilla || guardada.plantilla || "",
    plantillaBase64,
    plantillaVariables: variablesInscripcion.length
      ? variablesInscripcion
      : (variablesPrograma.length ? variablesPrograma : variablesGuardadas),
    plantillaValidada: Boolean(inscripcion.plantillaValidada || programa.plantillaValidada || guardada.plantillaValidada || plantillaBase64),
  };
}

/**
 * Mapea un registro de programa del almacenamiento a la estructura limpia esperada por la API del Frontend.
 * @param p Objeto del programa crudo de la DB
 * @param db Instancia de la base de datos (opcional para resolver plantillas)
 */
export function mapDbProgramToApi(p: any, db: any = null): any {
  if (!p) return null;
  const plantilla = obtenerPlantillaProgramaApi(db, p);
  return {
    id: p.id,
    nombre_programa: p.nombre,
    categoria: p.categoria,
    fecha_inicio: p.fechaInicio,
    fecha_fin: p.fechaFin,
    hora_inicio: p.horaInicio,
    hora_fin: p.horaFin,
    monto: p.costo,
    cupos: p.cupos,
    cupos_disponibles: p.cupos,
    cupos_ocupados: p.cuposOcupados || 0,
    estado_programa: normalizeProgramStateToFrontend(p.estado || "Habilitado"),
    grados: esProgramaCambridgeApi(p) ? [] : (p.gradosAplicables || []),
    responsable: p.responsable || p.docente || "",
    horario: p.horario || "",
    grupo: p.grupo || "",
    edad_minima: p.edadMinima || "",
    edad_maxima: p.edadMaxima || "",
    grupo_etario: p.grupoEtario || "",
    periodo: p.periodo || "escolar",
    modalidad_cobro: p.modalidadCobro || "Mensual",
    duracion_aviso_dias: p.duracionAvisoDias || 7,
    hora_limite_aviso: p.horaLimiteAviso || "23:59",
    requiere_uniforme: p.requiereUniforme,
    requiere_indumentaria: p.requiereIndumentaria,
    usar_fecha_limite_inscripcion: p.usarFechaLimiteInscripcion,
    fecha_apertura_inscripcion: p.fechaAperturaInscripcion || "",
    hora_apertura_inscripcion: p.horaAperturaInscripcion || "",
    fecha_limite_inscripcion: p.fechaLimiteInscripcion || "",
    hora_limite_inscripcion: p.horaLimiteInscripcion || "23:59",
    anuncio_imagen: p.anuncioImagen || "",
    anuncio_imagen_nombre: p.anuncioImagenNombre || "",
    talleres_deportivos: p.talleresDeportivos || p.talleres_deportivos || [],
    horarios_por_grupo: p.horariosPorGrupo || p.horarios_por_grupo || [],
    requisitos: p.requisitos || "",
    comunicado: p.comunicado || "",
    comunicado_completo: p.comunicadoCompleto || p.comunicado_completo || "",
    detalle_costo: p.detalleCosto || p.detalle_costo || "",
    detalle_almuerzo: p.detalleAlmuerzo || p.detalle_almuerzo || "",
    concesionarios: p.concesionarios || "",
    invitacion_masiva: p.invitacionMasiva,
    alcance_invitacion_masiva: p.alcanceInvitacionMasiva || "colegio",
    plantilla: plantilla.plantilla,
    plantilla_base64: plantilla.plantillaBase64,
    plantilla_variables: plantilla.plantillaVariables,
    plantilla_validada: plantilla.plantillaValidada,
    creado_desde_documento: Boolean(p.creadoDesdeDocumento),
    tipo_comunicado: p.tipoComunicado || "",
    tipo_documento: p.tipoDocumento || "",
    numero_documento: p.numeroDocumento || "",
    area_tematica: p.areaTematica || "",
    motivo_justificacion: p.motivoJustificacion || p.comunicado || "",
    nombre_ciclo: p.nombreCiclo || "",
    duracion: p.duracion || p.duracionTaller || "",
    tabla_horarios_nivel: p.tablaHorariosNivel || [],
    incluye_almuerzo: p.incluyeAlmuerzo || false,
    horario_recepcion_almuerzo: p.horarioRecepcionAlmuerzo || "",
    nivel_cambridge: p.nivelCambridge || "",
    modalidades_cambridge: p.modalidadesCambridge || [],
    costo_ciclo: p.costoCiclo || (p.costo ? String(p.costo) : ""),
    monto_primer_pago: p.montoPrimerPago || "",
    dias: Array.isArray(p.dias) ? p.dias : []
  };
}

/**
 * Mapea una inscripción de la base de datos a la estructura detallada requerida por la API del Frontend,
 * resolviendo información del estudiante, programa, pagos asociados, costos finales y horarios del alumno.
 * @param item Inscripción cruda de la base de datos
 * @param db Instancia de la base de datos
 */
export function mapDbEnrollmentToApi(item: any, db: any = null): any {
  if (!item) return null;
  const plantilla = obtenerPlantillaInscripcionApi(db, item);
  const programa = plantilla.programa || {};
  const student = db?.estudiantes?.[item.dniEstudiante] || {};
  const gradoEstudiante = obtenerGradoCompletoApi(item.gradoEstudiante || item.grado || student.grado, student.nivel || student.nivelEducativo || student.grado);
  return {
    inscripcion_id: item.id,
    estudiante_id: item.dniEstudiante || "",
    programa_id: item.programaId || "",
    creado_en: item.fechaRegistro || "",
    origen_inscripcion: item.origenRegistro || "Presencial",
    estado_inscripcion: normalizeEnrollmentStateToFrontend(item.estadoInscripcion || "Pendiente de pago"),
    dni_estudiante: item.dniEstudiante || "",
    codigo_estudiante: item.codigoEstudiante || student.codigoEstudiante || "",
    nombres_estudiante: item.nombresEstudiante || student.nombres || "",
    grado_estudiante: gradoEstudiante,
    seccion: item.seccion || "",
    nombre_programa: item.programa || programa.nombre || "",
    categoria: item.categoria || programa.categoria || "",
    horario: item.horario || resolverHorarioPorGradoApi(programa, gradoEstudiante) || (tieneHorariosPorGrupoApi(programa) ? "Horario no configurado para este grado" : programa.horario) || "",
    docente: item.docente || item.responsable || resolverDocentePorGradoApi(programa, gradoEstudiante) || "No definido",
    monto: item.costo ?? programa.costo ?? 0,
    modalidad_cobro: item.modalidadCobro || programa.modalidadCobro || "Mensual",
    fecha_inicio: item.fechaInicio || programa.fechaInicio || "",
    fecha_fin: item.fechaFin || programa.fechaFin || "",
    requisitos: item.requisitos || programa.requisitos || "",
    comunicado: item.comunicado || programa.comunicado || "",
    comunicado_completo: item.comunicadoCompleto || programa.comunicadoCompleto || "",
    detalle_costo: item.detalleCosto || programa.detalleCosto || "",
    detalle_almuerzo: item.detalleAlmuerzo || programa.detalleAlmuerzo || "",
    concesionarios: item.concesionarios || programa.concesionarios || "",
    tipo_comunicado: item.tipoComunicado || programa.tipoComunicado || "",
    tipo_documento: item.tipoDocumento || programa.tipoDocumento || "",
    numero_documento: item.numeroDocumento || programa.numeroDocumento || "",
    area_tematica: item.areaTematica || programa.areaTematica || "",
    motivo_justificacion: item.motivoJustificacion || programa.motivoJustificacion || item.comunicado || programa.comunicado || "",
    nombre_ciclo: item.nombreCiclo || programa.nombreCiclo || "",
    duracion: item.duracion || programa.duracion || item.duracionTaller || programa.duracionTaller || "",
    tabla_horarios_nivel: item.tablaHorariosNivel || programa.tablaHorariosNivel || [],
    incluye_almuerzo: item.incluyeAlmuerzo !== undefined ? item.incluyeAlmuerzo : (programa.incluyeAlmuerzo || false),
    horario_recepcion_almuerzo: item.horarioRecepcionAlmuerzo || programa.horarioRecepcionAlmuerzo || "",
    nivel_cambridge: item.nivelCambridge || programa.nivelCambridge || "",
    modalidades_cambridge: item.modalidadesCambridge || programa.modalidadesCambridge || [],
    costo_ciclo: item.costoCiclo ?? programa.costoCiclo ?? item.costo ?? programa.costo ?? "",
    monto_primer_pago: item.montoPrimerPago ?? programa.montoPrimerPago ?? "",
    duracion_aviso_dias: item.duracionAvisoDias || programa.duracionAvisoDias || 7,
    hora_limite_aviso: item.horaLimiteAviso || programa.horaLimiteAviso || "23:59",
    estado_programa: normalizeProgramStateToFrontend(programa.estado || "Habilitado"),
    usar_fecha_limite_inscripcion: item.usarFechaLimiteInscripcion !== undefined ? item.usarFechaLimiteInscripcion : (programa.usarFechaLimiteInscripcion || false),
    fecha_limite_inscripcion: item.fechaLimiteInscripcion || programa.fechaLimiteInscripcion || "",
    hora_limite_inscripcion: item.horaLimiteInscripcion || programa.horaLimiteInscripcion || "23:59",
    fecha_apertura_inscripcion: item.fechaAperturaInscripcion || programa.fechaAperturaInscripcion || "",
    hora_apertura_inscripcion: item.horaAperturaInscripcion || programa.horaAperturaInscripcion || "",
    plantilla: plantilla.plantilla,
    plantilla_base64: plantilla.plantillaBase64,
    plantilla_variables: plantilla.plantillaVariables,
    plantilla_validada: plantilla.plantillaValidada,
    apoderado: item.apoderado || "",
    telefono_apoderado: item.telefono || "",
    correo_apoderado: item.correo || "",
    estado_pago: (() => {
      const payments = db?.pagos || [];
      const p = payments.find((pay: any) => pay.inscripcionId === item.id) || 
                payments.find((pay: any) => pay.dniEstudiante === item.dniEstudiante && (pay.programaId === item.programaId || normalizarTextoApi(pay.programa) === normalizarTextoApi(item.programa)));
      if (p) {
        return normalizePaymentStateToFrontend(p.estado || "pendiente");
      }
      return "pendiente";
    })(),
    pago_id: item.pagoId || "",
    pago_referencia: item.pagoReferencia || "",
    pago_telefono: item.pagoTelefono || "",
    pago_captura_nombre: item.pagoCapturaNombre || "",
    pago_observacion_caja: item.pagoObservacionCaja || "",
    fecha_pago: item.fechaPago || "",
    derivado_caja: Boolean(item.derivadoCaja),
    estado_caja: item.estadoCaja || "",
    costoOriginal: item.costoOriginal,
    descuentoMonto: item.descuentoMonto,
    descuentoTipo: item.descuentoTipo,
    descuentoValor: item.descuentoValor,
    descuentoJustificacion: item.descuentoJustificacion,
    descuentoAprobado: item.descuentoAprobado || false,
    descuentoAprobadoPor: item.descuentoAprobadoPor,
    descuentoFechaAprobacion: item.descuentoFechaAprobacion
  };
}

/**
 * Mapea un registro de pago a la estructura legible por la API de la interfaz de Caja y Administración.
 * @param item Objeto del pago en base de datos
 */
export function mapDbPaymentToApi(item: any): any {
  if (!item) return null;
  return {
    pago_id: item.id,
    inscripcion_id: item.inscripcionId,
    monto_pago: item.monto,
    metodo_pago: item.formaPago,
    estado_pago: normalizePaymentStateToFrontend(item.estado),
    comprobante_url: item.capturaPagoBase64 || "",
    motivo_observacion: item.observacion || item.observaciones || "",
    usuario_validacion: item.validadoPor || "",
    fecha_validacion: item.validadoEn || "",
    dni_estudiante: item.dniEstudiante,
    nombres_estudiante: item.nombresEstudiante || "",
    nombre_programa: item.programa || "",
    programa_fecha_inicio: item.programaFechaInicio || item.fechaInicio || "",
    programa_fecha_fin: item.programaFechaFin || item.fechaFin || "",
    estado_programa: item.estadoPrograma || "",
    periodo: item.periodo || "escolar",
    creado_en: item.fecha || "",
    numero_operacion: item.numeroOperacion || "",
    telefono_operacion: item.telefonoOperacion || "",
    origen_registro: item.origenRegistro || "Portal padres",
    nro_recibo: item.nroRecibo || item.nro_recibo || "",
    nroRecibo: item.nroRecibo || item.nro_recibo || "",
    descuento_aprobado: item.descuentoAprobado || false,
    descuento_tipo: item.descuentoTipo || "",
    descuento_monto: item.descuentoMonto || 0,
    descuento_justificacion: item.descuentoJustificacion || "",
    descuentoAprobado: item.descuentoAprobado || false,
    descuentoTipo: item.descuentoTipo || "",
    descuentoMonto: item.descuentoMonto || 0,
    descuentoJustificacion: item.descuentoJustificacion || ""
  };
}

/**
 * Mapea un registro de asistencia del alumno a la estructura requerida por las llamadas y reportes de la API.
 * @param item Registro de asistencia de la base de datos
 */
export function mapDbAsistenciaToApi(item: any): any {
  if (!item) return null;
  return {
    asistencia_id: item.id,
    estudiante_id: item.dniEstudiante || "",
    programa_id: item.programaId || "",
    fecha_asistencia: item.fechaRegistro || item.fecha || "",
    estado_asistencia: normalizeAttendanceStateToFrontend(item.estadoAcceso || item.estado || "presente"),
    usuario_registro: item.origen || item.registradoPor || "Auxiliar",
    dni_estudiante: item.dniEstudiante || "",
    codigo_estudiante: item.codigoEstudiante || "",
    nombres_estudiante: item.nombresEstudiante || "",
    nombre_programa: item.programa || "",
    horario: item.horario || "",
    observacion: item.observacion || "",
    estado_pago: item.estadoPago || "Pendiente"
  };
}
