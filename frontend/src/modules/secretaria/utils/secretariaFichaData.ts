import {
  calcularDuracionTexto as calcularDuracionFechas,
  formatearFechaLargaPeru,
  formatearFechaPeru,
  normalizarFecha,
} from "../../../services/dateService";
import {
  cleanFallbackText,
  base64ToArrayBuffer,
  escaparHtml,
  escaparXml,
  escaparRegExp,
  procesarTextoComunicado,
  formatearFechaFicha,
  formatearFechaValor,
  normalizarNombreArchivo,
  normalizarComparacion,
  normalizarSeleccionCambridge,
  describirSeleccionCambridgeFicha,
  esFichaCambridge,
  extraerDiasHorario,
  extraerHorasHorario,
  extraerAlmuerzoHorario,
  formatearMesEvaluacion,
  coincideGradoDocumento,
  descomponerGradoDocumento,
  formatearGradoDocumento,
  formatearRangoHoraDocumento,
  formatearRangoHoraTexto,
  formatearHoraDocumento,
  calcularDuracionTexto,
  obtenerNombrePeriodo,
  formatearNivelesDocumento,
  obtenerInfoGrado,
  agruparGradosConsecutivos,
  crearHorarioDocumento,
  crearFilasHorarioDocumento,
  obtenerFilaHorario,
} from "./secretariaFichaHelpers";

export {
  cleanFallbackText,
  base64ToArrayBuffer,
  escaparHtml,
  escaparXml,
  escaparRegExp,
  procesarTextoComunicado,
  formatearFechaFicha,
  formatearFechaValor,
  normalizarNombreArchivo,
  normalizarComparacion,
  normalizarSeleccionCambridge,
  describirSeleccionCambridgeFicha,
  esFichaCambridge,
  extraerDiasHorario,
  extraerHorasHorario,
  extraerAlmuerzoHorario,
  formatearMesEvaluacion,
  coincideGradoDocumento,
  descomponerGradoDocumento,
  formatearGradoDocumento,
  formatearRangoHoraDocumento,
  formatearRangoHoraTexto,
  formatearHoraDocumento,
  calcularDuracionTexto,
  obtenerNombrePeriodo,
  formatearNivelesDocumento,
  obtenerInfoGrado,
  agruparGradosConsecutivos,
  crearHorarioDocumento,
  crearFilasHorarioDocumento,
  obtenerFilaHorario,
};

