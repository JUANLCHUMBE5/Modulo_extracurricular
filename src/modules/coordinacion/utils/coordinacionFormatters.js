export function formatearHora12(valor) {
  const match = String(valor || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return valor || "";
  const horas24 = Number(match[1]);
  const minutos = match[2];
  const periodo = horas24 >= 12 ? "PM" : "AM";
  const horas12 = horas24 % 12 || 12;
  return `${horas12}:${minutos} ${periodo}`;
}

export function esCostoValido(valor) {
  const texto = String(valor || "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return false;
  return Number(texto) > 0;
}

export function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

export function textoEstadoCarga(estado) {
  if (estado === "Valido") return "Listo";
  if (estado === "Duplicado") return "Duplicado";
  return "Con error";
}

export function normalizarComparacion(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function escaparRegExp(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
