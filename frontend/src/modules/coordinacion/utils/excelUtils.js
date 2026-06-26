export async function descargarListaAlumnosExcel(programa, tipo, alumnos) {
  const ExcelJS = (await import("exceljs")).default;
  const esPreinscritos = tipo === "preinscritos";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Colegio San Rafael";
  workbook.created = new Date();

  const sheetName = esPreinscritos ? "Alumnos Pre-inscritos" : "Alumnos Matriculados";
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = esPreinscritos ? columnasPreinscritos : columnasMatriculados;
  worksheet.addRows(alumnos);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF006B5B" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Alumnos_${esPreinscritos ? "Preinscritos" : "Matriculados"}_${programa.nombre.replace(/\s+/g, "_")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const columnasPreinscritos = [
  { header: "DNI", key: "dni", width: 15 },
  { header: "Código", key: "codigoEstudiante", width: 15 },
  { header: "Estudiante", key: "nombres", width: 35 },
  { header: "Grado", key: "grado", width: 15 },
  { header: "Observación", key: "observacion", width: 30 },
];

const columnasMatriculados = [
  { header: "DNI", key: "dni", width: 15 },
  { header: "Código", key: "codigoEstudiante", width: 15 },
  { header: "Estudiante", key: "nombres", width: 35 },
  { header: "Grado", key: "grado", width: 15 },
  { header: "Estado Inscripción", key: "estadoInscripcion", width: 25 },
  { header: "Estado Pago", key: "estadoPago", width: 20 },
  { header: "Canal/Origen", key: "origenRegistro", width: 20 },
  { header: "Fecha Registro", key: "fechaRegistro", width: 25 },
];
