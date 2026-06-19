import { jsPDF } from "jspdf";
import { renderAsync } from "docx-preview";
import {
  cleanFallbackText,
  escaparHtml,
  normalizarNombreArchivo,
  formatearNivelesDocumento,
  formatearRangoHoraDocumento,
  agruparGradosConsecutivos,
} from "./secretariaFichaData";

export function prepararVistaDocxParaImpresion(contenedor) {
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  if (!paginas.length) return;

  const paginasConContenido = compactarPaginasDocx(contenedor, paginas.filter(paginaTieneContenidoDocx));
  paginas
    .filter((pagina) => !paginasConContenido.includes(pagina))
    .forEach((pagina) => pagina.remove());

  paginasConContenido.forEach((pagina) => {
    const contenido = pagina.querySelector("article") || pagina;
    pagina.style.height = pagina.style.height || "297mm";
    pagina.style.overflow = "visible";
    pagina.style.minHeight = pagina.style.minHeight || "297mm";
    pagina.style.position = "relative";
    contenido.style.position = "relative";
    ajustarDocxAUnaPagina(pagina, contenido);
  });

  normalizarMarcasAguaDocx(contenedor);
}

export function normalizarMarcasAguaDocx(contenedor) {
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  paginas.forEach((pagina) => {
    const rectPagina = pagina.getBoundingClientRect();
    const anchoPagina = rectPagina.width || leerMedidaCss(pagina, "width") || 794;
    const altoPagina = rectPagina.height || leerMedidaCss(pagina, "height") || 1123;
    const visuales = Array.from(pagina.querySelectorAll("img, svg"));

    visuales.forEach((visual) => {
      const rect = visual.getBoundingClientRect();
      const ancho = rect.width || leerMedidaCss(visual, "width");
      const alto = rect.height || leerMedidaCss(visual, "height");
      const estilo = visual.getAttribute("style") || "";
      const pareceMarcaDeAguaWord = /z-index\s*:\s*-\d+/i.test(estilo);

      if (!pareceMarcaDeAguaWord && (ancho < anchoPagina * 0.45 || alto < altoPagina * 0.28)) return;

      const contenedorMarca = obtenerContenedorMarcaAgua(visual, pagina);
      visual.classList.add("secretaria-docx-watermark");
      visual.setAttribute("aria-hidden", "true");
      if (contenedorMarca !== visual) {
        contenedorMarca.classList.add("secretaria-docx-watermark-holder");
        contenedorMarca.setAttribute("aria-hidden", "true");
      }
    });

    const contenido = pagina.querySelector("article") || pagina;
    Array.from(contenido.children).forEach((hijo) => {
      if (
        hijo.classList.contains("secretaria-docx-watermark") ||
        hijo.classList.contains("secretaria-docx-watermark-holder")
      ) return;
      hijo.style.position = hijo.style.position || "relative";
      hijo.style.zIndex = hijo.style.zIndex || "1";
    });
  });
}

function formatearFechaLargaCircular(fechaStr) {
  if (!fechaStr) return "";
  try {
    const date = new Date(fechaStr + "T00:00:00");
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
  } catch (e) {
    return fechaStr;
  }
}

