import { reemplazarVariablesComunicado } from "./padresTextBuilders";

/**
 * Repara texto con doble codificación UTF-8 (mojibake).
 */
export function repararTexto(texto: any): string {
  const s = String(texto || "");
  if (!s || typeof TextDecoder === "undefined") return s;

  const w1252 = new Map([
    [0x20AC, 0x80], // €
    [0x201A, 0x82], // ‚
    [0x0192, 0x83], // ƒ
    [0x201E, 0x84], // „
    [0x2026, 0x85], // …
    [0x2020, 0x86], // †
    [0x2021, 0x87], // ‡
    [0x02C6, 0x88], // ˆ
    [0x2030, 0x89], // ‰
    [0x0160, 0x8A], // Š
    [0x2039, 0x8B], // ‹
    [0x0152, 0x8C], // Œ
    [0x017D, 0x8E], // Ž
    [0x2018, 0x91], // '
    [0x2019, 0x92], // '
    [0x201C, 0x93], // "
    [0x201D, 0x94], // "
    [0x2022, 0x95], // •
    [0x2013, 0x96], // –
    [0x2014, 0x97], // —
    [0x02DC, 0x98], // ˜
    [0x2122, 0x99], // ™
    [0x0161, 0x9A], // š
    [0x203A, 0x9B], // ›
    [0x0153, 0x9C], // œ
    [0x017E, 0x9E], // ž
    [0x0178, 0x9F], // Ÿ
  ]);

  function toByte(ch: string) {
    const c = ch.codePointAt(0);
    if (!c) return -1;
    if (c < 0x100) return c;
    const b = w1252.get(c);
    return b !== undefined ? b : -1;
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let out = "";
  let i = 0;
  const len = s.length;

  while (i < len) {
    const b0 = toByte(s[i]);
    let consumed = 0;

    if (b0 >= 0xF0 && b0 <= 0xF4 && i + 3 < len) {
      const b1 = toByte(s[i + 1]);
      const b2 = toByte(s[i + 2]);
      const b3 = toByte(s[i + 3]);
      if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
        try {
          out += decoder.decode(new Uint8Array([b0, b1, b2, b3]));
          consumed = 4;
        } catch { /* ignore */ }
      }
    }

    if (!consumed && b0 >= 0xE0 && b0 <= 0xEF && i + 2 < len) {
      const b1 = toByte(s[i + 1]);
      const b2 = toByte(s[i + 2]);
      if ((b1 & 0xC0) === 0x80 && (b2 & 0xC0) === 0x80) {
        try {
          out += decoder.decode(new Uint8Array([b0, b1, b2]));
          consumed = 3;
        } catch { /* ignore */ }
      }
    }

    if (!consumed && b0 >= 0xC2 && b0 <= 0xDF && i + 1 < len) {
      const b1 = toByte(s[i + 1]);
      if ((b1 & 0xC0) === 0x80) {
        try {
          out += decoder.decode(new Uint8Array([b0, b1]));
          consumed = 2;
        } catch { /* ignore */ }
      }
    }

    if (consumed) {
      i += consumed;
    } else {
      out += s[i];
      i++;
    }
  }

  return out
    .replace(/\bCKAUB\b/g, "CLUB")
    .replace(/\bMATEMTAICA\b/g, "MATEMÁTICA")
    .replace(/\bMatemtaica\b/gi, "Matemática")
    .replace(/\bCkaub\b/gi, "Club")
    .replace(/\bMatematica\b/gi, "Matemática");
}

export function dividirSentencias(texto: string) {
  const textToProcess = String(texto).trim();
  const sentencias = [];
  const regexPunto = /\.\s+(?=[A-ZÁÉÍÓÚÑ])/g;
  const abrevs = new Set(["sr", "sra", "dr", "dra", "lic", "ing", "av", "jr", "prof", "profa", "a.m", "p.m"]);

  let lastCut = 0;
  let match;

  while ((match = regexPunto.exec(textToProcess)) !== null) {
    const pos = match.index;
    const antes = textToProcess.slice(0, pos);

    const ultimaPalabraMatch = antes.match(/(\b\S+)$/);
    const ultimaPalabra = ultimaPalabraMatch ? ultimaPalabraMatch[1].toLowerCase() : "";

    if (abrevs.has(ultimaPalabra) || abrevs.has(ultimaPalabra.replace(/\.$/, ""))) {
      continue;
    }

    const parte = textToProcess.slice(lastCut, pos + 1).trim();
    if (parte) {
      sentencias.push(parte);
    }
    lastCut = pos + 1;
  }

  const parteFinal = textToProcess.slice(lastCut).trim();
  if (parteFinal) {
    sentencias.push(parteFinal);
  }

  return sentencias;
}

