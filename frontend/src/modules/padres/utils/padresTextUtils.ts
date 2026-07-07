import { formatearFechaPeru, obtenerVentanaInscripcion } from "../../../services/dateService";
import {
  limpiarComunicadoWord,
  textoIncluyeSeccionesDePrograma,
  extraerMensajePrincipalWord,
  obtenerDetalleFormatoDesdeWord,
  dividirParrafosPorCampos,
  obtenerDetalleFormatoPadres,
  normalizarTextoPadres,
  repararTexto,
  obtenerAreaPrograma,
  obtenerTipoCampo,
  formatearHorarioDetalle,
} from "./padresTextParsing";
import {
  crearDatosComunicadoPadres,
  crearComunicadoCambridgePadres,
  crearComunicadoClubTareasPadres,
  crearComunicadoBasicoPadres,
  obtenerIndicacionesProgramaPadres,
  resumirComunicadoPadres,
  obtenerDatosCambridgePadres,
} from "./padresTextBuilders";

export {
  crearDatosComunicadoPadres,
  limpiarComunicadoWord,
  textoIncluyeSeccionesDePrograma,
  extraerMensajePrincipalWord,
  obtenerDetalleFormatoDesdeWord,
  crearComunicadoCambridgePadres,
  crearComunicadoClubTareasPadres,
  crearComunicadoBasicoPadres,
  dividirParrafosPorCampos,
  obtenerIndicacionesProgramaPadres,
  obtenerDetalleFormatoPadres,
  resumirComunicadoPadres,
  obtenerDatosCambridgePadres,
  normalizarTextoPadres,
  repararTexto,
  obtenerAreaPrograma,
  obtenerTipoCampo,
  formatearHorarioDetalle,
};

export function prepararComunicadoPadres(programa: any, estudiante: any) {
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
  const indicaciones = obtenerIndicacionesProgramaPadres(programa, { esCambridge, esClubTareas });
  if (ventana.fechaLimite) {
    indicaciones.unshift(
      `Confirmar la inscripción en línea a más tardar el ${ventana.fechaLimite} a las ${ventana.horaLimite} (cierre de inscripciones regulares).`
    );
  }
  const detalleFormato = obtenerDetalleFormatoPadres(programa);
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

export function formatearRangoFechasPadres(inicio: any, fin: any) {
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

export function convertirHorasAMPM(texto: any) {
  if (!texto) return "";

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

  result = result.replace(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/gi, "$1 - $2");
  result = result.replace(/\s*-\s*(aula|AULA)\s*/i, " · Aula ");

  return result;
}

export function dividirHorarioPadres(horario: any) {
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

function formatearFechaLetrasPadres(fecha: any, { incluirAnio = true, usarDeAnio = true } = {}) {
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

function crearFechaLocal(valor: any) {
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

export function esProgramaCambridgePadres(programa: any) {
  const texto = normalizarTextoPadres([
    programa?.programa,
    programa?.nombre,
    programa?.categoria,
    programa?.plantilla,
  ].filter(Boolean).join(" "));
  return texto.includes("cambridge");
}

function esProgramaClubTareasPadres(programa: any) {
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
  const opciones: any = {
    A: "A - Promovido/a por Certificado Oficial 2025",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por Desempeño Académico",
  };
  return opciones[seleccion] || "Pendiente de definir en Coordinación Académica";
}
