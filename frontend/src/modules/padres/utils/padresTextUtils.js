import { formatearFechaPeru, obtenerVentanaInscripcion } from "../../../services/dateService";

export function prepararComunicadoPadres(programa, estudiante) {
  const titulo = programa?.programa || programa?.nombre || "Comunicado del programa";
  const fecha = programa?.fechaInicio
    ? `Carabayllo, ${formatearFechaPeru(programa.fechaInicio, "Por definir")}`
    : "";
  const area = obtenerAreaPrograma(programa?.area || titulo);
  const alumno = estudiante?.nombres || "el estudiante";
  const esCambridge = esProgramaCambridgePadres(programa);
  const esClubTareas = esProgramaClubTareasPadres(programa);
  const datosComunicado = crearDatosComunicadoPadres(programa, estudiante, titulo);
  const textoCompletoWord = limpiarComunicadoWord(
    programa?.comunicadoCompleto || programa?.comunicado_completo || programa?.comunicado || "",
    { area, programa: titulo, alumno, datos: datosComunicado }
  );
  const textoResumenWord = limpiarComunicadoWord(
    programa?.comunicado || textoCompletoWord,
    { area, programa: titulo, alumno, datos: datosComunicado }
  );
  const comunicadoYaIncluyeDetalle = Boolean(textoCompletoWord && textoIncluyeSeccionesDePrograma(textoCompletoWord));
  const textoMensajeWord = comunicadoYaIncluyeDetalle ? extraerMensajePrincipalWord(textoCompletoWord) : textoCompletoWord;
  const detalleWord = comunicadoYaIncluyeDetalle ? obtenerDetalleFormatoDesdeWord(textoCompletoWord) : [];
  const parrafosFallback = esCambridge
    ? crearComunicadoCambridgePadres(programa, estudiante, titulo)
    : esClubTareas
      ? crearComunicadoClubTareasPadres(programa, estudiante, titulo, area)
      : crearComunicadoBasicoPadres(programa, estudiante, titulo);
  const parrafosOriginales = textoMensajeWord
    ? textoMensajeWord.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
    : parrafosFallback;
  const parrafos = dividirParrafosPorCampos(parrafosOriginales);
  const parrafosResumenBaseOriginales = textoResumenWord
    ? (comunicadoYaIncluyeDetalle ? parrafosOriginales : textoResumenWord.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean))
    : parrafosFallback;
  const parrafosResumenBase = dividirParrafosPorCampos(parrafosResumenBaseOriginales);
  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const indicaciones = comunicadoYaIncluyeDetalle
    ? []
    : obtenerIndicacionesProgramaPadres(programa, { esCambridge, esClubTareas });
  if (!comunicadoYaIncluyeDetalle && ventana.fechaLimite) {
    indicaciones.unshift(
      `Confirmar la inscripción en línea a más tardar el ${ventana.fechaLimite} a las ${ventana.horaLimite} (cierre de inscripciones regulares).`
    );
  }
  const detalleFormato = comunicadoYaIncluyeDetalle ? detalleWord : obtenerDetalleFormatoPadres(programa);
  const resumenParrafos = resumirComunicadoPadres(parrafosResumenBase, programa, detalleFormato);
  const datosCambridge = esCambridge ? obtenerDatosCambridgePadres(programa, estudiante) : null;

  return {
    titulo,
    fecha,
    parrafos,
    resumenParrafos,
    indicaciones,
    indicacionesResumen: indicaciones.slice(0, 3),
    detalleFormato,
    datosCambridge,
    tieneAlmuerzoFormato: detalleFormato.some((seccion) =>
      ["almuerzo", "concesionarios"].includes(normalizarTextoPadres(seccion.titulo))
    ),
    ocultarAlmuerzo: comunicadoYaIncluyeDetalle || (!programa?.detalleAlmuerzo && !programa?.concesionarios),
  };
}

export function formatearRangoFechasPadres(inicio, fin) {
  const fechaInicio = crearFechaLocal(inicio);
  const fechaFin = crearFechaLocal(fin);
  if (!fechaInicio && !fechaFin) return "Por definir";
  if (!fechaInicio) return formatearFechaLetrasPadres(fechaFin, { incluirAnio: true });
  if (!fechaFin) return formatearFechaLetrasPadres(fechaInicio, { incluirAnio: true });

  const mismoAnio = fechaInicio.getFullYear() === fechaFin.getFullYear();
  const inicioTexto = formatearFechaLetrasPadres(fechaInicio, { incluirAnio: !mismoAnio });
  const finTexto = formatearFechaLetrasPadres(fechaFin, { incluirAnio: true, usarDeAnio: mismoAnio });
  return `Del ${inicioTexto} al ${finTexto}`;
}

export function convertirHorasAMPM(texto) {
  if (!texto) return "";

  // Convert HH:MM or H:MM to 12-hour format with AM/PM (preserving any existing suffix)
  const timeRegex = /\b(\d{1,2}):(\d{2})\b(?:\s*([AP]M|a\.m\.|p\.m\.|am|pm)(?!\w))?/gi;
  let result = String(texto).replace(timeRegex, (match, hh, mm, suffix) => {
    let hours = parseInt(hh, 10);
    const minutes = mm;
    let ampm = "";
    if (suffix) {
      const s = suffix.toLowerCase();
      if (s.includes("p")) {
        ampm = "PM";
      } else {
        ampm = "AM";
      }
    } else {
      ampm = hours >= 12 ? "PM" : "AM";
    }
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  });

  // Format range dash cleanly
  result = result.replace(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/gi, "$1 - $2");

  // Replace " - Aula" or " - AULA" with " · Aula"
  result = result.replace(/\s*-\s*(aula|AULA)\s*/i, " · Aula ");

  return result;
}

