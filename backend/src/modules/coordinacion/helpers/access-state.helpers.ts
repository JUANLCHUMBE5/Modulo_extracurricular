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
    const limiteMs = 15 * 60 * 1000;
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
