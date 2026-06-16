import { jsPDF } from "jspdf";
import { renderAsync } from "docx-preview";
import {
  cleanFallbackText,
  escaparHtml,
  normalizarNombreArchivo,
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

export function crearPdfInvitacionDocumento(documento) {
  const ficha = documento.ficha || {};
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
  doc.text(documento.titulo || "Ficha de invitación", 105, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate 500
  doc.text(`Carabayllo, ${ficha.fecha || ""}`, 105, y, { align: "center" });
  y += 4.5;
  doc.text(`Código de inscripción: ${ficha.codigo || ""}`, 105, y, { align: "center" });
  y += 6;
  doc.setDrawColor(203, 213, 225); // slate 300
  doc.setLineWidth(0.3);
  doc.line(margen, y, 210 - margen, y);
  y += 8;

  (documento.lineas || []).forEach((linea) => {
    y = agregarParrafoPdf(doc, linea, margen, y, anchoTexto);
  });

  y = agregarBloquePdf(doc, "", documento.resumen || [], margen, y, anchoTexto);

  // Add signature block at the bottom
  if (y + 35 > 275) {
    doc.addPage();
    y = 20;
  } else {
    y += 12;
  }

  doc.setDrawColor(148, 163, 184); // slate 400
  doc.setLineWidth(0.4);
  const xFirma = 105 - 35; // centered line of 70mm
  doc.line(xFirma, y + 15, xFirma + 70, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate 600
  doc.text("Firma del Padre / Apoderado", 105, y + 20, { align: "center" });
  doc.text("DNI: _______________________", 105, y + 25, { align: "center" });

  return doc;
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