export function crearDatosFicha(estudiante: any, inscripcion: any) {
  const fechaRegistro = normalizarFecha(inscripcion.fechaRegistro) || new Date();
  const seleccionCambridge = normalizarSeleccionCambridge(inscripcion.seleccion || estudiante?.seleccion);
  const nivelCambridge = inscripcion.nivelCambridge || estudiante?.nivelCambridge || "";

  const telApoderado = cleanFallbackText(inscripcion.telefono);
  const horarioProg = cleanFallbackText(inscripcion.horario);

  return {
    codigo: inscripcion.id || "Sin código",
    fecha: formatearFechaFicha(fechaRegistro),
    estudiante: {
      nombre: cleanFallbackText(inscripcion.nombresEstudiante || estudiante.nombres) || "-",
      dni: cleanFallbackText(inscripcion.dniEstudiante || estudiante.dni) || "-",
      grado: cleanFallbackText(estudiante.grado) || "-",
      seccion: cleanFallbackText(estudiante.seccion) || "-",
      periodo: estudiante.periodo || obtenerNombrePeriodo(inscripcion.periodo),
      colegio: cleanFallbackText(inscripcion.colegioProcedencia) || "Colegio San Rafael",
    },
    programa: {
      id: inscripcion.programaId || "",
      nombre: cleanFallbackText(inscripcion.programa) || "-",
      horario: horarioProg || "Por confirmar",
      responsable: cleanFallbackText(inscripcion.docente) || "-",
      costo: `S/ ${Number(inscripcion.costo || 0).toFixed(2)}`,
      modalidadCobro: cleanFallbackText(inscripcion.modalidadCobro) || "-",
      requisitos: cleanFallbackText(inscripcion.requisitos) || "Sin requisitos adicionales",
      plantilla: cleanFallbackText(inscripcion.plantilla) || "Sin plantilla asociada",
      uniforme: inscripcion.requiereUniforme ? "Sí" : "No",
      talla: cleanFallbackText(inscripcion.tallaUniforme) || "-",
      estado: cleanFallbackText(inscripcion.estadoInscripción) || "Pendiente de pago",
      estadoPago: cleanFallbackText(inscripcion.estadoPago) || "Pendiente",
      ingresoCambridge: describirSeleccionCambridgeFicha(seleccionCambridge),
      nivelCambridge,
      comunicado: cleanFallbackText(inscripcion.comunicado || inscripcion.comunicadoCompleto) || "",
      tipoComunicado: cleanFallbackText(inscripcion.tipoComunicado || inscripcion.tipo_comunicado) || "",
      tipoDocumento: cleanFallbackText(inscripcion.tipoDocumento || inscripcion.tipo_documento) || "",
      numeroDocumento: cleanFallbackText(inscripcion.numeroDocumento || inscripcion.numero_documento) || "",
      areaTematica: cleanFallbackText(inscripcion.areaTematica || inscripcion.area_tematica) || "",
      motivoJustificacion: cleanFallbackText(inscripcion.motivoJustificacion || inscripcion.motivo_justificacion || inscripcion.comunicado || inscripcion.comunicadoCompleto) || "",
      nombreCiclo: cleanFallbackText(inscripcion.nombreCiclo || inscripcion.nombre_ciclo) || "",
      duracion: cleanFallbackText(inscripcion.duracion || inscripcion.duracionTaller) || "",
      tablaHorariosNivel: inscripcion.tablaHorariosNivel || inscripcion.tabla_horarios_nivel || [],
      incluyeAlmuerzo: Boolean(inscripcion.incluyeAlmuerzo || inscripcion.incluye_almuerzo),
      horarioRecepcionAlmuerzo: cleanFallbackText(inscripcion.horarioRecepcionAlmuerzo || inscripcion.horario_recepcion_almuerzo) || "",
      detalleAlmuerzo: cleanFallbackText(inscripcion.detalleAlmuerzo || inscripcion.detalle_almuerzo) || "",
      concesionarios: cleanFallbackText(inscripcion.concesionarios) || "",
      modalidadesCambridge: inscripcion.modalidadesCambridge || inscripcion.modalidades_cambridge || [],
      costoCiclo: inscripcion.costoCiclo || inscripcion.costo_ciclo || (inscripcion.costo ? String(inscripcion.costo) : ""),
      montoPrimerPago: inscripcion.montoPrimerPago || inscripcion.monto_primer_pago || "",
      fechaInicio: inscripcion.fechaInicio || "",
      fechaFin: inscripcion.fechaFin || "",
      horariosPorGrupo: inscripcion.horariosPorGrupo || [],
    },
    apoderado: {
      nombre: cleanFallbackText(inscripcion.apoderado) || "-",
      telefono: telApoderado || "-",
      correo: cleanFallbackText(inscripcion.correo) || "-",
      medioEnvio: cleanFallbackText(inscripcion.medioEnvio) || "-",
    },
    observacion: cleanFallbackText(inscripcion.observacion) || "Sin observación",
  };
}

