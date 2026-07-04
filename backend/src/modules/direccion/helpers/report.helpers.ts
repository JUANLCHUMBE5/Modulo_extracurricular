import { normalizarTextoApi } from "../../../common/shared/mappers.js";

export function normalizarFechaFiltro(valor: any) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (local) return `${local[3]}-${local[2]}-${local[1]}`;
  const fecha = new Date(texto);
  if (!Number.isNaN(fecha.getTime())) return fecha.toISOString().slice(0, 10);
  return texto.slice(0, 10);
}

export function normalizarEstadoPago(estado: any) {
  const texto = normalizarTextoApi(estado);
  if (texto.includes("pag") || texto === "completado" || texto === "validado") return "Pagado";
  if (texto.includes("anul") || texto === "cancelado") return "Anulado";
  return "Pendiente";
}

export function contarPor(items: any[], resolver: (item: any) => any) {
  const conteo = new Map<any, number>();
  items.forEach((item) => {
    const key = resolver(item) || "Sin dato";
    conteo.set(key, (conteo.get(key) || 0) + 1);
  });
  const colores = ["teal.6", "orange.6", "blue.6", "grape.6", "yellow.6", "red.6"];
  return [...conteo.entries()].map(([name, value], index) => ({
    name,
    value,
    color: colores[index % colores.length],
  }));
}

export function abreviar(valor: any) {
  const texto = String(valor || "Sin nombre").trim();
  return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
}

export function obtenerPrimerValor(item: any, claves: string[]) {
  return claves.map((clave) => item?.[clave]).find(Boolean) || "";
}