export function dividirHorarioPadres(horario) {
  const texto = repararTexto(String(horario || "")).trim();
  const partes = texto.match(/^(.+?):\s*([^,]+?)\s+almuerzo\s+([^,]+),\s*clase\s+(.+)$/i);
  if (!partes) return null;
  return {
    grados: partes[1].trim(),
    dia: partes[2].trim(),
    almuerzo: partes[3].trim(),
    clase: partes[4].trim(),
  };
}

function formatearFechaLetrasPadres(fecha, { incluirAnio = true, usarDeAnio = true } = {}) {
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

function crearFechaLocal(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;

  const texto = String(valor);
  const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (partes) {
    const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function obtenerAreaPrograma(valor) {
  const texto = repararTexto(String(valor || "").trim());
  if (!texto) return "reforzamiento";
  const sinClub = texto.replace(/^club\s+de\s+tareas\s*/i, "").trim();
  return sinClub || texto;
}

export function esProgramaCambridgePadres(programa) {
  const texto = normalizarTextoPadres([
    programa?.programa,
    programa?.nombre,
    programa?.categoria,
    programa?.plantilla,
  ].filter(Boolean).join(" "));
  return texto.includes("cambridge");
}

function esProgramaClubTareasPadres(programa) {
  const texto = normalizarTextoPadres([
    programa?.programa,
    programa?.nombre,
    programa?.categoria,
    programa?.plantilla,
  ].filter(Boolean).join(" "));
  return texto.includes("club de tareas") || texto.includes("club tareas");
}

export function describirSeleccionCambridgePadres(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  const opciones = {
    A: "A - Promovido/a por Certificado Oficial 2025",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por Desempeno Academico",
  };
  return opciones[seleccion] || "Pendiente de definir en Coordinación Académica";
}

function crearComunicadoCambridgePadres(programa, estudiante, titulo) {
  const alumno = estudiante?.nombres || "su menor hijo(a)";
  const aula = estudiante?.grado || "";
  const vigencia = formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin);
  const horario = repararTexto(String(programa?.horario || "").trim()) || "Por confirmar";
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const modalidad = programa?.modalidadCobro ? `Modalidad de pago: ${programa.modalidadCobro}` : "";
  const datosCambridge = obtenerDatosCambridgePadres(programa, estudiante);
  const nivelCambridge = datosCambridge?.nivelCambridge ? ` en el nivel ${datosCambridge.nivelCambridge}` : "";
  const ingresoCambridge = datosCambridge?.seleccion
    ? `Modalidad Cambridge asignada: ${describirSeleccionCambridgePadres(datosCambridge.seleccion)}.`
    : "";

  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const limiteTexto = ventana.fechaLimite
    ? `Habilitado para inscripción en línea hasta el ${ventana.fechaLimite} a las ${ventana.horaLimite}.`
    : "";

  const parrafos = [
    `En nuestra institución estamos comprometidos con la formación integral de nuestros estudiantes y con una enseñanza sólida del idioma inglés. Por ello, invitamos a ${alumno}${aula ? ` del aula ${aula}` : ""} a participar en ${titulo}${nivelCambridge}.`,
  ];

  if (ingresoCambridge) {
    parrafos.push(ingresoCambridge);
  }

  parrafos.push(
    "El programa de Preparación Cambridge fortalece las habilidades necesarias para rendir una certificación internacional reconocida y brinda acompañamiento mediante clases especializadas, materiales de preparación y simulacros del examen.",
    `Vigencia: ${vigencia}`,
    `Horario: ${horario}`,
    `Costo: ${costo}`
  );

  if (modalidad) {
    parrafos.push(modalidad);
  }
  if (limiteTexto) {
    parrafos.push(`Plazo de inscripción: ${limiteTexto}`);
  }

  parrafos.push(
    "Para completar la inscripción, la familia debe revisar y aceptar esta información antes de confirmar los datos del apoderado y continuar con el pago."
  );

  return parrafos;
}

function crearComunicadoBasicoPadres(programa, estudiante, titulo) {
  const alumno = estudiante?.nombres || "el estudiante";
  const vigencia = formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin);
  const horario = repararTexto(String(programa?.horario || "").trim()) || "Por confirmar";
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const responsable = repararTexto(String(programa?.responsable || programa?.docente || "").trim());

  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const limiteTexto = ventana.fechaLimite
    ? `Habilitado para confirmación en línea hasta el ${ventana.fechaLimite} a las ${ventana.horaLimite}.`
    : "";

  const parrafos = [
    `El colegio informa que ${alumno} tiene disponible el programa ${titulo}.`,
    `Vigencia: ${vigencia}`,
    `Horario: ${horario}`,
    `Costo: ${costo}`,
  ];

  if (limiteTexto) {
    parrafos.push(`Plazo de inscripción: ${limiteTexto}`);
  }

  parrafos.push(
    responsable ? `Responsable del programa: ${responsable}` : "La coordinacion del programa brindara las indicaciones necesarias antes del inicio.",
    "Revise esta informacion y confirme la aceptacion para continuar con la inscripcion."
  );

  return parrafos;
}

function crearComunicadoClubTareasPadres(programa, estudiante, titulo, area) {
  const alumno = estudiante?.nombres || "el estudiante";
  const grado = estudiante?.grado || "";
  const vigencia = formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin);
  const horario = repararTexto(String(programa?.horario || "").trim()) || "Por confirmar";
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const modalidad = programa?.modalidadCobro ? `Modalidad de cobro: ${programa.modalidadCobro}` : "";
  const responsable = repararTexto(String(programa?.responsable || programa?.docente || "").trim());

  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const limiteTexto = ventana.fechaLimite
    ? `Habilitado en línea hasta el ${ventana.fechaLimite} a las ${ventana.horaLimite}.`
    : "";

  const parrafos = [
    `El colegio informa que ${alumno}${grado ? ` del aula ${grado}` : ""} tiene disponible el ${titulo}, orientado al acompanamiento y refuerzo de tareas del area de ${area}.`,
    `Vigencia: del ${vigencia.replace(/^Del\s+/i, "")}`,
    `Horario: ${horario}`,
    `Costo: ${costo}`,
  ];

  if (modalidad) {
    parrafos.push(modalidad);
  }
  if (limiteTexto) {
    parrafos.push(`Plazo de inscripción: ${limiteTexto}`);
  }

  parrafos.push(
    responsable ? `Responsable del programa: ${responsable}` : "Coordinacion Academica comunicara el responsable asignado antes del inicio.",
    "La familia debe revisar esta informacion y confirmar la aceptacion para continuar con la inscripcion."
  );

  return parrafos;
}

