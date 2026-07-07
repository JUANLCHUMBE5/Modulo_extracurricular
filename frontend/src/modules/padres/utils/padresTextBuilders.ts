import { obtenerVentanaInscripcion, formatearFechaPeru } from "../../../services/dateService";
import {
  formatearRangoFechasPadres,
  describirSeleccionCambridgePadres,
} from "./padresTextUtils";
import {
  repararTexto,
  extraerIndicacionesDesdeTexto,
  quitarDuplicadosTexto,
  normalizarTextoPadres,
  obtenerAreaPrograma,
} from "./padresTextParsing";

export function crearComunicadoCambridgePadres(programa: any, estudiante: any, titulo: string) {
  const alumno = estudiante?.nombres || "su menor hijo(a)";
  const aula = estudiante?.grado || "";
  const vigencia = formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin);
  const horario = repararTexto(String(programa?.horario || "").trim()) || "Por confirmar";
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const modalidad = programa?.modalidadCobro ? `Modalidad de pago: ${programa.modalidadCobro}` : "";
  const datosCambridge = obtenerDatosCambridgePadres(programa, estudiante);
  const nivelCambridge = datosCambridge?.nivelCambridge ? ` en el nivel ${datosCambridge.nivelCambridge}` : "";
  const ingresoCambridge = datosCambridge?.seleccion
    ? `Modalidad Cambridge asignada: ${describirSeleccionCambridgePadres(datosCambridge.seleccion)}.`
    : "";

  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const limiteTexto = ventana.fechaLimite
    ? `Habilitado para inscripción en línea hasta el ${ventana.fechaLimite} a las ${ventana.horaLimite}.`
    : "";

  const parrafos = [
    `En nuestra institución estamos comprometidos con la formación integral de nuestros estudiantes y con una enseñanza sólida del idioma inglés. Por ello, invitamos a ${alumno}${aula ? ` del aula ${aula}` : ""} a participar en ${titulo}${nivelCambridge}.`,
  ];

  if (ingresoCambridge) {
    parrafos.push(ingresoCambridge);
  }

  parrafos.push(
    "El programa de Preparación Cambridge fortalece las habilidades necesarias para rendir una certificación internacional reconocida y brinda acompañamiento mediante clases especializadas, materiales de preparación y simulacros del examen.",
    `Horario: ${horario}`,
    `Vigencia: ${vigencia}`,
    `Costo: ${costo}`
  );

  if (modalidad) {
    parrafos.push(modalidad);
  }
  if (limiteTexto) {
    parrafos.push(`Plazo de inscripción: ${limiteTexto}`);
  }

  return parrafos;
}

export function crearComunicadoBasicoPadres(programa: any, estudiante: any, titulo: string) {
  const alumno = estudiante?.nombres || "el estudiante";
  const vigencia = formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin);
  const horario = repararTexto(String(programa?.horario || "").trim()) || "Por confirmar";
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const responsable = repararTexto(String(programa?.responsable || programa?.docente || "").trim());

  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const limiteTexto = ventana.fechaLimite
    ? `Habilitado para confirmación en línea hasta el ${ventana.fechaLimite} a las ${ventana.horaLimite}.`
    : "";

  const esDeportivo = (Array.isArray(programa?.talleresDeportivos) && programa.talleresDeportivos.length > 0) ||
    String(programa?.nombre || "").toLowerCase().includes("deport") ||
    String(programa?.nombre || "").toLowerCase().includes("deprot") ||
    String(programa?.programa || "").toLowerCase().includes("deport") ||
    String(programa?.programa || "").toLowerCase().includes("deprot");

  const parrafos = [
    `El colegio informa que ${alumno} tiene disponible el programa ${titulo}.`,
    `Horario: ${horario}`,
    `Vigencia: ${vigencia}`,
  ];

  if (!esDeportivo) {
    if (responsable) {
      parrafos.push(`Responsable del programa: ${responsable}`);
    } else {
      parrafos.push("Responsable del programa: La coordinación del programa brindará las indicaciones necesarias antes del inicio.");
    }
  }

  parrafos.push(`Costo: ${costo}`);

  if (limiteTexto) {
    parrafos.push(`Plazo de inscripción: ${limiteTexto}`);
  }

  parrafos.push(
    "Revise esta información y confirme la aceptación para continuar con la inscripción."
  );

  return parrafos;
}

