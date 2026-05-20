import { formatearFechaPeru } from "../../../services/dateService";

export function prepararComunicadoPadres(programa, estudiante) {
  const titulo = programa?.programa || programa?.nombre || "Comunicado del programa";
  const fecha = programa?.fechaInicio
    ? `Carabayllo, ${formatearFechaPeru(programa.fechaInicio, "Por definir")}`
    : "";
  const area = obtenerAreaPrograma(programa?.area || titulo);
  const alumno = estudiante?.nombres || "el estudiante";
  const textoWord = limpiarComunicadoWord(programa?.comunicado || "", { area, programa: titulo, alumno });
  const parrafos = textoWord
    ? textoWord.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
    : [`Coordinacion aun no registro un comunicado en la plantilla Word para ${alumno}.`];

  return { titulo, fecha, parrafos };
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

export function dividirHorarioPadres(horario) {
  const texto = String(horario || "").trim();
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

function limpiarComunicadoWord(texto, datos) {
  return repararTexto(texto)
    .replace(/\{\{\s*TITULO\s*\}\}/gi, datos.programa)
    .replace(/\{\{\s*FECHA\s*\}\}/gi, "")
    .replace(/\{\{\s*AREA\s*\}\}/gi, datos.area)
    .replace(/\{\{\s*PROG\s*\}\}/gi, datos.programa)
    .replace(/\barea de\s*,/gi, `area de ${datos.area},`)
    .replace(/\barea de\s+hemos/gi, `area de ${datos.area}, hemos`)
    .replace(/\baula\s*,/gi, `aula ${datos.programa},`)
    .replace(/\baula\s+la cual/gi, `aula ${datos.programa}, la cual`)
    .replace(/\d{10,}\s*:\s*Del\s+al\s*\./gi, "")
    .replace(/\s+([,.])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function repararTexto(texto) {
  return String(texto || "")
    .replace(/MatemÃ¡tico/g, "Matematico")
    .replace(/DirecciÃ³n/g, "Direccion")
    .replace(/estÃ¡/g, "esta")
    .replace(/aquÃ­/g, "aqui")
    .replace(/explicaciÃ³n/g, "explicacion")
    .replace(/resoluciÃ³n/g, "resolucion")
    .replace(/Ã¡rea/g, "area")
    .replace(/distribuciÃ³n/g, "distribucion")
    .replace(/InstituciÃ³n/g, "Institucion")
    .replace(/CoordinaciÃ³n/g, "Coordinacion");
}
