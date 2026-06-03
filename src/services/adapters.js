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
    id: apiPrograma.id,
    nombre: apiPrograma.nombre_programa || apiPrograma.nombre || "",
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
    gradosAplicables: apiPrograma.grados || apiPrograma.gradosAplicables || [],
    responsable: apiPrograma.responsable || apiPrograma.docente || "",
    horario: apiPrograma.horario || "",
    periodo: apiPrograma.periodo || "escolar",
    modalidadCobro: apiPrograma.modalidad_cobro || apiPrograma.modalidadCobro || "Mensual",
    requiereUniforme: apiPrograma.requiere_uniforme !== undefined ? Boolean(apiPrograma.requiere_uniforme) : Boolean(apiPrograma.requiereUniforme),
    requiereIndumentaria: apiPrograma.requiere_indumentaria !== undefined ? Boolean(apiPrograma.requiere_indumentaria) : Boolean(apiPrograma.requiereIndumentaria),
    anuncioImagen: apiPrograma.anuncio_imagen || apiPrograma.anuncioImagen || "",
    anuncioImagenNombre: apiPrograma.anuncio_imagen_nombre || apiPrograma.anuncioImagenNombre || "",
    talleresDeportivos: apiPrograma.talleres_deportivos || apiPrograma.talleresDeportivos || [],
    horariosPorGrupo: apiPrograma.horarios_por_grupo || apiPrograma.horariosPorGrupo || [],
    requisitos: apiPrograma.requisitos || "",
    comunicado: apiPrograma.comunicado || "",
    detalleCosto: apiPrograma.detalle_costo || apiPrograma.detalleCosto || "",
    detalleAlmuerzo: apiPrograma.detalle_almuerzo || apiPrograma.detalleAlmuerzo || "",
    concesionarios: apiPrograma.concesionarios || ""
  };
}

/**
 * Adapta un estudiante desde el formato API al formato del frontend
 */
export function adaptarEstudiante(apiEstudiante) {
  if (!apiEstudiante) return null;
  return {
    id: apiEstudiante.estudiante_id || apiEstudiante.id || "",
    dni: apiEstudiante.dni_estudiante || apiEstudiante.dni || "",
    codigoEstudiante: apiEstudiante.codigo_estudiante || apiEstudiante.codigoEstudiante || "",
    nombres: apiEstudiante.nombres || "",
    apellidos: apiEstudiante.apellidos || "",
    fechaNacimiento: apiEstudiante.fecha_nacimiento || apiEstudiante.fechaNacimiento || "",
    grado: apiEstudiante.grado_nombre || apiEstudiante.grado || "",
    seccion: apiEstudiante.seccion || "",
    nivel: apiEstudiante.nivel_nombre || apiEstudiante.nivel || "",
    sexo: apiEstudiante.sexo || "",
    tipoAlumno: apiEstudiante.tipo_alumno || apiEstudiante.tipoAlumno || "Alumno interno",
    estadoMatricula: apiEstudiante.estado_matricula || apiEstudiante.estadoMatricula || "Activo",
    apoderado: apiEstudiante.apoderado || "",
    telefonoApoderado: apiEstudiante.telefono_apoderado || apiEstudiante.telefonoApoderado || "",
    correoApoderado: apiEstudiante.correo_apoderado || apiEstudiante.correoApoderado || ""
  };
}

/**
 * Adapta una inscripción desde el formato API al formato del frontend
 */
