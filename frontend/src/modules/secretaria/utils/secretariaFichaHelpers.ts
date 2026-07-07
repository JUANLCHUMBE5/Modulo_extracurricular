import {
  calcularDuracionTexto as calcularDuracionFechas,
  normalizarFecha,
} from "../../../services/dateService";

export function cleanFallbackText(value: any) {
  if (value === undefined || value === null) return "";
  const str = String(value).trim();
  const lower = str.toLowerCase();

  if (
    lower === "no definido" ||
    lower === "no definido." ||
    lower === "no registrado" ||
    lower === "no registrado." ||
    lower === "sin codigo" ||
    lower === "sin código" ||
    lower === "sin código."
  ) {
    return "";
  }

  if (
    lower === "horario no configurado para este grado" ||
    lower === "horario no configurado para este grado."
  ) {
    return "Por confirmar";
  }

  return str;
}

export function base64ToArrayBuffer(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function escaparHtml(valor: any): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escaparXml(valor: any): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function escaparRegExp(valor: string): string {
  return String(valor || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function procesarTextoComunicado(texto: string, estudiante: any, inscripcion: any) {
  let resultado = String(texto || "");
  const mapa = {
    ALUMNO: cleanFallbackText(inscripcion.nombresEstudiante || estudiante.nombres),
    GRADO: cleanFallbackText(estudiante.grado),
    SECCION: cleanFallbackText(estudiante.seccion),
    PROGRAMA: cleanFallbackText(inscripcion.programa || inscripcion.tallerNombre),
    COSTO: cleanFallbackText(inscripcion.costo),
    HORARIO: cleanFallbackText(inscripcion.horario),
  };

  Object.entries(mapa).forEach(([key, val]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    resultado = resultado.replace(regex, val);
  });

  return resultado;
}

export function formatearFechaFicha(fecha: any) {
  if (!fecha) return "";
  const d = normalizarFecha(fecha);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatearFechaValor(valor: any) {
  if (!valor) return "—";
  const d = normalizarFecha(valor);
  if (!d) return "—";
  return formatearFechaFicha(d);
}

export function normalizarNombreArchivo(valor: any): string {
  return String(valor || "archivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "archivo";
}

export function normalizarComparacion(valor: any): string {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarSeleccionCambridge(valor: any) {
  const texto = normalizarComparacion(valor).replace(/[^abc]/g, "");
  return texto.charAt(0).toUpperCase();
}

export function describirSeleccionCambridgeFicha(valor = "") {
  const seleccion = normalizarSeleccionCambridge(valor);
  const opciones: any = {
    A: "A - Promovido/a por Certificado Oficial 2025",
    B: "B - Ingresante por Admission Test",
    C: "C - Ingresante por Desempeño Académico",
  };
  return opciones[seleccion] || "Pendiente de definir";
}

export function esFichaCambridge(ficha: any) {
  return normalizarComparacion([
    ficha?.programa?.nombre,
    ficha?.programa?.plantilla,
  ].filter(Boolean).join(" ")).includes("cambridge");
}

export function extraerDiasHorario(horario: any) {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const texto = normalizarComparacion(horario);
  return dias
    .filter((dia) => texto.includes(normalizarComparacion(dia)))
    .join(", ");
}

export function extraerHorasHorario(horario: any) {
  const matches = [...String(horario || "").matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((match) => {
      const minuto = match[2] || "00";
      return formatearHoraDocumento(`${match[1]}:${minuto}`);
    });

  return matches.length >= 2 ? `${matches[0]} a ${matches[1]}` : "";
}

export function extraerAlmuerzoHorario(horario: any) {
  const match = String(horario || "").match(/almuerzo\s+([^,·/]+)/i);
  return formatearRangoHoraTexto(match?.[1]?.trim() || "");
}

export function formatearMesEvaluacion(valor: any) {
  const fecha = normalizarFecha(valor) || new Date();
  return new Intl.DateTimeFormat("es-PE", { month: "long" }).format(fecha);
}

export function coincideGradoDocumento(valorGrupo: any, gradoAlumno: any) {
  const grupo = descomponerGradoDocumento(valorGrupo);
  const alumno = descomponerGradoDocumento(gradoAlumno);
  if (!grupo.numero || !alumno.numero) return false;
  if (grupo.numero !== alumno.numero) return false;
  return !grupo.nivel || !alumno.nivel || grupo.nivel === alumno.nivel;
}

export function descomponerGradoDocumento(valor: any) {
  const texto = normalizarComparacion(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/) ? (texto.match(/\d+/) as any[])[0] : "";
  return { nivel, numero };
}

export function formatearGradoDocumento(valor: any) {
  const texto = String(valor || "").replace(/^(Inicial|Primaria|Secundaria):/i, "").trim();
  if (!texto) return "";
  const numero = texto.match(/\d+/) ? (texto.match(/\d+/) as any[])[0] : null;
  if (normalizarComparacion(valor).includes("inicial") && numero) return `INICIAL ${numero} AÑOS`;
  if (/años?/i.test(texto)) return texto.toUpperCase();
  if (!numero) return texto.toUpperCase();
  return `${numero}°GRADO`;
}

export function formatearRangoHoraDocumento(inicio: any, fin: any) {
  if (!inicio || !fin) return "";
  return `${formatearHoraDocumento(inicio)} a ${formatearHoraDocumento(fin)}`;
}

export function formatearRangoHoraTexto(valor: any) {
  const horas = [...String(valor || "").matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi)]
    .map((match) => formatearHoraDocumento(`${match[1]}:${match[2] || "00"}`));
  if (horas.length >= 2) return `${horas[0]} a ${horas[1]}`;
  return String(valor || "").replace(/\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\b/gi, "").trim();
}

export function formatearHoraDocumento(valor: any) {
  const match = String(valor || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return valor || "";
  const hora = Number(match[1]);
  const minutos = match[2];
  const hora12 = hora > 12 ? hora - 12 : hora || 12;
  return `${hora12}:${minutos}`;
}

export function calcularDuracionTexto(inicio: any, fin: any) {
  return calcularDuracionFechas(inicio, fin);
}

export function obtenerNombrePeriodo(periodo: any) {
  return String(periodo || "").toLowerCase().includes("verano")
    ? "Ciclo verano"
    : "Año escolar";
}

export function formatearNivelesDocumento(grados = []) {
  return (Array.isArray(grados) ? grados : [])
    .map(formatearGradoDocumento)
    .filter(Boolean)
    .join(", ");
}

export function obtenerInfoGrado(gradoStr: any) {
  const texto = String(gradoStr || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let nivel = "primaria";
  if (texto.includes("inicial") || texto.includes("ano") || texto.includes("anos")) {
    nivel = "inicial";
  } else if (texto.includes("secundaria") || texto.includes("sec")) {
    nivel = "secundaria";
  }

  const match = texto.match(/\d+/);
  const numero = match ? parseInt(match[0], 10) : null;

  return { nivel, numero, original: gradoStr };
}

export function agruparGradosConsecutivos(gradosArray: any[]) {
  if (!Array.isArray(gradosArray) || gradosArray.length === 0) return [];

  const parsed = gradosArray.map(g => obtenerInfoGrado(g));

  const levels: any = { inicial: [], primaria: [], secundaria: [] };
  parsed.forEach(p => {
    if (levels[p.nivel]) {
      levels[p.nivel].push(p);
    } else {
      levels.primaria.push(p);
    }
  });

  const subgroups: any[] = [];

  ["inicial", "primaria", "secundaria"].forEach(levelName => {
    const items = levels[levelName];
    if (items.length === 0) return;

    items.sort((a: any, b: any) => {
      const numA = a.numero === null ? 99 : a.numero;
      const numB = b.numero === null ? 99 : b.numero;
      return numA - numB;
    });

    let currentRun: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      if (currentRun.length === 0) {
        currentRun.push(current);
      } else {
        const last = currentRun[currentRun.length - 1];
        if (
          current.numero !== null &&
          last.numero !== null &&
          current.numero === last.numero + 1
        ) {
          currentRun.push(current);
        } else {
          subgroups.push(currentRun.map(r => r.original));
          currentRun = [current];
        }
      }
    }
    if (currentRun.length > 0) {
      subgroups.push(currentRun.map(r => r.original));
    }
  });

  return subgroups;
}

export function crearHorarioDocumento(inscripcion: any, estudiante: any) {
  const grupos = Array.isArray(inscripcion?.horariosPorGrupo) ? inscripcion.horariosPorGrupo : [];
  const gradoAlumno = inscripcion?.gradoEstudiante || inscripcion?.grado || estudiante?.grado || "";
  const grupo = grupos.find((item) => (item.grados || []).some((grado) => coincideGradoDocumento(grado, gradoAlumno)));
  const gradoDelTurno = grupo?.grados?.find((grado) => coincideGradoDocumento(grado, gradoAlumno)) || gradoAlumno;
  const nivelesTurno = gradoDelTurno ? [formatearGradoDocumento(gradoDelTurno)] : [];
  if (!grupo) {
    return {
      dia: extraerDiasHorario(inscripcion?.horario),
      almuerzo: extraerAlmuerzoHorario(inscripcion?.horario),
      clase: extraerHorasHorario(inscripcion?.horario),
      aula: inscripcion?.aula || "",
      niveles: nivelesTurno,
    };
  }

  return {
    dia: grupo.dia || "",
    almuerzo: formatearRangoHoraDocumento(grupo.almuerzoInicio, grupo.almuerzoFin),
    clase: formatearRangoHoraDocumento(grupo.horaInicio, grupo.horaFin),
    aula: grupo.aula || "",
    niveles: nivelesTurno,
  };
}

export function crearFilasHorarioDocumento(inscripcion: any, estudiante: any, horarioRespaldo: any) {
  const grupos = Array.isArray(inscripcion?.horariosPorGrupo) ? inscripcion.horariosPorGrupo : [];
  const gradoAlumno = inscripcion?.gradoEstudiante || inscripcion?.grado || estudiante?.grado || "";

  const gruposFiltrados = grupos.filter((item) =>
    (item.grados || []).some((grado) => coincideGradoDocumento(grado, gradoAlumno))
  );

  const gruposAMostrar = gruposFiltrados.length > 0 ? gruposFiltrados : grupos;

  const filas = gruposAMostrar
    .map((grupo) => ({
      nivel: formatearNivelesDocumento(grupo.grados),
      dia: grupo.dia || "",
      almuerzo: formatearRangoHoraDocumento(grupo.almuerzoInicio, grupo.almuerzoFin),
      clase: formatearRangoHoraDocumento(grupo.horaInicio, grupo.horaFin),
    }))
    .filter((fila) => fila.nivel || fila.dia || fila.almuerzo || fila.clase);

  if (filas.length) return filas;

  const gradoAlumnoRespaldo = inscripcion?.gradoEstudiante || inscripcion?.grado || estudiante?.grado || "";
  return [{
    nivel: horarioRespaldo.niveles[0] || formatearGradoDocumento(gradoAlumnoRespaldo),
    dia: horarioRespaldo.dia || extraerDiasHorario(inscripcion?.horario),
    almuerzo: horarioRespaldo.almuerzo || extraerAlmuerzoHorario(inscripcion?.horario),
    clase: horarioRespaldo.clase || extraerHorasHorario(inscripcion?.horario),
  }];
}

export function obtenerFilaHorario(filas: any[], index: number) {
  return filas[index] || {
    nivel: "",
    dia: "",
    almuerzo: "",
    clase: "",
  };
}
