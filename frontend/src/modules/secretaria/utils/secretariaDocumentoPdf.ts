import { renderAsync } from "docx-preview";
import {
  cleanFallbackText,
  escaparHtml,
  normalizarNombreArchivo,
  formatearNivelesDocumento,
  formatearRangoHoraDocumento,
  agruparGradosConsecutivos,
} from "./secretariaFichaData";
import {
  crearPdfInvitacionDocumento,
  descargarFichaPdf,
  obtenerFilasCambridgeFicha,
} from "./secretariaDocumentoPdfDrawing";

export { crearPdfInvitacionDocumento, descargarFichaPdf };

export function prepararVistaDocxParaImpresion(contenedor: HTMLElement) {
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  if (!paginas.length) return;

  const paginasConContenido = compactarPaginasDocx(contenedor, paginas.filter(paginaTieneContenidoDocx));
  paginas
    .filter((pagina) => !paginasConContenido.includes(pagina))
    .forEach((pagina) => (pagina as HTMLElement).remove());

  paginasConContenido.forEach((pagina: any) => {
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

export function normalizarMarcasAguaDocx(contenedor: HTMLElement) {
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  paginas.forEach((pagina: any) => {
    const rectPagina = pagina.getBoundingClientRect();
    const anchoPagina = rectPagina.width || leerMedidaCss(pagina, "width") || 794;
    const altoPagina = rectPagina.height || leerMedidaCss(pagina, "height") || 1123;
    const visuales = Array.from(pagina.querySelectorAll("img, svg"));

    visuales.forEach((visual: any) => {
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
    Array.from(contenido.children).forEach((hijo: any) => {
      if (
        hijo.classList.contains("secretaria-docx-watermark") ||
        hijo.classList.contains("secretaria-docx-watermark-holder")
      ) return;
      hijo.style.position = hijo.style.position || "relative";
      hijo.style.zIndex = hijo.style.zIndex || "1";
    });
  });
}

export async function crearUrlPdfInvitacion(documento: any): Promise<string> {
  const doc = await crearPdfInvitacionDocumento(documento);
  return doc.output("bloburl") as any;
}

export async function convertirWordOriginalAPdf(wordBlob: Blob) {
  const formData = new FormData();
  formData.append("archivo", wordBlob, "documento.docx");

  const response = await fetch("/api/secretaria/documentos/pdf", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Fallo en la conversión de documento DOCX a PDF.");
  return response.blob();
}

export function imprimirPdfBlob(pdfBlob: Blob) {
  const url = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow?.focus();

    const cleanup = () => {
      try {
        document.body.removeChild(iframe);
      } catch (e) {
        // already removed
      }
      URL.revokeObjectURL(url);
    };

    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = cleanup;
    }

    iframe.contentWindow?.print();

    // Fallback: wait 60s in case onafterprint doesn't fire
    setTimeout(cleanup, 60000);
  };
}

export async function imprimirWordRenderizado(wordBlob: Blob) {
  const docxContainer = document.createElement("div");
  docxContainer.className = "secretaria-word-print-container";
  docxContainer.style.position = "fixed";
  docxContainer.style.top = "-9999px";
  docxContainer.style.left = "-9999px";
  docxContainer.style.width = "210mm";
  docxContainer.style.background = "#fff";
  document.body.appendChild(docxContainer);

  try {
    await renderAsync(wordBlob, docxContainer);
    limpiarPaginasDocxVacias(docxContainer);
    prepararVistaDocxParaImpresion(docxContainer);

    const html = docxContainer.innerHTML;
    await imprimirHtmlRenderizado(html);
  } finally {
    document.body.removeChild(docxContainer);
  }
}

export function imprimirHtmlRenderizado(html: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
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

      const cleanup = () => {
        try {
          iframe.remove();
        } catch (e) {
          // already removed
        }
        resolve();
      };

      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = cleanup;
      }

      iframe.contentWindow?.print();

      // Fallback: wait 60s in case onafterprint doesn't fire
      setTimeout(cleanup, 60000);
    }, 350);
  });
}

export function crearHtmlImpresionFicha(ficha: any) {
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
      <h4 style="margin: 0 0 8px; font-size: 13px; color: #14532d; border-bottom: 2px solid #14532d; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${escaparHtml(titulo)}</h4>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px;">
        <tbody>
          ${(items as any[]).map(([label, value]) => {
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
        <title>Ficha de aceptación ${escaparHtml(ficha.codigo)}</title>
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
            <h3>COLEGIO MATEMÁTICO SAN RAFAEL</h3>
            <strong>Ficha de aceptación del programa extracurricular</strong>
            <span>Carabayllo, ${escaparHtml(ficha.fecha)}</span>
            <span>Código de inscripción: ${escaparHtml(ficha.codigo)}</span>
          </header>
          <p>Por medio de la presente, se deja constancia de que el padre o apoderado acepta la inscripción del estudiante en el programa indicado, de acuerdo con las condiciones establecidas por la institución.</p>
          ${bloquesHtml}
          <h4>Aceptación</h4>
          <p>El padre o apoderado declara haber leído y aceptado las condiciones del programa. Esta ficha será presentada en Cajera para continuar con el proceso de pago.</p>
          <p><strong>Observación:</strong> ${escaparHtml(ficha.observacion)}</p>
        </main>
      </body>
    </html>
  `;
}

function limpiarPaginasDocxVacias(contenedor: HTMLElement) {
  contenedor?.classList.remove("is-adapted");
  const paginas = Array.from(contenedor?.querySelectorAll(".docx") || []);
  paginas.forEach((pagina: any) => {
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

function compactarPaginasDocx(_contenedor: HTMLElement, paginasConContenido: any[]) {
  if (paginasConContenido.length <= 1) return paginasConContenido;

  const paginaPrincipal = paginasConContenido[0];
  const contenidoPrincipal = paginaPrincipal.querySelector("article") || paginaPrincipal;

  paginasConContenido.slice(1).forEach((paginaExtra) => {
    const contenidoExtra = paginaExtra.querySelector("article") || paginaExtra;
    Array.from(contenidoExtra.childNodes).forEach((nodo: any) => {
      contenidoPrincipal.appendChild(nodo);
    });
    paginaExtra.remove();
  });

  return [paginaPrincipal];
}

function ajustarDocxAUnaPagina(pagina: any, contenido: any) {
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

function obtenerContenedorMarcaAgua(visual: any, pagina: any) {
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

function leerMedidaCss(elemento: any, propiedad: string) {
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

function convertirMedidaCssAPx(valor: any) {
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

function paginaTieneContenidoDocx(pagina: any) {
  const texto = pagina.textContent.replace(/\s+/g, "").trim();
  const visuales = Array.from(pagina.querySelectorAll("img, svg, canvas, picture"));
  const tablasConContenido = Array.from(pagina.querySelectorAll("table")).some((tabla: any) =>
    tabla.textContent.replace(/\s+/g, "").trim().length > 0
  );

  return texto.length > 2 || tablasConContenido || visuales.length > 0;
}

function compactarDocumentoDocxParaImpresion(doc: any) {
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
