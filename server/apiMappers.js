export function normalizeProgramStateToFrontend(state) {
  const map = {
    borrador: "Deshabilitado",
    publicado: "Habilitado",
    cerrado: "Deshabilitado",
    archivado: "Deshabilitado",
    Habilitado: "Habilitado",
    Deshabilitado: "Deshabilitado"
  };
  return map[state] || state || "Habilitado";
}

export function normalizeEnrollmentStateToFrontend(state) {
  const map = {
    preinscrita: "Pendiente de pago",
    pendiente_pago: "Pendiente de pago",
    pendiente_validacion: "Por Verificar",
    confirmada: "Pago validado",
    observada: "Pago observado",
    anulada: "Anulada",
    "Pendiente de pago": "Pendiente de pago",
    "Por Verificar": "Por Verificar",
    "Pago validado": "Pago validado",
    "Pago observado": "Pago observado",
    "Anulada": "Anulada"
  };
  return map[state] || state || "Pendiente de pago";
}

export function normalizePaymentStateToFrontend(state) {
  const map = {
    pendiente: "Por Verificar",
    validado: "completado",
    observado: "observado",
    rechazado: "observado",
    anulado: "anulado",
    "Por Verificar": "Por Verificar",
    "completado": "completado",
    "observado": "observado",
    "anulado": "anulado"
  };
  return map[state] || state || "Por Verificar";
}

export function normalizeAttendanceStateToFrontend(state) {
  return state || "presente";
}

export function normalizeProgramStateToBackend(state) {
  const map = {
    Habilitado: "publicado",
    Deshabilitado: "borrador",
    publicado: "publicado",
    borrador: "borrador",
    cerrado: "cerrado",
    archivado: "archivado"
  };
  return map[state] || state || "publicado";
}

export function normalizeEnrollmentStateToBackend(state) {
  const map = {
    "Pendiente de pago": "pendiente_pago",
    "Por Verificar": "pendiente_validacion",
    "Pago validado": "confirmada",
    "Pago observado": "observada",
    "Anulada": "anulada",
    pendiente_pago: "pendiente_pago",
    pendiente_validacion: "pendiente_validacion",
    confirmada: "confirmada",
    observada: "observada",
    anulada: "anulada"
  };
  return map[state] || state || "pendiente_pago";
}

export function normalizePaymentStateToBackend(state) {
  const map = {
    "Por Verificar": "pendiente",
    "completado": "validado",
    "observado": "observado",
    "anulado": "anulado",
    pendiente: "pendiente",
    validado: "validado",
    observado: "observado",
    anulado: "anulado"
  };
  return map[state] || state || "pendiente";
}

// Log de Auditoría

