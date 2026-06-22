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
  formatearNivelesDocumento,
  formatearRangoHoraDocumento,
  agruparGradosConsecutivos,
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
    const esEspecial = inscripcion.tipoComunicado && inscripcion.tipoComunicado !== "Otro genérico";
    if (esEspecial) {
      lineas = crearLineasInvitacionEspecial(ficha, inscripcion, estudiante);
    } else {
       const textoBruto = inscripcion.comunicado || inscripcion.comunicadoCompleto;
       const normalizar = (str) => String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
       const textoNorm = normalizar(textoBruto);
       const esTextoDefaultAntiguo = textoNorm && (
         textoNorm.includes("inscripcion queda registrada como") ||
         textoNorm.includes("telefono de contacto del apoderado") ||
         textoNorm.includes("invita al estudiante") ||
         textoNorm.includes("ficha automatica de inscripcion")
       );

      if (textoBruto && !esTextoDefaultAntiguo) {
        const textoProcesado = procesarTextoComunicado(textoBruto, estudiante, inscripcion);
        lineas = textoProcesado
          .split(/\n\s*\n/)
          .map((p) => p.replace(/\n/g, " ").trim())
          .filter(Boolean);
      } else {
        lineas = crearLineasInvitacionDefault(ficha);
      }
    }
  }

  return {
    titulo: inscripcion.plantilla
      ? "Ficha de invitación personalizada"
      : (inscripcion.tipoComunicado && inscripcion.tipoComunicado !== "Otro genérico")
      ? `${inscripcion.tipoDocumento || "Comunicado"} Extracurricular`
      : "Invitación a Actividad Extracurricular",
    lineas,
    html,
    usaPlantilla: Boolean(html),
    resumen: crearResumenInvitacion(ficha),
    ficha,
  };
}

