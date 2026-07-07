import JSZip from "jszip";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  base64ToArrayBuffer,
  crearMapaVariablesDocumento,
  escaparHtml,
  escaparRegExp,
} from "./secretariaFichaData";

export { base64ToArrayBuffer, crearMapaVariablesDocumento, escaparHtml, escaparRegExp };

export function obtenerDelimitadoresPlantilla(zip: any) {
  const usaLlavesDobles = Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .some((name) => /\{\{\s*[^{}]+\s*\}\}/.test(extraerTextoPlanoDocx(zip.file(name)?.asText())));

  return usaLlavesDobles ? { start: "{{", end: "}}" } : null;
}

export async function extraerPlantillaPersonalizada({ estudiante, inscripcion }: any) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(inscripcion.plantillaBase64));
  const datos = crearMapaVariablesDocumento(estudiante, inscripcion);
  const archivosXml = Object.values(zip.files)
    .filter((file) => /^word\/(document|header|footer)\d*\.xml$/i.test(file.name))
    .sort((a, b) => Number(a.name !== "word/document.xml") - Number(b.name !== "word/document.xml"));
  const textos = await Promise.all(archivosXml.map(async (file) =>
    extraerTextoPlanoDocx(await file.async("text"))
  ));
  const htmls = await Promise.all(archivosXml.map(async (file) =>
    convertirDocxXmlAHtml(reemplazarVariablesXml(await file.async("text"), datos))
  ));
  const textoPersonalizado = reemplazarVariablesTexto(textos.join("\n"), datos);
  return {
    lineas: dividirLineasDocumento(textoPersonalizado),
    html: htmls.join(""),
  };
}

export function crearLineasInvitacionDefault(ficha: any) {
  const lineas = [];
  const tieneUniforme = ficha.programa.uniforme === "Sí" || ficha.programa.uniforme === "Si";
  const uniformeStr = tieneUniforme ? ` Asimismo, se requiere el uso de uniforme (Talla: ${ficha.programa.talla || 'Por definir'}).` : "";
  const requisitosStr = ficha.programa.requisitos && ficha.programa.requisitos !== "Sin requisitos adicionales"
    ? ` Para la participación, se solicita cumplir con los siguientes requisitos: ${ficha.programa.requisitos}.`
    : "";

  lineas.push(`COMUNICADO OFICIAL`);
  lineas.push(`Estimado(a) apoderado(a) ${ficha.apoderado.nombre || ''}:`);

  lineas.push(`Reciba un cordial saludo a nombre del Colegio Matemático San Rafael. Por medio del presente documento, nos complace invitar a su menor hijo(a) ${ficha.estudiante.nombre}, del grado ${ficha.estudiante.grado} sección ${ficha.estudiante.seccion}, a participar en nuestra actividad extracurricular: ${ficha.programa.nombre.toUpperCase()}.`);

  lineas.push(`Este programa tiene como propósito complementar la formación integral de nuestros alumnos. Las sesiones se desarrollarán en el horario de ${ficha.programa.horario || 'Por confirmar'}, y estarán bajo la responsabilidad de ${ficha.programa.responsable || 'Coordinación Académica'}.`);

  let costoTexto = `La inversión para este programa es de ${ficha.programa.costo || 'S/ 0.00'}`;
  if (ficha.programa.modalidadCobro) {
    costoTexto += ` bajo la modalidad de pago ${ficha.programa.modalidadCobro.toLowerCase() === 'unico' ? 'único' : ficha.programa.modalidadCobro.toLowerCase()}`;
  }
  costoTexto += `.${requisitosStr}${uniformeStr}`;
  lineas.push(costoTexto);

  lineas.push(`Agradecemos de antemano su confianza y apoyo constante en las actividades de nuestra institución educativa.`);

  if (ficha.observacion && ficha.observacion !== "Sin observación") {
    lineas.push(`Observación adicional: ${ficha.observacion}`);
  }

  return lineas;
}

