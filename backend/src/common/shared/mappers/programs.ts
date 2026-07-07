import { normalizarTextoApi } from "./normalization.js";

/**
 * Evalúa si un programa extracurricular tiene la información mínima suficiente para ser listado en el portal de padres.
 * @param programa Objeto que representa el programa/taller
 * @returns `true` si cuenta con la información necesaria, `false` en caso contrario
 */
export function programaListoParaPortalPadresApi(programa: any = {}): boolean {
  const esBorradorDeDocumento = Boolean(programa.creadoDesdeDocumento || programa.plantilla || programa.plantillaValidada);
  if (!esBorradorDeDocumento) return true;

  const horario = normalizarTextoApi(programa.horario);
  const grupo = normalizarTextoApi(programa.grupo);
  const tieneHorarioReal = Boolean(
    (Array.isArray(programa.horariosPorGrupo) && programa.horariosPorGrupo.length > 0) ||
    (horario && !["por definir", "por confirmar", "no definido"].includes(horario)) ||
    (grupo && !["por definir", "por confirmar", "no definido"].includes(grupo))
  );
  const tieneVigencia = Boolean(programa.fechaInicio && programa.fechaFin);
  const tieneCupos = Number(programa.cupos || 0) > 0;
  const tieneCosto = Number(programa.costo || programa.precio || 0) > 0;

  return tieneHorarioReal || tieneVigencia || tieneCupos || tieneCosto;
}

/**
 * Comprueba si un programa contiene configuraciones de horarios separadas por grupos/grados académicos.
 * @param programa Objeto del programa/taller
 * @returns `true` si tiene horarios desglosados en un array, `false` en caso contrario
 */
export function tieneHorariosPorGrupoApi(programa: any): boolean {
  return Array.isArray(programa?.horariosPorGrupo) && programa.horariosPorGrupo.length > 0;
}

/**
 * Descompone un string de grado escolar (ej: "3: Primaria" o "inicial 4 años") en su nivel académico y número.
 * @param valor Texto del grado
 * @returns Un objeto con `{ nivel, numero }`
 */
