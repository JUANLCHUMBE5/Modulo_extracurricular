import { jsPDF } from "jspdf";
import { fechaActualIso } from "../../../services/dateService";

export function descargarListaAlumnosPdf(programa, alumnos) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 14;
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const fecha = formatearFechaPdf(fechaActualIso());
  let y = 16;

  doc.setTextColor(7, 17, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Lista de alumnos registrados", anchoPagina / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 97, 115);
  doc.text(`Generado: ${fecha}`, anchoPagina / 2, y, { align: "center" });
  y += 10;

  const datosPrograma = [
    ["Programa", programa?.nombre || "Sin nombre"],
    ["Codigo", programa?.id || "Sin codigo"],
    ["Categoria", programa?.categoria || "No definida"],
    ["Responsable", programa?.responsable || "No asignado"],
    ["Horario", programa?.horario || "Por definir"],
    ["Vigencia", `${formatearFechaPdf(programa?.fechaInicio)} al ${formatearFechaPdf(programa?.fechaFin)}`],
    ["Cupos", `${programa?.cuposOcupados || alumnos.length}/${programa?.cupos || alumnos.length}`],
  ];

  doc.setDrawColor(216, 229, 226);
  doc.setFillColor(248, 252, 251);
  doc.roundedRect(margen, y, anchoPagina - margen * 2, 39, 3, 3, "FD");
  y += 6;

  datosPrograma.forEach(([label, value], index) => {
    const columna = index % 2;
    const fila = Math.floor(index / 2);
    const x = margen + 5 + columna * 91;
    const yy = y + fila * 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(82, 97, 115);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(7, 17, 31);
    doc.text(doc.splitTextToSize(String(value || "-"), columna === 0 ? 76 : 70), x, yy + 3.8);
  });

  y += 45;
  y = dibujarEncabezadoTablaPdf(doc, margen, y);

  alumnos.forEach((alumno, index) => {
    if (y > altoPagina - 18) {
      doc.addPage();
      y = 16;
      y = dibujarEncabezadoTablaPdf(doc, margen, y);
    }

    const nombre = String(alumno.nombres || alumno.nombre || "").trim() || "-";
    const fila = [
      String(index + 1),
      alumno.dni || "Sin DNI",
      alumno.codigoEstudiante || "-",
      nombre,
      alumno.grado || "-",
      alumno.seccion || "-",
    ];

    const altoFila = Math.max(8, doc.splitTextToSize(nombre, 67).length * 4.2 + 4);
    doc.setDrawColor(237, 242, 245);
    doc.line(margen, y - 2, anchoPagina - margen, y - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(24, 33, 47);
    doc.text(fila[0], margen + 1, y + 3);
    doc.text(fila[1], margen + 10, y + 3);
    doc.text(fila[2], margen + 35, y + 3);
    doc.text(doc.splitTextToSize(fila[3], 67), margen + 62, y + 3);
    doc.text(fila[4], margen + 134, y + 3);
    doc.text(fila[5], margen + 161, y + 3);
    y += altoFila;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(82, 97, 115);
  doc.text(`Total de alumnos: ${alumnos.length}`, margen, altoPagina - 10);
  doc.save(`lista-alumnos-${normalizarNombreArchivoPdf(programa?.nombre || programa?.id || "programa")}-${fechaActualIso()}.pdf`);
}

function dibujarEncabezadoTablaPdf(doc, margen, y) {
  doc.setFillColor(234, 246, 242);
  doc.setDrawColor(216, 229, 226);
  doc.roundedRect(margen, y, 182, 8, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(39, 124, 105);
  doc.text("#", margen + 1, y + 5.3);
  doc.text("DNI", margen + 10, y + 5.3);
  doc.text("CODIGO", margen + 35, y + 5.3);
  doc.text("ESTUDIANTE", margen + 62, y + 5.3);
  doc.text("GRADO", margen + 134, y + 5.3);
  doc.text("SECCION", margen + 161, y + 5.3);
  return y + 12;
}

function formatearFechaPdf(valor) {
  if (!valor) return "Sin fecha";
  const partes = String(valor).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return String(valor);
}

function normalizarNombreArchivoPdf(valor) {
  return String(valor || "archivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "archivo";
}