export function extraerTextoPlanoDocx(xml: any) {
  return decodificarEntidadesXml(String(xml || "")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<w:tab[^>]*\/>/gi, " ")
    .replace(/<w:br[^>]*\/>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

export function convertirDocxXmlAHtml(xml: string) {
  const body = String(xml || "").match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/i)?.[1] || String(xml || "");
  const bloques = body.match(/<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/gi) || [];

  return bloques.map((bloque) => {
    if (/^<w:tbl/i.test(bloque)) return convertirTablaDocxAHtml(bloque);
    return convertirParrafoDocxAHtml(bloque);
  }).join("");
}

export function convertirParrafoDocxAHtml(parrafo: string) {
  const texto = extraerTextoPlanoDocx(parrafo);
  if (!texto) return "";
  const clases = ["secretaria-word-paragraph"];
  const alineacion = parrafo.match(/<w:jc[^>]+w:val="([^"]+)"/i)?.[1] || "";
  if (alineacion === "center") clases.push("is-center");
  if (alineacion === "right") clases.push("is-right");
  if (alineacion === "both") clases.push("is-justify");

  const pareceTitulo = parrafo.includes('<w:b/>') && texto.length < 120 && !texto.endsWith(".");
  if (pareceTitulo) clases.push("is-bold-title");

  return `<p class="${clases.join(" ")}">${escaparHtml(texto)}</p>`;
}

export function convertirTablaDocxAHtml(tabla: string) {
  const filas = tabla.match(/<w:tr[\s\S]*?<\/w:tr>/gi) || [];
  const filasHtml = filas.map((fila) => {
    const celdas = fila.match(/<w:tc[\s\S]*?<\/w:tc>/gi) || [];
    const celdasHtml = celdas.map((celda) => {
      const texto = extraerTextoPlanoDocx(celda);
      const esHeader = celda.includes('<w:shd') || celda.includes('<w:b/>');
      const tag = esHeader ? "th" : "td";
      return `<${tag} style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px;">${escaparHtml(texto)}</${tag}>`;
    }).join("");
    return `<tr style="border-bottom: 1px solid #e2e8f0;">${celdasHtml}</tr>`;
  }).join("");

  return `
    <div style="margin: 15px 0; overflow-x: auto; width: 100%;">
      <table style="width: 100%; border-collapse: collapse; margin: 0 auto; text-align: left;">
        <tbody>${filasHtml}</tbody>
      </table>
    </div>
  `;
}