export function dividirParrafosPorCampos(parrafos: any[]) {
  if (!Array.isArray(parrafos)) return [];
  const regex = /(Vigencia|Horario|Costo|Plazo de inscripci[oó]n|Plazo|Responsable del programa|Responsable|Docente|Modalidad de cobro|Modalidad de pago|Modalidad de ingreso|Modalidad):/gi;
  const resultado: any[] = [];

  parrafos.forEach((parrafo) => {
    const texto = String(parrafo || "").trim();
    if (!texto) return;

    const matches = [];
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(texto)) !== null) {
      matches.push({
        index: match.index,
        label: match[1],
        full: match[0],
      });
    }

    if (matches.length === 0) {
      resultado.push(...dividirSentencias(texto));
      return;
    }

    if (matches[0].index > 0) {
      const partePrevia = texto.slice(0, matches[0].index).trim();
      if (partePrevia) {
        resultado.push(...dividirSentencias(partePrevia));
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const inicio = matches[i].index;
      const fin = i + 1 < matches.length ? matches[i + 1].index : texto.length;
      const chunk = texto.slice(inicio, fin).trim();

      const sentenciasDelChunk = dividirSentencias(chunk);
      if (sentenciasDelChunk.length > 0) {
        resultado.push(sentenciasDelChunk[0]);
        for (let j = 1; j < sentenciasDelChunk.length; j++) {
          resultado.push(sentenciasDelChunk[j]);
        }
      }
    }
  });

  return resultado;
}

export function obtenerTipoCampo(label = "") {
  const texto = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (texto.includes("modalidad")) return "modalidad";
  if (texto.includes("disponible")) return "disponibles";
  if (texto.includes("inicio")) return "inicio";
  if (texto.includes("vigencia") || texto.includes("fecha")) return "vigencia";
  if (texto.includes("horario") || texto.includes("hora")) return "horario";
  if (texto.includes("costo") || texto.includes("pago") || texto.includes("precio")) return "costo";
  if (texto.includes("plazo") || texto.includes("limite")) return "plazo";
  if (texto.includes("responsable") || texto.includes("docente")) return "responsable";
  return "general";
}