function obtenerDatosCambridgePadres(programa, estudiante) {
  const seleccion = String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase();
  const nivelCambridge = String(programa?.nivelCambridge || estudiante?.nivelCambridge || "").trim();
  if (!seleccion && !nivelCambridge) return null;
  return { seleccion, nivelCambridge };
}

function obtenerIndicacionesProgramaPadres(programa, { esCambridge = false, esClubTareas = false } = {}) {
  const desdeFormato = [
    ...extraerIndicacionesDesdeTexto(programa?.requisitos),
    ...extraerIndicacionesDesdeTexto(programa?.detalleAlmuerzo, { soloSeccion: true }),
    ...extraerIndicacionesDesdeTexto(programa?.detalleCosto, { soloSeccion: true }),
    ...extraerIndicacionesDesdeTexto(programa?.comunicado, { soloSeccion: true }),
  ];
  const indicaciones = quitarDuplicadosTexto(desdeFormato).slice(0, 6);
  if (indicaciones.length) return indicaciones;

  if (esCambridge) {
    return [
      "Debe revisar y llevar los materiales de preparación Cambridge solicitados por el docente.",
      "Debe participar en los simulacros y actividades programadas para la certificación.",
    ];
  }

  if (esClubTareas) {
    return [
      "El estudiante debe asistir con sus cuadernos, libros o tareas pendientes del area correspondiente.",
      "La familia debe verificar el horario asignado antes de confirmar la inscripcion.",
      "El pago se registra segun la modalidad indicada por el colegio.",
    ];
  }

  return ["Revise el resumen del programa, confirme el horario y continue con los datos del apoderado."];
}

function esSaludoGreeting(texto) {
  const normalizado = String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    normalizado.includes("cordial saludo") ||
    normalizado.includes("es grato saludar") ||
    normalizado.includes("grato dirigirnos") ||
    normalizado.includes("nos dirigimos a usted") ||
    normalizado.includes("reciba un saludo") ||
    normalizado.includes("comunidad educativa") ||
    normalizado.includes("estimados padres") ||
    normalizado.includes("estimado padre") ||
    normalizado.includes("querida familia") ||
    normalizado.includes("queridas familias") ||
    normalizado.includes("de nuestra consideracion")
  );
}

function formatearHorarioParaResumen(horario) {
  if (!horario) return "";
  let texto = String(horario).trim();

  // Strip grade/level prefix (e.g. "Primaria: 4:", "4 Primaria:")
  const gradeRegex = /^(?:(?:inicial|primaria|secundaria)[\s:]*\d+|\d+\s*(?:inicial|primaria|secundaria))[\s:]*/i;
  texto = texto.replace(gradeRegex, "").trim();

  // Try to match: "Día almuerzo rango, clase rango"
  const partesAlm = texto.match(/^([^,]+?)\s+almuerzo\s+([^,]+),\s*clase\s+(.+)$/i);
  if (partesAlm) {
    const dia = partesAlm[1].trim();
    const almuerzo = partesAlm[2].trim();
    const clase = partesAlm[3].trim();
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    return `${diaCap} · Almuerzo: ${convertirHorasAMPM(almuerzo)} · Clase: ${convertirHorasAMPM(clase)}`;
  }

  // Try to match: "Día clase rango"
  const partesClase = texto.match(/^([^,]+?)\s+clase\s+(.+)$/i);
  if (partesClase) {
    const dia = partesClase[1].trim();
    const clase = partesClase[2].trim();
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    return `${diaCap} · Clase: ${convertirHorasAMPM(clase)}`;
  }

  return convertirHorasAMPM(texto);
}

