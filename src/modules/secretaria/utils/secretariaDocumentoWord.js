import JSZip from "jszip";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  base64ToArrayBuffer,
  crearDatosFicha,
  crearMapaVariablesDocumento,
  crearResumenInvitacion,
  escaparHtml,
  escaparRegExp,
  escaparXml,
  normalizarNombreArchivo,
} from "./secretariaFichaData";

export async function crearDocumentoInvitacion(estudiante, inscripcion) {
  const ficha = crearDatosFicha(estudiante, inscripcion);
  let lineas = [];
  let html = "";

  if (inscripcion.plantillaBase64) {
    try {
      const plantilla = await extraerPlantillaPersonalizada({
        estudiante,
        inscripcion,
      });
      lineas = plantilla.lineas;
      html = plantilla.html;
    } catch {
      lineas = [];
      html = "";
    }
  }

  if (!lineas.length) {
    lineas = crearLineasInvitacionDefault(ficha);
  }

  return {
    titulo: inscripcion.plantilla
      ? "Ficha de invitación personalizada"
      : "Ficha automática de inscripción al programa extracurricular",
    lineas,
    html,
    usaPlantilla: Boolean(html),
    resumen: crearResumenInvitacion(ficha),
    ficha,
  };
}

export async function descargarComunicadoWord({ estudiante, inscripcion }) {
  const blob = await generarComunicadoWordBlob({ estudiante, inscripcion });
  descargarBlob(blob, `comunicado-${normalizarNombreArchivo(inscripcion.nombresEstudiante)}-${normalizarNombreArchivo(inscripcion.programa)}.docx`);
}

export async function generarComunicadoWordBlob({ estudiante, inscripcion, omitirMarcaAguaVista = false }) {
  if (!inscripcion.plantillaBase64) {
    throw new Error("El programa no tiene una plantilla Word cargada por Coordinación.");
  }

  const datos = crearMapaVariablesDocumento(estudiante, inscripcion);
  try {
    const zipPlantilla = new PizZip(base64ToArrayBuffer(inscripcion.plantillaBase64));
    normalizarDelimitadoresPlantilla(zipPlantilla, datos);
    const doc = new Docxtemplater(zipPlantilla, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });
    doc.render(datos);
    if (omitirMarcaAguaVista) {
      removerMarcasAguaWord(doc.getZip());
    }
    return doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } catch {
    return generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista });
  }
}

