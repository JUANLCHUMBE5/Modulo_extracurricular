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
  procesarTextoComunicado,
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
    const textoBruto = inscripcion.comunicado || inscripcion.comunicadoCompleto;
    if (textoBruto) {
      const textoProcesado = procesarTextoComunicado(textoBruto, estudiante, inscripcion);
      lineas = textoProcesado
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\n/g, " ").trim())
        .filter(Boolean);
    } else {
      lineas = crearLineasInvitacionDefault(ficha);
    }
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
    const delimitadores = obtenerDelimitadoresPlantilla(zipPlantilla);
    if (!delimitadores) normalizarDelimitadoresPlantilla(zipPlantilla, datos);
    const doc = new Docxtemplater(zipPlantilla, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      ...(delimitadores ? { delimiters: delimitadores } : {}),
    });
    doc.render(datos);
    if (omitirMarcaAguaVista) {
      removerMarcasAguaWord(doc.getZip());
    } else {
      suavizarMarcasAguaWord(doc.getZip());
    }
    const blob = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    return omitirMarcaAguaVista ? blob : await suavizarImagenesMarcaAguaDocx(blob);
  } catch {
    return generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista });
  }
}

function obtenerDelimitadoresPlantilla(zip) {
  const usaLlavesDobles = Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .some((name) => /\{\{\s*[^{}]+\s*\}\}/.test(extraerTextoPlanoDocx(zip.file(name)?.asText())));

  return usaLlavesDobles ? { start: "{{", end: "}}" } : null;
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
  const tieneUniforme = ficha.programa.uniforme === "Sí" || ficha.programa.uniforme === "Si";
  const lineaUniforme = tieneUniforme ? `. Uniforme requerido: Sí (Talla: ${ficha.programa.talla})` : "";

  return [
    `Estimado(a) apoderado(a) ${ficha.apoderado.nombre}:`,
    `Por medio de la presente, el Colegio Matemático San Rafael invita al estudiante ${ficha.estudiante.nombre}, del grado ${ficha.estudiante.grado} sección ${ficha.estudiante.seccion}, a participar en el programa extracurricular ${ficha.programa.nombre}.`,
    `El programa se desarrollará en el horario ${ficha.programa.horario}, bajo la responsabilidad de ${ficha.programa.responsable}.`,
    `El costo registrado es ${ficha.programa.costo}, con modalidad de cobro ${ficha.programa.modalidadCobro}.`,
    `Requisitos: ${ficha.programa.requisitos}${lineaUniforme}.`,
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

function suavizarMarcasAguaWord(zip) {
  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((name) => {
      const file = zip.file(name);
      if (!file) return;
      const xml = file.asText();
      const ajustado = suavizarBloquesMarcaAguaWord(xml);
      if (ajustado !== xml) zip.file(name, ajustado);
    });
}

function suavizarBloquesMarcaAguaWord(xml) {
  return String(xml || "").replace(/<w:pict\b[^>]*>[\s\S]*?<\/w:pict>/gi, (bloque) => {
    if (!bloque.includes("WordPictureWatermark")) return bloque;
    return aplicarMarcaAguaSuave(bloque);
  });
}

function aplicarMarcaAguaSuave(bloque) {
  return bloque
    .replace(/<v:shape\b([^>]*)>/gi, (_match, atributos) => (
      `<v:shape${asegurarAtributoEstiloVml(atributos, [
        ["opacity", "0.08"],
        ["mso-opacity", "8%"],
      ])}>`
    ))
    .replace(/<v:imagedata\b([^>]*?)\/>/gi, (_match, atributos) => {
      let nuevos = atributos;
      if (!/\sgrayscale=/i.test(nuevos)) nuevos += ' grayscale="t"';
      if (!/\sgain=/i.test(nuevos)) nuevos += ' gain="0.35"';
      if (!/\sblacklevel=/i.test(nuevos)) nuevos += ' blacklevel="0.30"';
      return `<v:imagedata${nuevos}/>`;
    });
}

function asegurarAtributoEstiloVml(atributos, reglas) {
  const matchStyle = atributos.match(/\sstyle="([^"]*)"/i);
  if (!matchStyle) {
    const estilo = reglas.map(([propiedad, valor]) => `${propiedad}:${valor}`).join(";");
    return `${atributos} style="${estilo}"`;
  }

  const estiloNuevo = reglas.reduce((actual, [propiedad, valor]) => {
    const patron = new RegExp(`(^|;)\\s*${escaparRegExp(propiedad)}\\s*:[^;]*`, "i");
    if (patron.test(actual)) return actual.replace(patron, `$1${propiedad}:${valor}`);
    return `${actual.replace(/;?\s*$/, "")};${propiedad}:${valor}`;
  }, matchStyle[1]);

  return atributos.replace(matchStyle[0], ` style="${estiloNuevo}"`);
}

async function generarComunicadoWordBlobLegacy({ datos, inscripcion, omitirMarcaAguaVista = false }) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(inscripcion.plantillaBase64));
  const archivosXml = Object.values(zip.files).filter((file) =>
    /^word\/(document|header|footer)\d*\.xml$/i.test(file.name)
  );

  await Promise.all(archivosXml.map(async (file) => {
    const xml = await file.async("text");
    const reemplazado = reemplazarVariablesXml(xml, datos);
    zip.file(file.name, omitirMarcaAguaVista ? quitarBloquesMarcaAguaWord(reemplazado) : suavizarBloquesMarcaAguaWord(reemplazado));
  }));

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return omitirMarcaAguaVista ? blob : await suavizarImagenesMarcaAguaDocx(blob);
}

