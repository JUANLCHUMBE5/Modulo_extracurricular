import { nivelesGrados } from "../constants/coordinacionConstants";
import { formatearHora12 } from "./coordinacionFormatters";

const ANUNCIO_IMAGEN_MAX_BYTES = 900 * 1024;

export function normalizarListaGrados(lista) {
  if (!Array.isArray(lista)) return [];
  const normalizados = lista
    .map((item) => {
      let str = String(item || "").trim();

      // Corrige variantes heredadas con codificacion dañada antes de comparar.
      str = normalizarTextoAnos(str);

      if (str.includes(":")) {
        let [nivel, grado] = str.split(":");
        nivel = nivel.trim();
        grado = normalizarTextoAnos(grado.trim());
        nivel = nivel.charAt(0).toUpperCase() + nivel.slice(1).toLowerCase();
        return `${nivel}:${grado}`;
      }

      if (str.includes("años") || str.includes("año") || str.includes("anys") || /^\d+\s*años?$/i.test(str)) {
        const num = str.match(/\d+/)?.[0] || "";
        if (num) return `Inicial:${num} años`;
      }

      return str;
    })
    .filter(Boolean);

  return [...new Set(normalizados)];
}

export function normalizarListaTexto(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

export function esProgramaDeportivo(nombre = "", categoria = "") {
  const texto = normalizarTextoBusqueda(`${nombre} ${categoria}`);
  return /\b(deport|voley|volley|futbol|futsal|fulbito|football|soccer)\b/.test(texto);
}

export function esProgramaCambridge(programa = {}) {
  const variables = Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [];
  const texto = normalizarTextoBusqueda([
    programa.nombre,
    programa.categoria,
    programa.plantilla,
    ...variables,
  ].filter(Boolean).join(" "));

  return /\bingles\b/.test(texto) ||
    /\bcambridge\b/.test(texto) ||
    /\bcertificacion\b/.test(texto) ||
    /\bpreparacion\b/.test(texto) ||
    variables.some((variable) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(String(variable || "").toLowerCase())
    );
}

export function calcularRangoEdades(desde, hasta) {
  const edadDesde = calcularEdadDesdeFecha(desde);
  const edadHasta = calcularEdadDesdeFecha(hasta);
  if (!edadDesde || !edadHasta) return { edadMinima: "", edadMaxima: "" };
  return {
    edadMinima: Math.min(edadDesde, edadHasta),
    edadMaxima: Math.max(edadDesde, edadHasta),
  };
}

export function formatearPesoArchivo(bytes = 0) {
  const numero = Number(bytes || 0);
  if (!numero) return "";
  if (numero < 1024 * 1024) return `${Math.round(numero / 1024)} KB`;
  return `${(numero / (1024 * 1024)).toFixed(1)} MB`;
}

export function nombreProgramaDesdeArchivo(nombreArchivo = "") {
  return String(nombreArchivo || "")
    .replace(/\.[^.]+$/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b(plantilla|digital|variables|word|docx)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export async function comprimirImagenAnuncio(archivo) {
  const dataUrlOriginal = await leerArchivoComoDataUrl(archivo);
  if (archivo.size <= ANUNCIO_IMAGEN_MAX_BYTES) {
    return {
      dataUrl: dataUrlOriginal,
      bytes: archivo.size,
      comprimida: false,
    };
  }

  const imagen = await cargarImagen(dataUrlOriginal);
  const escala = Math.min(1, 1400 / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);

  let calidad = 0.82;
  let comprimida = canvas.toDataURL("image/jpeg", calidad);
  while (dataUrlABytes(comprimida) > ANUNCIO_IMAGEN_MAX_BYTES && calidad > 0.46) {
    calidad -= 0.08;
    comprimida = canvas.toDataURL("image/jpeg", calidad);
  }

  return {
    dataUrl: comprimida,
    bytes: dataUrlABytes(comprimida),
    comprimida: true,
  };
}

export function obtenerGradosDeportivos(talleres) {
  if (!Array.isArray(talleres)) return [];
  const sets = new Set();
  talleres.forEach((taller) => {
    mapAgesToGrades(taller.edadMinima, taller.edadMaxima).forEach((grado) => sets.add(grado));
  });
  return Array.from(sets);
}

export function resumenGrupoDeportivo(talleres) {
  if (!Array.isArray(talleres) || talleres.length === 0) return "Por definir";
  const talleresUnicos = [];
  talleres.forEach((taller) => {
    const nivelLabel = taller.nivel ? ` [${taller.nivel}]` : "";
    const label = `${taller.deporte}${nivelLabel} (${taller.edadMinima}-${taller.edadMaxima} años)`;
    if (!talleresUnicos.includes(label)) talleresUnicos.push(label);
  });
  return talleresUnicos.join(" / ");
}

export function resumenHorarioDeportivo(talleres) {
  if (!Array.isArray(talleres) || talleres.length === 0) return "Por definir";
  const porDia = {};
  talleres.forEach((taller) => {
    if (!porDia[taller.dia]) porDia[taller.dia] = [];
    const nivelLabel = taller.nivel ? ` [${taller.nivel}]` : "";
    porDia[taller.dia].push(`${taller.deporte}${nivelLabel} (${taller.edadMinima}-${taller.edadMaxima} a.): ${taller.horaInicio}-${taller.horaFin}`);
  });
  return Object.keys(porDia).map((dia) => `${dia}: ${porDia[dia].join(", ")}`).join(" / ");
}

export function crearGrupoEtarioVerano(datos) {
  if (datos.grupoEtario) return datos.grupoEtario;
  if (datos.edadMinima && datos.edadMaxima) {
    return `Edades ${datos.edadMinima} a ${datos.edadMaxima} anios`;
  }
  return "";
}

export function resumenHorario(dias, inicio, fin, almuerzoInicio = "", almuerzoFin = "") {
  const diasSeguros = normalizarListaTexto(dias);
  if (!diasSeguros.length || !inicio || !fin) return "";
  const clase = `${formatearHora12(inicio)} - ${formatearHora12(fin)}`;
  const almuerzo = almuerzoInicio && almuerzoFin
    ? ` · almuerzo ${formatearHora12(almuerzoInicio)} - ${formatearHora12(almuerzoFin)}`
    : "";
  return `${diasSeguros.join(", ")} clase ${clase}${almuerzo}`;
}

export function normalizarHorariosPorGrupo(grupos, gradosAplicables = null) {
  const gradosValidos = gradosAplicables ? new Set(normalizarListaGrados(gradosAplicables)) : null;
  return (Array.isArray(grupos) ? grupos : []).map((grupo, index) => {
    const gradosNormalizados = normalizarListaGrados(grupo.grados);
    const gradosFiltrados = gradosValidos
      ? gradosNormalizados.filter((grado) => gradosValidos.has(grado))
      : gradosNormalizados;
    return {
      id: grupo.id || `grupo-${index + 1}`,
      grados: gradosFiltrados,
      dia: grupo.dia || "",
      almuerzoInicio: grupo.almuerzoInicio || "14:20",
      almuerzoFin: grupo.almuerzoFin || "15:10",
      horaInicio: grupo.horaInicio || "",
      horaFin: grupo.horaFin || "",
      aula: String(grupo.aula || "").trim(),
    };
  }).filter((grupo) => grupo.grados.length > 0);
}

export function obtenerGradosFinales(gradosBase) {
  return normalizarListaGrados(gradosBase);
}

export function resumenHorariosPorGrupo(gruposHorario) {
  return gruposHorario
    .map((grupo) => {
      const grados = resumenGrados(grupo.grados);
      const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";
      return `${grados}: ${grupo.dia} almuerzo ${formatearHora12(grupo.almuerzoInicio)}-${formatearHora12(grupo.almuerzoFin)}, clase ${formatearHora12(grupo.horaInicio)}-${formatearHora12(grupo.horaFin)}${aula}`;
    })
    .join(" / ");
}

export function normalizarPeriodoVista(valor) {
  return String(valor || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

function normalizarTextoAnos(valor) {
  return valor
    .replace(/a\u00c3\u00b1os/g, "años")
    .replace(/a\u00c3\u00b1o/g, "año")
    .replace(/a\u00c2\u00b1os/g, "años")
    .replace(/a\?os/g, "años")
    .replace(/\baos\b/g, "años");
}

function normalizarTextoBusqueda(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calcularEdadDesdeFecha(fechaTexto) {
  if (!fechaTexto) return "";
  const fecha = new Date(fechaTexto);
  if (Number.isNaN(fecha.getTime())) return "";
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const mes = hoy.getMonth() - fecha.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) edad -= 1;
  return edad > 0 ? edad : "";
}

function leerArchivoComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(archivo);
  });
}

function cargarImagen(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("La imagen seleccionada no se pudo procesar."));
    image.src = dataUrl;
  });
}