export function formatearHorarioDetalle(texto: string) {
  if (!texto) return "";
  if (texto.toLowerCase().includes("por definir")) return texto;

  if (texto.includes(":") && (texto.includes("[") || texto.includes("Competitivo") || texto.includes("Formativo"))) {
    const regexCualquierDia = /\b(Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\b/gi;
    const matchDias: string[] = [];
    let m;
    while ((m = regexCualquierDia.exec(texto)) !== null) {
      const diaNormalizado = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
        .replace("miercoles", "Miércoles")
        .replace("sabado", "Sábado");
      if (!matchDias.includes(diaNormalizado)) {
        matchDias.push(diaNormalizado);
      }
    }

    const regex = /([A-Za-zÁÉÍÓÚáéíóúÑñü]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñü]+)*)\s*(?:\[[^\]]+\])?\s*(\([^)]+\))\s*:\s*([^,/]+)/g;
    const matches = [...texto.matchAll(regex)];

    if (matches.length > 0 && matchDias.length > 0) {
      const tieneCompetitivo = /competitivo/i.test(texto);
      const tieneFormativo = /formativo/i.test(texto);
      let modTexto = "";
      if (tieneCompetitivo && tieneFormativo) modTexto = " [Competitivo] Y [Formativo]";
      else if (tieneCompetitivo) modTexto = " [Competitivo]";
      else if (tieneFormativo) modTexto = " [Formativo]";

      const header = `${matchDias.join(", ")}:${modTexto}`;
      
      const uniqueBullets: string[] = [];
      matches.forEach(m => {
        const deporte = m[1].trim();
        const edad = m[2].trim();
        const deporteCap = deporte.charAt(0).toUpperCase() + deporte.slice(1).toLowerCase();
        const bullet = `• ${deporteCap} ${edad}`;
        if (!uniqueBullets.includes(bullet)) {
          uniqueBullets.push(bullet);
        }
      });

      return `${header}\n\n${uniqueBullets.join("\n")}`;
    }
  }

  // Fallback original
  const primerColon = texto.indexOf(":");
  if (primerColon !== -1) {
    const dias = texto.substring(0, primerColon).trim();
    let deportes = texto.substring(primerColon + 1).trim();
    deportes = deportes.replace(/,\s+(?=[A-ZÁÉÍÓÚÑ])/g, "\n• ");

    if (deportes.length > 0) {
      deportes = "• " + deportes;
    }
    return `${dias}:\n${deportes}`;
  }

  let formatted = texto;
  formatted = formatted.replace(/\s*almuerzo\s*/gi, "\nALMUERZO: ");
  formatted = formatted.replace(/\s*clase\s*/gi, "\nCLASE: ");
  formatted = formatted.replace(/\s*·\s*aula\s*/gi, "\nAULA: ");
  formatted = formatted.replace(/\s*·\s*/gi, "\n");
  formatted = formatted.replace(/:\s*:/g, ":");
  formatted = formatted.split("\n").map(function (line) { return line.trim(); }).filter(Boolean).join("\n");

  return formatted;
}

