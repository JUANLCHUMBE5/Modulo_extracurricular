/**
 * Normaliza el estado de un programa de la base de datos a un término descriptivo para el Frontend.
 * @param state Estado actual del programa en base de datos ("borrador", "publicado", etc.)
 * @returns Estado mapeado para el cliente ("Habilitado" o "Deshabilitado")
 */
export function normalizeProgramStateToFrontend(state: string): string {
  const map: Record<string, string> = {
    borrador: "Deshabilitado",
    publicado: "Habilitado",
    cerrado: "Deshabilitado",
    archivado: "Deshabilitado",
    Habilitado: "Habilitado",
    Deshabilitado: "Deshabilitado"
  };
  return map[state] || state || "Habilitado";
}

/**
 * Normaliza el estado de una matrícula (inscripción) de la base de datos a un término para el Frontend.
 * @param state Estado de la matrícula en la base de datos ("preinscrita", "confirmada", etc.)
 * @returns Estado formateado para el cliente ("Pendiente de pago", "Pago validado", etc.)
 */
export function normalizeEnrollmentStateToFrontend(state: string): string {
  const map: Record<string, string> = {
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

/**
 * Normaliza el estado de una transacción de pago de la base de datos a un término para el Frontend.
 * @param state Estado del pago en la base de datos ("pendiente", "validado", etc.)
 * @returns Estado mapeado para el cliente ("Por Verificar", "completado", "observado", etc.)
 */
export function normalizePaymentStateToFrontend(state: string): string {
  const map: Record<string, string> = {
    pendiente: "Por Verificar",
    validado: "completado",
    observado: "observado",
    rechazado: "observado",
    anulado: "anulado",
    "Por Verificar": "Por Verificar",
    "completado": "completado"
  };
  return map[state] || state || "Por Verificar";
}

/**
 * Normaliza el estado de la asistencia de un alumno.
 * @param state Estado de la asistencia en base de datos.
 * @returns El mismo estado, por defecto "presente".
 */
export function normalizeAttendanceStateToFrontend(state: string): string {
  return state || "presente";
}

/**
 * Traduce el estado de un programa desde el Frontend hacia el valor que requiere la Base de Datos.
 * @param state Estado proveniente del cliente ("Habilitado", "Deshabilitado")
 * @returns Estado para almacenar en la base de datos ("publicado", "borrador", etc.)
 */
export function normalizeProgramStateToBackend(state: string): string {
  const map: Record<string, string> = {
    Habilitado: "publicado",
    Deshabilitado: "borrador",
    publicado: "publicado",
    borrador: "borrador",
    cerrado: "cerrado",
    archivado: "archivado"
  };
  return map[state] || state || "publicado";
}

/**
 * Traduce el estado de una inscripción desde el Frontend hacia el término que requiere la Base de Datos.
 * @param state Estado de la inscripción en el frontend ("Pendiente de pago", "Por Verificar", etc.)
 * @returns Estado correspondiente para la base de datos ("pendiente_pago", "pendiente_validacion", etc.)
 */
export function normalizeEnrollmentStateToBackend(state: string): string {
  const map: Record<string, string> = {
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

/**
 * Traduce el estado de un pago desde el Frontend hacia el término correspondiente en la Base de Datos.
 * @param state Estado del pago en el frontend ("Por Verificar", "completado", etc.)
 * @returns Estado correspondiente para la base de datos ("pendiente", "validado", etc.)
 */
export function normalizePaymentStateToBackend(state: string): string {
  const map: Record<string, string> = {
    "Por Verificar": "pendiente",
    "completado": "validado",
    "observado": "observado",
    "anulado": "anulado",
    pendiente: "pendiente",
    validado: "validado"
  };
  return map[state] || state || "pendiente";
}

/**
 * Normaliza el nombre de un periodo escolar para determinar si es periodo de verano u ordinario.
 * @param valor Nombre o texto del periodo
 * @returns "verano" o "escolar"
 */
export function normalizarPeriodoApi(valor: any): "verano" | "escolar" {
  return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

/**
 * Limpia y estandariza un texto eliminando espacios extras, convirtiéndolo a minúsculas y removiendo tildes/diacríticos.
 * Útil para búsquedas y comparaciones no sensibles a mayúsculas o acentos.
 * @param valor Cadena de texto a normalizar
 * @returns Texto limpio, en minúsculas y sin acentos
 */
export function normalizarTextoApi(valor: any): string {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Parsea un monto numérico asegurando que tenga un formato de 2 decimales y maneje casos especiales como ". 1" o ".1"
 * @param monto Valor del monto a parsear
 * @returns Número con 2 decimales de precisión
 */
export function parseMonto(monto: any): number {
  if (monto === undefined || monto === null) return 0;
  let valStr = String(monto).trim();
  // Quitar símbolos de moneda y espacios intermedios
  valStr = valStr.replace(/[S/$\s]/g, "");
  
  // Si empieza con punto o coma (ej: ". 1" o ", 1" o ".1"), quitamos ese carácter inicial
  if (valStr.startsWith(".") || valStr.startsWith(",")) {
    valStr = valStr.slice(1).trim();
  }
  
  // Reemplazar coma decimal por punto decimal
  valStr = valStr.replace(",", ".");
  
  const num = parseFloat(valStr);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

/**
 * Formatea un monto con exactamente 2 decimales como cadena de texto.
 * @param monto Valor del monto
 * @returns Cadena con formato "XX.XX"
 */
export function formatMonto(monto: any): string {
  return parseMonto(monto).toFixed(2);
}

