import {
  agregarHoja,
  construirDetalleFinanciero,
  descargarBlob,
} from "./direccionExcelHelpers";

export async function descargarReporteDireccionExcel(panel: any, tipoReporte: string, filtros: any = {}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  if (tipoReporte === "completo" || tipoReporte === "resumen") {
    const resumen = Object.entries(panel.resumen).map(([indicador, valor]) => ({ indicador, valor }));
    agregarHoja(workbook, "Resumen", resumen, [
      { header: "Indicador", key: "indicador", width: 28 },
      { header: "Valor", key: "valor", width: 18 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "programas") {
    agregarHoja(workbook, "Programas", panel.reportes.programas, [
      { header: "Código", key: "id", width: 14 },
      { header: "Programa", key: "nombre", width: 32 },
      { header: "Periodo", key: "periodo", width: 14 },
      { header: "Estado", key: "estado", width: 16 },
      { header: "Categoría", key: "categoria", width: 18 },
      { header: "Responsable", key: "responsable", width: 24 },
      { header: "Inscritos", key: "inscritos", width: 12 },
      { header: "Cupos", key: "cupos", width: 10 },
      { header: "Avance %", key: "avance", width: 12 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Proyectado", key: "proyectado", width: 14 },
      { header: "Recaudado", key: "recaudado", width: 14 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "inscripciones") {
    agregarHoja(workbook, "Inscripciones", panel.reportes.inscripciones, [
      { header: "Código", key: "id", width: 16 },
      { header: "DNI", key: "dni", width: 12 },
      { header: "Estudiante", key: "estudiante", width: 32 },
      { header: "Grado", key: "grado", width: 18 },
      { header: "Programa", key: "programa", width: 32 },
      { header: "Estado inscripción", key: "estadoInscripcion", width: 20 },
      { header: "Estado pago", key: "estadoPago", width: 16 },
      { header: "Costo", key: "costo", width: 12 },
      { header: "Origen", key: "origen", width: 24 },
      { header: "Fecha registro", key: "fechaRegistro", width: 22 },
      { header: "Apoderado", key: "apoderado", width: 24 },
      { header: "Teléfono", key: "telefono", width: 16 },
    ]);
  }

  if (tipoReporte === "completo" || tipoReporte === "pagos") {
    const filasPagos = (panel.reportes.pagos || []).map((pago: any) => ({
      ...pago,
      ...construirDetalleFinanciero(pago),
    }));
    agregarHoja(workbook, "Pagos", filasPagos, [
      { header: "Código", key: "id", width: 16 },
      { header: "DNI", key: "dni", width: 12 },
      { header: "Estudiante", key: "estudiante", width: 32 },
      { header: "Programa", key: "programa", width: 32 },
      { header: "Beca", key: "beca", width: 10 },
      { header: "Descuento", key: "descuento", width: 18 },
      { header: "Anulado", key: "anulado", width: 12 },
      { header: "Estado", key: "estadoFinanciero", width: 16 },
      { header: "Monto pagado", key: "montoPagado", width: 15 },
      { header: "Monto anulado", key: "montoAnulado", width: 15 },
      { header: "Medio", key: "medio", width: 18 },
      { header: "Fecha", key: "fecha", width: 22 },
      { header: "N° de comprobante", key: "nroRecibo", width: 18 },
      { header: "Observaciones / Motivo Anulación", key: "observaciones", width: 30 },
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const nombre = `direccion-${tipoReporte}-${filtros.periodo || "todos"}.xlsx`;
  descargarBlob(blob, nombre);
  return nombre;
}