export function crearComunicadoClubTareasPadres(programa: any, estudiante: any, titulo: string, area: string) {
  const alumno = estudiante?.nombres || "el estudiante";
  const grado = estudiante?.grado || "";
  const vigencia = formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin);
  const horario = repararTexto(String(programa?.horario || "").trim()) || "Por confirmar";
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const modalidad = programa?.modalidadCobro ? `Modalidad de cobro: ${programa.modalidadCobro}` : "";
  const responsable = repararTexto(String(programa?.responsable || programa?.docente || "").trim());

  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const limiteTexto = ventana.fechaLimite
    ? `Habilitado en línea hasta el ${ventana.fechaLimite} a las ${ventana.horaLimite}.`
    : "";

  const parrafos = [
    `El colegio informa que ${alumno}${grado ? ` del aula ${grado}` : ""} tiene disponible el ${titulo}, orientado al acompañamiento y refuerzo de tareas del área de ${area}.`,
    `Horario: ${horario}`,
    `Vigencia: del ${vigencia.replace(/^Del\s+/i, "")}`,
  ];

  if (responsable) {
    parrafos.push(`Responsable del programa: ${responsable}`);
  } else {
    parrafos.push("Responsable del programa: Coordinación Académica comunicará el responsable asignado antes del inicio.");
  }

  parrafos.push(`Costo: ${costo}`);

  if (modalidad) {
    parrafos.push(modalidad);
  }
  if (limiteTexto) {
    parrafos.push(`Plazo de inscripción: ${limiteTexto}`);
  }

  parrafos.push(
    "La familia debe revisar esta información y confirmar la aceptación para continuar con la inscripción."
  );

  return parrafos;
}

export function obtenerDatosCambridgePadres(programa: any, estudiante: any) {
  const seleccion = String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase();
  const nivelCambridge = String(programa?.nivelCambridge || estudiante?.nivelCambridge || "").trim();
  if (!seleccion && !nivelCambridge) return null;
  return { seleccion, nivelCambridge };
}

export function obtenerIndicacionesProgramaPadres(programa: any, { esCambridge = false, esClubTareas = false } = {}) {
  const desdeFormato = [
    ...extraerIndicacionesDesdeTexto(programa?.requisitos),
    ...extraerIndicacionesDesdeTexto(programa?.detalleAlmuerzo, { soloSeccion: true }),
    ...extraerIndicacionesDesdeTexto(programa?.detalleCosto, { soloSeccion: true }),
    ...extraerIndicacionesDesdeTexto(programa?.comunicado, { soloSeccion: true }),
  ];
  const indicaciones = quitarDuplicadosTexto(desdeFormato).slice(0, 6);
  if (indicaciones.length) return indicaciones;

  if (esCambridge) {
    return [
      "Debe revisar y llevar los materiales de preparación Cambridge solicitados por el docente.",
      "Debe participar en los simulacros y actividades programadas para la certificación.",
    ];
  }

  if (esClubTareas) {
    return [
      "El estudiante debe asistir con sus cuadernos, libros o tareas pendientes del área correspondiente.",
      "La familia debe verificar el horario asignado antes de confirmar la inscripción.",
      "El pago se registra según la modalidad indicada por el colegio.",
    ];
  }

  return ["Revise el resumen del programa, confirme el horario y continúe con los datos del apoderado."];
}