export function crearLineasInvitacionEspecial(ficha, inscripcion, estudiante) {
  const lineas = [];
  const tipoDoc = inscripcion.tipoDocumento || "Comunicado";
  const numDoc = inscripcion.numeroDocumento || "";
  const area = inscripcion.areaTematica || "";
  const motivo = inscripcion.motivoJustificacion || inscripcion.comunicado || "";
  const ciclo = inscripcion.nombreCiclo || "Ciclo I";
  const duracion = inscripcion.duracion || inscripcion.duracionTaller || "";
  const requis = inscripcion.requisitos || "";

  // 1. Cabecera del Documento
  if (numDoc) {
    lineas.push(`${tipoDoc.toUpperCase()} N° ${numDoc.toUpperCase()}`);
  } else {
    lineas.push(`${tipoDoc.toUpperCase()}`);
  }

  // 2. Área Temática
  if (area && area !== "No aplica") {
    lineas.push(`ÁREA: ${area.toUpperCase()}`);
  }

  // 3. Saludo al apoderado
  lineas.push(`Estimado(a) apoderado(a) de la familia San Rafael:`);

  // 4. Motivo / Justificación
  if (motivo) {
    const motivoProcesado = procesarTextoComunicado(motivo, estudiante, { ...inscripcion, ...ficha.programa });
    const parrafos = motivoProcesado.split(/\n+/).map(p => p.trim()).filter(Boolean);
    lineas.push(...parrafos);
  } else {
    lineas.push(`Por medio del presente documento, se hace la cordial invitación al estudiante ${ficha.estudiante.nombre} a participar en el programa de ${ficha.programa.nombre}.`);
  }

  // 5. Detalles del Ciclo
  let cicloTexto = `Este taller corresponde al ${ciclo}`;
  if (duracion) cicloTexto += ` con una duración de ${duracion}`;
  if (inscripcion.fechaInicio && inscripcion.fechaFin) {
    cicloTexto += `, comprendido desde el ${formatearFechaLargaCircular(inscripcion.fechaInicio)} hasta el ${formatearFechaLargaCircular(inscripcion.fechaFin)}`;
  }
  cicloTexto += `.`;
  lineas.push(cicloTexto);

  // 6. Horarios por Nivel
  const tabla = inscripcion.tablaHorariosNivel || [];
  const grupos = inscripcion.horariosPorGrupo || [];
  if (Array.isArray(tabla) && tabla.length > 0) {
    lineas.push(`CRONOGRAMA Y HORARIOS:`);
    tabla.forEach(row => {
      let horarioNivel = `· ${row.nivel || "Nivel"} - Día(s): ${row.dia || "Por definir"} - Horario de clase: ${row.horarioClase || "Por definir"}`;
      if (row.horarioAlmuerzo) {
        horarioNivel += ` (Horario almuerzo: ${row.horarioAlmuerzo})`;
      }
      const parts = [];
      if (row.responsable && row.responsable.trim()) {
        parts.push(`Docente: ${row.responsable.trim()}`);
      }
      if (row.tutora && row.tutora.trim()) {
        parts.push(`Apoyo: ${row.tutora.trim()}`);
      }
      if (parts.length > 0) {
        horarioNivel += ` - ${parts.join(" y ")}`;
      }
      lineas.push(horarioNivel);
    });
  } else if (Array.isArray(grupos) && grupos.length > 0) {
    lineas.push(`CRONOGRAMA Y HORARIOS:`);
    grupos.forEach(row => {
      const subgruposGrados = agruparGradosConsecutivos(row.grados);
      const almuerzoTexto = (row.almuerzoInicio && row.almuerzoFin)
        ? ` (Horario almuerzo: ${formatearRangoHoraDocumento(row.almuerzoInicio, row.almuerzoFin)})`
        : "";
      const claseTexto = formatearRangoHoraDocumento(row.horaInicio, row.horaFin);

      const parts = [];
      if (row.responsable && row.responsable.trim()) {
        parts.push(`Docente: ${row.responsable.trim()}`);
      }
      if (row.tutora && row.tutora.trim()) {
        parts.push(`Apoyo: ${row.tutora.trim()}`);
      }
      const extraInfo = parts.length > 0 ? ` - ${parts.join(" y ")}` : "";

      if (subgruposGrados.length > 0) {
        subgruposGrados.forEach(subgrupo => {
          const nivelesFmt = formatearNivelesDocumento(subgrupo);
          let horarioNivel = `· ${nivelesFmt || "Nivel"} - Día(s): ${row.dia || "Por definir"} - Horario de clase: ${claseTexto}${almuerzoTexto}${extraInfo}`;
          lineas.push(horarioNivel);
        });
      } else {
        let horarioNivel = `· Nivel - Día(s): ${row.dia || "Por definir"} - Horario de clase: ${claseTexto}${almuerzoTexto}${extraInfo}`;
        lineas.push(horarioNivel);
      }
    });
  }

  // 7. Almuerzo
  if (inscripcion.incluyeAlmuerzo) {
    let almuerzoTexto = `Recepción de Almuerzo: Sí, incluye recepción de almuerzo.`;
    if (inscripcion.horarioRecepcionAlmuerzo) {
      almuerzoTexto += ` Horario establecido: ${inscripcion.horarioRecepcionAlmuerzo}.`;
    }
    lineas.push(almuerzoTexto);
    if (inscripcion.detalleAlmuerzo) {
      lineas.push(`Detalle del almuerzo: ${inscripcion.detalleAlmuerzo}`);
    }
    if (inscripcion.concesionarios) {
      lineas.push(`Concesionarios: ${inscripcion.concesionarios}`);
    }
  }

  // 8. Cambridge
  if (inscripcion.tipoComunicado === "Certificación Cambridge") {
    const nivel = inscripcion.nivelCambridge ? `Nivel de examen: ${inscripcion.nivelCambridge}. ` : "";
    const mod = Array.isArray(inscripcion.modalidadesCambridge) && inscripcion.modalidadesCambridge.length > 0
      ? `Modalidad de ingreso: ${inscripcion.modalidadesCambridge.join(", ")}. `
      : "";
    const costoVal = inscripcion.costoCiclo || inscripcion.costo;
    const costoCiclo = costoVal ? `Costo total del ciclo: S/ ${Number(costoVal).toFixed(2)}. ` : "";
    const pago1 = inscripcion.montoPrimerPago ? `Monto primer pago: S/ ${Number(inscripcion.montoPrimerPago).toFixed(2)}.` : "";

    if (nivel || mod || costoCiclo || pago1) {
      lineas.push(`INFORMACIÓN ADICIONAL DEL EXAMEN: ${nivel}${mod}${costoCiclo}${pago1}`);
    }
  }

  // 9. Requisitos / Útiles
  if (requis) {
    const requisProcesado = procesarTextoComunicado(requis, estudiante, { ...inscripcion, ...ficha.programa });
    lineas.push(`MATERIALES Y REQUISITOS: ${requisProcesado}`);
  }

  return lineas;
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