export function normalizarPeriodoApi(valor) {
  return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

export function normalizarTextoApi(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tieneHorariosPorGrupoApi(programa) {
  return Array.isArray(programa?.horariosPorGrupo) && programa.horariosPorGrupo.length > 0;
}

function descomponerGradoApi(valor) {
  const texto = normalizarTextoApi(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function coincideGradoApi(gradoGrupo, gradoAlumnoNormalizado) {
  const grupo = descomponerGradoApi(gradoGrupo);
  if (!grupo.numero || !gradoAlumnoNormalizado?.numero) return false;
  if (grupo.numero !== gradoAlumnoNormalizado.numero) return false;
  return !grupo.nivel || !gradoAlumnoNormalizado.nivel || grupo.nivel === gradoAlumnoNormalizado.nivel;
}

function formatearGradoApi(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

function resolverHorarioPorGradoApi(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGradoApi(gradoAlumno);
  if (!gradoNormalizado.numero) return "";
  let gradoDelTurno = "";
  const grupo = grupos.find((item) => {
    gradoDelTurno = (item.grados || []).find((grado) => coincideGradoApi(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grados = formatearGradoApi(gradoDelTurno || gradoAlumno);
  const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";
  return `${grados ? `${grados}: ` : ""}${grupo.dia} almuerzo ${grupo.almuerzoInicio || "14:20"}-${grupo.almuerzoFin || "15:10"}, clase ${grupo.horaInicio || ""}-${grupo.horaFin || ""}${aula}`;
}

function resolverDocentePorGradoApi(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return programa.responsable || programa.docente || "No definido";

  const gradoNormalizado = descomponerGradoApi(gradoAlumno);
  if (!gradoNormalizado.numero) return programa.responsable || programa.docente || "No definido";
  const grupo = grupos.find((item) =>
    (item.grados || []).some((grado) => coincideGradoApi(grado, gradoNormalizado))
  );

  if (grupo && grupo.responsable && grupo.responsable.trim()) {
    return grupo.responsable;
  }
  return programa.responsable || programa.docente || "No definido";
}

function obtenerPlantillaProgramaApi(db, programa = {}) {
  const guardada = db?.plantillasPorPrograma?.[programa?.id] || {};
  const variablesPrograma = Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [];
  const variablesGuardadas = Array.isArray(guardada.plantillaVariables) ? guardada.plantillaVariables : [];
  const plantillaBase64 = programa.plantillaBase64 || guardada.plantillaBase64 || "";

  const plantillaNombre = programa.plantilla === "" ? "" : (programa.plantilla || guardada.plantilla || "");
  const finalBase64 = programa.plantilla === "" ? "" : plantillaBase64;
  const finalVariables = programa.plantilla === "" ? [] : (variablesPrograma.length ? variablesPrograma : variablesGuardadas);
  const finalValidada = programa.plantilla === "" ? false : Boolean(programa.plantillaValidada || guardada.plantillaValidada || plantillaBase64);

  return {
    plantilla: plantillaNombre,
    plantillaBase64: finalBase64,
    plantillaVariables: finalVariables,
    plantillaValidada: finalValidada,
  };
}

export function obtenerCamposProgramaInvitacionApi(db, programa = null, gradoEstudiante = "") {
  if (!programa) {
    return {
      programaCosto: "",
      programaGrupo: "",
      programaGrupoEtario: "",
      programaHorario: "",
      programaDisponible: false,
      programaHorarioConfigurado: false,
      programaDocente: "",
      programaCupos: "",
      programaCuposDisponibles: 0,
      programaModalidadCobro: "",
      programaRequisitos: "",
      programaFechaInicio: "",
      programaFechaFin: "",
      programaDuracionTaller: "",
      programaDuracionAvisoDias: "",
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      requiereUniforme: false,
      requiereIndumentaria: false,
    };
  }

  const plantilla = obtenerPlantillaProgramaApi(db, programa);
  const cuposDisponibles = Math.max(0, Number(programa.cupos || 0) - Number(programa.cuposOcupados || 0));

  const horarioResuelto = resolverHorarioPorGradoApi(programa, gradoEstudiante);
  const docenteResuelto = resolverDocentePorGradoApi(programa, gradoEstudiante);

  return {
    programaCosto: programa.costo ?? "",
    programaGrupo: programa.grupo || "",
    programaGrupoEtario: programa.grupoEtario || programa.grupo || "",
    programaHorario: horarioResuelto || (tieneHorariosPorGrupoApi(programa) ? "Horario no configurado para este grado" : programa.horario) || "",
    programaDisponible: true,
    programaHorarioConfigurado: Boolean(horarioResuelto || !tieneHorariosPorGrupoApi(programa)),
    programaDocente: docenteResuelto,
    programaCupos: `${cuposDisponibles} cupos disponibles`,
    programaCuposDisponibles: cuposDisponibles,
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programa.requisitos || "",
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    programaDuracionTaller: programa.duracionTaller || "",
    programaDuracionAvisoDias: programa.duracionAvisoDias || "",
    plantilla: plantilla.plantilla,
    plantillaBase64: plantilla.plantillaBase64,
    plantillaVariables: plantilla.plantillaVariables,
    plantillaValidada: Boolean(plantilla.plantillaValidada),
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
  };
}

function normalizarGradoAplicableDesdeAlumnoApi(grado = "") {
  const texto = normalizarTextoApi(grado).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  if (!nivel || !numero) return "";

  const nivelFormateado = {
    inicial: "Inicial",
    primaria: "Primaria",
    secundaria: "Secundaria",
  }[nivel];

  return nivel === "inicial" && /anos|ano/.test(texto)
    ? `${nivelFormateado}:${numero} anos`
    : `${nivelFormateado}:${numero}`;
}

function agregarGradoProgramaDesdeAlumnoApi(programa, gradoAlumno) {
  if (!programa) return;
  const gradoAplicable = normalizarGradoAplicableDesdeAlumnoApi(gradoAlumno);
  if (!gradoAplicable) return;

  const actuales = Array.isArray(programa.gradosAplicables) ? programa.gradosAplicables : [];
  const existe = actuales.some((grado) => normalizarTextoApi(grado) === normalizarTextoApi(gradoAplicable));
  if (!existe) {
    programa.gradosAplicables = [...actuales, gradoAplicable];
  }
}

export function sincronizarGradosProgramaConInvitadosApi(db, programaId) {
  const programa = (db.programas || []).find(p => p.id === programaId);
  if (!programa) return;

  const grados = [];
  (db.invitadosPorPrograma?.[programaId] || []).forEach((invitado) => {
    const gradoAplicable = normalizarGradoAplicableDesdeAlumnoApi(invitado.grado);
    if (!gradoAplicable) return;
    const existe = grados.some((grado) => normalizarTextoApi(grado) === normalizarTextoApi(gradoAplicable));
    if (!existe) grados.push(gradoAplicable);
  });

  if (grados.length) {
    programa.gradosAplicables = ordenarGradosAplicablesApi(grados);
  }
}

function ordenarGradosAplicablesApi(grados) {
  const ordenNivel = { inicial: 0, primaria: 1, secundaria: 2 };
  return [...grados].sort((a, b) => {
    const gradoA = descomponerGradoAplicableApi(a);
    const gradoB = descomponerGradoAplicableApi(b);
    if (gradoA.nivelOrden !== gradoB.nivelOrden) return gradoA.nivelOrden - gradoB.nivelOrden;
    return gradoA.numero - gradoB.numero;
  });

  function descomponerGradoAplicableApi(valor) {
    const texto = normalizarTextoApi(valor);
    const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
    const numero = Number(texto.match(/\d+/)?.[0] || 0);
    return {
      nivelOrden: ordenNivel[nivel] ?? 99,
      numero,
    };
  }
}

export function sincronizarPlantillaProgramaApi(db, programa = {}) {
  if (!programa?.id) return;
  db.plantillasPorPrograma = db.plantillasPorPrograma || {};
  if (!programa.plantilla) {
    delete db.plantillasPorPrograma[programa.id];
  } else {
    db.plantillasPorPrograma[programa.id] = {
      plantilla: programa.plantilla || "",
      plantillaBase64: programa.plantillaBase64 || "",
      plantillaVariables: Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [],
      plantillaValidada: Boolean(programa.plantillaValidada || programa.plantillaBase64),
      plantillaActualizadaEn: programa.plantillaActualizadaEn || new Date().toISOString(),
    };
  }
}

function obtenerPlantillaInscripcionApi(db, inscripcion = {}) {
  const programa = (db?.programas || []).find(p => p.id === inscripcion.programaId) || {};
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

export function mapDbProgramToApi(p, db = null) {
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
    grados: p.gradosAplicables || [],
    responsable: p.responsable || p.docente || "",
    horario: p.horario || "",
    periodo: p.periodo || "escolar",
    modalidad_cobro: p.modalidadCobro || "Mensual",
    duracion_aviso_dias: p.duracionAvisoDias || 7,
    requiere_uniforme: p.requiereUniforme,
    requiere_indumentaria: p.requiereIndumentaria,
    anuncio_imagen: p.anuncioImagen || "",
    anuncio_imagen_nombre: p.anuncioImagenNombre || "",
    talleres_deportivos: p.talleresDeportivos || [],
    horarios_por_grupo: p.horariosPorGrupo || [],
    requisitos: p.requisitos || "",
    comunicado: p.comunicado || "",
    detalle_costo: p.detalleCosto || "",
    detalle_almuerzo: p.detalleAlmuerzo || "",
    concesionarios: p.concesionarios || "",
    invitacion_masiva: p.invitacionMasiva,
    alcance_invitacion_masiva: p.alcanceInvitacionMasiva || "colegio",
    plantilla: plantilla.plantilla,
    plantilla_base64: plantilla.plantillaBase64,
    plantilla_variables: plantilla.plantillaVariables,
    plantilla_validada: plantilla.plantillaValidada
  };
}

export function mapDbEnrollmentToApi(item, db = null) {
  if (!item) return null;
  const plantilla = obtenerPlantillaInscripcionApi(db, item);
  const programa = plantilla.programa || {};
  return {
    inscripcion_id: item.id,
    estudiante_id: item.dniEstudiante || "",
    programa_id: item.programaId || "",
    creado_en: item.fechaRegistro || "",
    origen_inscripcion: item.origenRegistro || "Presencial",
    estado_inscripcion: normalizeEnrollmentStateToFrontend(item.estadoInscripcion || "Pendiente de pago"),
    dni_estudiante: item.dniEstudiante || "",
    codigo_estudiante: item.codigoEstudiante || "",
    nombres_estudiante: item.nombresEstudiante || "",
    grado_estudiante: item.gradoEstudiante || item.grado || "",
    seccion: item.seccion || "",
    nombre_programa: item.programa || programa.nombre || "",
    categoria: item.categoria || programa.categoria || "",
    horario: item.horario || resolverHorarioPorGradoApi(programa, item.gradoEstudiante || item.grado) || (tieneHorariosPorGrupoApi(programa) ? "Horario no configurado para este grado" : programa.horario) || "",
    docente: item.docente || item.responsable || resolverDocentePorGradoApi(programa, item.gradoEstudiante || item.grado) || "No definido",
    monto: item.costo ?? programa.costo ?? 0,
    modalidad_cobro: item.modalidadCobro || programa.modalidadCobro || "Mensual",
    fecha_inicio: item.fechaInicio || programa.fechaInicio || "",
    fecha_fin: item.fechaFin || programa.fechaFin || "",
    requisitos: item.requisitos || programa.requisitos || "",
    comunicado: item.comunicado || programa.comunicado || "",
    detalle_costo: item.detalleCosto || programa.detalleCosto || "",
    detalle_almuerzo: item.detalleAlmuerzo || programa.detalleAlmuerzo || "",
    concesionarios: item.concesionarios || programa.concesionarios || "",
    plantilla: plantilla.plantilla,
    plantilla_base64: plantilla.plantillaBase64,
    plantilla_variables: plantilla.plantillaVariables,
    plantilla_validada: plantilla.plantillaValidada,
    apoderado: item.apoderado || "",
    telefono_apoderado: item.telefono || "",
    correo_apoderado: item.correo || "",
    estado_pago: normalizePaymentStateToFrontend(item.estadoPago || "Pendiente"),
    pago_id: item.pagoId || "",
    fecha_pago: item.fechaPago || ""
  };
}

export function mapDbPaymentToApi(item) {
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
    periodo: item.periodo || "escolar",
    creado_en: item.fecha || "",
    numero_operacion: item.numeroOperacion || "",
    telefono_operacion: item.telefonoOperacion || "",
    origen_registro: item.origenRegistro || "Portal padres"
  };
}

export function mapDbAsistenciaToApi(item) {
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
