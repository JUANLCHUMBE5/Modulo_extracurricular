import JSZip from "jszip";
import {
  diasSemana,
  modelosPlantilla,
  nivelesGrados,
  variablesPlantillaAceptadas,
  variablesPlantillaRequeridas,
} from "../constants/coordinacionConstants";
import { escaparRegExp, formatearHora12, normalizarComparacion } from "./coordinacionFormatters";

export async function leerPlantillaWord(archivo) {
  const zip = await JSZip.loadAsync(archivo);
  return analizarZipPlantilla(zip);
}

export async function leerDocumentoWord(archivo) {
  const zip = await JSZip.loadAsync(archivo);
  return analizarZipPlantilla(zip, { validarVariables: false });
}

export async function leerPlantillaWordDesdeBase64(base64) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(base64));
  return analizarZipPlantilla(zip);
}

export async function leerDocumentoWordDesdeBase64(base64) {
  const zip = await JSZip.loadAsync(base64ToArrayBuffer(base64));
  return analizarZipPlantilla(zip, { validarVariables: false });
}

export function leerArchivoBase64(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = String(reader.result || "");
      resolve(resultado.includes(",") ? resultado.split(",")[1] : resultado);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo Word."));
    reader.readAsDataURL(archivo);
  });
}

export function extraerDatosProgramaDesdeWord(textoPlano, nombreArchivo, categorias = []) {
  const texto = normalizarSaltos(textoPlano);
  const nombreDetectado = extraerValorEtiqueta(texto, [
    "nombre del programa",
    "programa",
    "curso",
    "taller",
    "actividad",
  ]) || nombreDesdeArchivo(nombreArchivo);
  const categoriaDetectada = extraerCategoria(texto, categorias);
  const horarioDetectado = extraerValorEtiqueta(texto, ["horario", "horarios", "dias y horario", "día y hora", "dia y hora"]);
  const horas = extraerHoras(horarioDetectado || texto);
  const fechas = extraerFechas(texto);
  const grados = extraerGrados(texto);
  const costo = extraerCosto(texto);
  const cupos = extraerNumeroEtiqueta(texto, ["cupos", "vacantes"]);
  const requisitos = extraerValorEtiqueta(texto, ["requisitos", "materiales", "consideraciones"]) || extraerBloqueSeccion(texto, ["incluye"], ["modalidades", "opcion a", "opción a"]);
  const comunicado = extraerComunicadoPrincipal(texto);
  const detalleCosto = compactarBloquesDetectados([
    extraerBloqueSeccion(texto, ["la modalidad de ingreso"], ["atentamente"]),
    extraerBloqueSeccion(texto, ["costo", "precio por ciclo"], ["el almuerzo", "almuerzo", "requisitos", "entregar este formato", "acepto"]),
  ]);
  const detalleAlmuerzo = extraerBloqueSeccion(texto, ["el almuerzo", "almuerzo"], ["entregar este formato", "acepto", "datos del alumno"]);
  const concesionarios = extraerConcesionarios(texto);
  const modalidadCobro = extraerModalidad(texto);
  
  const textoLower = texto.toLowerCase();
  const nombreArchivoLower = String(nombreArchivo || "").toLowerCase();

  let tipoComunicadoSugerido = "";
  if (nombreArchivoLower.includes("cambridge") || textoLower.includes("cambridge")) {
    tipoComunicadoSugerido = "Cambridge";
  } else if (
    nombreArchivoLower.includes("club de tareas") || 
    nombreArchivoLower.includes("club tareas") || 
    textoLower.includes("club de tareas") || 
    textoLower.includes("club tareas")
  ) {
    tipoComunicadoSugerido = "Club de Tareas";
  } else if (
    nombreArchivoLower.includes("reforzamiento") || 
    textoLower.includes("reforzamiento")
  ) {
    tipoComunicadoSugerido = "Reforzamiento (Circular)";
  } else if (
    nombreArchivoLower.includes("seleccion") || 
    nombreArchivoLower.includes("selección") || 
    textoLower.includes("aula especial seleccion") || 
    textoLower.includes("aula especial selección")
  ) {
    tipoComunicadoSugerido = "Selección (Circular)";
  }

  let areaTematicaSugerida = "";
  if (tipoComunicadoSugerido === "Cambridge" || nombreArchivoLower.includes("ingles") || nombreArchivoLower.includes("inglés") || textoLower.includes("ingles") || textoLower.includes("inglés")) {
    areaTematicaSugerida = "Inglés / Cambridge";
  } else {
    const tieneMatematica = textoLower.includes("matematica") || textoLower.includes("matemática") || nombreArchivoLower.includes("matematica") || nombreArchivoLower.includes("matemática");
    const tieneComunicacion = textoLower.includes("comunicacion") || textoLower.includes("comunicación") || nombreArchivoLower.includes("comunicacion") || nombreArchivoLower.includes("comunicación");
    
    if (tieneMatematica && tieneComunicacion) {
      areaTematicaSugerida = "Matemática y Comunicación";
    } else if (tieneComunicacion) {
      areaTematicaSugerida = "Comunicación";
    } else if (tieneMatematica) {
      areaTematicaSugerida = "Matemática";
    } else {
      areaTematicaSugerida = "Matemática";
    }
  }

  const datos = {};
  datos.areaTematica = areaTematicaSugerida;
  datos.categoria = categoriaDetectada || "Academico";
  if (tipoComunicadoSugerido) {
    datos.tipoComunicado = tipoComunicadoSugerido;
  }

  if (nombreDetectado) datos.nombre = capitalizarTexto(nombreDetectado);
  if (grados.length) datos.gradosAplicables = grados;
  if (horarioDetectado) datos.dias = extraerDias(horarioDetectado);
  if (!datos.dias?.length) datos.dias = extraerDias(texto);
  if (horas.horaInicio) datos.horaInicio = horas.horaInicio;
  if (horas.horaFin) datos.horaFin = horas.horaFin;
  if (fechas.fechaInicio) datos.fechaInicio = fechas.fechaInicio;
  if (fechas.fechaFin) datos.fechaFin = fechas.fechaFin;
  if (cupos) datos.cupos = cupos;
  if (costo) datos.costo = costo;
  if (modalidadCobro) datos.modalidadCobro = modalidadCobro;
  if (requisitos) datos.requisitos = requisitos;
  if (comunicado) datos.comunicado = comunicado;
  if (detalleCosto) datos.detalleCosto = detalleCosto;

  const responsable = extraerValorEtiqueta(texto, ["responsable", "docente", "profesor", "profesora"]);
  if (responsable) datos.responsable = responsable;

  const tutora = extraerValorEtiqueta(texto, ["tutora", "apoyo", "auxiliar"]);
  if (tutora) datos.tutora = tutora;

  const uniforme = extraerUniforme(texto);
  if (uniforme !== null) datos.requiereUniforme = uniforme;

  if (datos.dias?.length && datos.horaInicio && datos.horaFin) {
    datos.horario = `${datos.dias.join(", ")} ${datos.horaInicio} - ${datos.horaFin}`;
  }
  if (datos.gradosAplicables?.length) {
    datos.grupo = resumenGradosDesdeValores(datos.gradosAplicables);
  }

  return limpiarDatosVacios(datos);
}

