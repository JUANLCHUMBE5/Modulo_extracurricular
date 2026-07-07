import { formatearFechaPeru } from "../../../services/dateService";

export function normalizarTexto(valor: any) {
  return String(valor || "").trim().toLowerCase();
}

export function normalizarPeriodo(periodo: any) {
  const texto = String(periodo || "").toLowerCase();
  if (texto.includes("verano")) return "verano";
  if (texto.includes("todos") || texto.includes("ambos")) return "todos";
  return "escolar";
}

export function normalizarEstadoPago(estado: any) {
  const texto = String(estado || "").toLowerCase();
  if (texto.includes("pag") || texto === "completado") return "Pagado";
  if (texto.includes("anul") || texto === "cancelado") return "Anulado";
  return "Pendiente";
}

export function normalizarEstadoPagoClave(...valores: any[]) {
  const texto = valores
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (["cancelado", "anulado"].some((item) => texto.includes(item))) return "anulado";
  if (["completado", "pagado", "validado", "aprobado", "pago validado"].some((item) => texto.includes(item))) return "pagado";
  if (["verificando", "verificacion", "por verificar", "revision"].some((item) => texto.includes(item))) return "verificando";
  if (["observado", "rechazado", "no coincide"].some((item) => texto.includes(item))) return "observado";
  return "pendiente";
}

export function esVerdadero(valor: any) {
  if (typeof valor === "boolean") return valor;
  const texto = String(valor ?? "").trim().toLowerCase();
  if (!texto || ["false", "no", "0", "ninguno", "-"].includes(texto)) return false;
  return true;
}

export function construirDetalleFinanciero(row: any = {}, pago: any = null) {
  const fuentePago = pago || row;
  const estadoClave = normalizarEstadoPagoClave(
    fuentePago?.estadoPago,
    fuentePago?.estado,
    fuentePago?.estadoVerificacion,
    row?.estadoPago
  );
  const descuentoTipo = String(row.descuentoTipo || fuentePago?.descuentoTipo || "").trim();
  const descuentoAprobado = esVerdadero(row.descuentoAprobado) || esVerdadero(fuentePago?.descuentoAprobado);
  const descuentoEsBeca = descuentoAprobado && descuentoTipo.toLowerCase() === "beca";
  const descuentoNoBeca = descuentoAprobado && !descuentoEsBeca;
  const monto = Number(fuentePago?.monto ?? row.montoPagado ?? row.costo ?? 0);

  return {
    beca: descuentoEsBeca ? "SI" : "-",
    descuento: descuentoNoBeca ? String(descuentoTipo || "DESCUENTO").toUpperCase() : "-",
    anulado: estadoClave === "anulado" ? "SI" : "-",
    estadoFinanciero: normalizarEstadoPago(fuentePago?.estadoPago || fuentePago?.estado || row.estadoPago),
    montoPagado: estadoClave === "anulado" ? 0 : monto,
    montoAnulado: estadoClave === "anulado" ? monto : 0,
  };
}

export function coincideEstadoPago(estado: any, filtro: any, excluirAnulados: any) {
  const valor = String(estado || "").toLowerCase();
  if (filtro === "Pagado") {
    return valor.includes("pag") || valor === "completado" || valor === "aprobado";
  }
  if (filtro === "Pendiente") {
    return !valor.includes("pag") && valor !== "completado" && valor !== "aprobado" && (!excluirAnulados || !valor.includes("anul"));
  }
  return true;
}

export function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export function agregarHoja(workbook: any, nombre: string, filas: any[], columnas: any[]) {
  const hoja = workbook.addWorksheet(nombre);
  hoja.columns = columnas;
  hoja.addRows(filas);
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176C60" } };
  hoja.getRow(1).alignment = { vertical: "middle" };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.eachRow((row, rowNum) => {
    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (rowNum > 1) {
        const colKey = columnas[colNum - 1]?.key;
        if (colKey && ["fechaPago", "fecha", "fechaRegistro"].includes(colKey)) {
          if (cell.value && cell.value !== "—") {
            cell.value = formatearFechaPeru(cell.value, cell.value);
          }
        }
      }
    });
  });
}