export function crearResumenInvitacion(ficha: any) {
  const resumen = [
    ["Estudiante", ficha.estudiante.nombre],
    ["DNI", ficha.estudiante.dni],
    ["Grado y sección", `${ficha.estudiante.grado} ${ficha.estudiante.seccion}`],
    ["Programa invitado", ficha.programa.nombre],
    ["Horario", ficha.programa.horario],
    ["Costo", ficha.programa.costo],
    ["Modalidad", ficha.programa.modalidadCobro],
    ["Requisitos", ficha.programa.requisitos],
  ];

  const tieneUniforme = ficha.programa.uniforme === "Sí" || ficha.programa.uniforme === "Si";
  if (tieneUniforme) {
    resumen.push(["Uniforme requerido", "Sí"]);
    resumen.push(["Talla", ficha.programa.talla]);
  }

  resumen.push(["Apoderado", ficha.apoderado.nombre]);
  resumen.push(["Celular", ficha.apoderado.telefono]);

  if (esFichaCambridge(ficha)) {
    resumen.splice(5, 0, ["Modalidad Cambridge A/B/C", ficha.programa.ingresoCambridge]);
    if (ficha.programa.nivelCambridge) {
      resumen.splice(6, 0, ["Nivel Cambridge", ficha.programa.nivelCambridge]);
    }
  }
  return resumen;
}

export function crearMapaVariablesDocumento(estudiante: any, inscripcion: any) {
  const costo = Number(inscripcion.costo || 0).toFixed(2);
  const fechaInicio = formatearFechaInicioRango(inscripcion.fechaInicio, inscripcion.fechaFin);
  const fechaFin = formatearFechaFinRango(inscripcion.fechaInicio, inscripcion.fechaFin);
  const rangoFechas = formatearRangoFechasLetras(inscripcion.fechaInicio, inscripcion.fechaFin);
  const duracion = calcularDuracionTexto(inscripcion.fechaInicio, inscripcion.fechaFin);
  const alumno = cleanFallbackText(inscripcion.nombresEstudiante || estudiante?.nombres) || "";
  const apoderado = cleanFallbackText(inscripcion.apoderado) || "";
  const telefono = cleanFallbackText(inscripcion.telefono) || "";
  const grado = cleanFallbackText(inscripcion.gradoEstudiante || inscripcion.grado || estudiante?.grado) || "";
  const seccion = cleanFallbackText(inscripcion.seccion || estudiante?.seccion) || "";
  const gradoSeccion = `${grado} ${seccion}`.trim();
  const programa = cleanFallbackText(inscripcion.programa) || "";
  const fechaActual = formatearFechaFicha(new Date());
  const fechaActualLarga = formatearFechaLargaPeru(new Date(), fechaActual);
  const mesEvaluacion = formatearMesEvaluacion(inscripcion.fechaRegistro || new Date());
  const horario = cleanFallbackText(inscripcion.horario) || "";
  const horarioDocumento = crearHorarioDocumento(inscripcion, estudiante);
  const filasHorario = crearFilasHorarioDocumento(inscripcion, estudiante, horarioDocumento);
  const fila1 = obtenerFilaHorario(filasHorario, 0);
  const fila2 = obtenerFilaHorario(filasHorario, 1);
  const dias = horarioDocumento.dia || extraerDiasHorario(horario);
  const horas = horarioDocumento.clase || extraerHorasHorario(horario);
  const almuerzo = horarioDocumento.almuerzo || extraerAlmuerzoHorario(horario);
  const aula = horarioDocumento.aula || inscripcion.aula || "";
  const horarioCambridge = [dias, horas].filter(Boolean).join(" ");
  const niveles = horarioDocumento.niveles;
  const modalidadCobro = cleanFallbackText(inscripcion.modalidadCobro) || "";
  const anioActual = String(new Date().getFullYear());
  const seleccionCambridge = normalizarSeleccionCambridge(inscripcion.seleccion || estudiante?.seleccion);
  const marcaSeleccion = "X";

  return {
    N_COM: inscripcion.numeroDocumento || inscripcion.numero_documento || inscripcion.id || "",
    TITULO: `${inscripcion.tipoDocumento || "Comunicado"} ${programa}`.trim(),
    FECHA: fechaActual,
    FECHA_CARTA: fechaActual,
    ANIO_CARTA: anioActual,
    ANIO_CERT: anioActual,
    AREA: "Coordinación Académica de Actividades Extracurriculares",
    PROG: programa,
    CICLO: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    CICLO_I: inscripcion.cicloI || fechaInicio || rangoFechas,
    CICLO_II: inscripcion.cicloII || fechaFin || rangoFechas,
    INI: fechaInicio,
    FIN: fechaFin,
    RANGO: rangoFechas,
    VIGENCIA: rangoFechas,
    DUR: duracion,
    N1: niveles[0] || gradoSeccion,
    N2: niveles[1] || "",
    N3: niveles[2] || "",
    N4: niveles[3] || "",
    DIA: dias,
    ALM: almuerzo || "",
    CLASE: horas || horario,
    PAGO: costo,
    COSTO: costo,
    HOR_ALM: almuerzo || "",
    ALUMNO: alumno,
    ALU: alumno,
    GR_SEC: gradoSeccion,
    NIV: gradoSeccion || grado,
    AUL: aula,
    HORARIO: horarioCambridge || horario,
    CHK_A: seleccionCambridge === "A" ? marcaSeleccion : "",
    CHK_B: seleccionCambridge === "B" ? marcaSeleccion : "",
    CHK_C: seleccionCambridge === "C" ? marcaSeleccion : "",
    APOD: apoderado,
    CEL: telefono,
    NUMERO_DOCUMENTO: inscripcion.numeroDocumento || inscripcion.numero_documento || "",
    MOTIVO: inscripcion.motivoJustificacion || "",
    TABLA_GRADOS: inscripcion.tablaHorariosNivel || [],
    DOCENTE: cleanFallbackText(inscripcion.docente) || "",
    RESPONSABLE: cleanFallbackText(inscripcion.docente) || "",
    DIAS: dias,
    CLASE_1: fila1.clase || "",
    CLASE_2: fila2.clase || "",
    ALM_1: fila1.almuerzo || "",
    ALM_2: fila2.almuerzo || "",
    HOR_ALM_1: fila1.almuerzo || "",
    HOR_ALM_2: fila2.almuerzo || "",
    NIVEL_1: fila1.nivel || "",
    NIVEL_2: fila2.nivel || "",
    NIVEL_CAMBRIDGE: nivelCambridge || "",
    SELECCION: describirSeleccionCambridgeFicha(seleccionCambridge),
    FECHA_LOTE: fechaActualLarga,
    MES_EVAL: mesEvaluacion || "",
  };
}