async function suavizarImagenesMarcaAguaDocx(blob) {
  try {
    const zip = await JSZip.loadAsync(blob);
    const objetivos = obtenerObjetivosImagenMarcaAgua(zip);
    if (!objetivos.length) return blob;

    await Promise.all(objetivos.map(async (objetivo) => {
      const file = zip.file(objetivo.mediaPath);
      if (!file) return;
      const imagenOriginal = await file.async("blob");
      const imagenSuave = await convertirImagenMarcaAgua(imagenOriginal);
      if (!imagenSuave) return;

      zip.file(objetivo.pngPath, imagenSuave);
      if (objetivo.relsPath && objetivo.targetOriginal !== objetivo.targetNuevo) {
        const relsFile = zip.file(objetivo.relsPath);
        if (relsFile) {
          const relsXml = await relsFile.async("text");
          zip.file(objetivo.relsPath, actualizarTargetRelacion(relsXml, objetivo.relId, objetivo.targetNuevo));
        }
      }
    }));

    asegurarContentTypePng(zip);
    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  } catch {
    return blob;
  }
}

function obtenerObjetivosImagenMarcaAgua(zip) {
  const objetivos = [];
  const vistos = new Set();
  Object.keys(zip.files)
    .filter((name) => /^word\/(document|header|footer)\d*\.xml$/i.test(name))
    .forEach((xmlPath) => {
      const file = zip.file(xmlPath);
      if (!file) return;
      const xml = file.asText();
      const bloques = xml.match(/<w:pict\b[^>]*>[\s\S]*?<\/w:pict>/gi) || [];
      const ids = new Set();
      bloques
        .filter((bloque) => bloque.includes("WordPictureWatermark"))
        .forEach((bloque) => {
          Array.from(bloque.matchAll(/(?:r:id|o:relid)="([^"]+)"/gi))
            .forEach((match) => ids.add(match[1]));
        });
      if (!ids.size) return;

      const relsPath = obtenerRutaRelaciones(xmlPath);
      const relsFile = zip.file(relsPath);
      if (!relsFile) return;
      const relsXml = relsFile.asText();
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

function obtenerRutaRelaciones(xmlPath) {
  const directorio = obtenerDirectorio(xmlPath);
  const archivo = xmlPath.split("/").pop();
  return `${directorio}/_rels/${archivo}.rels`;
}

function obtenerTargetRelacion(relsXml, relId) {
  const patron = new RegExp(`<Relationship\\b[^>]*\\bId="${escaparRegExp(relId)}"[^>]*>`, "i");
  const match = String(relsXml || "").match(patron);
  return match?.[0]?.match(/\bTarget="([^"]+)"/i)?.[1] || "";
}

function actualizarTargetRelacion(relsXml, relId, targetNuevo) {
  const patron = new RegExp(`(<Relationship\\b[^>]*\\bId="${escaparRegExp(relId)}"[^>]*\\bTarget=")([^"]+)(")`, "i");
  return String(relsXml || "").replace(patron, `$1${targetNuevo}$3`);
}

function obtenerDirectorio(ruta) {
  return String(ruta || "").split("/").slice(0, -1).join("/") || ".";
}

function normalizarRutaZip(ruta) {
  const partes = [];
  String(ruta || "").split("/").forEach((parte) => {
    if (!parte || parte === ".") return;
    if (parte === "..") partes.pop();
    else partes.push(parte);
  });
  return partes.join("/");
}

function calcularTargetRelativo(directorioBase, destino) {
  const base = normalizarRutaZip(directorioBase);
  const ruta = normalizarRutaZip(destino);
  if (ruta.startsWith(`${base}/`)) return ruta.slice(base.length + 1);
  return ruta;
}

async function convertirImagenMarcaAgua(blob) {
  if (typeof Image === "undefined" || typeof document === "undefined") return null;
  const url = URL.createObjectURL(blob);
  try {
    const imagen = await cargarImagen(url);
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

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = reject;
    imagen.src = url;
  });
}

function asegurarContentTypePng(zip) {
  const file = zip.file("[Content_Types].xml");
  if (!file) return;
  const xml = file.asText();
  if (/<Default\b[^>]*Extension="png"/i.test(xml)) return;
  zip.file("[Content_Types].xml", xml.replace(
    "</Types>",
    '<Default Extension="png" ContentType="image/png"/></Types>'
  ));
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