function convertirHorasAMPM(texto: any) {
  if (!texto) return "";
  const timeRegex = /\b(\d{1,2}):(\d{2})\b(?:\s*([AP]M|a\.m\.|p\.m\.|am|pm)(?!\w))?/gi;
  let result = String(texto).replace(timeRegex, (match, hh, mm, suffix) => {
    let hours = parseInt(hh, 10);
    const minutes = mm;
    let ampm = "";
    if (suffix) {
      const s = suffix.toLowerCase();
      if (s.includes("p")) {
        ampm = "PM";
      } else {
        ampm = "AM";
      }
    } else {
      ampm = hours >= 12 ? "PM" : "AM";
    }
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  });

  result = result.replace(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/gi, "$1 - $2");
  result = result.replace(/\s*-\s*(aula|AULA)\s*/i, " · Aula ");
  return result;
}

function formatearHorarioParaResumen(horario: any) {
  if (!horario) return "";
  let texto = String(horario).trim();

  const gradeRegex = /^(?:(?:inicial|primaria|secundaria)[\s:]*\d+|\d+\s*(?:inicial|primaria|secundaria))[\s:]*/i;
  texto = texto.replace(gradeRegex, "").trim();

  const partesAlm = texto.match(/^([^,]+?)\s+almuerzo\s+([^,]+),\s*clase\s+(.+)$/i);
  if (partesAlm) {
    const dia = partesAlm[1].trim();
    const almuerzo = partesAlm[2].trim();
    const clase = partesAlm[3].trim();
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    return `${diaCap} · Almuerzo: ${convertirHorasAMPM(almuerzo)} · Clase: ${convertirHorasAMPM(clase)}`;
  }

  const partesClase = texto.match(/^([^,]+?)\s+clase\s+(.+)$/i);
  if (partesClase) {
    const dia = partesClase[1].trim();
    const clase = partesClase[2].trim();
    const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
    return `${diaCap} · Clase: ${convertirHorasAMPM(clase)}`;
  }

  return convertirHorasAMPM(texto);
}

export function resumirComunicadoPadres(parrafos: any[], programa: any, detalleFormato: any[]) {
  const resumen = [];
  const tieneTalleres = Array.isArray(programa?.talleresDeportivos) && programa.talleresDeportivos.length > 0;

  if (tieneTalleres) {
    // For programs with structured talleres, show clean summary instead of raw schedule
    const niveles = Array.from(new Set(programa.talleresDeportivos.map((t: any) => t.nivel).filter(Boolean)));
    const deportes = Array.from(new Set(programa.talleresDeportivos.map((t: any) => t.deporte).filter(Boolean)));

    if (niveles.length > 0) {
      resumen.push(`Modalidad: ${niveles.join(", ")}`);
    }
    if (deportes.length > 0) {
      resumen.push(`Disponibles: ${deportes.join(", ")}`);
    }
  } else if (programa?.horario) {
    resumen.push(`Horario: ${formatearHorarioParaResumen(programa.horario)}`);
  }

  if (programa?.fechaInicio) {
    const fechaObj = new Date(programa.fechaInicio + "T00:00:00");
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diaSemana = dias[fechaObj.getDay()] || "";
    const dd = String(fechaObj.getDate()).padStart(2, "0");
    const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
    resumen.push(`Inicio: ${diaSemana}, ${dd}/${mm}`);
  }
  if (programa?.fechaFin) {
    resumen.push(`Límite: ${formatearRangoFechasPadres(programa.fechaInicio, programa.fechaFin).replace(/^Del\s+\d+.*?al\s+/i, "")}`);
  }
  if (Number(programa?.costo || 0) > 0) {
    resumen.push(`Costo: S/ ${Number(programa.costo).toFixed(2)}`);
  }
  return resumen;
}

