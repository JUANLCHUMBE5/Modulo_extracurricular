import {
  calcularDuracionTexto as calcularDuracionFechas,
  formatearFechaPeru,
  normalizarFecha,
} from "../../../services/dateService";

export function crearDatosFicha(estudiante, inscripcion) {
  const fechaRegistro = normalizarFecha(inscripcion.fechaRegistro) || new Date();

  return {
    codigo: inscripcion.id || "Sin código",
    fecha: formatearFechaFicha(fechaRegistro),
    estudiante: {
      nombre: inscripcion.nombresEstudiante || estudiante.nombres || "No definido",
      dni: inscripcion.dniEstudiante || estudiante.dni || "No definido",
      grado: estudiante.grado || "No aplica",
      seccion: estudiante.seccion || "No aplica",
      periodo: estudiante.periodo || obtenerNombrePeriodo(inscripcion.periodo),
      colegio: inscripcion.colegioProcedencia || "Colegio San Rafael",
    },
    programa: {
      nombre: inscripcion.programa || "No definido",
      horario: inscripcion.horario || "No definido",
      responsable: inscripcion.docente || "No definido",
      costo: `S/ ${Number(inscripcion.costo || 0).toFixed(2)}`,
      modalidadCobro: inscripcion.modalidadCobro || "No definido",
      requisitos: inscripcion.requisitos || "Sin requisitos adicionales",
      plantilla: inscripcion.plantilla || "Sin plantilla asociada",
      uniforme: inscripcion.requiereUniforme ? "Sí" : "No",
      talla: inscripcion.tallaUniforme || "No aplica",
      estado: inscripcion.estadoInscripción || "Pendiente de pago",
      estadoPago: inscripcion.estadoPago || "Pendiente",
    },
    apoderado: {
      nombre: inscripcion.apoderado || "No definido",
      telefono: inscripcion.telefono || "No definido",
      correo: inscripcion.correo || "No registrado",
      medioEnvio: inscripcion.medioEnvio || "No definido",
    },
    observacion: inscripcion.observacion || "Sin observación",
  };
}

export function crearResumenInvitacion(ficha) {
  return [
    ["Estudiante", ficha.estudiante.nombre],
    ["DNI", ficha.estudiante.dni],
    ["Grado y sección", `${ficha.estudiante.grado} ${ficha.estudiante.seccion}`],
    ["Programa invitado", ficha.programa.nombre],
    ["Horario", ficha.programa.horario],
    ["Costo", ficha.programa.costo],
    ["Modalidad", ficha.programa.modalidadCobro],
    ["Requisitos", ficha.programa.requisitos],
    ["Apoderado", ficha.apoderado.nombre],
    ["Celular", ficha.apoderado.telefono],
  ];
}