export function contarDatosDetectados(datos) {
  return Object.keys(datos).filter((key) => !["grupo", "horario"].includes(key)).length;
}

export function filtrarDatosDocumento(datos) {
  const camposDocumento = ["requisitos", "comunicado", "comunicadoCompleto", "detalleCosto", "detalleAlmuerzo", "concesionarios"];
  return Object.fromEntries(Object.entries(datos).filter(([key]) => camposDocumento.includes(key)));
}

export function etiquetaCampoDocumento(campo) {
  const etiquetas = {
    requisitos: "Requisitos",
    comunicado: "Comunicado",
    comunicadoCompleto: "Comunicado completo",
    detalleCosto: "Detalle de costo",
    detalleAlmuerzo: "Almuerzo",
    concesionarios: "Concesionarios",
  };
  return etiquetas[campo] || campo;
}

export function resumirTextoDocumento(valor) {
  const texto = String(valor || "").replace(/\s+/g, " ").trim();
  if (!texto) return "Sin contenido";
  return texto.length > 240 ? `${texto.slice(0, 240).trim()}...` : texto;
}

async function analizarZipPlantilla(zip, opciones = {}) {
  const validarVariables = opciones.validarVariables !== false;
  const archivosXml = Object.values(zip.files).filter((file) =>
    /^word\/(document|header|footer)\d*\.xml$/i.test(file.name)
  );

  if (!archivosXml.length) {
    throw new Error("La plantilla no parece ser un documento Word válido.");
  }

  const contenidos = await Promise.all(archivosXml.map((file) => file.async("text")));
  const contenido = contenidos.join(" ");
  const textoPlano = contenidos.map(extraerTextoPlanoXml).join("\n");
  const presentes = detectarVariablesPlantilla(contenido, variablesPlantillaAceptadas);
  const modeloCompleto = modelosPlantilla.find((modelo) =>
    modelo.variables.every((variable) => presentes.includes(variable.id))
  );
  const modeloBase = modeloCompleto || obtenerModeloMasCercano(presentes);
  const variablesBase = modeloBase?.variables || variablesPlantillaRequeridas;
  const faltantes = variablesBase.filter((variable) => !presentes.includes(variable.id));
  const variablesListasModelo = variablesBase.filter((variable) => presentes.includes(variable.id));
  const flexibleValida = !modeloCompleto && esPlantillaDigitalUtil(presentes);

  if (validarVariables && presentes.length === 0) {
    throw new Error("La plantilla no contiene ninguna variable válida (ej: {{ALUMNO}}, {{FECHA}}, etc.).");
  }

  return {
    variablesDetectadas: presentes,
    variablesListasModelo: variablesListasModelo.map((item) => item.id),
    variablesRequeridasModelo: variablesBase.map((item) => item.id),
    variablesFaltantes: faltantes.map((item) => item.id),
    plantillaValida: true,
    plantillaModelo: modeloBase?.id || "general",
    textoPlano,
  };
}