function formatearFechaLarga(fechaStr) {
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

function extraerDiasHorario(horario) {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const texto = String(horario || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return dias
    .filter((dia) => texto.includes(dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    .join(", ");
}

function extraerHorasHorario(horario) {
  const matches = [...String(horario || "").matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((match) => {
      const hora = Number(match[1]);
      const minuto = match[2] || "00";
      const hora12 = hora > 12 ? hora - 12 : hora || 12;
      return `${hora12}:${minuto}`;
    });

  return matches.length >= 2 ? `${matches[0]} a ${matches[1]}` : "";
}

function extraerAlmuerzoHorario(horario) {
  const match = String(horario || "").match(/almuerzo\s+([^,·/]+)/i);
  if (!match) return "";
  const valor = match[1].trim();
  const horas = [...valor.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((m) => {
      const hr = Number(m[1]);
      const min = m[2] || "00";
      const hr12 = hr > 12 ? hr - 12 : hr || 12;
      return `${hr12}:${min}`;
    });
  if (horas.length >= 2) return `${horas[0]} a ${horas[1]}`;
  return valor.replace(/\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\b/gi, "").trim();
}

export function crearPdfInvitacionDocumento(documento) {
  const ficha = documento.ficha || {};
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  
  const nombreEstudiante = (ficha.estudiante?.nombre || "").toUpperCase();
  const gradoEstudiante = (ficha.estudiante?.grado || "").toUpperCase();
  const seccionEstudiante = ficha.estudiante?.seccion && ficha.estudiante.seccion !== "-" ? `SECCIÓN ${ficha.estudiante.seccion.toUpperCase()}` : "";
  const tallerNombre = (ficha.programa?.nombre || "").toUpperCase();

  // 0. Faint background watermark (centered)
  doc.setDrawColor(241, 245, 249); // extremely light gray (slate 100)
  doc.setLineWidth(1.2);
  doc.circle(105, 148.5, 42); // outer circle of watermark
  doc.circle(105, 148.5, 38); // inner circle
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(241, 245, 249);
  doc.text("COLEGIO SAN RAFAEL", 105, 148.5 - 4, { align: "center" });
  doc.text("MATEMÁTICO Y ECOLÓGICO", 105, 148.5 + 4, { align: "center" });

  // 1. Slogan header
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate 500
  doc.text('"Año de la Esperanza y el Fortalecimiento de la Democracia"', 192, 14, { align: "right" });

  // 2. School Brand info with decorative icons
  doc.setDrawColor(30, 58, 138); // blue
  doc.setLineWidth(0.75);
  doc.circle(22, 17.5, 2.5); // gear outer circle
  
  doc.setFillColor(34, 197, 94); // green
  doc.ellipse(23.5, 16.5, 1.2, 0.7, "F"); // green leaf next to gear

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138); // brand primary #1E3A8A
  doc.text("Colegio San Rafael", 27, 16.5);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Matemático y Ecológico", 27, 20.5);

  // 3. Document ID and Date
  const docNumRaw = ficha.programa?.numeroDocumento || ficha.programa?.id || "N° 29";
  const nCom = `COMUNICADO CMSR-${docNumRaw.toUpperCase()}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(nCom, 18, 26);

  const fechaStr = `Carabayllo, ${formatearFechaLarga(ficha.fecha) || "marzo de 2026"}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(fechaStr, 192, 26, { align: "right" });

  // 4. Header Underline
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(18, 28, 192, 28);

  let y = 36;

  // 5. Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  const tituloDoc = `COMUNICADO: ${tituloFichaOriginal(ficha) || tallerNombre}`;
  doc.text(tituloDoc, 105, y, { align: "center" });
  y += 8;

  // 6. Introduction Paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  
  const gradoSeccionText = seccionEstudiante ? `${gradoEstudiante} ${seccionEstudiante}` : gradoEstudiante;
  const parrafo1 = `Reciba un cordial saludo de parte de la Comunidad Educativa del Colegio Matemático "San Rafael". Nos dirigimos a usted para informarle que, con el propósito de complementar la formación integral de nuestros alumnos, nos complace invitar a su menor hijo(a) ${nombreEstudiante}, del grado ${gradoSeccionText}, a participar en nuestra actividad extracurricular: ${tallerNombre}.`;
  
  y = agregarParrafoPdf(doc, parrafo1, 18, y, 174);
  y += 2.5;

  // 7. Cycle & Duration details
  const ciclo = ficha.programa?.nombreCiclo || "Ciclo I";
  const duracion = ficha.programa?.duracion || "";
  const durTexto = duracion ? ` con una duración de ${duracion}` : "";
  let fechasTexto = "";
  if (ficha.programa?.fechaInicio && ficha.programa?.fechaFin) {
    fechasTexto = `, comprendido desde el ${formatearFechaLargaCircular(ficha.programa.fechaInicio)} hasta el ${formatearFechaLargaCircular(ficha.programa.fechaFin)}`;
  }
  const parrafo2 = `Este taller corresponde al ${ciclo}${durTexto}${fechasTexto}.`;
  y = agregarParrafoPdf(doc, parrafo2, 18, y, 174);
  y += 4.5;

  // 8. Schedules Table
  const tabla = ficha.programa?.tablaHorariosNivel || [];
  const grupos = ficha.programa?.horariosPorGrupo || [];
  const rows = [];
  
  if (Array.isArray(tabla) && tabla.length > 0) {
    tabla.forEach(row => {
      rows.push({
        nivel: row.nivel || "Por definir",
        dia: row.dia || "Por definir",
        almuerzo: row.horarioAlmuerzo || "No aplica",
        clase: row.horarioClase || "Por definir"
      });
    });
  } else if (Array.isArray(grupos) && grupos.length > 0) {
    grupos.forEach(row => {
      const subgruposGrados = agruparGradosConsecutivos(row.grados);
      const almuerzoFmt = (row.almuerzoInicio && row.almuerzoFin)
        ? formatearRangoHoraDocumento(row.almuerzoInicio, row.almuerzoFin)
        : "No aplica";
      const claseFmt = formatearRangoHoraDocumento(row.horaInicio, row.horaFin);
      
      if (subgruposGrados.length > 0) {
        subgruposGrados.forEach(subgrupo => {
          rows.push({
            nivel: formatearNivelesDocumento(subgrupo) || "Por definir",
            dia: row.dia || "Por definir",
            almuerzo: almuerzoFmt,
            clase: claseFmt
          });
        });
      } else {
        rows.push({
          nivel: "Por definir",
          dia: row.dia || "Por definir",
          almuerzo: almuerzoFmt,
          clase: claseFmt
        });
      }
    });
  } else {
    rows.push({
      nivel: gradoEstudiante || "GENERAL",
      dia: extraerDiasHorario(ficha.programa?.horario),
      almuerzo: extraerAlmuerzoHorario(ficha.programa?.horario) || "NO APLICA",
      clase: extraerHorasHorario(ficha.programa?.horario) || ficha.programa?.horario
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text("A continuación, se indican los horarios correspondientes:", 18, y);
  y += 4;

  // Draw table header
  doc.setFillColor(30, 58, 138);
  doc.rect(18, y, 174, 6.5, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("NIVEL / GRADO", 20, y + 4.8);
  doc.text("DÍA", 68, y + 4.8);
  doc.text("ALMUERZO", 102, y + 4.8);
  doc.text("CLASES", 146, y + 4.8);
  y += 6.5;

  // Draw table rows
  doc.setTextColor(15, 23, 42); // slate 900
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate 50
      doc.rect(18, y, 174, 6, "F");
    }
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.setLineWidth(0.2);
    doc.line(18, y + 6, 192, y + 6);

    doc.text(String(row.nivel).toUpperCase(), 20, y + 4.2);
    doc.text(String(row.dia).toUpperCase(), 68, y + 4.2);
    doc.text(String(row.almuerzo).toUpperCase(), 102, y + 4.2);
    doc.text(String(row.clase).toUpperCase(), 146, y + 4.2);
    y += 6;
  });
  y += 5.5;

  // 9. Requisitos
  const reqs = ficha.programa?.requisitos;
  if (reqs && reqs !== "Sin requisitos adicionales") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text("REQUISITOS:", 18, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const linesReq = reqs.split(/[·\-\*]/).map(line => line.trim()).filter(Boolean);
    if (linesReq.length > 1) {
      linesReq.forEach(line => {
        y = agregarParrafoPdf(doc, `· ${line}`, 18, y, 174);
      });
    } else {
      y = agregarParrafoPdf(doc, reqs, 18, y, 174);
    }
    y += 3.5;
  }

  // 10. Costo
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.rect(18, y, 174, 9, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text("COSTO:", 22, y + 5.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(220, 38, 38); // red 600
  const cobroMod = String(ficha.programa?.modalidadCobro || "UNICO").toUpperCase();
  doc.text(`${cobroMod}: ${ficha.programa?.costo || "S/ 0.00"} POR TODO EL CICLO`, 40, y + 5.8);
  y += 12.5;

  // 11. Almuerzo
  if (ficha.programa?.incluyeAlmuerzo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text("EL ALMUERZO:", 18, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const horarioAlm = ficha.programa.horarioRecepcionAlmuerzo
      ? ` de ${ficha.programa.horarioRecepcionAlmuerzo}`
      : "";
    const almuerzoParrafo = `Contamos con un área para la recepción de los almuerzos, donde se deberá dejar bajo el siguiente horario:${horarioAlm}. Indicando claramente una etiqueta grande en la lonchera, con NOMBRE DEL ALUMNO, GRADO Y SECCIÓN.`;
    y = agregarParrafoPdf(doc, almuerzoParrafo, 18, y, 174);
    y += 2.5;

    // Concesionarios
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const deliveryText = "Si deseara coordinar el servicio de Delivery le indicamos los siguientes contactos de nuestros 2 concesionarios autorizados para desayunos, loncheras, almuerzos: Cafetín Los Amigos del recreo (Sra. Rocío) - 976280197 / Cafetín Edith (Sra. Deysli) - 960897529.";
    y = agregarParrafoPdf(doc, deliveryText, 18, y, 174);
    y += 4.5;
  }

  // 12. Final statement & Direction stamp seal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  y = agregarParrafoPdf(doc, "Agradecemos de antemano su confianza y apoyo constante en las actividades de nuestra institución educativa.", 18, y, 174);
  y += 4;

  if (y + 32 > 297) {
    doc.addPage();
    y = 15;
  }

  doc.text("Atentamente,", 105, y, { align: "center" });
  y += 11;

  // Signature line
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.35);
  doc.line(85, y, 125, y);
  
  // General Direction Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text("DIRECCIÓN GENERAL", 105, y + 4, { align: "center" });
  
  // Circular ink stamp overlapping the signature
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.35);
  doc.circle(118, y - 2, 7.5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.5);
  doc.text("COLEGIO", 118, y - 5, { align: "center" });
  doc.text("SAN RAFAEL", 118, y - 3, { align: "center" });
  doc.text("DIRECCIÓN", 118, y - 1, { align: "center" });
  doc.text("GENERAL", 118, y + 1, { align: "center" });
  
  y += 12;

  // 13. Dotted line separator and Coupon
  if (y + 36 > 297) {
    doc.addPage();
    y = 15;
  } else {
    y += 2;
  }

  // Draw dotted line
  doc.setDrawColor(148, 163, 184); // slate 400
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(18, y, 192, y);
  doc.setLineDashPattern([], 0); // reset dash pattern
  y += 5;

  // Coupon title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text("ENTREGAR ESTE FORMATO FIRMADO si está conforme, al momento de inscribirse en Administración.", 18, y);
  y += 7;

  // Row 1
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("ACEPTO: __________________________________________", 18, y);
  doc.text(`GRADO/SECCIÓN: ${gradoSeccionText}`, 120, y);
  y += 7;

  // Row 2
  doc.text(`DATOS DEL ALUMNO: ${nombreEstudiante}`, 18, y);
  doc.text("CEL: ______________________________________", 120, y);
  y += 7;

  // Row 3
  const apodNombre = ficha.apoderado?.nombre && ficha.apoderado.nombre !== "-" ? ficha.apoderado.nombre.toUpperCase() : "__________________________________________";
  doc.text(`DATOS DEL APODERADO: ${apodNombre}`, 18, y);
  doc.text("FIRMA: ____________________________________", 120, y);

  return doc;
}

function tituloFichaOriginal(ficha) {
  const t = ficha.programa?.tipoComunicado;
  if (!t || t === "Otro genérico") return "";
  return t === "Reforzamiento (Circular)" ? "TALLER DE REFORZAMIENTO Y NIVELACIÓN" : t.toUpperCase();
}

export function crearUrlPdfInvitacion(documento) {
  const doc = crearPdfInvitacionDocumento(documento);
  return URL.createObjectURL(doc.output("blob"));
}

export async function convertirWordOriginalAPdf(wordBlob) {
  const formData = new FormData();
  formData.append(
    "archivo",
    wordBlob,
    "ficha.docx"
  );

  const response = await fetch("/api/secretaria/documentos/pdf", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "No se pudo convertir el Word original a PDF.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/pdf")) {
    throw new Error("El convertidor no devolvió un PDF válido.");
  }

  return await response.blob();
}

export function imprimirPdfBlob(pdfBlob) {
  const url = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  document.body.appendChild(iframe);
  setTimeout(() => {
    iframe.remove();
    URL.revokeObjectURL(url);
  }, 60000);
}

export async function imprimirWordRenderizado(wordBlob) {
  const contenedor = document.createElement("div");
  contenedor.className = "secretaria-word-document";
  contenedor.style.position = "fixed";
  contenedor.style.left = "-10000px";
  contenedor.style.top = "0";
  contenedor.style.width = "210mm";
  contenedor.style.background = "#ffffff";
  document.body.appendChild(contenedor);

  try {
    await renderAsync(wordBlob, contenedor, null, {
      className: "secretaria-docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      breakPages: false,
      ignoreLastRenderedPageBreak: false,
    });
    prepararVistaDocxParaImpresion(contenedor);
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        normalizarMarcasAguaDocx(contenedor);
        window.setTimeout(() => {
          prepararVistaDocxParaImpresion(contenedor);
          normalizarMarcasAguaDocx(contenedor);
          resolve();
        }, 300);
      });
    });
    await imprimirHtmlRenderizado(contenedor.innerHTML);
  } finally {
    contenedor.remove();
  }
}

export function imprimirHtmlRenderizado(html) {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      resolve();
      return;
    }

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${obtenerEstilosParaImpresion()}</style>
          <style>
            @page { size: A4; margin: 0; }
            html, body { margin: 0; padding: 0; background: #ffffff; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .secretaria-word-print-root {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: #ffffff;
            }
            .secretaria-word-print-root .docx-wrapper {
              padding: 0 !important;
              background: #ffffff !important;
              box-shadow: none !important;
              height: 297mm !important;
              min-height: 297mm !important;
              overflow: hidden !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }
            .secretaria-word-print-root .docx {
              margin: 0 auto !important;
              box-shadow: none !important;
              height: 297mm !important;
              min-height: 297mm !important;
              overflow: hidden !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }
            .secretaria-word-print-root .docx:not(:first-of-type),
            .secretaria-word-print-root .docx-wrapper:not(:first-of-type) {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <main class="secretaria-word-document secretaria-word-print-root">${html}</main>
        </body>
      </html>
    `);
    doc.close();
    compactarDocumentoDocxParaImpresion(doc);

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        iframe.remove();
        resolve();
      }, 1000);
    }, 350);
  });
}

export function crearHtmlImpresionFicha(ficha) {
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

  const bloques = [
    ["Datos del estudiante", [
      ["Nombre y apellido", ficha.estudiante.nombre],
      ["DNI", ficha.estudiante.dni],
      ["Grado", ficha.estudiante.grado],
      ["Sección", ficha.estudiante.seccion],
      ["Periodo", ficha.estudiante.periodo],
      ["Colegio de procedencia", ficha.estudiante.colegio],
    ]],
    ["Datos del programa", filasPrograma],
    ["Datos del padre / apoderado", [
      ["Nombre del padre o apoderado", ficha.apoderado.nombre],
      ["Teléfono", ficha.apoderado.telefono],
    ]],
  ];

  const bloquesHtml = bloques.map(([titulo, items]) => `
    <section style="margin-bottom: 20px;">
      <h4 style="margin: 0 0 8px; font-size: 13px; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${escaparHtml(titulo)}</h4>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px;">
        <tbody>
          ${items.map(([label, value]) => {
            const cleanVal = cleanFallbackText(value) || "-";
            const cleanLab = cleanFallbackText(label) || "-";
            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="width: 30%; padding: 6px 8px; font-weight: bold; background-color: #f8fafc; color: #334155; border: 1px solid #e2e8f0;">${escaparHtml(cleanLab)}</td>
                <td style="width: 70%; padding: 6px 8px; color: #0f172a; border: 1px solid #e2e8f0;">${escaparHtml(cleanVal)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </section>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>Ficha de aceptacion ${escaparHtml(ficha.codigo)}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #253244; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; }
          main { width: 100%; }
          header { display: grid; justify-items: center; gap: 6px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #cbd5df; text-align: center; }
          h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
          h4 { margin: 16px 0 8px; font-size: 13px; }
          p, strong, span { font-size: 12px; line-height: 1.5; }
          p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <main>
          <header>
            <h3>COLEGIO MATEMATICO SAN RAFAEL</h3>
            <strong>Ficha de aceptacion del programa extracurricular</strong>
            <span>Carabayllo, ${escaparHtml(ficha.fecha)}</span>
            <span>Código de inscripcion: ${escaparHtml(ficha.codigo)}</span>
          </header>
          <p>Por medio de la presente, se deja constancia de que el padre o apoderado acepta la inscripcion del estudiante en el programa indicado, de acuerdo con las condiciones establecidas por la institución.</p>
          ${bloquesHtml}
          <h4>Aceptación</h4>
          <p>El padre o apoderado declara haber leído y aceptado las condiciones del programa. Esta ficha sera presentada en Cajera para continuar con el proceso de pago.</p>
          <p><strong>Observación:</strong> ${escaparHtml(ficha.observacion)}</p>
        </main>
      </body>
    </html>
  `;
}

function obtenerFilasCambridgeFicha(ficha) {
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

export function descargarFichaPdf(ficha) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margen = 18;
  const anchoTexto = 174;
  let y = 16;

  // top brand accent bar
  doc.setFillColor(30, 58, 138); // brand primary dark blue #1E3A8A
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

  y = agregarBloquePdf(doc, "Datos del estudiante", [
    ["Nombre y apellido", ficha.estudiante.nombre],
    ["DNI", ficha.estudiante.dni],
    ["Grado", ficha.estudiante.grado],
    ["Sección", ficha.estudiante.seccion],
    ["Periodo", ficha.estudiante.periodo],
    ["Colegio de procedencia", ficha.estudiante.colegio],
  ], margen, y, anchoTexto);

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

  y = agregarBloquePdf(doc, "Datos del programa", filasPrograma, margen, y, anchoTexto);

  y = agregarBloquePdf(doc, "Datos del padre / apoderado", [
    ["Nombre del padre o apoderado", ficha.apoderado.nombre],
    ["Teléfono", ficha.apoderado.telefono],
  ], margen, y, anchoTexto);



  // Check signature block overflow
  if (y + 35 > 275) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate 800
  doc.text("Aceptación", margen, y);
  y += 5;

  y = agregarParrafoPdf(doc, "El padre o apoderado declara haber leído y aceptado las condiciones del programa. Esta ficha será presentada en Cajera para continuar con el proceso de pago.", margen, y, anchoTexto);
  y = agregarParrafoPdf(doc, `Observación: ${ficha.observacion}`, margen, y, anchoTexto);

  // Add parent signature block at the bottom
  if (y + 35 > 275) {
    doc.addPage();
    y = 20;
  } else {
    y += 10;
  }

  doc.setDrawColor(148, 163, 184); // slate 400
  doc.setLineWidth(0.4);
  const xFirmaAccept = 105 - 35; // centered line of 70mm
  doc.line(xFirmaAccept, y + 15, xFirmaAccept + 70, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate 600
  doc.text("Firma del Padre / Apoderado", 105, y + 20, { align: "center" });
  doc.text("DNI: _______________________", 105, y + 25, { align: "center" });

  doc.save(`ficha-aceptacion-${normalizarNombreArchivo(ficha.codigo)}.pdf`);
}

function limpiarPaginasDocxVacias(contenedor) {
  contenedor?.classList.remove("is-adapted");
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  paginas.forEach((pagina) => {
    const texto = pagina.textContent.replace(/\s+/g, "");
    const tieneContenidoVisual = pagina.querySelector("img, svg, canvas, table, picture");
    const altoContenido = pagina.scrollHeight;
    if (!texto && !tieneContenidoVisual) {
      pagina.remove();
      return;
    }

    if (texto.length < 3 && !tieneContenidoVisual && altoContenido < 80) {
      pagina.remove();
    }
  });
}

function compactarPaginasDocx(_contenedor, paginasConContenido) {
  if (paginasConContenido.length <= 1) return paginasConContenido;

  const paginaPrincipal = paginasConContenido[0];
  const contenidoPrincipal = paginaPrincipal.querySelector("article") || paginaPrincipal;

  paginasConContenido.slice(1).forEach((paginaExtra) => {
    const contenidoExtra = paginaExtra.querySelector("article") || paginaExtra;
    Array.from(contenidoExtra.childNodes).forEach((nodo) => {
      contenidoPrincipal.appendChild(nodo);
    });
    paginaExtra.remove();
  });

  return [paginaPrincipal];
}

function ajustarDocxAUnaPagina(pagina, contenido) {
  contenido.style.transform = "";
  contenido.style.transformOrigin = "";
  contenido.style.width = "";

  const altoPagina = pagina.getBoundingClientRect().height || 1122;
  const altoContenido = Math.max(contenido.scrollHeight || 0, pagina.scrollHeight || 0);
  if (!altoPagina || !altoContenido || altoContenido <= altoPagina) return;

  const escala = Math.max(0.68, Math.min(1, (altoPagina - 12) / altoContenido));
  contenido.style.transform = `scale(${escala})`;
  contenido.style.transformOrigin = "top left";
  contenido.style.width = `${100 / escala}%`;
  pagina.style.height = `${altoPagina}px`;
  pagina.style.overflow = "hidden";
}

function obtenerContenedorMarcaAgua(visual, pagina) {
  let actual = visual;
  while (actual.parentElement && actual.parentElement !== pagina) {
    const padre = actual.parentElement;
    if (padre.classList.contains("docx") || padre.tagName === "ARTICLE" || padre.tagName === "SECTION") break;
    const texto = padre.textContent.replace(/\s+/g, "").trim();
    const visuales = padre.querySelectorAll("img, svg, canvas, picture").length;
    if (texto || visuales > 1) break;
    actual = padre;
  }
  return actual;
}

function leerMedidaCss(elemento, propiedad) {
  const estilos = [
    elemento?.style?.getPropertyValue(propiedad),
    elemento?.getAttribute?.("style")?.match(new RegExp(`${propiedad}\\s*:\\s*([^;]+)`, "i"))?.[1],
  ].filter(Boolean);

  for (const valor of estilos) {
    const medida = convertirMedidaCssAPx(valor);
    if (medida) return medida;
  }
  return 0;
}

function convertirMedidaCssAPx(valor) {
  const match = String(valor || "").trim().match(/^(-?\d+(?:\.\d+)?)(px|pt|in|cm|mm)?$/i);
  if (!match) return 0;
  const numero = Number(match[1]);
  const unidad = (match[2] || "px").toLowerCase();
  if (!Number.isFinite(numero)) return 0;
  if (unidad === "pt") return numero * (96 / 72);
  if (unidad === "in") return numero * 96;
  if (unidad === "cm") return numero * (96 / 2.54);
  if (unidad === "mm") return numero * (96 / 25.4);
  return numero;
}

function paginaTieneContenidoDocx(pagina) {
  const texto = pagina.textContent.replace(/\s+/g, "").trim();
  const visuales = Array.from(pagina.querySelectorAll("img, svg, canvas, picture"));
  const tablasConContenido = Array.from(pagina.querySelectorAll("table")).some((tabla) =>
    tabla.textContent.replace(/\s+/g, "").trim().length > 0
  );

  return texto.length > 2 || tablasConContenido || visuales.length > 0;
}

function compactarDocumentoDocxParaImpresion(doc) {
  const root = doc.querySelector(".secretaria-word-print-root");
  if (!root) return;

  prepararVistaDocxParaImpresion(root);
  const wrapper = root.querySelector(".docx-wrapper");
  const pagina = root.querySelector(".docx");
  const contenido = pagina?.querySelector("article") || pagina;

  if (!wrapper || !pagina || !contenido) return;

  wrapper.style.height = "297mm";
  wrapper.style.minHeight = "297mm";
  wrapper.style.overflow = "hidden";
  pagina.style.height = "297mm";
  pagina.style.minHeight = "297mm";
  pagina.style.overflow = "hidden";
  ajustarDocxAUnaPagina(pagina, contenido);
}

function obtenerEstilosParaImpresion() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
}

function agregarBloquePdf(doc, titulo, items, x, y, anchoTexto) {
  if (!items || !items.length) return y;

  if (titulo) {
    // Check page overflow for block header
    if (y + 15 > 275) {
      doc.addPage();
      y = 20;
    }

    // Modern Left-Vertical brand accent bar
    doc.setFillColor(30, 58, 138); // brand primary dark blue #1E3A8A
    doc.rect(x, y, 2.5, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate 900
    doc.text(titulo.toUpperCase(), x + 5, y + 4.5);

    // Thin underline under header
    doc.setDrawColor(203, 213, 225); // slate 300
    doc.setLineWidth(0.35);
    doc.line(x, y + 6.5, x + anchoTexto, y + 6.5);
    y += 9.5;
  } else {
    // If no title, add a small spacing before the list/table
    y += 2;
  }

  items.forEach(([label, value]) => {
    const cleanVal = cleanFallbackText(value) || "-";
    const cleanLab = cleanFallbackText(label) || "-";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    const lineasValue = doc.splitTextToSize(String(cleanVal), 120);
    const lineasLabel = doc.splitTextToSize(String(cleanLab), 46);
    const numLineas = Math.max(lineasValue.length, lineasLabel.length);
    const altoFila = numLineas * 5 + 2;

    if (y + altoFila > 275) {
      doc.addPage();
      y = 20;

      // Draw continuation header with vertical accent bar
      doc.setFillColor(30, 58, 138);
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

    // Draw row cell divider (horizontal bottom line only)
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.setLineWidth(0.2);
    doc.line(x, y + altoFila, x + anchoTexto, y + altoFila);

    // Write label
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // slate 600 (slightly softer gray)
    doc.setFontSize(8.5);
    doc.text(lineasLabel, x + 2, y + 4);

    // Write value
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42); // slate 900
    doc.setFontSize(8.5);
    doc.text(lineasValue, x + 52, y + 4);

    y += altoFila;
  });

  return y + 5;
}

function agregarParrafoPdf(doc, texto, x, y, anchoTexto) {
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
