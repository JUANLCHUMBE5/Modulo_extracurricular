import { addDays, differenceInCalendarDays, format, formatISO, isValid, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

export function fechaActualIso() {
  return formatISO(new Date());
}

export function fechaActualInput() {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatearFechaPeru(valor, respaldo = "") {
  const fecha = normalizarFecha(valor);
  if (!fecha) return respaldo;
  return format(fecha, "dd/MM/yyyy", { locale: es });
}

export function formatearFechaHoraPeru(valor, respaldo = "Fecha no registrada") {
  const fecha = normalizarFecha(valor);
  if (!fecha) return respaldo;
  return format(fecha, "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatearFechaLargaPeru(valor, respaldo = "") {
  const fecha = normalizarFecha(valor);
  if (!fecha) return respaldo;
  return format(fecha, "dd 'de' MMMM 'de' yyyy", { locale: es });
}

export function calcularDuracionTexto(inicio, fin) {
  const fechaInicio = normalizarFecha(inicio);
  const fechaFin = normalizarFecha(fin);
  if (!fechaInicio || !fechaFin) return "";

  const dias = Math.max(1, differenceInCalendarDays(fechaFin, fechaInicio) + 1);
  if (dias < 30) return `${dias} días`;

  const meses = Math.max(1, Math.round(dias / 30));
  return `${meses} mes${meses === 1 ? "" : "es"}`;
}

export function normalizarDuracionAvisoDias(valor, respaldo = 2) {
  const numero = Math.trunc(Number(valor));
  const dias = Number.isFinite(numero) && numero > 0 ? numero : respaldo;
  return Math.min(7, Math.max(1, dias));
}

export function obtenerVentanaInscripcion(fechaInicio, fechaBase = new Date(), duracionAvisoDias = 2) {
  const inicio = normalizarFecha(fechaInicio);
  const hoy = normalizarFecha(fechaBase);
  const diasAviso = normalizarDuracionAvisoDias(duracionAvisoDias);
  if (!inicio || !hoy) {
    return {
      permitida: true,
      requiereCaja: false,
      fechaLimite: "",
      duracionAvisoDias: diasAviso,
      mensaje: "",
    };
  }

  const limite = addDays(startOfDay(inicio), diasAviso - 1);
  const fechaActual = startOfDay(hoy);
  const permitida = fechaActual <= limite;

  return {
    permitida,
    requiereCaja: !permitida,
    fechaLimite: format(limite, "dd/MM/yyyy", { locale: es }),
    duracionAvisoDias: diasAviso,
    mensaje: permitida
      ? `Aviso de inscripcion habilitado hasta el ${format(limite, "dd/MM/yyyy", { locale: es })}.`
      : "El aviso de inscripcion regular cerro. Derive al padre a Caja para evaluar el registro.",
  };
}

export function normalizarFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isValid(valor) ? valor : null;

  const texto = String(valor);
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(texto)
    ? parseISO(texto)
    : new Date(texto);

  return isValid(fecha) ? fecha : null;
}
