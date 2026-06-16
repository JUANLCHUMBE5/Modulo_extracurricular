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

  if (fechaInicio > fechaFin) return "Rango de fechas inválido";

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

export function obtenerVentanaInscripcion(fechaInicio, fechaBase = new Date(), duracionAvisoDias = 2, horaLimiteAviso = "23:59") {
  const inicio = normalizarFecha(fechaInicio);
  const hoy = normalizarFecha(fechaBase);
  const diasAviso = normalizarDuracionAvisoDias(duracionAvisoDias);
  if (!inicio || !hoy) {
    return {
      permitida: true,
      requiereCaja: false,
      fechaLimite: "",
      horaLimite: "",
      duracionAvisoDias: diasAviso,
      mensaje: "",
    };
  }

  const limiteDia = addDays(startOfDay(inicio), diasAviso - 1);
  let limite = new Date(limiteDia);
  const horaRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  const horaStr = String(horaLimiteAviso || "23:59").trim();
  let horas = 23;
  let minutos = 59;
  if (horaRegex.test(horaStr)) {
    const [h, m] = horaStr.split(":");
    horas = parseInt(h, 10);
    minutos = parseInt(m, 10);
  }
  limite.setHours(horas, minutos, 59, 999);

  const permitida = hoy.getTime() <= limite.getTime();
  const horaFormateada = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;

  return {
    permitida,
    requiereCaja: !permitida,
    fechaLimite: format(limite, "dd/MM/yyyy", { locale: es }),
    horaLimite: horaFormateada,
    duracionAvisoDias: diasAviso,
    mensaje: permitida
      ? `Aviso de inscripción habilitado hasta el ${format(limite, "dd/MM/yyyy", { locale: es })} a las ${horaFormateada}.`
      : "El aviso de inscripción regular cerró. Derive al padre a Cajera para evaluar el registro.",
  };
}

export function normalizarFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isValid(valor) ? valor : null;

  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const fecha = parseISO(texto);
    if (isValid(fecha)) return fecha;
  }

  const dmyMatch = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const dia = parseInt(dmyMatch[1], 10);
    const mes = parseInt(dmyMatch[2], 10) - 1;
    const anio = parseInt(dmyMatch[3], 10);
    const fecha = new Date(anio, mes, dia);
    if (isValid(fecha)) return fecha;
  }

  const fecha = new Date(texto);
  return isValid(fecha) ? fecha : null;
}
