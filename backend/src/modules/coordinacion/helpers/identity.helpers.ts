/**
 * Limpia y normaliza códigos de texto eliminando espacios y convirtiendo a mayúsculas.
 */
export function limpiarCodigo(valor: any): string {
  return String(valor || "").trim().toUpperCase();
}

/**
 * Convierte un texto a minúsculas, elimina espacios y remueve tildes/acentos.
 */
export function normalizarTexto(valor: any): string {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Compara dos códigos de forma segura ignorando mayúsculas y espacios.
 */
export function mismoCodigo(a: any, b: any): boolean {
  const valorA = limpiarCodigo(a);
  const valorB = limpiarCodigo(b);
  return Boolean(valorA && valorB && valorA === valorB);
}

/**
 * Normaliza y limpia campos de identificación (DNI, código, etc.) de un objeto.
 */
export function normalizarIdentificadores(ids: any = {}): Record<string, string> {
  const dniVal = ids.dni || ids.dniEstudiante || ids.estudianteDni;
  const cleanDniVal = dniVal ? String(dniVal).replace(/\D/g, "").slice(0, 8) : "";
  return {
    dni: cleanDniVal,
    codigoEstudiante: limpiarCodigo(ids.codigoEstudiante || ids.codigoAlumno),
    inscripcionId: limpiarCodigo(ids.inscripcionId || ids.idInscripcion),
    pagoId: limpiarCodigo(ids.pagoId || ids.idPago),
    programaId: limpiarCodigo(ids.programaId || ids.idPrograma),
    codigoOriginal: String(ids.codigoOriginal || ids.codigo || "").trim(),
  };
}

function extraerDesdeJson(texto: string): any {
  try {
    const json = JSON.parse(texto);
    if (!json || typeof json !== "object") return null;
    return idsDesdeObjeto(json);
  } catch {
    return null;
  }
}

function extraerDesdeUrl(texto: string): any {
  try {
    const url = new URL(texto);
    const params = Object.fromEntries(url.searchParams.entries());
    const segmentos = url.pathname.split("/").filter(Boolean).join(" ");
    return idsDesdeObjeto({ ...params, codigo: `${segmentos} ${url.hash || ""}` });
  } catch {
    return null;
  }
}

function idsDesdeObjeto(obj: any = {}): any {
  const codigo = obj.codigo || obj.code || obj.qr || obj.token || "";
  const textoExtendido = [
    codigo,
    obj.id,
    obj.path,
    obj.payload,
    obj.inscripcion,
    obj.registro,
  ].filter(Boolean).join(" ");
  return {
    dni: obj.dni || obj.dniEstudiante || obj.estudianteDni || textoExtendido.match(/\b\d{8}\b/)?.[0] || "",
    codigoEstudiante: obj.codigoEstudiante || obj.codigoAlumno || textoExtendido.match(/\b(?:EST|EXT)-[A-Z0-9-]+\b/i)?.[0] || "",
    inscripcionId: obj.inscripcionId || obj.idInscripcion || obj.registroId || textoExtendido.match(/\bINS-[A-Z0-9-]+\b/i)?.[0] || "",
    pagoId: obj.pagoId || obj.idPago || textoExtendido.match(/\bPAG-[A-Z0-9-]+\b/i)?.[0] || "",
    programaId: obj.programaId || obj.idPrograma || "",
  };
}

/**
 * Parsea un código de texto o string JSON/URL buscando DNI, código de alumno, etc.
 */
export function extraerIdentificadoresCodigo(codigo: any): Record<string, string> {
  const texto = String(codigo || "").trim();
  const ids: any = { codigoOriginal: texto };
  if (!texto) return ids;
  const desdeJson = extraerDesdeJson(texto);
  if (desdeJson) return normalizarIdentificadores({ ...ids, ...desdeJson });
  const desdeUrl = extraerDesdeUrl(texto);
  if (desdeUrl) return normalizarIdentificadores({ ...ids, ...desdeUrl });
  const dni = texto.match(/\b\d{8}\b/)?.[0] || "";
  const inscripcionId = texto.match(/\bINS-[A-Z0-9-]+\b/i)?.[0] || "";
  const pagoId = texto.match(/\bPAG-[A-Z0-9-]+\b/i)?.[0] || "";
  const codigoEstudiante = texto.match(/\b(?:EST|EXT)-[A-Z0-9-]+\b/i)?.[0] || "";
  return normalizarIdentificadores({
    ...ids,
    dni,
    inscripcionId,
    pagoId,
    codigoEstudiante,
  });
}