export function decodificarEntidadesXml(texto: string) {
  return String(texto || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function reemplazarVariablesXml(xml: string, datos: any) {
  return Object.entries(datos).reduce((actual: string, [variable, valor]) => {
    const seguro = escaparHtml(valor);
    const patrones = [
      new RegExp(`\\{\\{\\s*${escaparRegExp(variable)}\\s*\\}\\}`, "gi"),
      new RegExp(`\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`\\[\\[\\s*${escaparRegExp(variable)}\\s*\\]\\]`, "gi"),
      new RegExp(`\\$\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`&lt;&lt;\\s*${escaparRegExp(variable)}\\s*&gt;&gt;`, "gi"),
    ];
    return patrones.reduce((texto, patron) => texto.replace(patron, seguro), actual);
  }, xml);
}

export function reemplazarVariablesTexto(texto: string, datos: any) {
  return Object.entries(datos).reduce((actual: string, [variable, valor]) => {
    const seguro = String(valor == null ? "" : valor).trim();
    const patrones = [
      new RegExp(`\\{\\{\\s*${escaparRegExp(variable)}\\s*\\}\\}`, "gi"),
      new RegExp(`\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`\\[\\[\\s*${escaparRegExp(variable)}\\s*\\]\\]`, "gi"),
      new RegExp(`\\$\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
    ];
    return patrones.reduce((txt, patron) => txt.replace(patron, seguro), actual);
  }, texto);
}

export function dividirLineasDocumento(texto: string) {
  return String(texto || "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

export function suavizarMarcasAguaWord(zip: any) {
  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((name) => {
      const file = zip.file(name);
      if (!file) return;
      let xml = file.asText();
      xml = xml.replace(/(<w:pict\b[\s\S]*?opacity=")([^"]+)(")/gi, '$10.08$3');
      xml = xml.replace(/(<v:imagedata\b[\s\S]*?gain=")([^"]+)(")/gi, '$10.08$3');
      zip.file(name, xml);
    });
}

export function removerMarcasAguaWord(zip: any) {
  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((name) => {
      const file = zip.file(name);
      if (!file) return;
      let xml = file.asText();
      xml = xml.replace(/<w:pict\b[\s\S]*?<\/w:pict>/gi, "");
      xml = xml.replace(/<v:imagedata\b[\s\S]*?\/>/gi, "");
      zip.file(name, xml);
    });
}

export function normalizarDelimitadoresPlantilla(zip: any, datos: any) {
  const variables = Object.keys(datos).map(escaparRegExp).join("|");
  if (!variables) return;

  const patrones = [
    new RegExp(`\\{\\{\\s*(${variables})\\s*\\}\\}`, "gi"),
    new RegExp(`\\[\\[\\s*(${variables})\\s*\\]\\]`, "gi"),
    new RegExp(`\\$\\{\\s*(${variables})\\s*\\}`, "gi"),
    new RegExp(`&lt;&lt;\\s*(${variables})\\s*&gt;&gt;`, "gi"),
  ];

  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((name) => {
      const file = zip.file(name);
      if (!file) return;
      const xml = file.asText();
      const normalizado = patrones.reduce(
        (actual, patron) => actual.replace(patron, (_match, variable) => `{${variable}}`),
        xml
      );
      zip.file(name, normalizado);
    });
}

export function generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista }: any) {
  const zip = new PizZip(base64ToArrayBuffer(inscripcion.plantillaBase64));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(datos);
  if (omitirMarcaAguaVista) {
    removerMarcasAguaWord(doc.getZip());
  } else {
    suavizarMarcasAguaWord(doc.getZip());
  }
  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export async function suavizarImagenesMarcaAguaDocx(wordBlob: Blob): Promise<Blob> {
  if (typeof Image === "undefined" || typeof document === "undefined") return wordBlob;
  try {
    const zip = await JSZip.loadAsync(wordBlob);
    const relaciones = analizarRelacionesMarcaAgua(zip);
    if (relaciones.length === 0) return wordBlob;

    asegurarContentTypePng(zip);
    const promesas = relaciones.map(async ({ relsPath, relId, mediaPath, pngPath, targetNuevo }) => {
      const file = zip.file(mediaPath);
      if (!file) return;
      const blobOriginal = await file.async("blob");
      const blobNuevo = await convertirImagenMarcaAgua(blobOriginal);
      if (!blobNuevo) return;

      zip.file(pngPath, blobNuevo);
      const relsFile = zip.file(relsPath);
      if (!relsFile) return;
      const xmlNuevo = actualizarTargetRelacion(await relsFile.async("text"), relId, targetNuevo);
      zip.file(relsPath, xmlNuevo);
    });

    await Promise.all(promesas);
    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } catch {
    return wordBlob;
  }
}

function analizarRelacionesMarcaAgua(zip: any) {
  const objetivos: any[] = [];
  const vistos = new Set();

  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((xmlPath) => {
      const relsPath = obtenerRutaRelaciones(xmlPath);
      const relsFile = zip.file(relsPath);
      if (!relsFile) return;
      const relsXml = relsFile.asText();

      const xmlFile = zip.file(xmlPath);
      if (!xmlFile) return;
      const xml = xmlFile.asText();

      const ids = [
        ...xml.matchAll(/<v:imagedata\b[^>]*\br:id="([^"]+)"/gi),
        ...xml.matchAll(/<w:drawing\b[\s\S]*?<a:blip\b[^>]*\br:embed="([^"]+)"/gi)
      ].map((match) => match[1]);

      ids.forEach((relId) => {
        const targetOriginal = obtenerTargetRelacion(relsXml, relId);
        if (!targetOriginal || /^https?:|^file:/i.test(targetOriginal)) return;
        const mediaPath = normalizarRutaZip(`${obtenerDirectorio(xmlPath)}/${targetOriginal}`);
        if (!/^word\/media\//i.test(mediaPath) || !zip.file(mediaPath)) return;
        const pngPath = mediaPath.replace(/\.[^.\/]+$/i, "-watermark.png");
        const targetNuevo = calcularTargetRelativo(obtenerDirectorio(xmlPath), pngPath);
        const clave = `${relsPath}:${relId}:${mediaPath}`;
        if (vistos.has(clave)) return;
        vistos.add(clave);
        objetivos.push({ relsPath, relId, mediaPath, pngPath, targetOriginal, targetNuevo });
      });
    });
  return objetivos;
}

function obtenerRutaRelaciones(xmlPath: string) {
  const directorio = obtenerDirectorio(xmlPath);
  const archivo = xmlPath.split("/").pop();
  return `${directorio}/_rels/${archivo}.rels`;
}

function obtenerTargetRelacion(relsXml: string, relId: string) {
  const patron = new RegExp(`<Relationship\\b[^>]*\\bId="${escaparRegExp(relId)}"[^>]*>`, "i");
  const match = String(relsXml || "").match(patron);
  return match?.[0]?.match(/\bTarget="([^"]+)"/i)?.[1] || "";
}

function actualizarTargetRelacion(relsXml: string, relId: string, targetNuevo: string) {
  const patron = new RegExp(`(<Relationship\\b[^>]*\\bId="${escaparRegExp(relId)}"[^>]*\\bTarget=")([^"]+)(")`, "i");
  return String(relsXml || "").replace(patron, `$1${targetNuevo}$3`);
}

function obtenerDirectorio(ruta: string) {
  return String(ruta || "").split("/").slice(0, -1).join("/") || ".";
}

function normalizarRutaZip(ruta: string) {
  const partes: string[] = [];
  String(ruta || "").split("/").forEach((parte) => {
    if (!parte || parte === ".") return;
    if (parte === "..") partes.pop();
    else partes.push(parte);
  });
  return partes.join("/");
}

function calcularTargetRelativo(directorioBase: string, destino: string) {
  const base = normalizarRutaZip(directorioBase);
  const ruta = normalizarRutaZip(destino);
  if (ruta.startsWith(`${base}/`)) return ruta.slice(base.length + 1);
  return ruta;
}

async function convertirImagenMarcaAgua(blob: Blob): Promise<Blob | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") return null;
  const url = URL.createObjectURL(blob);
  try {
    const imagen: any = await cargarImagen(url);
    const canvas = document.createElement("canvas");
    canvas.width = imagen.naturalWidth || imagen.width;
    canvas.height = imagen.naturalHeight || imagen.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !canvas.width || !canvas.height) return null;

    ctx.drawImage(imagen, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gris = Math.round((data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114));
      data[i] = gris;
      data[i + 1] = gris;
      data[i + 2] = gris;
      data[i + 3] = Math.round(data[i + 3] * 0.08);
    }
    ctx.putImageData(imageData, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cargarImagen(url: string) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = reject;
    imagen.src = url;
  });
}

function asegurarContentTypePng(zip: any) {
  const file = zip.file("[Content_Types].xml");
  if (!file) return;
  const xml = file.asText();
  if (/<Default\b[^>]*Extension="png"/i.test(xml)) return;
  zip.file("[Content_Types].xml", xml.replace(
    "</Types>",
    '<Default Extension="png" ContentType="image/png"/></Types>'
  ));
}

export function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
