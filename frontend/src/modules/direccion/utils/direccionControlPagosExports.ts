import { descargarBlob } from "./direccionExcelHelpers";

export async function exportExcelControlPagos({ fecha, estadisticas }: any) {
  const ExcelJS = (await import("exceljs")).default;
  if (!estadisticas || estadisticas.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Control de Pagos");

  worksheet.columns = [
    { key: "nro", width: 6 },
    { key: "docente", width: 25 },
    { key: "programa", width: 35 },
    { key: "aula", width: 18 },
    { key: "matriculados", width: 15 },
    { key: "asistieron", width: 15 },
    { key: "tasa", width: 20 },
    { key: "sugerencia", width: 22 },
  ];

  // Header metadata
  worksheet.mergeCells("A1:H1");
  worksheet.getCell("A1").value = "COLEGIO SAN RAFAEL - CONTROL DE PAGOS A DOCENTES";
  worksheet.getCell("A1").font = { name: "Calibri", size: 13, bold: true, color: { argb: "FF0F766E" } };
  worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

  worksheet.getCell("A2").value = "Fecha de Reporte:";
  worksheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
  worksheet.getCell("B2").value = fecha ? fecha.split("-").reverse().join("/") : "—";
  worksheet.getCell("B2").font = { size: 10, bold: true };

  worksheet.getCell("E2").value = "Total de Clases:";
  worksheet.getCell("E2").font = { bold: true, size: 10, color: { argb: "FF475569" } };
  worksheet.getCell("F2").value = `${estadisticas.length} grupos/bloques`;
  worksheet.getCell("F2").font = { size: 10 };

  worksheet.getRow(1).height = 25;
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 10;

  // Table Header
  const headerRow = worksheet.getRow(4);
  headerRow.values = [
    "N°",
    "Profesor / Docente",
    "Taller / Programa",
    "Aula / Bloque",
    "Matriculados",
    "Asistieron",
    "Tasa de Asistencia",
    "Sugerencia de Pago"
  ];
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 25;

  const dataRows: any[] = [];
  estadisticas.forEach((item: any, idx: number) => {
    const tasa = item.matriculados > 0 ? Math.round((item.asistieron / item.matriculados) * 100) : 0;
    const sugerencia = tasa === 100 
      ? "Pago Completo" 
      : tasa > 0 
        ? `Pago Parcial (${tasa}%)` 
        : "Sin Pago (0% Asist.)";

    dataRows.push({
      nro: idx + 1,
      docente: item.docente,
      programa: item.programa,
      aula: item.aula || "—",
      matriculados: item.matriculados,
      asistieron: item.asistieron,
      tasa: `${tasa}%`,
      sugerencia: sugerencia,
    });
  });

  worksheet.addRows(dataRows);

  // Styling table cells
  worksheet.eachRow((row, rowNum) => {
    if (rowNum > 4) {
      row.height = 20;
    }
    if (rowNum >= 4) {
      row.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        if (rowNum > 4) {
          cell.alignment = { vertical: "middle", horizontal: colNum >= 5 ? "center" : "left" };
        }
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  descargarBlob(blob, `Control_Pagos_Docentes_${fecha ? fecha.replace(/-/g, "_") : "Reporte"}.xlsx`);
}

export async function exportPdfControlPagos({ fecha, estadisticas }: any) {
  const { jsPDF } = await import("jspdf");
  if (!estadisticas || estadisticas.length === 0) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 14;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();

  let y = 16;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 118, 110);
  doc.text("COLEGIO SAN RAFAEL", margen, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("REPORTE DE CONTROL DE PAGOS A DOCENTES POR ASISTENCIA", margen, y + 4.5);

  y += 10;

  // Metadata Card
  doc.setDrawColor(204, 225, 222);
  doc.setFillColor(242, 248, 247);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("FECHA DE REVISIÓN:", margen + 4, y + 9);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(fecha ? fecha.split("-").reverse().join("/") : "—", margen + 38, y + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL CLASES:", margen + 120, y + 9);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${estadisticas.length} grupos/bloques evaluados`, margen + 148, y + 9);

  y += 20;

  // Draw table header
  const dibujarCabecera = (yy: number) => {
    doc.setFillColor(234, 246, 242);
    doc.setDrawColor(204, 225, 222);
    doc.roundedRect(margen, yy, anchoPagina - margen * 2, 8, 1.5, 1.5, "FD");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 118, 110);
    
    doc.text("#", margen + 2, yy + 5.3);
    doc.text("DOCENTE / PROFESOR", margen + 8, yy + 5.3);
    doc.text("TALLER / PROGRAMA", margen + 45, yy + 5.3);
    doc.text("AULA / BLOQUE", margen + 98, yy + 5.3);
    doc.text("ASIG", margen + 128, yy + 5.3, { align: "center" });
    doc.text("ASIST", margen + 140, yy + 5.3, { align: "center" });
    doc.text("% ASIST", margen + 155, yy + 5.3, { align: "center" });
    doc.text("SUGERENCIA DE PAGO", margen + 172, yy + 5.3);
  };

  dibujarCabecera(y);
  y += 12;

  estadisticas.forEach((item: any, idx: number) => {
    if (y > altoPagina - 18) {
      doc.addPage();
      y = 16;
      dibujarCabecera(y);
      y += 12;
    }

    const tasa = item.matriculados > 0 ? Math.round((item.asistieron / item.matriculados) * 100) : 0;
    const sugerencia = tasa === 100 
      ? "Pago Completo" 
      : tasa > 0 
        ? `Pago Parcial (${tasa}%)` 
        : "Sin Pago (0%)";

    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(String(idx + 1), margen + 2, y + 3);
    
    // Docente
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(item.docente, 35), margen + 8, y + 3);
    doc.setFont("helvetica", "normal");

    // Programa
    doc.text(doc.splitTextToSize(item.programa, 50), margen + 45, y + 3);

    // Aula / Bloque
    doc.text(item.aula || "—", margen + 98, y + 3);

    // Counts & Rate
    doc.text(String(item.matriculados), margen + 128, y + 3, { align: "center" });
    doc.text(String(item.asistieron), margen + 140, y + 3, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    const tasaColor = tasa === 100 ? [15, 118, 110] : tasa >= 50 ? [217, 119, 6] : [220, 38, 38];
    doc.setTextColor(tasaColor[0], tasaColor[1], tasaColor[2]);
    doc.text(`${tasa}%`, margen + 155, y + 3, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    // Sugerencia
    doc.text(sugerencia, margen + 172, y + 3);

    const linesMax = Math.max(
      doc.splitTextToSize(item.docente, 35).length,
      doc.splitTextToSize(item.programa, 50).length
    );
    const altoFila = Math.max(9, linesMax * 4 + 2);
    y += altoFila;
  });

  doc.save(`Control_Pagos_Docentes_${fecha ? fecha.replace(/-/g, "_") : "Reporte"}.pdf`);
}