function resumirComunicadoPadres(parrafos, programa, detalleFormato) {
  const resumen = [];

  // Push as separate items so they are parsed into individual cards in the details grid (matching the home page order)
  if (programa?.horario) {
    resumen.push(`Horario: ${formatearHorarioParaResumen(programa.horario)}`);
  }
  if (programa?.fechaInicio || programa?.fechaFin) {
    resumen.push(`Vigencia: ${formatearRangoFechasPadres(programa.fechaInicio, programa.fechaFin)}`);
  }
  if (Number(programa?.costo || 0) > 0) {
    resumen.push(`Costo: S/ ${Number(programa.costo).toFixed(2)}`);
  }

  if (detalleFormato.length) {
    resumen.push("Abra el comunicado completo para leer condiciones, indicaciones, materiales y modalidades de pago.");
  }

  return resumen;
}

function obtenerDetalleFormatoPadres(programa) {
  let secciones = [
    ...seccionarTextoFormato(programa?.detalleCosto, "Costo"),
    ...seccionarTextoFormato(programa?.detalleAlmuerzo, "Almuerzo"),
    ...seccionarTextoFormato(programa?.concesionarios, "Almuerzo"),
  ];

  secciones = secciones.map((sec) => {
    const normal = normalizarTextoPadres(sec.titulo);
    if (normal.includes("almuerzo") || normal.includes("concesionario") || normal.includes("detalle del formato")) {
      return { ...sec, titulo: "Almuerzo" };
    }
    return sec;
  });

  return compactarSeccionesDetalle(secciones).filter((seccion) => seccion.items.length);
}

function obtenerDetalleFormatoDesdeWord(texto) {
  const limpio = limpiarCierreFormularioWord(texto);
  const secciones = [
    extraerBloquePorMarcadoresWord(limpio, "Requisitos", ["requisitos"], ["costo"]),
    extraerBloquePorMarcadoresWord(limpio, "Costo", ["costo"], ["el almuerzo", "almuerzo"]),
    extraerAlmuerzoWord(limpio),
  ].filter(Boolean);

  return compactarSeccionesDetalle(secciones).filter((seccion) => seccion.items.length);
}

function extraerBloquePorMarcadoresWord(texto, titulo, inicios, finales = []) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    return inicios.some((item) => normal.startsWith(normalizarTextoPadres(item)));
  });
  if (inicio === -1) return null;

  const items = [];
  for (const linea of lineas.slice(inicio)) {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    const esInicio = inicios.some((item) => normal.startsWith(normalizarTextoPadres(item)));
    const esFinal = !esInicio && finales.some((item) => normal.startsWith(normalizarTextoPadres(item)));
    if (esFinal) break;

    const textoItem = limpiarIndicacion(linea.replace(new RegExp(`^\\s*${titulo}\\s*:?\\s*`, "i"), ""));
    if (!textoItem) continue;
    if (esTituloSeccionWord(textoItem)) continue;
    if (esInicio && normalizarTextoPadres(textoItem) === normalizarTextoPadres(titulo)) continue;
    items.push(textoItem);
  }

  return { titulo, items: quitarDuplicadosTexto(items) };
}

function extraerAlmuerzoWord(texto) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => normalizarTextoPadres(linea).includes("contamos con un area"));
  if (inicio === -1) {
    return extraerBloquePorMarcadoresWord(texto, "Almuerzo", ["el almuerzo", "almuerzo"], ["atentamente", "entregar este formato", "acepto", "datos del alumno"]);
  }

  const items = [];
  for (const linea of lineas.slice(inicio)) {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    if (/^(atentamente|entregar este formato|acepto|datos del alumno|datos del apoderado)\b/.test(normal)) break;
    if (/^(clases|nivel|dia|almuerzo|el almuerzo|costo|requisitos|pago unico|de)$/i.test(normal)) continue;
    if (/^\d+\s*(primaria|secundaria|inicial)\b/.test(normal)) continue;
    if (/^(primaria|secundaria|inicial)\s+\d+\b/.test(normal)) continue;
    if (normal.includes("clase") && normal.includes("almuerzo") && /\d{1,2}:\d{2}/.test(linea)) continue;

    const item = limpiarIndicacion(
      linea
        .replace(/\b\d{10,}\b/g, "")
        .replace(/\s+/g, " ")
    );
    if (item) items.push(item);
  }

  return { titulo: "Almuerzo", items: quitarDuplicadosTexto(items) };
}

function esTituloSeccionWord(texto) {
  const normal = normalizarTextoPadres(texto).replace(/[:.]+$/g, "");
  return /^(club de tareas|duracion|duración|requisitos|costo|el almuerzo|almuerzo|acepto|datos del alumno|datos del apoderado)$/.test(normal);
}