export function normalizarTextoPadres(valor: any): string {
  return repararTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function obtenerAreaPrograma(valor: any): string {
  const texto = repararTexto(String(valor || "").trim());
  if (!texto) return "reforzamiento";
  const sinClub = texto.replace(/^club\s+de\s+tareas\s*/i, "").trim();
  return sinClub || texto;
}

export function limpiarCierreFormularioWord(texto: string) {
  return String(texto || "")
    .replace(/\bAtentamente[\s\S]*$/i, "")
    .replace(/\bENTREGAR ESTE FORMATO[\s\S]*$/i, "")
    .replace(/\bACEPTO\s*:[\s\S]*$/i, "")
    .replace(/\bDATOS DEL ALUMNO\s*:[\s\S]*$/i, "")
    .replace(/\bDATOS DEL APODERADO\s*:[\s\S]*$/i, "")
    .replace(/\b0-\d{6,}\b/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function limpiarTextoFormato(texto: any) {
  return repararTexto(texto)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function quitarDuplicadosTexto(items: any[]) {
  const vistos = new Set();
  return items.filter((item) => {
    const clave = normalizarTextoPadres(item);
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

export function limpiarIndicacion(valor: any) {
  return String(valor || "")
    .replace(/^[\s*-]+/, "")
    .replace(/^\d+[.)-]\s*/, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]$/, "");
}

export function esIndicacionValida(valor: any) {
  const texto = String(valor || "").trim();
  const normal = normalizarTextoPadres(texto);
  if (texto.length < 4) return false;
  if (/^(requisitos|indicaciones|consideraciones|materiales|clases|ventajas)$/i.test(normal)) return false;
  if (/^(costo|pago unico|precio|s\/)/i.test(normal)) return false;
  if (normal.includes("soles") || normal.includes("s/")) return false;
  return true;
}

export function dividirIndicacion(linea: any): string[] {
  const texto = String(linea || "").trim();
  if (texto.includes("\n")) return texto.split("\n");
  if (/^\d+[.)-]/.test(texto) || /^[*-]/.test(texto)) return [texto];
  if (texto.length > 90 && /[.;]\s+/.test(texto)) return texto.split(/[.;]\s+/);
  return [texto];
}

export function extraerBloqueIndicaciones(lineas: any[]) {
  const inicio = lineas.findIndex((linea) =>
    /^(requisitos|indicaciones|consideraciones|materiales)\s*:?$/i.test(normalizarTextoPadres(linea))
  );
  if (inicio === -1) return [];

  const salida = [];
  for (const linea of lineas.slice(inicio + 1)) {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    if (/^(costo|el almuerzo|almuerzo|entregar este formato|acepto|datos del alumno|modalidades|atentamente)\b/.test(normal)) {
      break;
    }
    salida.push(linea);
  }
  return salida;
}

export function extraerIndicacionesDesdeTexto(texto: any, { soloSeccion = false } = {}) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  if (!lineas.length) return [];

  const bloque = soloSeccion ? extraerBloqueIndicaciones(lineas) : lineas;
  if (!bloque.length) return [];

  return bloque.flatMap(dividirIndicacion).map(limpiarIndicacion).filter(esIndicacionValida);
}

export function compactarSeccionesDetalle(secciones: any[]) {
  const mapa = new Map();
  secciones.forEach((seccion) => {
    const clave = normalizarTextoPadres(seccion.titulo);
    const previa = mapa.get(clave);
    if (previa) {
      previa.items = quitarDuplicadosTexto([...previa.items, ...seccion.items]);
      return;
    }
    mapa.set(clave, {
      titulo: seccion.titulo,
      items: quitarDuplicadosTexto(seccion.items),
    });
  });
  return [...mapa.values()];
}

export function seccionarTextoFormato(texto: any, tituloBase: string) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  if (!lineas.length) return [];

  const secciones = [];
  let actual = { titulo: tituloBase, items: [] as any[] };

  lineas.forEach((linea) => {
    const titulo = detectarTituloDetalle(linea);
    if (titulo) {
      if (actual.items.length) secciones.push(actual);
      actual = { titulo, items: [] };
      return;
    }
    const item = limpiarIndicacion(linea);
    if (item) actual.items.push(item);
  });

  if (actual.items.length) secciones.push(actual);
  return compactarSeccionesDetalle(secciones);
}

export function detectarTituloDetalle(linea: string) {
  const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
  if (/^ventajas\b/.test(normal)) return "Ventajas";
  if (/^nota\b/.test(normal)) return "Nota";
  if (/^requisitos\b/.test(normal)) return "Requisitos";
  if (/^indicaciones\b/.test(normal)) return "Indicaciones";
  if (/^la modalidad de ingreso\b/.test(normal) || /^modalidad de ingreso\b/.test(normal)) return "Modalidad de ingreso";
  if (/^el programa de preparacion\b/.test(normal) || /^ciclo\b/.test(normal)) return "Ciclos";
  if (/^precio por ciclo\b/.test(normal)) return "Precio por ciclo";
  if (/^horarios?\b/.test(normal)) return "Horario";
  if (/^incluye\b/.test(normal)) return "Incluye";
  if (/^modalidades de inscripcion\b/.test(normal)) return "Modalidades de inscripción";
  if (/^opcion a\b/.test(normal)) return "Inscripción presencial";
  if (/^opcion b\b/.test(normal)) return "Inscripción virtual";
  if (/^materiales\b/.test(normal) || normal.includes("traer los siguientes utiles")) return "Útiles";
  if (/^el almuerzo\b/.test(normal) || /^almuerzo\b/.test(normal)) return "Almuerzo";
  if (normal.startsWith("si deseara coordinar")) return "Concesionarios";
  if (/^costo\b/.test(normal) || /^precio\b/.test(normal)) return "Costo";
  return "";
}

export function esTituloSeccionWord(texto: string) {
  const normal = normalizarTextoPadres(texto).replace(/[:.]+$/g, "");
  return /^(club de tareas|duracion|duración|requisitos|costo|el almuerzo|almuerzo|acepto|datos del alumno|datos del apoderado|ventajas|nota|traer los siguientes utiles|materiales)$/.test(normal);
}

export function extraerBloquePorMarcadoresWord(texto: string, titulo: string, inicios: string[], finales: string[] = []) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    return inicios.some((item) => normal.startsWith(normalizarTextoPadres(item)));
  });
  if (inicio === -1) return null;

  const items = [];
  for (const linea of lineas.slice(inicio)) {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    const esInicio = inicios.some((item) => normal.startsWith(normalizarTextoPadres(item)));
    const esFinal = !esInicio && finales.some((item) => normal.startsWith(normalizarTextoPadres(item)));
    if (esFinal) break;

    const textoItem = limpiarIndicacion(linea.replace(new RegExp(`^\\s*${titulo}\\s*:?\\s*`, "i"), ""));
    if (!textoItem) continue;
    if (esTituloSeccionWord(textoItem)) continue;
    if (esInicio && normalizarTextoPadres(textoItem) === normalizarTextoPadres(titulo)) continue;
    items.push(textoItem);
  }

  return { titulo, items: quitarDuplicadosTexto(items) };
}