export function crearMapaVariablesDocumento(estudiante, inscripcion) {
  const costo = `S/ ${Number(inscripcion.costo || 0).toFixed(2)}`;
  const fechaInicio = formatearFechaInicioRango(inscripcion.fechaInicio, inscripcion.fechaFin);
  const fechaFin = formatearFechaFinRango(inscripcion.fechaInicio, inscripcion.fechaFin);
  const rangoFechas = formatearRangoFechasLetras(inscripcion.fechaInicio, inscripcion.fechaFin);
  const duracion = calcularDuracionTexto(inscripcion.fechaInicio, inscripcion.fechaFin);
  const alumno = inscripcion.nombresEstudiante || estudiante?.nombres || "";
  const apoderado = inscripcion.apoderado || "";
  const telefono = inscripcion.telefono || "";
  const grado = estudiante?.grado || "";
  const seccion = estudiante?.seccion || "";
  const gradoSeccion = `${grado} ${seccion}`.trim();
  const programa = inscripcion.programa || "";
  const fechaActual = formatearFechaFicha(new Date());
  const horario = inscripcion.horario || "";
  const horarioDocumento = crearHorarioDocumento(inscripcion, estudiante);
  const dias = horarioDocumento.dia || extraerDiasHorario(horario);
  const horas = horarioDocumento.clase || extraerHorasHorario(horario);
  const almuerzo = horarioDocumento.almuerzo || extraerAlmuerzoHorario(horario);
  const aula = horarioDocumento.aula || inscripcion.aula || "";
  const horarioCambridge = [dias, horas].filter(Boolean).join(" ");
  const niveles = horarioDocumento.niveles;
  const pago = inscripcion.modalidadCobro || "";
  const anioActual = String(new Date().getFullYear());
  const seleccionCambridge = normalizarSeleccionCambridge(inscripcion.seleccion || estudiante?.seleccion);
  const marcaSeleccion = "X";

  return {
    N_COM: inscripcion.id || "",
    TITULO: `Comunicado ${programa}`.trim(),
    FECHA: fechaActual,
    FECHA_CARTA: fechaActual,
    ANIO_CARTA: anioActual,
    ANIO_CERT: anioActual,
    AREA: "Coordinación de Actividades Extracurriculares",
    PROG: programa,
    CICLO: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    CICLO_I: fechaInicio || rangoFechas,
    CICLO_II: fechaFin || rangoFechas,
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
    PAGO: pago,
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
    num: inscripcion.id || "",
    numero: inscripcion.id || "",
    nro: inscripcion.id || "",
    alumno,
    nombre_alumno: alumno,
    "nombre del alumno": alumno,
    estudiante: alumno,
    dni: inscripcion.dniEstudiante || estudiante?.dni || "Sin DNI",
    codigo: inscripcion.codigoEstudiante || estudiante?.codigoEstudiante || "",
    codigo_estudiante: inscripcion.codigoEstudiante || estudiante?.codigoEstudiante || "",
    grado,
    seccion,
    sección: seccion,
    apoderado,
    nombre_apoderado: apoderado,
    "nombre del apoderado": apoderado,
    celular: telefono,
    telefono,
    teléfono: telefono,
    telefono_apoderado: telefono,
    correo: inscripcion.correo || "",
    medio_envio: inscripcion.medioEnvio || "",
    programa: inscripcion.programa || "",
    prog: inscripcion.programa || "",
    curso: inscripcion.programa || "",
    curso_programa: inscripcion.programa || "",
    nivel: estudiante?.grado || "",
    nivel1: grado,
    grado_seccion: gradoSeccion,
    periodo: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    ciclo: estudiante?.periodo || obtenerNombrePeriodo(inscripcion.periodo),
    horario,
    dia: dias,
    dias,
    día: dias,
    días: dias,
    dia1: dias,
    día1: dias,
    hora: horas,
    horas,
    clases: horas || inscripcion.horario || "",
    clase: horas || inscripcion.horario || "",
    clase1: horas || inscripcion.horario || "",
    almuerzo: almuerzo || "",
    alm1: almuerzo || "",
    costo,
    modalidad_cobro: pago,
    requisitos: inscripcion.requisitos || "",
    observacion: inscripcion.observacion || "",
    inicio: fechaInicio,
    fecha_inicio: fechaInicio,
    fin: fechaFin,
    fecha_fin: fechaFin,
    rango: rangoFechas,
    rango_fechas: rangoFechas,
    vigencia: rangoFechas,
    duracion,
    duración: duracion,
    fecha: fechaActual,
  };
}

export function base64ToArrayBuffer(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let index = 0; index < binario.length; index += 1) {
    bytes[index] = binario.charCodeAt(index);
  }
  return bytes.buffer;
}