function extraerMensajePrincipalWord(texto) {
  const limpio = limpiarCierreFormularioWord(texto);
  const lineas = limpiarTextoFormato(limpio).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => esLineaMensajeColegio(linea));
  const desdeMensaje = inicio === -1 ? lineas.filter((linea) => !esCabeceraWord(linea)) : lineas.slice(inicio);
  if (desdeMensaje[0]) {
    desdeMensaje[0] = desdeMensaje[0].replace(/^.*?\b(Reciba|Nos dirigimos|En este sentido)\b/i, "$1").trim();
  }
  const corte = desdeMensaje.findIndex((linea, index) => {
    if (index === 0 && esLineaMensajeColegio(linea)) return false;
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    return /^(club de tareas|ciclo|duracion|duración|a continuacion|requisitos|costo|el almuerzo|almuerzo)\b/.test(normal);
  });
  const principales = (corte === -1 ? desdeMensaje : desdeMensaje.slice(0, corte))
    .filter((linea) => !esCabeceraWord(linea));
  return unirLineasCortadasWord(principales).join("\n\n");
}

function esLineaMensajeColegio(linea) {
  const normal = normalizarTextoPadres(linea);
  return /\b(reciba|nos dirigimos|en este sentido)\b/.test(normal);
}

function esCabeceraWord(linea) {
  const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
  return (
    normal.includes("ano de la esperanza") ||
    /^comunicado\s+cmsr\b/.test(normal) ||
    /^comunicado$/.test(normal) ||
    /^carabayllo$/.test(normal)
  );
}

function unirLineasCortadasWord(lineas) {
  const resultado = [];

  lineas.forEach((linea) => {
    const actual = String(linea || "").trim();
    if (!actual) return;

    const previo = resultado[resultado.length - 1] || "";
    if (previo && debeUnirseLineaWord(previo, actual)) {
      resultado[resultado.length - 1] = `${previo} ${actual}`.replace(/\s+/g, " ").trim();
      return;
    }

    resultado.push(actual);
  });

  return resultado;
}

function debeUnirseLineaWord(previo, actual) {
  const anterior = String(previo || "").trim();
  const siguiente = String(actual || "").trim();
  if (!anterior || !siguiente) return false;
  if (/[.!?;:]$/.test(anterior)) return false;
  if (/^(nos dirigimos|en este sentido|reciba)\b/i.test(siguiente)) return false;
  return /^[a-zÃ¡Ã©Ã­Ã³ÃºÃ±]/i.test(siguiente);
}

function seccionarTextoFormato(texto, tituloBase) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  if (!lineas.length) return [];

  const secciones = [];
  let actual = { titulo: tituloBase, items: [] };

  lineas.forEach((linea) => {
    const titulo = detectarTituloDetalle(linea);
    if (titulo) {
      if (actual.items.length) secciones.push(actual);
      actual = { titulo, items: [] };
      return;
    }
    const item = limpiarIndicacion(linea);
    if (item) actual.items.push(item);
  });

  if (actual.items.length) secciones.push(actual);
  return compactarSeccionesDetalle(secciones);
}

function detectarTituloDetalle(linea) {
  const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
  if (/^ventajas\b/.test(normal)) return "Ventajas";
  if (/^nota\b/.test(normal)) return "Nota";
  if (/^requisitos\b/.test(normal)) return "Requisitos";
  if (/^indicaciones\b/.test(normal)) return "Indicaciones";
  if (/^la modalidad de ingreso\b/.test(normal) || /^modalidad de ingreso\b/.test(normal)) return "Modalidad de ingreso";
  if (/^el programa de preparacion\b/.test(normal) || /^ciclo\b/.test(normal)) return "Ciclos";
  if (/^precio por ciclo\b/.test(normal)) return "Precio por ciclo";
  if (/^horarios?\b/.test(normal)) return "Horario";
  if (/^incluye\b/.test(normal)) return "Incluye";
  if (/^modalidades de inscripcion\b/.test(normal)) return "Modalidades de inscripción";
  if (/^opcion a\b/.test(normal)) return "Inscripción presencial";
  if (/^opcion b\b/.test(normal)) return "Inscripción virtual";
  if (/^materiales\b/.test(normal) || normal.includes("traer los siguientes utiles")) return "Útiles";
  if (/^el almuerzo\b/.test(normal) || /^almuerzo\b/.test(normal)) return "Almuerzo";
  if (normal.startsWith("si deseara coordinar")) return "Concesionarios";
  if (/^costo\b/.test(normal) || /^precio\b/.test(normal)) return "Costo";
  return "";
}

function compactarSeccionesDetalle(secciones) {
  const mapa = new Map();
  secciones.forEach((seccion) => {
    const clave = normalizarTextoPadres(seccion.titulo);
    const previa = mapa.get(clave);
    if (previa) {
      previa.items = quitarDuplicadosTexto([...previa.items, ...seccion.items]);
      return;
    }
    mapa.set(clave, {
      titulo: seccion.titulo,
      items: quitarDuplicadosTexto(seccion.items),
    });
  });
  return [...mapa.values()];
}

function extraerIndicacionesDesdeTexto(texto, { soloSeccion = false } = {}) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  if (!lineas.length) return [];

  const bloque = soloSeccion ? extraerBloqueIndicaciones(lineas) : lineas;
  if (!bloque.length) return [];

  return bloque.flatMap(dividirIndicacion).map(limpiarIndicacion).filter(esIndicacionValida);
}

