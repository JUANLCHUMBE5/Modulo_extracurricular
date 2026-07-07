import { obtenerConfiguracionInstitucional } from "../../coordinacion/services/coordinacionService";
import {
  cleanFallbackText,
  escaparHtml,
  normalizarNombreArchivo,
  formatearNivelesDocumento,
  formatearRangoHoraDocumento,
  agruparGradosConsecutivos,
  extraerDiasHorario,
  extraerHorasHorario,
  extraerAlmuerzoHorario,
} from "./secretariaFichaData";

function formatearFechaLargaCircular(fechaStr: string) {
  if (!fechaStr) return "";
  try {
    const date = new Date(fechaStr + "T00:00:00");
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
  } catch (e) {
    return fechaStr;
  }
}

function formatearFechaLarga(fechaStr: string) {
  if (!fechaStr) return "";
  const parts = String(fechaStr).split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${day} de ${meses[month]} de ${year}`;
  }
  return fechaStr;
}

let configuracionInstitucionalCache: any = null;

async function obtenerRecursosInstitucionales() {
  try {
    configuracionInstitucionalCache = await obtenerConfiguracionInstitucional();
    return configuracionInstitucionalCache;
  } catch {
    return configuracionInstitucionalCache || {};
  }
}

function dataUrlRecurso(configuracion: any, campo: string) {
  const recurso = configuracion?.[campo];
  if (!recurso) return "";
  if (typeof recurso === "string") return recurso;
  return recurso.dataUrl || "";
}

function formatoImagenDataUrl(dataUrl = "") {
  const formato = String(dataUrl).match(/^data:image\/([^;]+)/i)?.[1]?.toUpperCase();
  if (!formato) return "PNG";
  return formato === "JPG" ? "JPEG" : formato;
}

function agregarImagenPdf(doc: any, dataUrl: string, x: number, y: number, ancho: number, alto: number) {
  if (!dataUrl) return false;
  try {
    doc.addImage(dataUrl, formatoImagenDataUrl(dataUrl), x, y, ancho, alto, undefined, "FAST");
    return true;
  } catch {
    return false;
  }
}

function esDocumentoCambridge(ficha: any) {
  const texto = [
    ficha?.programa?.tipoComunicado,
    ficha?.programa?.nombre,
    ficha?.programa?.areaTematica,
    ficha?.programa?.plantilla,
  ].filter(Boolean).join(" ").toLowerCase();
  return /cambridge|cambrigde|cabringde|camringde|ingles/.test(texto);
}

export function obtenerFilasCambridgeFicha(ficha: any) {
  const texto = [
    ficha?.programa?.nombre,
    ficha?.programa?.plantilla,
  ].filter(Boolean).join(" ").toLowerCase();
  if (!texto.includes("cambridge")) return [];
  const filas = [["Modalidad Cambridge A/B/C", ficha.programa.ingresoCambridge || "Pendiente de definir"]];
  if (ficha.programa.nivelCambridge) {
    filas.push(["Nivel Cambridge", ficha.programa.nivelCambridge]);
  }
  return filas;
}

export async function descargarFichaPdf(ficha: any) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 18;
  const anchoTexto = 174;
  let y = 16;

  // top brand accent bar
  doc.setFillColor(20, 83, 45); // brand primary dark green
  doc.rect(margen, y, anchoTexto, 2.5, "F");
  y += 9;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate 900
  doc.text("COLEGIO MATEMATICO SAN RAFAEL", 105, y, { align: "center" });
  y += 6;
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105); // slate 600
  doc.text("Ficha de aceptación del programa extracurricular", 105, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate 500
  doc.text(`Carabayllo, ${ficha.fecha}`, 105, y, { align: "center" });
  y += 4.5;
  doc.text(`Código de inscripción: ${ficha.codigo}`, 105, y, { align: "center" });
  y += 6;
  doc.setDrawColor(203, 213, 225); // slate 300
  doc.setLineWidth(0.3);
  doc.line(margen, y, 210 - margen, y);
  y += 8;

  y = agregarParrafoPdf(doc, "Por medio de la presente, se deja constancia de que el padre o apoderado acepta la inscripción del estudiante en el programa indicado, de acuerdo con las condiciones establecidas por la institución.", margen, y, anchoTexto);

  const filasPrograma = [
    ["Programa / taller", ficha.programa.nombre],
    ["Horario", ficha.programa.horario],
    ["Responsable", ficha.programa.responsable],
    ...obtenerFilasCambridgeFicha(ficha),
    ["Costo referencial", ficha.programa.costo],
    ["Modalidad de cobro", ficha.programa.modalidadCobro],
    ["Requisitos", ficha.programa.requisitos],
    ["Plantilla utilizada", ficha.programa.plantilla],
  ];

  if (ficha.programa.uniforme === "Sí" || ficha.programa.uniforme === "Si") {
    filasPrograma.push(["Uniforme requerido", "Sí"]);
    filasPrograma.push(["Talla", ficha.programa.talla]);
  }

  filasPrograma.push(["Estado", ficha.programa.estado]);
  filasPrograma.push(["Estado de pago", ficha.programa.estadoPago]);

  y = agregarBloquePdf(doc, "Datos del estudiante", [
    ["Nombre y apellido", ficha.estudiante.nombre],
    ["DNI", ficha.estudiante.dni],
    ["Grado", ficha.estudiante.grado],
    ["Sección", ficha.estudiante.seccion],
    ["Periodo", ficha.estudiante.periodo],
    ["Colegio de procedencia", ficha.estudiante.colegio],
  ], margen, y, anchoTexto);

  y = agregarBloquePdf(doc, "Datos del programa", filasPrograma, margen, y, anchoTexto);

  y = agregarBloquePdf(doc, "Datos del padre / apoderado", [
    ["Nombre del padre o apoderado", ficha.apoderado.nombre],
    ["Teléfono", ficha.apoderado.telefono],
  ], margen, y, anchoTexto);

  y = agregarBloquePdf(doc, "Aceptación", [
    ["Firma del apoderado", "El padre o apoderado declara haber leído y aceptado las condiciones del programa. Esta ficha será presentada en Cajera para continuar con el proceso de pago."],
    ["Observación", cleanFallbackText(ficha.observacion) || "-"],
  ], margen, y, anchoTexto);

  doc.save(`Ficha_Aceptacion_${normalizarNombreArchivo(ficha.codigo)}.pdf`);
}

export async function crearPdfInvitacionDocumento(documento: any) {
  const { jsPDF } = await import("jspdf");
  const ficha = documento.ficha || {};
  const recursosInstitucionales = await obtenerRecursosInstitucionales();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoColegio = dataUrlRecurso(recursosInstitucionales, "logoInstitucion");
  const logoCambridge = dataUrlRecurso(recursosInstitucionales, "logoCambridge");
  const firmaDireccion = dataUrlRecurso(recursosInstitucionales, "firmaDireccion");
  const selloInstitucion = dataUrlRecurso(recursosInstitucionales, "selloInstitucion");
  const mostrarCambridge = esDocumentoCambridge(ficha);

  const nombreEstudiante = (ficha.estudiante?.nombre || "").toUpperCase();
  const gradoEstudiante = (ficha.estudiante?.grado || "").toUpperCase();
  const seccionEstudiante = ficha.estudiante?.seccion && ficha.estudiante.seccion !== "-" ? `SECCIÓN ${ficha.estudiante.seccion.toUpperCase()}` : "";
  const tallerNombre = (ficha.programa?.nombre || "").toUpperCase();

  // Watermark
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(1.2);
  doc.circle(105, 148.5, 42);
  doc.circle(105, 148.5, 38);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(241, 245, 249);
  doc.text("COLEGIO SAN RAFAEL", 105, 148.5 - 4, { align: "center" });
  doc.text("MATEMÁTICO Y ECOLÓGICO", 105, 148.5 + 4, { align: "center" });

  // Slogan
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  if (!mostrarCambridge) {
    doc.text('"Año de la Esperanza y el Fortalecimiento de la Democracia"', 192, 14, { align: "right" });
  }

  // School Brand
  doc.setDrawColor(20, 83, 45);
  doc.setLineWidth(0.75);
  doc.circle(22, 17.5, 2.5);

  doc.setFillColor(34, 197, 94);
  doc.ellipse(23.5, 16.5, 1.2, 0.7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 83, 45);
  doc.text("SAN RAFAEL", 27, 18.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text("COLEGIO MATEMÁTICO Y ECOLÓGICO", 27, 21.5);

  // Logo images
  agregarImagenPdf(doc, logoColegio, 12, 14, 7, 9.5);
  if (mostrarCambridge) {
    agregarImagenPdf(doc, logoCambridge, 158, 14, 34, 10);
  }

  // Header Title
  doc.setFillColor(20, 83, 45);
  doc.rect(12, 27, 186, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    mostrarCambridge
      ? "PROGRAMAS EXTRACURRICULARES - CERTIFICACIONES INTERNACIONALES DE INGLÉS"
      : "PROGRAMAS EXTRACURRICULARES - COMUNICACIÓN DE INVITACIÓN AL TALLER DE REFORZAMIENTO Y/O NIVELACIÓN",
    15,
    31.2
  );

  // Body content
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Carabayllo, ${formatearFechaLargaCircular(ficha.fecha)}`, 12, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Estimado Padre de Familia / Apoderado:", 12, 47);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text("Reciba el cordial saludo de la Comunidad Educativa del Colegio San Rafael.", 12, 52);

  // Text body depending on Cambridge or regular
  let yIntro = 57;
  let linesIntro: string[] = [];
  if (mostrarCambridge) {
    const textIntro =
      "Le informamos que su menor hijo(a) ha sido seleccionado(a) para participar en el prestigioso Programa Extracurricular de Inglés, el cual está enfocado en la preparación integral para las Certificaciones Internacionales de Cambridge University. Consideramos que esta es una valiosa oportunidad para potenciar y certificar internacionalmente el dominio lingüístico de su menor hijo(a).";
    linesIntro = doc.splitTextToSize(textIntro, 186);
  } else {
    const areaTexto = String(ficha.programa?.areaTematica || "el área académica").toUpperCase();
    const textIntro = `Habiendo revisado la situación académica y el perfil del I Bimestre, hemos encontrado que su menor hijo(a) califica y se beneficiará directamente de integrarse al Taller Extracurricular de Reforzamiento Académico en ${areaTexto}. Este taller ha sido diseñado como un espacio personalizado de nivelación para fortalecer su aprendizaje y asegurar su éxito académico.`;
    linesIntro = doc.splitTextToSize(textIntro, 186);
  }
  doc.text(linesIntro, 12, yIntro);
  yIntro += linesIntro.length * 4.5 + 2;

  // Student info card box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.rect(12, yIntro, 186, 24, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("ESTUDIANTE INVITADO:", 16, yIntro + 6);
  doc.text("GRADO Y NIVEL:", 16, yIntro + 11.5);
  doc.text("PROGRAMA / TALLER:", 16, yIntro + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text(nombreEstudiante, 58, yIntro + 6);
  doc.text(`${gradoEstudiante} ${seccionEstudiante}`.trim(), 58, yIntro + 11.5);
  doc.text(tallerNombre, 58, yIntro + 18);
  yIntro += 30;

  // Program details block
  doc.setFillColor(20, 83, 45);
  doc.rect(12, yIntro, 4, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text("DETALLES Y ORGANIZACIÓN DEL PROGRAMA", 19, yIntro + 3.8);
  yIntro += 8;

  // Details content
  const diaTaller = extraerDiasHorario(ficha.programa?.horario);
  const horaTaller = extraerHorasHorario(ficha.programa?.horario);
  const almuerzoTaller = extraerAlmuerzoHorario(ficha.programa?.horario);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  let yDetalle = yIntro;
  const espaciadoFila = 4.8;

  doc.text("• Frecuencia y horario: ", 15, yDetalle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${diaTaller} de ${horaTaller}`, 51, yDetalle);
  yDetalle += espaciadoFila;

  if (almuerzoTaller && !mostrarCambridge) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("• Almuerzo (escolar): ", 15, yDetalle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${almuerzoTaller} (incluido beneficio de comedor institucional)`, 51, yDetalle);
    yDetalle += espaciadoFila;
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text("• Docente / Tutor: ", 15, yDetalle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(String(ficha.programa?.responsable || "Docente especializado").toUpperCase(), 51, yDetalle);
  yDetalle += espaciadoFila;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text("• Fecha de inicio: ", 15, yDetalle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatearFechaLarga(ficha.programa?.fechaInicio), 51, yDetalle);
  yDetalle += espaciadoFila;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text("• Costo mensual: ", 15, yDetalle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 83, 45);
  doc.text(Number(ficha.programa?.costo || 0) > 0 ? `S/. ${ficha.programa.costo} MENSUAL` : "COMPLETAMENTE GRATUITO", 51, yDetalle);
  yDetalle += espaciadoFila;

  if (ficha.programa?.requiereUniforme && !mostrarCambridge) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("• Uniforme requerido: ", 15, yDetalle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Talla: ${ficha.programa.talla || "Según ficha de matrícula"} (Prenda obligatoria del taller)`, 51, yDetalle);
    yDetalle += espaciadoFila;
  }

  yIntro = yDetalle + 4;

  // Benefits & advantages section
  doc.setFillColor(20, 83, 45);
  doc.rect(12, yIntro, 4, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text(mostrarCambridge ? "BENEFICIOS DEL PROGRAMA INTERNACIONAL" : "VENTAJAS Y COMPROMISOS DEL TALLER", 19, yIntro + 3.8);
  yIntro += 8;

  // Advantages text list
  const ventajas = mostrarCambridge
    ? [
        "Preparación académica especializada con material oficial de Cambridge University (Workbook gratis al inicio).",
        "Evaluaciones periódicas de simulación (Mock Exams) para medir el avance real.",
        "Desarrollo de competencias lingüísticas avanzadas: Listening, Reading, Writing y Speaking.",
        "Acceso preferencial para rendir el examen oficial de certificación al culminar satisfactoriamente el ciclo."
      ]
    : [
        "Workbook (Compendio de ejercicios prácticos) totalmente gratis al cumplir con la asistencia al ciclo.",
        "Monitoreo académico personalizado y reporte de progreso bimestral directo al apoderado.",
        "Seguimiento psicopedagógico para alumnos que muestren dificultades persistentes.",
        "Compromiso de asistencia: El estudiante debe asistir puntualmente a todas las sesiones programadas."
      ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  ventajas.forEach((vent) => {
    const lineasVent = doc.splitTextToSize(`• ${vent}`, 186);
    doc.text(lineasVent, 12, yIntro);
    yIntro += lineasVent.length * 4 + 1.2;
  });
  yIntro += 2;

  // Invitation letter text
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const textAviso = mostrarCambridge
    ? "Nota: Al ser un programa extracurricular voluntario, las vacantes son limitadas y se asignarán en orden de aceptación. Rogamos registrar su respuesta a la brevedad."
    : "Importante: Para mantener la gratuidad del compendio y la vacante del taller, se requiere una asistencia mínima del 90%. En caso de abandono sin justificación, el apoderado deberá cubrir el costo del compendio.";
  const linesAviso = doc.splitTextToSize(textAviso, 186);
  doc.text(linesAviso, 12, yIntro);
  yIntro += linesAviso.length * 3.5 + 4;

  // QR Code placeholder / info box
  doc.setFillColor(248, 250, 252);
  doc.rect(12, yIntro, 186, 17, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text("¿CÓMO CONFIRMAR SU REGISTRO O DESCARGAR LA FICHA?", 16, yIntro + 5.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "1. Ingrese al Portal de Padres desde su celular o computadora con el DNI del alumno.",
    16,
    yIntro + 9.5
  );
  doc.text(
    "2. Acepte las condiciones del taller y registre los datos de contacto del apoderado.",
    16,
    yIntro + 13
  );

  // QR Code box outline
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.rect(170, yIntro + 1.5, 23, 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("CÓDIGO QR", 181.5, yIntro + 7.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("ACCESO PORTAL", 181.5, yIntro + 10.5, { align: "center" });
  yIntro += 23;

  // Signature lines
  const yFirma = yIntro + 10;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);

  // Director signature line
  doc.line(16, yFirma, 86, yFirma);
  // Parent signature line
  doc.line(124, yFirma, 194, yFirma);

  // Director text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("DIRECCIÓN GENERAL", 51, yFirma + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Colegio San Rafael", 51, yFirma + 7.5, { align: "center" });

  // Parent text
  doc.setFont("helvetica", "bold");
  doc.text("FIRMA DEL PADRE / APODERADO", 159, yFirma + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("DNI: _______________________", 159, yFirma + 7.5, { align: "center" });

  // Signature images
  agregarImagenPdf(doc, firmaDireccion, 36, yFirma - 14, 30, 12);
  agregarImagenPdf(doc, selloInstitucion, 58, yFirma - 16, 22, 22);

  // Page bottom footer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("COLEGIO SAN RAFAEL - CARABAYLLO", 105, 287, { align: "center" });

  return doc;
}

function agregarBloquePdf(doc: any, titulo: string, items: any[][], x: number, y: number, anchoTexto: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 83, 45); // brand green
  doc.text(titulo, x, y + 4);
  y += 7;

  items.forEach(([label, value]) => {
    const cleanLab = cleanFallbackText(label) || "-";
    const cleanVal = cleanFallbackText(value) || "-";
    const lineasLabel = doc.splitTextToSize(String(cleanLab), 48);
    const lineasValue = doc.splitTextToSize(String(cleanVal), anchoTexto - 52);
    const altoFila = Math.max(lineasLabel.length * 4.5, lineasValue.length * 4.5) + 3;

    if (y + altoFila > 275) {
      doc.addPage();
      y = 16;
      doc.setFillColor(20, 83, 45);
      doc.rect(x, y, 2.5, 5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${titulo.toUpperCase()} (CONTINUACIÓN)`, x + 5, y + 3.8);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(x, y + 5.5, x + anchoTexto, y + 5.5);
      y += 7.5;
    }

    doc.setDrawColor(226, 232, 240); // slate 200
    doc.setLineWidth(0.2);
    doc.line(x, y + altoFila, x + anchoTexto, y + altoFila);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // slate 600
    doc.setFontSize(8.5);
    doc.text(lineasLabel, x + 2, y + 4);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42); // slate 900
    doc.setFontSize(8.5);
    doc.text(lineasValue, x + 52, y + 4);

    y += altoFila;
  });

  return y + 5;
}

function agregarParrafoPdf(doc: any, texto: string, x: number, y: number, anchoTexto: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85); // slate 700
  const lineas = doc.splitTextToSize(String(texto), anchoTexto);
  const alto = lineas.length * 5 + 4;
  if (y + alto > 275) {
    doc.addPage();
    y = 20;
  }
  doc.text(lineas, x, y);
  return y + alto;
}
