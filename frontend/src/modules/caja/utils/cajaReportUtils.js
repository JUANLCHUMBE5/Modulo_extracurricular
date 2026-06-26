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

  if (fila.descuentoAprobado) {
    const tipoLabel = String(fila.descuentoTipo).toLowerCase() === "beca" ? "Beca" : "Dirección / Desc";
    if (esPagado) {
      return `${tipoLabel} (Caja)`;
    }
    return tipoLabel;
  }

  if (origen === "caja" || origen === "cajera") {
    if (!esPagado) return "-";
    return `${formaPago || "Efectivo"} (Caja)`;
  }

  if (!esPagoWebPadresCaja(fila)) return "-";
  
  const cleanForma = (formaPago || "").trim();
  if (cleanForma.toLowerCase().includes("web")) {
    return cleanForma;
  }
  return `${cleanForma || "Yape"} (Web)`;
}

export function obtenerTelefonoPagoWebCaja(fila = {}) {
  const origen = String(fila.origen || fila.origenRegistro || "").toLowerCase();
  if (origen === "caja" || origen === "cajera") {
    const estado = String(fila.estadoPago || "").toLowerCase();
    const esPagado = ["pagado", "completado", "pago validado", "validado"].includes(estado);
    if (!esPagado) return "-";
    return fila.telefonoOperacion || "-";
  }
  if (!esPagoWebPadresCaja(fila)) return "-";
  return fila.telefonoOperacion || fila.telefono || "-";
}

export function generarCSVReporteCaja(datos) {
  const encabezados = [
    "NRO",
    "NOMBRES Y APELLIDOS",
    "TALLER",
    "GRADO",
    "SECCION",
    "FECHA",
    "RECIBO",
    "BECA",
    "DESCUENTO",
    "ANULADO",
    "ESTADO",
    "MONTO PAGADO",
    "MONTO ANULADO",
    "JUSTIFICACION / OBSERVACION"
  ];
  const filas = datos.map((fila, index) => {
    const estadoNormalizado = normalizarEstadoPagoVista(fila.estadoPago, fila.estado, fila.estadoVerificacion);
    const descuentoTipo = String(fila.descuentoTipo || "").trim();
    const descuentoEsBeca = fila.descuentoAprobado && descuentoTipo.toLowerCase() === "beca";
    const descuentoNoBeca = fila.descuentoAprobado && !descuentoEsBeca;
    const monto = `S/ ${Number(fila.monto || 0).toFixed(2)}`;

    return [
      index + 1,
      fila.estudiante ? String(fila.estudiante).toUpperCase() : "SIN NOMBRE",
      fila.programa ? String(fila.programa).toUpperCase() : "-",
      fila.grado || "-",
      fila.seccion || "-",
      formatearFechaPeru(fila.fecha || fila.fechaPago || fila.fechaRegistro),
      fila.nroRecibo || fila.nro_recibo || "-",
      descuentoEsBeca ? "SI" : "-",
      descuentoNoBeca ? String(descuentoTipo || "DESCUENTO").toUpperCase() : "-",
      estadoNormalizado === "anulado" ? "SI" : "-",
      fila.estadoPago ? String(fila.estadoPago).toUpperCase() : "-",
      estadoNormalizado === "anulado" ? "-" : monto,
      estadoNormalizado === "anulado" ? monto : "-",
      fila.observaciones || fila.descuentoJustificacion || "-",
    ];
  });
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