function extraerBloqueIndicaciones(lineas) {
  const inicio = lineas.findIndex((linea) =>
    /^(requisitos|indicaciones|consideraciones|materiales)\s*:?$/i.test(normalizarTextoPadres(linea))
  );
  if (inicio === -1) return [];

  const salida = [];
  for (const linea of lineas.slice(inicio + 1)) {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    if (/^(costo|el almuerzo|almuerzo|entregar este formato|acepto|datos del alumno|modalidades|atentamente)\b/.test(normal)) {
      break;
    }
    salida.push(linea);
  }
  return salida;
}

function dividirIndicacion(linea) {
  const texto = String(linea || "").trim();
  if (texto.includes("\n")) return texto.split("\n");
  if (/^\d+[.)-]/.test(texto) || /^[*-]/.test(texto)) return [texto];
  if (texto.length > 90 && /[.;]\s+/.test(texto)) return texto.split(/[.;]\s+/);
  return [texto];
}

function limpiarIndicacion(valor) {
  return String(valor || "")
    .replace(/^[\s*-]+/, "")
    .replace(/^\d+[.)-]\s*/, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]$/, "");
}

function esIndicacionValida(valor) {
  const texto = String(valor || "").trim();
  const normal = normalizarTextoPadres(texto);
  if (texto.length < 4) return false;
  if (/^(requisitos|indicaciones|consideraciones|materiales|clases|ventajas)$/i.test(normal)) return false;
  if (/^(costo|pago unico|precio|s\/)/i.test(normal)) return false;
  if (normal.includes("soles") || normal.includes("s/")) return false;
  return true;
}

