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

export function agregarHoja(workbook: any, nombre: string, filas: any[], columnas: any[], filtros: any = {}) {
  const hoja = workbook.addWorksheet(nombre);

  // Check if filters are applied
  const hasFiltros = filtros && (
    (filtros.grado && filtros.grado !== "todos") ||
    (filtros.seccion && filtros.seccion !== "todos") ||
    filtros.desde ||
    filtros.hasta ||
    (filtros.periodo && filtros.periodo !== "todos")
  );

  let startRow = 1;
  if (hasFiltros) {
    // Row 1: Title
    const titleCell = hoja.getCell("A1");
    titleCell.value = `Reporte de ${nombre}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF176C60" } };

    // Row 2: Applied filters list
    const filterParts: string[] = [];
    if (filtros.periodo && filtros.periodo !== "todos") {
      filterParts.push(`Periodo: ${String(filtros.periodo).toUpperCase()}`);
    }
    if (filtros.grado && filtros.grado !== "todos") {
      filterParts.push(`Grado: ${filtros.grado}`);
    }
    if (filtros.seccion && filtros.seccion !== "todos") {
      filterParts.push(`Sección: ${filtros.seccion}`);
    }
    if (filtros.desde || filtros.hasta) {
      const desdeStr = filtros.desde ? formatearFechaPeru(filtros.desde, filtros.desde) : "Inicio";
      const hastaStr = filtros.hasta ? formatearFechaPeru(filtros.hasta, filtros.hasta) : "Fin";
      filterParts.push(`Fechas: del ${desdeStr} al ${hastaStr}`);
    }

    const filterCell = hoja.getCell("A2");
    filterCell.value = `Filtros aplicados: ${filterParts.join("  |  ")}`;
    filterCell.font = { italic: true, size: 10, color: { argb: "FF475569" } };

    // Row 3: Blank gap row
    hoja.getRow(3).height = 10;
    startRow = 4;
  }

  // Setup columns and headers manually at startRow
  const headerRow = hoja.getRow(startRow);
  columnas.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    hoja.getColumn(idx + 1).key = col.key;
    if (col.width) {
      hoja.getColumn(idx + 1).width = col.width;
    }
  });

  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176C60" } };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 24;

  // Add the rows
  filas.forEach((fila, fIdx) => {
    const row = hoja.getRow(startRow + 1 + fIdx);
    columnas.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = fila[col.key];
    });
  });

  // Enable AutoFilter on the table header row
  hoja.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow, column: columnas.length }
  };

  // Freeze the header row and rows above it
  hoja.views = [{ state: "frozen", ySplit: startRow }];

  // Border formatting and cell formatting
  hoja.eachRow((row, rowNum) => {
    if (rowNum < startRow) return; // skip header title and filter description rows

    row.eachCell((cell, colNum) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (rowNum > startRow) {
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