function dataUrlABytes(dataUrl = "") {
  const base64 = String(dataUrl).split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

function mapAgesToGrades(edadMinima, edadMaxima) {
  const min = Number(edadMinima || 0);
  const max = Number(edadMaxima || 0);
  const grados = [];
  for (let edad = min; edad <= max; edad++) {
    if (edad === 3) grados.push("Inicial:3 años");
    else if (edad === 4) grados.push("Inicial:4 años");
    else if (edad === 5) grados.push("Inicial:5 años");
    else if (edad >= 6 && edad <= 11) grados.push(`Primaria:${edad - 5}`);
    else if (edad >= 12 && edad <= 16) grados.push(`Secundaria:${edad - 11}`);
    else if (edad >= 17) grados.push("Secundaria:5");
  }
  return grados;
}

export function resumenGrados(grados) {
  const gradosSeguros = normalizarListaGrados(grados);
  if (!gradosSeguros.length) return "";
  return nivelesGrados
    .map(({ nivel }) => {
      const items = gradosSeguros
        .filter((item) => item.startsWith(`${nivel}:`))
        .map((item) => etiquetaGradoCorta(item.split(":")[1]));
      return items.length ? `${nivel}: ${items.join(", ")}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

function etiquetaGradoCorta(grado) {
  return String(grado || "").replace(/\s*años?/i, "").trim();
}