function formatearFechaInicioRango(inicio: any, fin: any) {
  if (!inicio && !fin) return "";
  const d = normalizarFecha(inicio || fin);
  return d ? formatearFechaFicha(d) : "";
}

function formatearFechaFinRango(inicio: any, fin: any) {
  if (!inicio && !fin) return "";
  const d = normalizarFecha(fin || inicio);
  return d ? formatearFechaFicha(d) : "";
}

function formatearRangoFechasLetras(inicio: any, fin: any) {
  const dIni = normalizarFecha(inicio);
  const dFin = normalizarFecha(fin);
  if (!dIni && !dFin) return "";
  if (!dIni) return formatearFechaLargaPeru(dFin, "");
  if (!dFin) return formatearFechaLargaPeru(dIni, "");

  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  if (dIni.getFullYear() === dFin.getFullYear() && dIni.getMonth() === dFin.getMonth()) {
    return `Del ${dIni.getDate()} al ${dFin.getDate()} de ${meses[dIni.getMonth()]} de ${dIni.getFullYear()}`;
  }

  if (dIni.getFullYear() === dFin.getFullYear()) {
    return `Del ${dIni.getDate()} de ${meses[dIni.getMonth()]} al ${dFin.getDate()} de ${meses[dFin.getMonth()]} de ${dIni.getFullYear()}`;
  }

  return `Del ${dIni.getDate()} de ${meses[dIni.getMonth()]} de ${dIni.getFullYear()} al ${dFin.getDate()} de ${meses[dFin.getMonth()]} de ${dFin.getFullYear()}`;
}
