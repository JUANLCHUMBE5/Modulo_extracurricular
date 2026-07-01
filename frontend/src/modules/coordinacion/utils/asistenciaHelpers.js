/**
 * Utilidades de ayuda para formateo y procesamiento de asistencias.
 */

/**
 * Normaliza un string para comparaciones seguras de texto sin tildes ni caracteres especiales.
 * 
 * @param {string} val Texto a normalizar.
 * @returns {string} Texto normalizado en minúsculas y sin acentos.
 */
export function normalizarTextoSimple(val = "") {
  return String(val || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Compara dos cadenas de grados escolares de forma flexible.
 * 
 * @param {string} g1 Primer grado (Ej: "Primaria:1").
 * @param {string} g2 Segundo grado.
 * @returns {boolean} True si representan el mismo nivel y grado.
 */
export function compararGrados(g1 = "", g2 = "") {
  const t1 = String(g1 || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const t2 = String(g2 || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
    
  if (t1 === t2) return true;

  const num1 = t1.match(/\d+/)?.[0] || "";
  const num2 = t2.match(/\d+/)?.[0] || "";
  if (!num1 || !num2 || num1 !== num2) return false;

  const nivel1 = ["inicial", "primaria", "secundaria"].find((n) => t1.includes(n)) || "";
  const nivel2 = ["inicial", "primaria", "secundaria"].find((n) => t2.includes(n)) || "";

  return nivel1 === nivel2;
}

/**
 * Parsea un texto que describe días de la semana y los convierte a enteros de Date (0-6).
 * 
 * @param {string} texto Texto descriptivo (ej: "Lunes, Miércoles").
 * @returns {number[]} Array con los números de día (1 para Lunes, etc.).
 */
export function parseDiasSemana(texto = "") {
  const norm = String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  const diasEncontrados = [];
  if (norm.includes("lunes")) diasEncontrados.push(1);
  if (norm.includes("martes")) diasEncontrados.push(2);
  if (norm.includes("miercoles")) diasEncontrados.push(3);
  if (norm.includes("jueves")) diasEncontrados.push(4);
  if (norm.includes("viernes")) diasEncontrados.push(5);
  if (norm.includes("sabado")) diasEncontrados.push(6);
  if (norm.includes("domingo")) diasEncontrados.push(0);
  return diasEncontrados;
}

/**
 * Proyecta y genera la lista de todas las fechas calendario programadas para un taller 
 * según su fecha de vigencia y los días de clase asignados.
 * 
 * @param {Object} prog Taller/programa extracurricular.
 * @param {string} inicioStr Fecha de inicio ("YYYY-MM-DD").
 * @param {string} finStr Fecha de fin ("YYYY-MM-DD").
 * @returns {string[]} Array de strings de fechas programadas.
 */
export function generarFechasProgramadas(prog, inicioStr, finStr) {
  if (!inicioStr || !finStr) return [];
  
  let textoDias = "";
  if (Array.isArray(prog?.horariosPorGrupo) && prog.horariosPorGrupo.length > 0) {
    textoDias = prog.horariosPorGrupo.map(g => g.dia).join(", ");
  } else {
    textoDias = prog?.horario || "";
  }
  
  const diasSemana = parseDiasSemana(textoDias);
  if (diasSemana.length === 0) return [];
  
  const start = new Date(inicioStr + "T00:00:00");
  const end = new Date(finStr + "T00:00:00");
  
  const dates = [];
  let current = new Date(start);
  let safety = 0;
  while (current <= end && safety < 366) {
    safety++;
    const dayOfWeek = current.getDay();
    if (diasSemana.includes(dayOfWeek)) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}
