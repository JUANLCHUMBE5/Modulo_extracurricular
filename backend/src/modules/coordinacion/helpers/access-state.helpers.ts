import { normalizarTexto } from "./identity.helpers.js";

/**
 * Valida si el horario del taller coincide con el dia de la semana actual.
 */
export function esDiaCorrecto(horarioStr: string): boolean {
  if (!horarioStr) return false;

  let hoyEsp = "lunes";
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      weekday: "long"
    });
    const weekdayEnglish = formatter.format(new Date()).toLowerCase();
    const mapping: Record<string, string> = {
      sunday: "domingo",
      monday: "lunes",
      tuesday: "martes",
      wednesday: "miercoles",
      thursday: "jueves",
      friday: "viernes",
      saturday: "sabado"
    };
    hoyEsp = mapping[weekdayEnglish] || "lunes";
  } catch (e) {
    const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    hoyEsp = diasSemana[new Date().getDay()] || "lunes";
  }

  const normalizar = (txt: string) => String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const horarioNorm = normalizar(horarioStr);
  const diasSemanaLista = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const diasEncontrados = diasSemanaLista.filter(dia => horarioNorm.includes(dia));
  if (diasEncontrados.length === 0) return false;
  return horarioNorm.includes(hoyEsp);
}

/**
 * Calcula los minutos restantes para permitir un reingreso en menos de 15 minutos.
 */
export function obtenerMinutosRestantesIngresoReciente(
  asistenciasList: any[],
  studentDni: string,
  studentCode: string,
  programId: string,
  nowMs: number = Date.now()
): number {
  if (!Array.isArray(asistenciasList)) return 0;
  const cleanDni = studentDni ? String(studentDni).replace(/\D/g, "") : "";
  const cleanCode = studentCode ? String(studentCode).trim() : "";
  let maxRestante = 0;
  asistenciasList.forEach(ast => {
    const astDni = ast.dniEstudiante ? String(ast.dniEstudiante).replace(/\D/g, "") : "";
    const astCode = ast.codigoEstudiante ? String(ast.codigoEstudiante).trim() : "";
    const coincideEstudiante = (cleanDni && astDni === cleanDni) || (cleanCode && astCode === cleanCode);
    if (!coincideEstudiante) return;
    const coincidePrograma = ast.programaId === programId;
    if (!coincidePrograma) return;
    const fechaAst = new Date(ast.fechaRegistro);
    if (isNaN(fechaAst.getTime())) return;
    const diffMs = nowMs - fechaAst.getTime();
    const limiteMs = 60 * 60 * 1000; // 1 hora de bloqueo para evitar fraude / compartir accesos
    if (diffMs >= 0 && diffMs < limiteMs) {
      const mins = Math.ceil((limiteMs - diffMs) / 60000);
      if (mins > maxRestante) maxRestante = mins;
    }
  });
  return maxRestante;
}

/**
 * Normaliza el estado de pago del estudiante a 'pagado', 'anulado' o 'pendiente'.
 */
export function normalizarEstadoPago(valor: any): string {
  const msg = normalizarTexto(valor);
  if (["completado", "pagado", "validado", "pago validado"].some((estado) => msg.includes(estado))) return "pagado";
  if (["cancelado", "anulado", "rechazado"].some((estado) => msg.includes(estado))) return "anulado";
  return "pendiente";
}

/**
 * Resuelve el estado de pago final evaluando tanto la inscripcion como la transaccion.
 */
export function resolverEstadoPago(inscripcion: any, pago: any): string {
  const estadoPago = normalizarEstadoPago(pago?.estado);
  const estadoInscripcion = normalizarEstadoPago(inscripcion?.estadoPago);
  if (estadoPago === "pagado" || estadoInscripcion === "pagado") return "pagado";
  if (estadoPago === "anulado" || estadoInscripcion === "anulado") return "anulado";
  return "pendiente";
}

/**
 * Ordena un listado de objetos por fecha de forma descendente.
 */
export function ordenarPorFecha(items: any[], campoPreferido: string = "fechaRegistro"): any[] {
  return [...items].sort((a, b) => {
    const fechaA = new Date(a?.[campoPreferido] || a?.fechaPago || a?.fecha || a?.createdAt || 0).getTime();
    const fechaB = new Date(b?.[campoPreferido] || b?.fechaPago || b?.fecha || b?.createdAt || 0).getTime();
    return fechaB - fechaA;
  });
}

function getAhoraLima(): Date {
  const ahora = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(ahora);
    const getVal = (type: string) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);
    return new Date(getVal("year"), getVal("month") - 1, getVal("day"), getVal("hour"), getVal("minute"), getVal("second"));
  } catch (e) {
    return ahora;
  }
}

/**
 * Determina si la llegada actual del alumno es considerada tardanza.
 */
export function esLlegadaTardanza(horarioStr: string, toleranciaMinutos: number = 10): boolean {
  if (!horarioStr) return false;

  const str = String(horarioStr);
  let match = str.match(/clase\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);

  if (!match) {
    const cleaned = str.replace(/almuerzo\s+\d{2}:\d{2}-\d{2}:\d{2},?\s*/gi, "");
    match = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
    if (!match) {
      const singleMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i);
      if (!singleMatch) return false;

      const hours = parseInt(singleMatch[1], 10);
      const minutes = parseInt(singleMatch[2], 10);
      const meridian = singleMatch[3] ? singleMatch[3].toLowerCase().replace(/\s/g, "") : null;

      let hours24 = hours;
      if (meridian) {
        if (meridian.includes("p") && hours < 12) hours24 += 12;
        else if (meridian.includes("a") && hours === 12) hours24 = 0;
      }
      const inicioMinutos = hours24 * 60 + minutes;

      const ahora = getAhoraLima();
      const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();

      return ahoraMinutos > (inicioMinutos + toleranciaMinutos);
    }
  }

  const startHrs = parseInt(match[1], 10);
  const startMins = parseInt(match[2], 10);
  const startMeridian = match[3] ? match[3].toLowerCase().replace(/\s/g, "") : null;

  let startHrs24 = startHrs;
  if (startMeridian) {
    if (startMeridian.includes("p") && startHrs < 12) startHrs24 += 12;
    else if (startMeridian.includes("a") && startHrs === 12) startHrs24 = 0;
  }
  const inicioMinutos = startHrs24 * 60 + startMins;

  const ahora = getAhoraLima();
  const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();

  return ahoraMinutos > (inicioMinutos + toleranciaMinutos);
}
