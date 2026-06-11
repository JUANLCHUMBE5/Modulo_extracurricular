import { formatearFechaPeru } from "../../../services/dateService";

export function normalizarEstadoPagoVista(...valores) {
  const texto = valores
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["completado", "pagado", "validado", "pago validado"].some((item) => texto.includes(item))) return "pagado";
  if (["verificando", "verificacion", "por verificar", "revision"].some((item) => texto.includes(item))) return "verificando";
  if (["observado", "rechazado", "no coincide"].some((item) => texto.includes(item))) return "observado";
  if (["cancelado", "anulado"].some((item) => texto.includes(item))) return "anulado";
  return "pendiente";
}

export function esPagoWebPadresCaja(fila = {}) {
  const origen = String(fila.origen || fila.origenRegistro || "").toLowerCase();
  const formaPago = String(fila.formaPago || "").toLowerCase();
  const tienePago = Boolean(
    fila.pagoId ||
    fila.numeroOperacion ||
    ["pagado", "verificando", "observado"].includes(fila.estadoPago) ||
    formaPago.includes("reserva") ||
    formaPago.includes("web")
  );
  const esWeb = origen.includes("portal") || origen.includes("web") || formaPago.includes("web") || formaPago.includes("reserva");
  return esWeb && tienePago && !formaPago.includes("sin pago");
}

export function esPagoWebPorVerificarCaja(fila = {}) {
  if (!esPagoWebPadresCaja(fila)) return false;
  if (fila.estadoPago === "verificando") return true;
  if (fila.estadoPago !== "pendiente") return false;

  return Boolean(
    fila.pagoId ||
    fila.numeroOperacion ||
    fila.telefonoOperacion ||
    fila.capturaPagoBase64 ||
    fila.capturaPagoNombre
  );
}

export function obtenerMedioCanalWebCaja(fila = {}) {
  const estado = String(fila.estadoPago || "").toLowerCase();
  const esPagado = ["pagado", "completado", "pago validado", "validado"].includes(estado);
  
  const origen = String(fila.origen || fila.origenRegistro || "").toLowerCase();
  const formaPago = fila.formaPago || "";
  
  if (origen === "caja") {
    if (!esPagado) return "-";
    return `${formaPago || "Efectivo"} / Caja`;
  }
  
  if (!esPagoWebPadresCaja(fila)) return "-";
  if (String(formaPago).toLowerCase().includes("web")) {
    return formaPago || "Reserva / Web";
  }
  return `${formaPago || "Yape"} / Web`;
}

export function obtenerTelefonoPagoWebCaja(fila = {}) {
  const origen = String(fila.origen || fila.origenRegistro || "").toLowerCase();
  if (origen === "caja") {
    const estado = String(fila.estadoPago || "").toLowerCase();
    const esPagado = ["pagado", "completado", "pago validado", "validado"].includes(estado);
    if (!esPagado) return "-";
    return fila.telefonoOperacion || "-";
  }
  if (!esPagoWebPadresCaja(fila)) return "-";
  return fila.telefonoOperacion || fila.telefono || "-";
}

export function generarCSVReporteCaja(datos) {
  const encabezados = ["DNI", "Estudiante", "Programa", "Monto", "Estado pago", "Codigo operacion", "Telefono", "Medio / canal", "Fecha registro", "Fecha pago", "Apoderado", "Telefono apoderado"];
  const filas = datos.map((fila) => [
    fila.dniEstudiante,
    fila.estudiante,
    fila.programa,
    Number(fila.monto || 0).toFixed(2),
    fila.estadoPago,
    fila.numeroOperacion,
    obtenerTelefonoPagoWebCaja(fila),
    obtenerMedioCanalWebCaja(fila),
    formatearFechaPeru(fila.fechaRegistro),
    formatearFechaPeru(fila.fechaPago),
    fila.apoderado,
    fila.telefono,
  ]);
  const csvContent = [encabezados, ...filas]
    .map((fila) => fila.map((valor) => `"${String(valor || "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  return "sep=;\n" + csvContent;
}

export function descargarArchivoCsv(contenido, nombreArchivo) {
  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