export function extraerAlmuerzoWord(texto: string) {
  const lineas = limpiarTextoFormato(texto).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => normalizarTextoPadres(linea).includes("contamos con un area"));
  if (inicio === -1) {
    return extraerBloquePorMarcadoresWord(texto, "Almuerzo", ["el almuerzo", "almuerzo"], ["atentamente", "entregar este formato", "acepto", "datos del alumno"]);
  }

  const items = [];
  for (const linea of lineas.slice(inicio)) {
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    if (/^(atentamente|entregar este formato|acepto|datos del alumno|datos del apoderado)\b/.test(normal)) break;
    if (/^(clases|nivel|dia|almuerzo|el almuerzo|costo|requisitos|pago unico|de)$/i.test(normal)) continue;
    if (/^\d+\s*(primaria|secundaria|inicial)\b/.test(normal)) continue;
    if (/^(primaria|secundaria|inicial)\s+\d+\b/.test(normal)) continue;
    if (normal.includes("clase") && normal.includes("almuerzo") && /\d{1,2}:\d{2}/.test(linea)) continue;

    const item = limpiarIndicacion(
      linea
        .replace(/\b\d{10,}\b/g, "")
        .replace(/\s+/g, " ")
    );
    if (item) items.push(item);
  }

  return { titulo: "Almuerzo", items: quitarDuplicadosTexto(items) };
}

export function esLineaMensajeColegio(linea: string) {
  const normal = normalizarTextoPadres(linea);
  return /\b(reciba|nos dirigimos|en este sentido)\b/.test(normal);
}

export function esCabeceraWord(linea: string) {
  const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
  return (
    normal.includes("ano de la esperanza") ||
    /^comunicado\s+cmsr\b/.test(normal) ||
    /^comunicado$/.test(normal) ||
    /^carabayllo$/.test(normal)
  );
}

export function debeUnirseLineaWord(previo: string, actual: string) {
  const anterior = String(previo || "").trim();
  const siguiente = String(actual || "").trim();
  if (!anterior || !siguiente) return false;
  if (/[.!?;:]$/.test(anterior)) return false;
  if (/^(nos dirigimos|en este sentido|reciba)\b/i.test(siguiente)) return false;
  return /^[a-zÃ¡Ã©Ã­Ã³ÃºÃ±]/i.test(siguiente);
}

export function unirLineasCortadasWord(lineas: any[]) {
  const resultado: string[] = [];

  lineas.forEach((linea) => {
    const actual = String(linea || "").trim();
    if (!actual) return;

    const previo = resultado[resultado.length - 1] || "";
    if (previo && debeUnirseLineaWord(previo, actual)) {
      resultado[resultado.length - 1] = `${previo} ${actual}`.replace(/\s+/g, " ").trim();
      return;
    }
    resultado.push(actual);
  });

  return resultado;
}

export function extraerMensajePrincipalWord(texto: string) {
  const limpio = limpiarCierreFormularioWord(texto);
  const lineas = limpiarTextoFormato(limpio).split("\n").map((linea) => linea.trim()).filter(Boolean);
  const inicio = lineas.findIndex((linea) => esLineaMensajeColegio(linea));
  const desdeMensaje = inicio === -1 ? lineas.filter((linea) => !esCabeceraWord(linea)) : lineas.slice(inicio);
  if (desdeMensaje[0]) {
    desdeMensaje[0] = desdeMensaje[0].replace(/^.*?\b(Reciba|Nos dirigimos|En este sentido)\b/i, "$1").trim();
  }
  const corte = desdeMensaje.findIndex((linea, index) => {
    if (index === 0 && esLineaMensajeColegio(linea)) return false;
    const normal = normalizarTextoPadres(linea).replace(/[:.]+$/g, "");
    return /^(club de tareas|ciclo|duracion|duración|a continuacion|requisitos|costo|el almuerzo|almuerzo)\b/.test(normal);
  });
  const principales = (corte === -1 ? desdeMensaje : desdeMensaje.slice(0, corte))
    .filter((linea) => !esCabeceraWord(linea));
  return unirLineasCortadasWord(principales).join("\n\n");
}