export function adaptarInscripcion(apiInscripcion) {
  if (!apiInscripcion) return null;
  return {
    id: apiInscripcion.inscripcion_id || apiInscripcion.id || "",
    estudianteId: apiInscripcion.estudiante_id || apiInscripcion.estudianteId || "",
    programaId: apiInscripcion.programa_id || apiInscripcion.programaId || "",
    fechaRegistro: apiInscripcion.creado_en || apiInscripcion.fechaRegistro || "",
    origen: apiInscripcion.origen_inscripcion || apiInscripcion.origen || apiInscripcion.origenRegistro || "Portal padres",
    estado: apiInscripcion.estado_inscripcion || apiInscripcion.estado || apiInscripcion.estadoInscripcion || "Pendiente de pago",
    
    // Propiedades heredadas y calculadas para compatibilidad con vistas React
    dniEstudiante: apiInscripcion.dni_estudiante || apiInscripcion.dniEstudiante || "",
    codigoEstudiante: apiInscripcion.codigo_estudiante || apiInscripcion.codigoEstudiante || "",
    nombresEstudiante: apiInscripcion.nombres_estudiante || apiInscripcion.nombresEstudiante || "",
    gradoEstudiante: apiInscripcion.grado_estudiante || apiInscripcion.gradoEstudiante || apiInscripcion.grado || "",
    grado: apiInscripcion.grado_estudiante || apiInscripcion.gradoEstudiante || apiInscripcion.grado || "",
    seccion: apiInscripcion.seccion || "",
    programa: apiInscripcion.nombre_programa || apiInscripcion.programa || "",
    categoria: apiInscripcion.categoria || "",
    horario: apiInscripcion.horario || "",
    docente: apiInscripcion.docente || apiInscripcion.responsable || "No definido",
    costo: apiInscripcion.monto !== undefined ? Number(apiInscripcion.monto) : Number(apiInscripcion.costo || 0),
    modalidadCobro: apiInscripcion.modalidad_cobro || apiInscripcion.modalidadCobro || "Mensual",
    fechaInicio: apiInscripcion.fecha_inicio || apiInscripcion.fechaInicio || "",
    fechaFin: apiInscripcion.fecha_fin || apiInscripcion.fechaFin || "",
    apoderado: apiInscripcion.apoderado || "",
    telefono: apiInscripcion.telefono_apoderado || apiInscripcion.telefono || "",
    correo: apiInscripcion.correo_apoderado || apiInscripcion.correo || "",
    estadoInscripcion: apiInscripcion.estado_inscripcion || apiInscripcion.estadoInscripcion || "Pendiente de pago",
    estadoPago: apiInscripcion.estado_pago || apiInscripcion.estadoPago || "Pendiente",
    pagoId: apiInscripcion.pago_id || apiInscripcion.pagoId || "",
    fechaPago: apiInscripcion.fecha_pago || apiInscripcion.fechaPago || "",
    origenRegistro: apiInscripcion.origen_inscripcion || apiInscripcion.origen || apiInscripcion.origenRegistro || "Portal padres"
  };
}

/**
 * Adapta un pago desde el formato API al formato del frontend
 */
export function adaptarPago(apiPago) {
  if (!apiPago) return null;
  return {
    id: apiPago.pago_id || apiPago.id || "",
    inscripcionId: apiPago.inscripcion_id || apiPago.inscripcionId || "",
    monto: apiPago.monto_pago !== undefined ? Number(apiPago.monto_pago) : Number(apiPago.monto || 0),
    metodo: apiPago.metodo_pago || apiPago.metodo || apiPago.formaPago || apiPago.medioPago || "Yape",
    formaPago: apiPago.metodo_pago || apiPago.metodo || apiPago.formaPago || apiPago.medioPago || "Yape",
    estado: apiPago.estado_pago || apiPago.estado || "pendiente",
    comprobante: apiPago.comprobante_url || apiPago.comprobante || apiPago.capturaPagoBase64 || "",
    capturaPagoBase64: apiPago.comprobante_url || apiPago.comprobante || apiPago.capturaPagoBase64 || "",
    observacion: apiPago.motivo_observacion || apiPago.observacion || apiPago.observaciones || "",
    observaciones: apiPago.motivo_observacion || apiPago.observacion || apiPago.observaciones || "",
    validadoPor: apiPago.usuario_validacion || apiPago.validadoPor || "",
    validadoEn: apiPago.fecha_validacion || apiPago.validadoEn || "",
    
    // Campos extendidos para bandeja y reportes de Caja
    dniEstudiante: apiPago.dni_estudiante || apiPago.dniEstudiante || apiPago.estudianteDni || "",
    estudianteDni: apiPago.dni_estudiante || apiPago.dniEstudiante || apiPago.estudianteDni || "",
    nombresEstudiante: apiPago.nombres_estudiante || apiPago.nombresEstudiante || apiPago.estudianteNombre || "",
    estudianteNombre: apiPago.nombres_estudiante || apiPago.nombresEstudiante || apiPago.estudianteNombre || "",
    programaId: apiPago.programa_id || apiPago.programaId || "",
    programa: apiPago.nombre_programa || apiPago.programa || apiPago.programaNombre || "",
    programaNombre: apiPago.nombre_programa || apiPago.programa || apiPago.programaNombre || "",
    periodo: apiPago.periodo || "escolar",
    fecha: apiPago.fecha || apiPago.fechaPago || apiPago.creado_en || "",
    fechaPago: apiPago.fecha || apiPago.fechaPago || "",
    numeroOperacion: apiPago.numero_operacion || apiPago.numeroOperacion || apiPago.referenciaPago || "",
    telefonoOperacion: apiPago.telefono_operacion || apiPago.telefonoOperacion || "",
    origenRegistro: apiPago.origen_registro || apiPago.origenRegistro || "Portal padres"
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
    observacion: apiAsistencia.observacion || ""
  };
}