function quitarDuplicadosTexto(items) {
  const vistos = new Set();
  return items.filter((item) => {
    const clave = normalizarTextoPadres(item);
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

function limpiarTextoFormato(texto) {
  return repararTexto(texto)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function recortarTexto(texto, maximo) {
  const limpio = String(texto || "").replace(/\s+/g, " ").trim();
  if (limpio.length <= maximo) return limpio;
  const corte = limpio.slice(0, maximo).replace(/\s+\S*$/, "").trim();
  return `${corte}...`;
}

function normalizarTextoPadres(valor) {
  return repararTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function crearDatosComunicadoPadres(programa, estudiante, titulo) {
  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const grado = programa?.grado || programa?.gradoEstudiante || estudiante?.grado || "";
  return {
    TITULO: titulo,
    FECHA: "",
    FECHA_CARTA: "",
    ANIO_CARTA: new Date().getFullYear(),
    ANIO_CERT: new Date().getFullYear(),
    AREA: obtenerAreaPrograma(programa?.area || titulo),
    PROG: titulo,
    PROGRAMA: titulo,
    ALU: estudiante?.nombres || programa?.nombresEstudiante || "el estudiante",
    ALUMNO: estudiante?.nombres || programa?.nombresEstudiante || "el estudiante",
    AUL: grado || "Por definir",
    AULA: grado || "Por definir",
    GR_SEC: grado || "Por definir",
    GRADO: grado || "Por definir",
    NIV: programa?.nivelEducativo || estudiante?.nivel || estudiante?.nivelEducativo || "",
    NIVEL: programa?.nivelEducativo || estudiante?.nivel || estudiante?.nivelEducativo || "",
    HORARIO: repararTexto(programa?.horario || "Por confirmar"),
    DIA: repararTexto(programa?.dia || ""),
    DIAS: repararTexto(programa?.dias || ""),
    ALM: "",
    ALM_1: "",
    ALM_2: "",
    CLASE: repararTexto(programa?.horario || ""),
    CLASE_1: repararTexto(programa?.horario || ""),
    CLASE_2: "",
    HOR_ALM: "",
    HOR_ALM_1: "",
    HOR_ALM_2: "",
    DOCENTE: programa?.responsable || programa?.docente || "Por definir",
    RESPONSABLE: programa?.responsable || programa?.docente || "Por definir",
    COSTO: costo,
    PAGO: programa?.modalidadCobro || "Por confirmar",
    INI: programa?.fechaInicio ? formatearFechaPeru(programa.fechaInicio, programa.fechaInicio) : "",
    FIN: programa?.fechaFin ? formatearFechaPeru(programa.fechaFin, programa.fechaFin) : "",
    DUR: programa?.duracionTaller || formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin),
    CICLO: programa?.cicloI || "",
    CICLO_I: programa?.cicloI || "",
    CICLO_II: programa?.cicloII || "",
    MES_EVAL: "",
    N1: grado || "",
    N2: "",
    N3: "",
    N4: "",
    NIVEL_1: grado || "",
    NIVEL_2: "",
    NIVEL_CAMBRIDGE: programa?.nivelCambridge || estudiante?.nivelCambridge || "",
    SELECCION: describirSeleccionCambridgePadres(programa?.seleccion || estudiante?.seleccion || ""),
    CHK_A: String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase() === "A" ? "X" : "",
    CHK_B: String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase() === "B" ? "X" : "",
    CHK_C: String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase() === "C" ? "X" : "",
    FECHA_LIMITE: ventana?.fechaLimite || "",
    HORA_LIMITE: ventana?.horaLimite || "",
    APOD: "",
    CEL: "",
  };
}

function reemplazarVariablesComunicado(texto, datos = {}) {
  let salida = String(texto || "");
  Object.entries(datos).forEach(([clave, valor]) => {
    const seguro = valor == null ? "" : String(valor);
    const patron = new RegExp(`\\{\\{\\s*${clave}\\s*\\}\\}|\\[\\[\\s*${clave}\\s*\\]\\]|\\{\\s*${clave}\\s*\\}`, "gi");
    salida = salida.replace(patron, seguro);
  });
  return salida.replace(/\{\{[^}]+\}\}|\[\[[^\]]+\]\]|\{[A-Z0-9_]+\}/gi, "");
}

function limpiarComunicadoWord(texto, datos) {
  const limpio = repararTexto(reemplazarVariablesComunicado(texto, datos.datos || {}))
    .replace(/\{\{\s*TITULO\s*\}\}/gi, datos.programa)
    .replace(/\{\{\s*FECHA\s*\}\}/gi, "")
    .replace(/\{\{\s*AREA\s*\}\}/gi, datos.area)
    .replace(/\{\{\s*PROG\s*\}\}/gi, datos.programa)
    .replace(/\barea de\s*,/gi, `area de ${datos.area},`)
    .replace(/\barea de\s+hemos/gi, `area de ${datos.area}, hemos`)
    .replace(/\baula\s*,/gi, `aula ${datos.programa},`)
    .replace(/\baula\s+la cual/gi, `aula ${datos.programa}, la cual`)
    .replace(/\d{10,}\s*:\s*Del\s+al\s*\./gi, "")
    .replace(/\b\d{10,}\b/g, "")
    .replace(/\s+(DURACI[OÃ“]N|REQUISITOS|COSTO|EL ALMUERZO|ACEPTO|DATOS DEL ALUMNO|DATOS DEL APODERADO)\s*:?/gi, "\n$1:")
    .replace(/\s+([,.])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return limpiarCierreFormularioWord(limpio);
}

function textoIncluyeSeccionesDePrograma(texto) {
  const normal = normalizarTextoPadres(texto);
  const marcadores = [
    /\brequisitos?\b/,
    /\bcosto\b/,
    /\bpago unico\b/,
    /\bel almuerzo\b/,
    /\bentregar este formato\b/,
    /\bdatos del alumno\b/,
    /\bacepto\b/,
  ];
  return marcadores.filter((patron) => patron.test(normal)).length >= 2;
}

function limpiarCierreFormularioWord(texto) {
  return String(texto || "")
    .replace(/\bAtentamente[\s\S]*$/i, "")
    .replace(/\bENTREGAR ESTE FORMATO[\s\S]*$/i, "")
    .replace(/\bACEPTO\s*:[\s\S]*$/i, "")
    .replace(/\bDATOS DEL ALUMNO\s*:[\s\S]*$/i, "")
    .replace(/\bDATOS DEL APODERADO\s*:[\s\S]*$/i, "")
    .replace(/\b0-\d{6,}\b/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Repara texto con doble codificación UTF-8 (mojibake).
 *
 * Cuando texto UTF-8 se lee como Windows-1252/Latin-1, cada byte del UTF-8 original
 * se convierte en un caracter Unicode incorrecto. Esta función revierte ese proceso:
 * 1. Convierte cada caracter de vuelta a su byte original (usando tabla inversa Win-1252)
 * 2. Busca secuencias de bytes que formen UTF-8 válido (2, 3 o 4 bytes)
 * 3. Decodifica esas secuencias al caracter Unicode correcto
 *
 * Ejemplos: Ã³ → ó, Ã± → ñ, â€" → –, Ã"N → ÓN, MARRÃ"N → MARRÓN
 */
export function repararTexto(texto) {
  const s = String(texto || "");
  if (!s || typeof TextDecoder === "undefined") return s;

  // Tabla inversa Windows-1252: mapea code points Unicode → byte original (0x80-0x9F).
  // Los bytes 0x80-0x9F en Win-1252 se mapean a estos code points Unicode.
  // Para revertir el mojibake, necesitamos el mapeo inverso.
  const w1252 = new Map([
    [0x20AC, 0x80], // €
    [0x201A, 0x82], // ‚
    [0x0192, 0x83], // ƒ
    [0x201E, 0x84], // „
    [0x2026, 0x85], // …
    [0x2020, 0x86], // †
    [0x2021, 0x87], // ‡
    [0x02C6, 0x88], // ˆ
    [0x2030, 0x89], // ‰
    [0x0160, 0x8A], // Š
    [0x2039, 0x8B], // ‹
    [0x0152, 0x8C], // Œ
    [0x017D, 0x8E], // Ž
    [0x2018, 0x91], // '
    [0x2019, 0x92], // '
    [0x201C, 0x93], // "
    [0x201D, 0x94], // "
    [0x2022, 0x95], // •
    [0x2013, 0x96], // –
    [0x2014, 0x97], // —
    [0x02DC, 0x98], // ˜
    [0x2122, 0x99], // ™
    [0x0161, 0x9A], // š
    [0x203A, 0x9B], // ›
    [0x0153, 0x9C], // œ
    [0x017E, 0x9E], // ž
    [0x0178, 0x9F], // Ÿ
  ]);

  function toByte(ch) {
    const c = ch.codePointAt(0);
    if (c < 0x100) return c;
    const b = w1252.get(c);
    return b !== undefined ? b : -1;
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let out = "";
  let i = 0;
  const len = s.length;

  while (i < len) {
    const b0 = toByte(s[i]);
    let consumed = 0;

    // Intentar secuencia UTF-8 de 4 bytes: F0-F4 (emojis, símbolos especiales)
    if (b0 >= 0xF0 && b0 <= 0xF4 && i + 3 < len) {
      const b1 = toByte(s[i + 1]);
      const b2 = toByte(s[i + 2]);
      const b3 = toByte(s[i + 3]);
      if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
        try {
          out += decoder.decode(new Uint8Array([b0, b1, b2, b3]));
          consumed = 4;
        } catch { /* no es secuencia UTF-8 válida */ }
      }
    }

    // Intentar secuencia UTF-8 de 3 bytes: E0-EF (ej: – — " " … emojis de 3 bytes)
    if (!consumed && b0 >= 0xE0 && b0 <= 0xEF && i + 2 < len) {
      const b1 = toByte(s[i + 1]);
      const b2 = toByte(s[i + 2]);
      if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
        try {
          out += decoder.decode(new Uint8Array([b0, b1, b2]));
          consumed = 3;
        } catch { /* no es secuencia UTF-8 válida */ }
      }
    }

    // Intentar secuencia UTF-8 de 2 bytes: C2-DF (ej: á é í ó ú ñ Á É Í Ó Ú Ñ ° ¡ ¿)
    if (!consumed && b0 >= 0xC2 && b0 <= 0xDF && i + 1 < len) {
      const b1 = toByte(s[i + 1]);
      if ((b1 & 0xC0) === 0x80) {
        try {
          out += decoder.decode(new Uint8Array([b0, b1]));
          consumed = 2;
        } catch { /* no es secuencia UTF-8 válida */ }
      }
    }

    if (consumed) {
      i += consumed;
    } else {
      out += s[i];
      i++;
    }
  }

  return out
    .replace(/\bCKAUB\b/g, "CLUB")
    .replace(/\bMATEMTAICA\b/g, "MATEMÁTICA")
    .replace(/\bMatemtaica\b/gi, "Matemática")
    .replace(/\bCkaub\b/gi, "Club")
    .replace(/\bMatematica\b/gi, "Matemática");
}

export function dividirSentencias(texto) {
  const textToProcess = String(texto).trim();
  const sentencias = [];
  const regexPunto = /\.\s+(?=[A-ZÁÉÍÓÚÑ])/g;
  const abrevs = new Set(["sr", "sra", "dr", "dra", "lic", "ing", "av", "jr", "prof", "profa", "a.m", "p.m"]);

  let lastCut = 0;
  let match;

  while ((match = regexPunto.exec(textToProcess)) !== null) {
    const pos = match.index;
    const antes = textToProcess.slice(0, pos);

    const ultimaPalabraMatch = antes.match(/(\b\S+)$/);
    const ultimaPalabra = ultimaPalabraMatch ? ultimaPalabraMatch[1].toLowerCase() : "";

    if (abrevs.has(ultimaPalabra) || abrevs.has(ultimaPalabra.replace(/\.$/, ""))) {
      continue;
    }

    const parte = textToProcess.slice(lastCut, pos + 1).trim();
    if (parte) {
      sentencias.push(parte);
    }
    lastCut = pos + 1;
  }

  const parteFinal = textToProcess.slice(lastCut).trim();
  if (parteFinal) {
    sentencias.push(parteFinal);
  }

  return sentencias;
}

export function dividirParrafosPorCampos(parrafos) {
  if (!Array.isArray(parrafos)) return [];
  const regex = /(Vigencia|Horario|Costo|Plazo de inscripci[oó]n|Plazo|Responsable del programa|Responsable|Docente|Modalidad de cobro|Modalidad de pago|Modalidad de ingreso|Modalidad):/gi;
  const resultado = [];

  parrafos.forEach((parrafo) => {
    const texto = String(parrafo || "").trim();
    if (!texto) return;

    const matches = [];
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(texto)) !== null) {
      matches.push({
        index: match.index,
        label: match[1],
        full: match[0],
      });
    }

    if (matches.length === 0) {
      resultado.push(...dividirSentencias(texto));
      return;
    }

    if (matches[0].index > 0) {
      const partePrevia = texto.slice(0, matches[0].index).trim();
      if (partePrevia) {
        resultado.push(...dividirSentencias(partePrevia));
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const inicio = matches[i].index;
      const fin = i + 1 < matches.length ? matches[i + 1].index : texto.length;
      const chunk = texto.slice(inicio, fin).trim();

      const sentenciasDelChunk = dividirSentencias(chunk);
      if (sentenciasDelChunk.length > 0) {
        resultado.push(sentenciasDelChunk[0]);
        for (let j = 1; j < sentenciasDelChunk.length; j++) {
          resultado.push(sentenciasDelChunk[j]);
        }
      }
    }
  });

  return resultado;
}

export function obtenerTipoCampo(label = "") {
  const texto = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (texto.includes("vigencia") || texto.includes("fecha")) return "vigencia";
  if (texto.includes("horario") || texto.includes("hora")) return "horario";
  if (texto.includes("costo") || texto.includes("pago") || texto.includes("precio")) return "costo";
  if (texto.includes("plazo") || texto.includes("limite")) return "plazo";
  if (texto.includes("responsable") || texto.includes("docente")) return "responsable";
  return "general";
}