async function extraerPlantillaPersonalizada({ estudiante, inscripcion }) {
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

function crearLineasInvitacionDefault(ficha) {
  return [
    `Estimado(a) apoderado(a) ${ficha.apoderado.nombre}:`,
    `Por medio de la presente, el Colegio Matemático San Rafael invita al estudiante ${ficha.estudiante.nombre}, del grado ${ficha.estudiante.grado} sección ${ficha.estudiante.seccion}, a participar en el programa extracurricular ${ficha.programa.nombre}.`,
    `El programa se desarrollará en el horario ${ficha.programa.horario}, bajo la responsabilidad de ${ficha.programa.responsable}.`,
    `El costo registrado es ${ficha.programa.costo}, con modalidad de cobro ${ficha.programa.modalidadCobro}.`,
    `Requisitos: ${ficha.programa.requisitos}. Uniforme requerido: ${ficha.programa.uniforme}.`,
    `Telefono de contacto del apoderado: ${ficha.apoderado.telefono}.`,
    `La inscripción queda registrada como ${ficha.programa.estado} y el pago queda ${ficha.programa.estadoPago}.`,
    ficha.observacion !== "Sin observación" ? `Observación: ${ficha.observacion}.` : "",
  ].filter(Boolean);
}

function extraerTextoPlanoDocx(xml) {
  return decodificarEntidadesXml(String(xml || "")
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<w:tab[^>]*\/>/gi, " ")
    .replace(/<w:br[^>]*\/>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function convertirDocxXmlAHtml(xml) {
  const body = String(xml || "").match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/i)?.[1] || String(xml || "");
  const bloques = body.match(/<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/gi) || [];

  return bloques.map((bloque) => {
    if (/^<w:tbl/i.test(bloque)) return convertirTablaDocxAHtml(bloque);
    return convertirParrafoDocxAHtml(bloque);
  }).join("");
}

function convertirParrafoDocxAHtml(parrafo) {
  const texto = extraerTextoPlanoDocx(parrafo);
  if (!texto) return "";
  const clases = ["secretaria-word-paragraph"];
  const alineacion = parrafo.match(/<w:jc[^>]+w:val="([^"]+)"/i)?.[1] || "";
  if (alineacion === "center") clases.push("is-center");
  if (alineacion === "right" || alineacion === "end") clases.push("is-right");
  if (alineacion === "both") clases.push("is-justify");
  const esTitulo = /<w:b\b/i.test(parrafo) && texto.length < 120;
  if (esTitulo) clases.push("is-bold");
  return `<p class="${clases.join(" ")}">${escaparHtml(texto)}</p>`;
}

function convertirTablaDocxAHtml(tabla) {
  const filas = tabla.match(/<w:tr[\s\S]*?<\/w:tr>/gi) || [];
  const filasHtml = filas.map((fila) => {
    const celdas = fila.match(/<w:tc[\s\S]*?<\/w:tc>/gi) || [];
    const celdasHtml = celdas.map((celda) => {
      const parrafos = celda.match(/<w:p[\s\S]*?<\/w:p>/gi) || [];
      const contenido = parrafos
        .map(convertirParrafoDocxAHtml)
        .join("") || "&nbsp;";
      return `<td>${contenido}</td>`;
    }).join("");
    return `<tr>${celdasHtml}</tr>`;
  }).join("");

  return filasHtml ? `<table class="secretaria-word-table"><tbody>${filasHtml}</tbody></table>` : "";
}

function decodificarEntidadesXml(valor) {
  return String(valor || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function reemplazarVariablesTexto(texto, datos) {
  return Object.entries(datos).reduce((actual, [variable, valor]) => {
    const seguro = String(valor ?? "");
    const patrones = [
      new RegExp(`\\{\\{\\s*${escaparRegExp(variable)}\\s*\\}\\}`, "gi"),
      new RegExp(`\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`\\[\\[\\s*${escaparRegExp(variable)}\\s*\\]\\]`, "gi"),
      new RegExp(`\\$\\{\\s*${escaparRegExp(variable)}\\s*\\}`, "gi"),
      new RegExp(`<<\\s*${escaparRegExp(variable)}\\s*>>`, "gi"),
    ];
    return patrones.reduce((textoActual, patron) => textoActual.replace(patron, seguro), actual);
  }, texto);
}

function dividirLineasDocumento(texto) {
  return String(texto || "")
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean);
}

function removerMarcasAguaWord(zip) {
  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((name) => {
      const file = zip.file(name);
      if (!file) return;
      const xml = file.asText();
      const limpio = quitarBloquesMarcaAguaWord(xml);
      if (limpio !== xml) zip.file(name, limpio);
    });
}

function quitarBloquesMarcaAguaWord(xml) {
  return String(xml || "").replace(/<w:pict\b[^>]*>[\s\S]*?<\/w:pict>/gi, (bloque) => (
    bloque.includes("WordPictureWatermark") ? "" : bloque
  ));
}

async function generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista = false }) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(inscripcion.plantillaBase64));
  const archivosXml = Object.values(zip.files).filter((file) =>
    /^word\/(document|header|footer)\d*\.xml$/i.test(file.name)
  );

  await Promise.all(archivosXml.map(async (file) => {
    const xml = await file.async("text");
    const reemplazado = reemplazarVariablesXml(xml, datos);
    zip.file(file.name, omitirMarcaAguaVista ? quitarBloquesMarcaAguaWord(reemplazado) : reemplazado);
  }));

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function normalizarDelimitadoresPlantilla(zip, datos) {
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
      const xml = file.asText();
      const normalizado = patrones.reduce(
        (actual, patron) => actual.replace(patron, (_match, variable) => `{${variable}}`),
        xml
      );
      zip.file(name, normalizado);
    });
}

function reemplazarVariablesXml(xml, datos) {
  return Object.entries(datos).reduce((actual, [variable, valor]) => {
    const seguro = escaparXml(valor);
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

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
