export function normalizarPeriodo(periodo) {
  const mapa = { escolar: "escolar", verano: "verano", ambos: "ambos" };
  return mapa[periodo] || "escolar";
}

export function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarEstadoPago(valor) {
  const texto = normalizarTexto(valor);
  if (["completado", "pagado", "validado", "pago validado"].some((item) => texto.includes(item))) return "pagado";
  if (["verificando", "verificacion", "por verificar"].some((item) => texto.includes(item))) return "verificando";
  if (["observado", "rechazado", "no coincide"].some((item) => texto.includes(item))) return "observado";
  if (["cancelado", "anulado"].some((item) => texto.includes(item))) return "anulado";
  return "pendiente";
}

export function obtenerEstadoRevisionWeb(inscripcion, pago) {
  if (!pago) return "sin_pago";
  const texto = normalizarTexto([
    pago.estado,
    pago.estadoVerificacion,
    pago.observaciones,
    inscripcion.estadoInscripcion,
    inscripcion.estadoPago,
  ].join(" "));

  if (["observado", "rechazado", "no coincide"].some((item) => texto.includes(item))) return "observado";
  if (["completado", "pagado", "validado", "pago validado"].some((item) => texto.includes(item))) return "pagado";
  if (["verificando", "verificacion", "por verificar"].some((item) => texto.includes(item))) return "verificando";
  return "pendiente";
}

export function esRegistroWeb(valor) {
  const texto = normalizarTexto(valor);
  return texto.includes("portal padres") || texto.includes("web");
}

export function normalizarFechaReporte(valor) {
  return String(valor || "").slice(0, 10);
}

export function filtrarReporteCaja(filas, filtros) {
  return filas
    .filter((fila) => {
      if (filtros.programa && filtros.programa !== "todos" && fila.programaId !== filtros.programa) return false;
      if (filtros.medioPago && filtros.medioPago !== "todos" && fila.formaPago !== filtros.medioPago) return false;
      if (filtros.desde && normalizarFechaReporte(fila.fecha) < filtros.desde) return false;
      if (filtros.hasta && normalizarFechaReporte(fila.fecha) > filtros.hasta) return false;
      if (filtros.estadoPago && filtros.estadoPago !== "todos" && fila.estadoPago !== filtros.estadoPago) return false;

      if (filtros.tipoReporte === "registro_secretaria") return !esRegistroWeb(fila.origen);
      if (filtros.tipoReporte === "por_cobrar" || filtros.tipoReporte === "pagos_pendientes") return fila.estadoPago === "pendiente";
      if (filtros.tipoReporte === "inscripciones") return fila.fuente === "inscripcion";
      if (filtros.tipoReporte === "registro_web") return esRegistroWeb(fila.origen);
      return true;
    })
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}