function obtenerModeloMasCercano(presentes) {
  return modelosPlantilla
    .map((modelo) => ({
      modelo,
      total: modelo.variables.filter((variable) => presentes.includes(variable.id)).length,
    }))
    .sort((a, b) => b.total - a.total)[0]?.modelo;
}

function esPlantillaDigitalUtil(presentes) {
  const tieneAlumno = presentes.includes("alumno") || presentes.includes("alu");
  const tieneGrado = presentes.includes("gr_sec") || presentes.includes("niv");
  const tieneContacto = presentes.includes("apod") || presentes.includes("cel");
  const tienePrograma = presentes.includes("prog") || presentes.includes("ciclo") || presentes.includes("horario");
  const tieneDetalle = presentes.includes("costo") || presentes.includes("pago") || presentes.includes("ini") || presentes.includes("fin");
  const minimoOperativo = presentes.length >= 6;

  return minimoOperativo && tieneAlumno && tieneGrado && tieneContacto && tienePrograma && tieneDetalle;
}

function detectarVariablesPlantilla(contenidoXml, variables) {
  const marcadores = extraerMarcadoresPlantilla(contenidoXml);
  if (marcadores.length) {
    return variables
      .filter((variable) => variable.aliases.some((alias) => marcadores.some((marcador) => coincideMarcadorPlantilla(marcador, alias))))
      .map((variable) => variable.id);
  }

  const contenido = decodificarXml(String(contenidoXml || "").replace(/<[^>]+>/g, " "));
  return variables
    .filter((variable) => variable.aliases.some((alias) => contieneAliasPlantilla(contenido, alias)))
    .map((variable) => variable.id);
}

function extraerMarcadoresPlantilla(contenidoXml) {
  const texto = extraerTextoPlanoXml(contenidoXml);
  const marcadores = new Set();
  const patron = /\{\{?\s*([^{}]+?)\s*\}\}?/g;
  let match = patron.exec(texto);
  while (match) {
    if (match[1]) marcadores.add(normalizarComparacion(match[1]).replace(/\s+/g, "_"));
    match = patron.exec(texto);
  }
  return Array.from(marcadores);
}

function coincideMarcadorPlantilla(marcador, alias) {
  return marcador === normalizarComparacion(alias).replace(/\s+/g, "_");
}

function contieneAliasPlantilla(contenido, alias) {
  const limpio = String(alias || "").trim();
  if (!limpio) return false;
  const flexible = escaparRegExp(limpio)
    .replace(/\\ /g, "\\s+")
    .replace(/_/g, "[_\\s]+");
  const patron = new RegExp(`(^|[^A-Za-z0-9_])${flexible}([^A-Za-z0-9_]|$)`, "i");
  return patron.test(contenido);
}

