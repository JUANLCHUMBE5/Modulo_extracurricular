export function formatearSoles(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

export function limpiarDni(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 8);
}

export function obtenerIniciales(estudiante) {
  const texto = `${estudiante?.nombres || ""} ${estudiante?.apellidos || ""}`.trim();
  return texto
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase() || "SR";
}