export function obtenerDetalleFormatoDesdeWord(texto: string) {
  const limpio = limpiarCierreFormularioWord(texto);
  const secciones = [
    extraerBloquePorMarcadoresWord(limpio, "Ventajas", ["ventajas"], ["nota", "traer los siguientes utiles", "requisitos", "costo"]),
    extraerBloquePorMarcadoresWord(limpio, "Nota", ["nota"], ["traer los siguientes utiles", "requisitos", "costo"]),
    extraerBloquePorMarcadoresWord(limpio, "Requisitos", ["traer los siguientes utiles", "requisitos", "materiales"], ["costo"]),
    extraerBloquePorMarcadoresWord(limpio, "Costo", ["costo"], ["el almuerzo", "almuerzo"]),
    extraerAlmuerzoWord(limpio),
  ].filter(Boolean);

  return compactarSeccionesDetalle(secciones).filter((seccion) => seccion.items.length);
}

export function obtenerDetalleFormatoPadres(programa: any) {
  let secciones = [
    ...seccionarTextoFormato(programa?.requisitos, "Requisitos"),
    ...seccionarTextoFormato(programa?.detalleCosto, "Costo"),
    ...seccionarTextoFormato(programa?.detalleAlmuerzo, "Almuerzo"),
    ...seccionarTextoFormato(programa?.concesionarios, "Almuerzo"),
  ];

  secciones = secciones.map((sec) => {
    const normal = normalizarTextoPadres(sec.titulo);
    if (normal.includes("almuerzo") || normal.includes("concesionario") || normal.includes("detalle del formato")) {
      return { ...sec, titulo: "Almuerzo" };
    }
    return sec;
  });

  return compactarSeccionesDetalle(secciones).filter((seccion) => seccion.items.length);
}

export function limpiarComunicadoWord(texto: string, datos: any) {
  const limpio = repararTexto(reemplazarVariablesComunicado(texto, datos.datos || {}))
    .replace(/\{\{\s*TITULO\s*\}\}/gi, datos.programa)
    .replace(/\{\{\s*FECHA\s*\}\}/gi, "")
    .replace(/\{\{\s*AREA\s*\}\}/gi, datos.area)
    .replace(/\{\{\s*PROG\s*\}\}/gi, datos.programa)
    .replace(/\barea de\s*,/gi, `area de ${datos.area},`)
    .replace(/\barea de\s+hemos/gi, `area de ${datos.area}, hemos`)
    .replace(/\baula\s*,/gi, `aula ${datos.programa},`)
    .replace(/\baula\s+la cual/gi, `aula ${datos.programa}, la cual`)
    .replace(/\d{10,}\s*:\s*Del\s+al\s*\./gi, "")
    .replace(/\b\d{10,}\b/g, "")
    .replace(/\s+(DURACI[OÓ]N|REQUISITOS|COSTO|EL ALMUERZO|ACEPTO|DATOS DEL ALUMNO|DATOS DEL APODERADO)\s*:?/gi, "\n$1:")
    .replace(/\s+([,.])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return limpiarCierreFormularioWord(limpio);
}

export function textoIncluyeSeccionesDePrograma(texto: string) {
  const normal = normalizarTextoPadres(texto);
  const marcadores = [
    /\brequisitos?\b/,
    /\bcosto\b/,
    /\bpago unico\b/,
    /\bel almuerzo\b/,
    /\bentregar este formato\b/,
    /\bdatos del alumno\b/,
    /\bacepto\b/,
  ];
  return marcadores.filter((patron) => patron.test(normal)).length >= 2;
}