function extraerTextoPlanoXml(xml) {
  return decodificarXml(xml)
    .replace(/<\/w:p>/gi, "\n")
    .replace(/<w:tab[^>]*\/>/gi, " ")
    .replace(/<w:br[^>]*\/>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function decodificarXml(valor) {
  return String(valor || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizarSaltos(texto) {
  return String(texto || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extraerValorEtiqueta(texto, etiquetas) {
  const lineas = normalizarSaltos(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  for (let index = 0; index < lineas.length; index += 1) {
    const linea = lineas[index];
    for (const etiqueta of etiquetas) {
      const patron = new RegExp(`^\\s*${escaparRegExp(etiqueta)}\\s*[:\\-–]\\s*(.+)$`, "i");
      const match = linea.match(patron);
      if (match?.[1]) return limpiarValorDetectado(match[1]);
      const etiquetaSola = new RegExp(`^\\s*${escaparRegExp(etiqueta)}\\s*[:\\-–]?\\s*$`, "i");
      if (etiquetaSola.test(linea) && lineas[index + 1]) return limpiarValorDetectado(lineas[index + 1]);
    }
  }
  return "";
}

function extraerComunicadoPrincipal(texto) {
  const normal = normalizarSaltos(texto);
  const lineas = normal.split("\n").map((linea) => linea.trim()).filter(Boolean);
  const indiceInicio = lineas.findIndex((linea) =>
    /^reciba\b/i.test(linea) ||
    /^en nuestra instituci[oó]n\b/i.test(linea) ||
    /^nos dirigimos\b/i.test(linea) ||
    normalizarComparacion(linea).startsWith("reciba un cordial saludo")
  );
  if (indiceInicio === -1) return "";

  const indiceFinRelativo = lineas.slice(indiceInicio + 1).findIndex((linea) => {
    const comparacion = normalizarComparacion(linea);
    return /^(club|ciclo|duracion|a continuacion|requisitos|costo|precio|la modalidad|el programa de preparacion|el almuerzo|entregar este formato)\b/.test(comparacion);
  });
  const indiceFin = indiceFinRelativo === -1 ? Math.min(lineas.length, indiceInicio + 8) : indiceInicio + 1 + indiceFinRelativo;
  return limpiarBloqueDetectado(lineas.slice(indiceInicio, indiceFin).join(" "));
}

function extraerBloqueSeccion(texto, etiquetasInicio, etiquetasFin = []) {
  const lineas = normalizarSaltos(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => {
    const comparacion = normalizarComparacion(linea).replace(/[:.]+$/g, "");
    return etiquetasInicio.some((etiqueta) => comparacion.startsWith(normalizarComparacion(etiqueta)));
  });
  if (inicio === -1) return "";

  const finRelativo = lineas.slice(inicio + 1).findIndex((linea) => {
    const comparacion = normalizarComparacion(linea).replace(/[:.]+$/g, "");
    return etiquetasFin.some((etiqueta) => comparacion.startsWith(normalizarComparacion(etiqueta)));
  });
  const fin = finRelativo === -1 ? Math.min(lineas.length, inicio + 8) : inicio + 1 + finRelativo;
  return limpiarBloqueDetectado(lineas.slice(inicio, fin).join("\n"));
}

function extraerConcesionarios(texto) {
  const bloque = extraerBloqueSeccion(
    texto,
    ["si deseara coordinar el servicio de delivery"],
    ["que son concesionarias", "entregar este formato", "acepto"]
  );
  if (bloque) return bloque;
  const coincidencias = [...String(texto || "").matchAll(/Cafet[ií]n\s+[^0-9\n]+(?:\n|\s)+(\d{9})/gi)]
    .map((match) => limpiarBloqueDetectado(match[0]));
  return coincidencias.join("\n");
}

function limpiarBloqueDetectado(valor) {
  return String(valor || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function compactarBloquesDetectados(bloques) {
  return bloques
    .map((bloque) => String(bloque || "").trim())
    .filter(Boolean)
    .filter((bloque, index, lista) => lista.findIndex((item) => item === bloque) === index)
    .join("\n\n");
}

function limpiarValorDetectado(valor) {
  return String(valor || "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]$/, "");
}

function nombreDesdeArchivo(nombreArchivo) {
  return String(nombreArchivo || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(carta|plantilla|comunicado|ficha|original|mismo|final|word|docx)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerCategoria(texto, categorias) {
  const detectada = extraerValorEtiqueta(texto, ["categoria", "categoría", "tipo"]);
  const normalizada = normalizarComparacion(detectada);
  const match = categorias.find((categoria) => normalizarComparacion(categoria) === normalizada);
  if (match) return match;
  if (detectada && categorias.includes("Otro")) return "Otro";
  return "";
}

function extraerDias(texto) {
  return diasSemana.filter((dia) => normalizarComparacion(texto).includes(normalizarComparacion(dia)));
}

function extraerHoras(texto) {
  const matches = [...String(texto || "").matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((match) => formatearHoraDetectada(match[1], match[2], match[3]))
    .filter(Boolean);

  return {
    horaInicio: matches[0] || "",
    horaFin: matches[1] || "",
  };
}

function formatearHoraDetectada(horaTexto, minutoTexto = "00", periodo = "") {
  let hora = Number(horaTexto);
  const minuto = Number(minutoTexto || "00");
  if (!Number.isFinite(hora) || !Number.isFinite(minuto) || hora > 23 || minuto > 59) return "";

  const normalPeriodo = normalizarComparacion(periodo);
  if (normalPeriodo.includes("p") && hora < 12) hora += 12;
  if (normalPeriodo.includes("a") && hora === 12) hora = 0;

  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function extraerFechas(texto) {
  const fechas = [...String(texto || "").matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g)]
    .map((match) => `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`);

  return {
    fechaInicio: fechas[0] || "",
    fechaFin: fechas[1] || "",
  };
}

function extraerCosto(texto) {
  const costoLinea = extraerValorEtiqueta(texto, ["costo", "inversion", "inversión", "pago"]);
  const precioCiclo = String(texto || "").match(/precio\s+por\s+ciclo[\s\S]{0,80}?S\/\.?\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (precioCiclo?.[1]) return Number(precioCiclo[1].replace(",", ".")).toFixed(2);
  const primerPago = String(texto || "").match(/primer\s+pago\s+de\s+S\/\.?\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (primerPago?.[1]) return Number(primerPago[1].replace(",", ".")).toFixed(2);
  const montoSoles = String(texto || "").match(/S\/\.?\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (montoSoles?.[1]) return Number(montoSoles[1].replace(",", ".")).toFixed(2);
  const pagoUnico = String(texto || "").match(/pago\s+[úu]nico\s*[:\-–]?\s*(?:S\/\.?\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (pagoUnico?.[1]) return Number(pagoUnico[1].replace(",", ".")).toFixed(2);
  const bloqueCosto = extraerBloqueSeccion(texto, ["costo"], ["el almuerzo", "almuerzo", "requisitos", "entregar este formato", "acepto"]);
  const fuente = costoLinea || bloqueCosto || texto;
  const match = String(fuente).match(/(?:S\/\s*)?(\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return "";
  return Number(match[1].replace(",", ".")).toFixed(2);
}

function extraerNumeroEtiqueta(texto, etiquetas) {
  const valor = extraerValorEtiqueta(texto, etiquetas);
  const match = String(valor).match(/\d+/);
  return match?.[0] || "";
}

function extraerModalidad(texto) {
  const normal = normalizarComparacion(texto);
  if (normal.includes("precio por ciclo") || normal.includes("por ciclo")) return "Por ciclo";
  if (normal.includes("pago unico") || normal.includes("unico")) return "Unico";
  if (normal.includes("mensual") || normal.includes("cuota")) return "Mensual";
  return "";
}

function extraerUniforme(texto) {
  const linea = extraerValorEtiqueta(texto, ["uniforme", "requiere uniforme"]);
  const normal = normalizarComparacion(linea || texto);
  if (normal.includes("no requiere uniforme") || /^no\b/.test(normal)) return false;
  if (normal.includes("requiere uniforme") || /^si\b/.test(normal) || normal.includes(" si ")) return true;
  return null;
}

function extraerGrados(texto) {
  const fuente = extraerValorEtiqueta(texto, ["grados", "grados aplicables", "dirigido a", "grado"]) || texto;
  const normal = normalizarComparacion(fuente);
  const seleccionados = [];

  nivelesGrados.forEach(({ nivel, grados }) => {
    const nivelNormal = normalizarComparacion(nivel);
    if (!normal.includes(nivelNormal)) return;

    grados.forEach((grado) => {
      const gradoNormal = normalizarComparacion(grado);
      const numero = gradoNormal.match(/\d+/)?.[0];
      const coincideNumero = numero && new RegExp(`\\b${numero}\\b`).test(normal);
      if (normal.includes(gradoNormal) || coincideNumero || normal.includes("todos")) {
        seleccionados.push(`${nivel}:${grado}`);
      }
    });
  });

  return [...new Set(seleccionados)];
}

function resumenGradosDesdeValores(grados) {
  if (!grados.length) return "";
  return nivelesGrados
    .map(({ nivel }) => {
      const items = grados
        .filter(item => item.startsWith(`${nivel}:`))
        .map(item => etiquetaGradoCorta(item.split(":")[1]));
      return items.length ? `${nivel}: ${items.join(", ")}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*años?/i, "").trim();
}

function limpiarDatosVacios(datos) {
  return Object.fromEntries(Object.entries(datos).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return true;
    return String(value ?? "").trim() !== "";
  }));
}

function capitalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
}

function base64ToArrayBuffer(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let index = 0; index < binario.length; index += 1) {
    bytes[index] = binario.charCodeAt(index);
  }
  return bytes.buffer;
}
