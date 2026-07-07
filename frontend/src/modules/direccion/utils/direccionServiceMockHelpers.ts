import { apiDb as apiDbRaw } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;

export function filtrarPorPeriodo(items: any[], periodo: string) {
  if (periodo === "todos") return [...items];
  return [...items].filter((item) => normalizarPeriodo(item.periodo || "escolar") === periodo);
}

export function normalizarPeriodo(periodo: string) {
  const texto = String(periodo || "").toLowerCase();
  if (texto.includes("verano")) return "verano";
  if (texto.includes("todos") || texto.includes("ambos")) return "todos";
  return "escolar";
}

export function normalizarEstadoPago(estado: string) {
  const texto = String(estado || "").toLowerCase();
  if (texto.includes("pag") || texto === "completado") return "Pagado";
  if (texto.includes("anul") || texto === "cancelado") return "Anulado";
  return "Pendiente";
}

export function contarPor(items: any[], resolver: (item: any) => any) {
  const conteo = new Map();
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

export function normalizarTexto(valor: any) {
  return String(valor || "").trim().toLowerCase();
}

export function abreviar(valor: any) {
  const texto = String(valor || "Sin nombre").trim();
  return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
}

export function crearFilaInscripcion(item: any) {
  return {
    id: item.id || "",
    dni: item.dniEstudiante || "",
    estudiante: item.nombresEstudiante || "",
    grado: item.gradoEstudiante || item.grado || "",
    seccion: item.seccionEstudiante || item.seccion || "",
    programa: item.programa || "",
    programaId: item.programaId || item.programa_id || "",
    estadoInscripcion: item.estadoInscripcion || "",
    estadoPago: normalizarEstadoPago(item.estadoPago),
    costo: Number(item.costo || 0),
    costoOriginal: Number(item.costoOriginal ?? item.costo ?? 0),
    origen: item.origenRegistro || "",
    fechaRegistro: item.fechaRegistro || "",
    apoderado: item.apoderado || "",
    telefono: item.telefono || "",
    descuentoAprobado: !!item.descuentoAprobado,
    descuentoTipo: item.descuentoTipo || "",
    descuentoValor: Number(item.descuentoValor || 0),
    descuentoMonto: Number(item.descuentoMonto || 0),
    descuentoJustificacion: item.descuentoJustificacion || "",
  };
}

export function crearFilaPago(item: any) {
  const inscripcion = (apiDb.inscripciones || []).find((ins: any) =>
    (item.inscripcionId && ins.id === item.inscripcionId) ||
    (item.dniEstudiante && ins.dniEstudiante === item.dniEstudiante && normalizarTexto(ins.programa) === normalizarTexto(item.programa))
  ) || null;

  return {
    id: item.id || "",
    inscripcionId: item.inscripcionId || "",
    programaId: item.programaId || inscripcion?.programaId || "",
    dni: item.dniEstudiante || item.estudianteDni || "",
    estudiante: item.nombresEstudiante || item.estudianteNombre || "",
    programa: item.programa || item.programaNombre || "",
    monto: Number(item.monto || 0),
    estado: normalizarEstadoPago(item.estado),
    estadoVerificacion: item.estadoVerificacion || "",
    medio: item.formaPago || item.medioPago || "",
    fecha: item.fechaPago || item.fecha || "",
    nroRecibo: item.nroRecibo || "",
    observaciones: item.observaciones || "",
    descuentoAprobado: Boolean(inscripcion?.descuentoAprobado),
    descuentoTipo: inscripcion?.descuentoTipo || "",
    descuentoValor: Number(inscripcion?.descuentoValor || 0),
    descuentoMonto: Number(inscripcion?.descuentoMonto || 0),
    descuentoJustificacion: inscripcion?.descuentoJustificacion || "",
  };
}