export function crearDatosComunicadoPadres(programa: any, estudiante: any, titulo: string) {
  const ventana = obtenerVentanaInscripcion(
    programa?.fechaInicio,
    new Date(),
    programa?.duracionAvisoDias,
    programa?.horaLimiteAviso,
    programa
  );
  const costo = Number(programa?.costo || 0) > 0 ? `S/ ${Number(programa.costo).toFixed(2)}` : "Por confirmar";
  const grado = programa?.grado || programa?.gradoEstudiante || estudiante?.grado || "";
  return {
    TITULO: titulo,
    FECHA: "",
    FECHA_CARTA: "",
    ANIO_CARTA: new Date().getFullYear(),
    ANIO_CERT: new Date().getFullYear(),
    AREA: obtenerAreaPrograma(programa?.area || titulo),
    PROG: titulo,
    PROGRAMA: titulo,
    ALU: estudiante?.nombres || programa?.nombresEstudiante || "el estudiante",
    ALUMNO: estudiante?.nombres || programa?.nombresEstudiante || "el estudiante",
    AUL: grado || "Por definir",
    AULA: grado || "Por definir",
    GR_SEC: grado || "Por definir",
    GRADO: grado || "Por definir",
    NIV: programa?.nivelEducativo || estudiante?.nivel || estudiante?.nivelEducativo || "",
    NIVEL: programa?.nivelEducativo || estudiante?.nivel || estudiante?.nivelEducativo || "",
    HORARIO: repararTexto(programa?.horario || "Por confirmar"),
    DIA: repararTexto(programa?.dia || ""),
    DIAS: repararTexto(programa?.dias || ""),
    ALM: "",
    ALM_1: "",
    ALM_2: "",
    CLASE: repararTexto(programa?.horario || ""),
    CLASE_1: repararTexto(programa?.horario || ""),
    CLASE_2: "",
    HOR_ALM: "",
    HOR_ALM_1: "",
    HOR_ALM_2: "",
    DOCENTE: programa?.responsable || programa?.docente || "Por definir",
    RESPONSABLE: programa?.responsable || programa?.docente || "Por definir",
    COSTO: costo,
    PAGO: programa?.modalidadCobro || "Por confirmar",
    INI: programa?.fechaInicio ? formatearFechaPeru(programa.fechaInicio, programa.fechaInicio) : "",
    FIN: programa?.fechaFin ? formatearFechaPeru(programa.fechaFin, programa.fechaFin) : "",
    DUR: programa?.duracionTaller || formatearRangoFechasPadres(programa?.fechaInicio, programa?.fechaFin),
    CICLO: programa?.cicloI || "",
    CICLO_I: programa?.cicloI || "",
    CICLO_II: programa?.cicloII || "",
    MES_EVAL: "",
    N1: grado || "",
    N2: "",
    N3: "",
    N4: "",
    NIVEL_1: grado || "",
    NIVEL_2: "",
    NIVEL_CAMBRIDGE: programa?.nivelCambridge || estudiante?.nivelCambridge || "",
    SELECCION: describirSeleccionCambridgePadres(programa?.seleccion || estudiante?.seleccion || ""),
    CHK_A: String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase() === "A" ? "X" : "",
    CHK_B: String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase() === "B" ? "X" : "",
    CHK_C: String(programa?.seleccion || estudiante?.seleccion || "").trim().toUpperCase() === "C" ? "X" : "",
    FECHA_LIMITE: ventana?.fechaLimite || "",
    HORA_LIMITE: ventana?.horaLimite || "",
    APOD: "",
    CEL: "",
  };
}

export function reemplazarVariablesComunicado(texto: string, datos = {}) {
  let salida = String(texto || "");
  Object.entries(datos).forEach(([clave, valor]) => {
    const seguro = valor == null ? "" : String(valor);
    const patron = new RegExp(`\\{\\{\\s*${clave}\\s*\\}\\}|\\[\\[\\s*${clave}\\s*\\]\\]|\\{\\s*${clave}\\s*\\}`, "gi");
    salida = salida.replace(patron, seguro);
  });
  return salida.replace(/\{\{[^}]+\}\}|\[\[[^\]]+\]\]|\{[A-Z0-9_]+\}/gi, "");
}