export function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escaparXml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escaparRegExp(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatearFechaFicha(fecha) {
  return formatearFechaPeru(fecha, formatearFechaPeru(new Date()));
}

export function formatearFechaValor(valor) {
  return formatearFechaPeru(valor);
}

export function normalizarNombreArchivo(valor) {
  return String(valor || "sin-codigo")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sin-codigo";
}

function formatearFechaInicioRango(inicio, fin) {
  const fechaInicio = normalizarFecha(inicio);
  const fechaFin = normalizarFecha(fin);
  if (!fechaInicio) return "";

  const mismoAnio = fechaFin && fechaInicio.getFullYear() === fechaFin.getFullYear();
  return formatearFechaLetras(fechaInicio, { incluirAnio: !mismoAnio });
}

function formatearFechaFinRango(inicio, fin) {
  const fechaInicio = normalizarFecha(inicio);
  const fechaFin = normalizarFecha(fin);
  if (!fechaFin) return "";

  const mismoAnio = fechaInicio && fechaInicio.getFullYear() === fechaFin.getFullYear();
  return formatearFechaLetras(fechaFin, { incluirAnio: true, usarDeAnio: mismoAnio });
}

function formatearRangoFechasLetras(inicio, fin) {
  const fechaInicio = normalizarFecha(inicio);
  const fechaFin = normalizarFecha(fin);
  if (!fechaInicio && !fechaFin) return "";
  if (!fechaInicio) return formatearFechaLetras(fechaFin, { incluirAnio: true });
  if (!fechaFin) return formatearFechaLetras(fechaInicio, { incluirAnio: true });
  return `del ${formatearFechaInicioRango(inicio, fin)} al ${formatearFechaFinRango(inicio, fin)}`;
}

function formatearFechaLetras(fecha, { incluirAnio = true, usarDeAnio = true } = {}) {
  if (!fecha) return "";
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const base = `${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
  if (!incluirAnio) return base;
  return `${base}${usarDeAnio ? " de" : ""} ${fecha.getFullYear()}`;
}

function extraerDiasHorario(horario) {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const texto = normalizarComparacion(horario);
  return dias
    .filter((dia) => texto.includes(normalizarComparacion(dia)))
    .join(", ");
}

function normalizarSeleccionCambridge(valor) {
  const texto = normalizarComparacion(valor).replace(/[^abc]/g, "");
  return texto.charAt(0).toUpperCase();
}

function extraerHorasHorario(horario) {
  const matches = [...String(horario || "").matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((match) => {
      const hora = match[1];
      const minuto = match[2] || "00";
      const periodo = match[3] ? ` ${match[3].replace(/\s+/g, "")}` : "";
      return `${hora}:${minuto}${periodo}`;
    });

  return matches.length >= 2 ? `${matches[0]} - ${matches[1]}` : "";
}

function extraerAlmuerzoHorario(horario) {
  const match = String(horario || "").match(/almuerzo\s+([^,·/]+)/i);
  return match?.[1]?.trim() || "";
}

function crearHorarioDocumento(inscripcion, estudiante) {
  const grupos = Array.isArray(inscripcion?.horariosPorGrupo) ? inscripcion.horariosPorGrupo : [];
  const gradoAlumno = inscripcion?.gradoEstudiante || inscripcion?.grado || estudiante?.grado || "";
  const grupo = grupos.find((item) => (item.grados || []).some((grado) => coincideGradoDocumento(grado, gradoAlumno)));
  const gradoDelTurno = grupo?.grados?.find((grado) => coincideGradoDocumento(grado, gradoAlumno)) || gradoAlumno;
  const nivelesTurno = gradoDelTurno ? [formatearGradoDocumento(gradoDelTurno)] : [];
  if (!grupo) {
    return {
      dia: extraerDiasHorario(inscripcion?.horario),
      almuerzo: extraerAlmuerzoHorario(inscripcion?.horario),
      clase: extraerHorasHorario(inscripcion?.horario),
      aula: inscripcion?.aula || "",
      niveles: nivelesTurno,
    };
  }

  return {
    dia: grupo.dia || "",
    almuerzo: formatearRangoHoraDocumento(grupo.almuerzoInicio, grupo.almuerzoFin),
    clase: formatearRangoHoraDocumento(grupo.horaInicio, grupo.horaFin),
    aula: grupo.aula || "",
    niveles: nivelesTurno,
  };
}

function coincideGradoDocumento(valorGrupo, gradoAlumno) {
  const grupo = descomponerGradoDocumento(valorGrupo);
  const alumno = descomponerGradoDocumento(gradoAlumno);
  if (!grupo.numero || !alumno.numero) return false;
  if (grupo.numero !== alumno.numero) return false;
  return !grupo.nivel || !alumno.nivel || grupo.nivel === alumno.nivel;
}

function descomponerGradoDocumento(valor) {
  const texto = normalizarComparacion(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function formatearGradoDocumento(valor) {
  const texto = String(valor || "").replace(/^(Inicial|Primaria|Secundaria):/i, "").trim();
  if (!texto) return "";
  if (/años?/i.test(texto)) return texto.toUpperCase();
  const numero = texto.match(/\d+/)?.[0];
  if (!numero) return texto.toUpperCase();
  return `${numero}°GRADO`;
}

function formatearRangoHoraDocumento(inicio, fin) {
  if (!inicio || !fin) return "";
  return `${formatearHoraDocumento(inicio)} a ${formatearHoraDocumento(fin)}`;
}

function formatearHoraDocumento(valor) {
  const match = String(valor || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return valor || "";
  const hora = Number(match[1]);
  const minutos = match[2];
  const hora12 = hora > 12 ? hora - 12 : hora || 12;
  return `${hora12}:${minutos}`;
}

function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calcularDuracionTexto(inicio, fin) {
  return calcularDuracionFechas(inicio, fin);
}

function obtenerNombrePeriodo(periodo) {
  return String(periodo || "").toLowerCase().includes("verano")
    ? "Ciclo verano"
    : "Año escolar";
}