export function descomponerGradoApi(valor: any): { nivel: string; numero: string } {
  const texto = normalizarTextoApi(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

/**
 * Reconstruye el nombre completo de un grado escolar incluyendo el nivel de respaldo si no está presente en el string.
 * @param grado Nombre del grado
 * @param nivel Nivel académico (Primaria, Secundaria, Inicial)
 * @param respaldoGrado Grado de respaldo si el primero es vacío
 * @returns String consolidado (ej. "4 Primaria")
 */
export function obtenerGradoCompletoApi(grado: any, nivel: any, respaldoGrado: string = ""): string {
  let g = String(grado || "").trim();
  if (!g) return String(respaldoGrado || "").trim();
  const gLower = g.toLowerCase();
  if (!gLower.includes("primaria") && !gLower.includes("secundaria") && !gLower.includes("inicial")) {
    const n = String(nivel || "").trim();
    if (n) {
      g = `${g} ${n}`;
    }
  }
  return g;
}

/**
 * Compara el grado escolar configurado en un grupo de taller con el grado normalizado de un estudiante para ver si coinciden.
 * @param gradoGrupo Grado del grupo del taller
 * @param gradoAlumnoNormalizado Grado del alumno ya descompuesto en `{ nivel, numero }`
 * @returns `true` si el alumno pertenece al rango del grado del grupo
 */
export function coincideGradoApi(gradoGrupo: any, gradoAlumnoNormalizado: { nivel: string; numero: string } | null): boolean {
  const grupo = descomponerGradoApi(gradoGrupo);
  if (!grupo.numero || !gradoAlumnoNormalizado?.numero) return false;
  if (grupo.numero !== gradoAlumnoNormalizado.numero) return false;
  return !grupo.nivel || grupo.nivel === gradoAlumnoNormalizado.nivel;
}

/**
 * Evalúa si un programa con alcance masivo está disponible para el grado de un alumno.
 * @param programa Objeto del programa
 * @param gradoAlumno Grado escolar del alumno
 * @returns `true` si el alumno cumple con el alcance de la invitación masiva
 */
export function programaDisponibleParaAlcanceMasivoApi(programa: any, gradoAlumno: string = ""): boolean {
  const alcance = normalizarTextoApi(programa?.alcanceInvitacionMasiva || "colegio");
  if (!alcance || alcance === "colegio" || alcance === "todos") return true;

  const gradoNormalizado = descomponerGradoApi(gradoAlumno);
  if (!gradoNormalizado.nivel) return false;

  if (alcance === "primaria" || alcance === "secundaria" || alcance === "inicial") {
    return gradoNormalizado.nivel === alcance;
  }

  if (alcance === "grados" || alcance === "seleccionados") {
    const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
    if (!gradosAplicables.length || !gradoNormalizado.numero) return false;
    return gradosAplicables.some((grado: any) => coincideGradoApi(grado, gradoNormalizado));
  }

  return true;
}

/**
 * Evalúa si un programa en específico está habilitado para el grado escolar de un alumno determinado.
 * Filtra programas especiales como Cambridge y distribuciones de grupos.
 * @param programa Objeto del programa
 * @param gradoAlumno Grado escolar del alumno
 * @returns `true` si el programa está disponible para el alumno, `false` en caso contrario
 */
export function programaDisponibleParaGradoApi(programa: any, gradoAlumno: string = ""): boolean {
  if (esProgramaCambridgeApi(programa)) return false;
  if (programa?.invitacionMasiva) return programaDisponibleParaAlcanceMasivoApi(programa, gradoAlumno);

  if (tieneHorariosPorGrupoApi(programa)) {
    return Boolean(resolverHorarioPorGradoApi(programa, gradoAlumno));
  }

  const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
  if (!gradosAplicables.length) return true;

  const gradoNormalizado = descomponerGradoApi(gradoAlumno);
  if (!gradoNormalizado.numero) return false;

  return gradosAplicables.some((grado: any) => coincideGradoApi(grado, gradoNormalizado));
}

/**
 * Determina mediante análisis de texto (palabras clave en nombre, categoría, plantilla o variables) si un programa pertenece a la preparación/certificación internacional Cambridge.
 * @param programa Objeto del programa
 * @returns `true` si es un programa Cambridge, `false` si es ordinario
 */
export function esProgramaCambridgeApi(programa: any = {}): boolean {
  const variables = Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [];
  const texto = normalizarTextoApi([
    programa.nombre,
    programa.programa,
    programa.categoria,
    programa.tipoComunicado,
    programa.plantilla,
    ...variables,
  ].filter(Boolean).join(" "));

  return texto.includes("cambridge") ||
    texto.includes("cambrigde") ||
    texto.includes("cabringde") ||
    texto.includes("camringde") ||
    texto.includes("certificacion cam") ||
    texto.includes("ingles") ||
    texto.includes("ingless") ||
    texto.includes("certificacion") ||
    texto.includes("preparacion") ||
    variables.some((variable: any) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(String(variable || "").toLowerCase())
    );
}

/**
 * Formatea un string interno de grado (ej. "Primaria:3") a un formato legible por el usuario (ej. "Primaria 3").
 * @param valor Grado interno
 */
function formatearGradoApi(valor: any): string {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

/**
 * Resuelve y formatea el horario exacto, almuerzo y aula que le corresponde a un alumno según su grado en un taller con múltiples grupos.
 * @param programa Objeto del programa
 * @param gradoAlumno Grado escolar del alumno
 * @returns String formateado con el horario correspondiente (ej. "Primaria 3: Lunes almuerzo 2:20 PM-3:10 PM, clase 3:10 PM-4:40 PM · Aula A1")
 */
export function resolverHorarioPorGradoApi(programa: any, gradoAlumno: string = ""): string {
  const grupos = programa?.horariosPorGrupo || [];
  
  // Si no hay grupos, pero es un taller deportivo con talleresDeportivos
  if ((!Array.isArray(grupos) || grupos.length === 0) && Array.isArray(programa?.talleresDeportivos) && programa.talleresDeportivos.length > 0) {
    const matchGrado = String(gradoAlumno || "").match(/\d+/);
    const num = matchGrado ? parseInt(matchGrado[0], 10) : 6;
    let edad = num;
    const lowerGrado = String(gradoAlumno || "").toLowerCase();
    if (lowerGrado.includes("primaria")) {
      edad = num + 5;
    } else if (lowerGrado.includes("secundaria")) {
      edad = num + 11;
    } else if (lowerGrado.includes("inicial")) {
      edad = num;
    }
    if (edad < 6) {
      edad = 6;
    }

    const filtered = programa.talleresDeportivos.filter((t: any) => 
      edad >= Number(t.edadMinima || 0) && edad <= Number(t.edadMaxima || 99)
    );

    if (filtered.length > 0) {
      const diasMap: Record<string, string[]> = {};
      filtered.forEach((t: any) => {
        const dia = t.dia || "Sin dia";
        if (!diasMap[dia]) {
          diasMap[dia] = [];
        }
        const nivelLabel = t.nivel ? ` [${t.nivel}]` : "";
        diasMap[dia].push(`${t.deporte}${nivelLabel} (${t.edadMinima}-${t.edadMaxima} a.): ${t.horaInicio || ""}-${t.horaFin || ""}`);
      });

      return Object.entries(diasMap)
        .map(([dia, list]) => `${dia}: ${list.join(", ")}`)
        .join(" / ");
    }
  }

  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGradoApi(gradoAlumno);
  if (!gradoNormalizado.numero) return "";
  let gradoDelTurno = "";
  const grupo = grupos.find((item: any) => {
    gradoDelTurno = (item.grados || []).find((grado: any) => coincideGradoApi(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grados = formatearGradoApi(gradoDelTurno || gradoAlumno);
  const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const parts = timeStr.trim().split(":");
    if (parts.length < 2) return timeStr;
    let hrs = parseInt(parts[0], 10);
    const mins = parts[1].trim();
    if (isNaN(hrs)) return timeStr;
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12;
    if (hrs === 0) hrs = 12;
    return `${hrs}:${mins} ${ampm}`;
  };

  const almuerzoInicio = formatTime(grupo.almuerzoInicio || "14:20");
  const almuerzoFin = formatTime(grupo.almuerzoFin || "15:10");
  const horaInicio = formatTime(grupo.horaInicio || "");
  const horaFin = formatTime(grupo.horaFin || "");

  return `${grados ? `${grados}: ` : ""}${grupo.dia} almuerzo ${almuerzoInicio}-${almuerzoFin}, clase ${horaInicio}-${horaFin}${aula}`;
}

/**
 * Resuelve qué docente o responsable está a cargo del grupo correspondiente al grado del alumno.
 * @param programa Objeto del programa
 * @param gradoAlumno Grado del estudiante
 * @returns Nombre del docente asignado
 */
export function resolverDocentePorGradoApi(programa: any, gradoAlumno: string = ""): string {
  const grupos = programa?.horariosPorGrupo || [];

  // Si no hay grupos, pero es un taller deportivo con talleresDeportivos
  if ((!Array.isArray(grupos) || grupos.length === 0) && Array.isArray(programa?.talleresDeportivos) && programa.talleresDeportivos.length > 0) {
    const matchGrado = String(gradoAlumno || "").match(/\d+/);
    const num = matchGrado ? parseInt(matchGrado[0], 10) : 6;
    let edad = num;
    const lowerGrado = String(gradoAlumno || "").toLowerCase();
    if (lowerGrado.includes("primaria")) {
      edad = num + 5;
    } else if (lowerGrado.includes("secundaria")) {
      edad = num + 11;
    } else if (lowerGrado.includes("inicial")) {
      edad = num;
    }
    if (edad < 6) {
      edad = 6;
    }

    const filtered = programa.talleresDeportivos.filter((t: any) => 
      edad >= Number(t.edadMinima || 0) && edad <= Number(t.edadMaxima || 99)
    );

    if (filtered.length > 0) {
      const docentes = Array.from(new Set(filtered.map((t: any) => t.docente).filter(Boolean)));
      if (docentes.length > 0) {
        return docentes.join(" · ");
      }
    }
  }

  const actualGrupos = Array.isArray(grupos) ? grupos : [];
  if (actualGrupos.length === 0) return programa.responsable || programa.docente || "No definido";

  const gradoNormalizado = descomponerGradoApi(gradoAlumno);
  if (!gradoNormalizado.numero) return programa.responsable || programa.docente || "No definido";
  const grupo = actualGrupos.find((item: any) =>
    (item.grados || []).some((grado: any) => coincideGradoApi(grado, gradoNormalizado))
  );

  if (grupo && grupo.responsable && grupo.responsable.trim()) {
    return grupo.responsable;
  }
  return programa.responsable || programa.docente || "No definido";
}

/**
 * Obtiene y unifica la plantilla Word y las variables dinámicas de un programa de la base de datos.
 * @param db Objeto de la base de datos local
 * @param programa Objeto del programa
 * @returns Objeto con `{ plantilla, plantillaBase64, plantillaVariables, plantillaValidada }`
 */
export function obtenerPlantillaProgramaApi(db: any, programa: any = {}): any {
  const guardada = db?.plantillasPorPrograma?.[programa?.id] || {};
  const variablesPrograma = Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [];
  const variablesGuardadas = Array.isArray(guardada.plantillaVariables) ? guardada.plantillaVariables : [];
  const plantillaBase64 = programa.plantillaBase64 || guardada.plantillaBase64 || "";

  const plantillaNombre = programa.plantilla === "" ? "" : (programa.plantilla || guardada.plantilla || "");
  const finalBase64 = programa.plantilla === "" ? "" : plantillaBase64;
  const finalVariables = programa.plantilla === "" ? [] : (variablesPrograma.length ? variablesPrograma : variablesGuardadas);
  const finalValidada = programa.plantilla === "" ? false : Boolean(programa.plantillaValidada || guardada.plantillaValidada || plantillaBase64);

  return {
    plantilla: plantillaNombre,
    plantillaBase64: finalBase64,
    plantillaVariables: finalVariables,
    plantillaValidada: finalValidada,
  };
}

/**
 * Resuelve y recopila todos los detalles informativos de un programa para construir la tarjeta de invitación del alumno.
 * @param db Instancia de la base de datos
 * @param programa Objeto del programa/taller
 * @param gradoEstudiante Grado escolar del estudiante
 * @returns Objeto estructurado con los detalles informativos y estado del programa
 */
export function obtenerCamposProgramaInvitacionApi(db: any, programa: any = null, gradoEstudiante: string = ""): any {
  if (!programa) {
    return {
      programaCosto: "",
      programaGrupo: "",
      programaGrupoEtario: "",
      programaHorario: "",
      programaDisponible: false,
      programaHorarioConfigurado: false,
      programaDocente: "",
      programaCupos: "",
      programaCuposDisponibles: 0,
      programaModalidadCobro: "",
      programaRequisitos: "",
      programaFechaInicio: "",
      programaFechaFin: "",
      programaDuracionTaller: "",
      programaDuracionAvisoDias: "",
      plantilla: "",
      plantillaBase64: "",
      plantillaVariables: [],
      plantillaValidada: false,
      requiereUniforme: false,
      requiereIndumentaria: false,
    };
  }

  const plantilla = obtenerPlantillaProgramaApi(db, programa);
  const cuposDisponibles = Math.max(0, Number(programa.cupos || 0) - Number(programa.cuposOcupados || 0));

  const horarioResuelto = resolverHorarioPorGradoApi(programa, gradoEstudiante);
  const docenteResuelto = resolverDocentePorGradoApi(programa, gradoEstudiante);

  return {
    programaCosto: programa.costo ?? "",
    programaGrupo: programa.grupo || "",
    programaGrupoEtario: programa.grupoEtario || programa.grupo || "",
    programaHorario: horarioResuelto || (tieneHorariosPorGrupoApi(programa) ? "Horario no configurado para este grado" : programa.horario) || "",
    programaDisponible: true,
    programaHorarioConfigurado: Boolean(horarioResuelto || !tieneHorariosPorGrupoApi(programa)),
    programaDocente: docenteResuelto,
    programaCupos: `${cuposDisponibles} cupos disponibles`,
    programaCuposDisponibles: cuposDisponibles,
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programa.requisitos || "",
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    programaDuracionTaller: programa.duracionTaller || "",
    programaDuracionAvisoDias: programa.duracionAvisoDias || "",
    plantilla: plantilla.plantilla,
    plantillaBase64: plantilla.plantillaBase64,
    plantillaVariables: plantilla.plantillaVariables,
    plantillaValidada: Boolean(plantilla.plantillaValidada),
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
  };
}

/**
 * Normaliza un string de grado escolar ingresado libremente por el alumno para convertirlo en el formato oficial de base de datos (ej. "Primaria:4").
 * @param grado String de entrada
 */
function normalizarGradoAplicableDesdeAlumnoApi(grado: string = ""): string {
  const texto = normalizarTextoApi(grado).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  if (!nivel || !numero) return "";

  const nivelFormateado: Record<string, string> = {
    inicial: "Inicial",
    primaria: "Primaria",
    secundaria: "Secundaria",
  };

  const formattedNivel = nivelFormateado[nivel] || nivel;

  return nivel === "inicial" && /anos|ano/.test(texto)
    ? `${formattedNivel}:${numero} anos`
    : `${formattedNivel}:${numero}`;
}

/**
 * Agrega el grado de un estudiante dentro de la lista de grados permitidos de un programa, previniendo duplicados.
 * @param programa Objeto del programa
 * @param gradoAlumno Grado escolar del estudiante
 */
export function agregarGradoProgramaDesdeAlumnoApi(programa: any, gradoAlumno: string): void {
  if (!programa) return;
  const gradoAplicable = normalizarGradoAplicableDesdeAlumnoApi(gradoAlumno);
  if (!gradoAplicable) return;

  const actuales = Array.isArray(programa.gradosAplicables) ? programa.gradosAplicables : [];
  const existe = actuales.some((grado: any) => normalizarTextoApi(grado) === normalizarTextoApi(gradoAplicable));
  if (!existe) {
    programa.gradosAplicables = [...actuales, gradoAplicable];
  }
}

/**
 * Valida si el grado del alumno está dentro de la lista de grados aplicables configurados para un programa.
 * @param programa Objeto del programa
 * @param gradoAlumno Grado escolar del alumno
 * @returns `true` si pertenece, `false` en caso contrario
 */
export function gradoCorrespondeAlProgramaApi(programa: any = {}, gradoAlumno: string = ""): boolean {
  const gradoNormalizado = descomponerGradoApi(gradoAlumno);
  if (!gradoNormalizado.numero) return false;

  const gradosConfigurados: any[] = [];
  if (Array.isArray(programa.gradosAplicables)) {
    gradosConfigurados.push(...programa.gradosAplicables);
  }
  if (Array.isArray(programa.horariosPorGrupo)) {
    programa.horariosPorGrupo.forEach((grupo: any) => {
      if (Array.isArray(grupo.grados)) gradosConfigurados.push(...grupo.grados);
    });
  }

  if (!gradosConfigurados.length) return true;
  return gradosConfigurados.some((grado) => coincideGradoApi(grado, gradoNormalizado));
}

/**
 * Sincroniza la lista de grados aplicables de un taller en base a los grados de los alumnos que han sido invitados a él.
 * @param db Instancia de la base de datos
 * @param programaId ID del taller a sincronizar
 */
export function sincronizarGradosProgramaConInvitadosApi(db: any, programaId: string): void {
  const programa = (db.programas || []).find((p: any) => p.id === programaId);
  if (!programa) return;
  if (esProgramaCambridgeApi(programa)) {
    programa.gradosAplicables = [];
    return;
  }

  const grados: string[] = [];
  (db.invitadosPorPrograma?.[programaId] || []).forEach((invitado: any) => {
    const gradoAplicable = normalizarGradoAplicableDesdeAlumnoApi(invitado.grado);
    if (!gradoAplicable) return;
    const existe = grados.some((grado) => normalizarTextoApi(grado) === normalizarTextoApi(gradoAplicable));
    if (!existe) grados.push(gradoAplicable);
  });

  if (grados.length) {
    programa.gradosAplicables = ordenarGradosAplicablesApi(grados);
  }
}

/**
 * Ordena una lista de grados escolares (ej: ["Primaria:3", "Inicial:5", "Secundaria:1"]) de forma lógica ascendente.
 * @param grados Array de grados escolares a ordenar
 */
function ordenarGradosAplicablesApi(grados: string[]): string[] {
  const ordenNivel: Record<string, number> = { inicial: 0, primaria: 1, secundaria: 2 };
  return [...grados].sort((a, b) => {
    const gradoA = descomponerGradoAplicableApi(a);
    const gradoB = descomponerGradoAplicableApi(b);
    if (gradoA.nivelOrden !== gradoB.nivelOrden) return gradoA.nivelOrden - gradoB.nivelOrden;
    return gradoA.numero - gradoB.numero;
  });

  function descomponerGradoAplicableApi(valor: string) {
    const texto = normalizarTextoApi(valor);
    const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
    const numero = Number(texto.match(/\d+/)?.[0] || 0);
    return {
      nivelOrden: ordenNivel[nivel] ?? 99,
      numero,
    };
  }
}

/**
 * Sincroniza la información de una plantilla del programa actualizándola en la tabla maestra de plantillas de la base de datos.
 * @param db Instancia de la base de datos
 * @param programa Objeto del programa
 */
export function sincronizarPlantillaProgramaApi(db: any, programa: any = {}): void {
  if (!programa?.id) return;
  db.plantillasPorPrograma = db.plantillasPorPrograma || {};
  if (!programa.plantilla) {
    delete db.plantillasPorPrograma[programa.id];
  } else {
    db.plantillasPorPrograma[programa.id] = {
      plantilla: programa.plantilla || "",
      plantillaBase64: programa.plantillaBase64 || "",
      plantillaVariables: Array.isArray(programa.plantillaVariables) ? programa.plantillaVariables : [],
      plantillaValidada: Boolean(programa.plantillaValidada || programa.plantillaBase64),
      plantillaActualizadaEn: programa.plantillaActualizadaEn || new Date().toISOString(),
    };
  }
}
