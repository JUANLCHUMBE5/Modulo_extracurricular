export function resolverHorarioPorGrado(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return "";
  let gradoDelTurno = "";
  const grupo = grupos.find((item) => {
    gradoDelTurno = (item.grados || []).find((grado) => coincideGrado(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grados = formatearGrado(gradoDelTurno || gradoAlumno);
  const aula = grupo.aula ? ` Â· Aula ${grupo.aula}` : "";
  return `${grados ? `${grados}: ` : ""}${grupo.dia} almuerzo ${grupo.almuerzoInicio || "14:20"}-${grupo.almuerzoFin || "15:10"}, clase ${grupo.horaInicio || ""}-${grupo.horaFin || ""}${aula}`;
}

export function resolverDocentePorGrado(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return programa.responsable || programa.docente || "No definido";

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return programa.responsable || programa.docente || "No definido";
  const grupo = grupos.find((item) =>
    (item.grados || []).some((grado) => coincideGrado(grado, gradoNormalizado))
  );

  if (grupo && grupo.responsable && grupo.responsable.trim()) {
    return grupo.responsable;
  }
  return programa.responsable || programa.docente || "No definido";
}

export function tieneHorariosPorGrupo(programa) {
  return Array.isArray(programa?.horariosPorGrupo) && programa.horariosPorGrupo.length > 0;
}

export function programaDisponibleParaGrado(programa, gradoAlumno = "") {
  if (programa?.invitacionMasiva) return programaDisponibleParaAlcanceMasivo(programa, gradoAlumno);

  if (tieneHorariosPorGrupo(programa)) {
    return Boolean(resolverHorarioPorGrado(programa, gradoAlumno));
  }

  const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
  if (!gradosAplicables.length) return true;

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return false;

  return gradosAplicables.some((grado) => coincideGrado(grado, gradoNormalizado));
}

export function programaDisponibleParaAlcanceMasivo(programa, gradoAlumno = "") {
  const alcance = normalizarTexto(programa?.alcanceInvitacionMasiva || "colegio");
  if (!alcance || alcance === "colegio" || alcance === "todos") return true;

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.nivel) return false;

  if (alcance === "primaria" || alcance === "secundaria" || alcance === "inicial") {
    return gradoNormalizado.nivel === alcance;
  }

  if (alcance === "grados" || alcance === "seleccionados") {
    const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
    if (!gradosAplicables.length || !gradoNormalizado.numero) return false;
    return gradosAplicables.some((grado) => coincideGrado(grado, gradoNormalizado));
  }

  return true;
}

function coincideGrado(gradoGrupo, gradoAlumnoNormalizado) {
  const grupo = descomponerGrado(gradoGrupo);
  if (!grupo.numero || !gradoAlumnoNormalizado?.numero) return false;
  if (grupo.numero !== gradoAlumnoNormalizado.numero) return false;
  return !grupo.nivel || grupo.nivel === gradoAlumnoNormalizado.nivel;
}

function formatearGrado(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

export function descomponerGrado(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

export function programaVisibleEnPortalPadres(programa) {
  return Boolean(programa) && (programa.estado || "Habilitado") === "Habilitado" && programaListoParaPortalPadres(programa);
}

export function programaListoParaPortalPadres(programa = {}) {
  const esBorradorDeDocumento = Boolean(programa.creadoDesdeDocumento || programa.plantilla || programa.plantillaValidada);
  if (!esBorradorDeDocumento) return true;

  const horario = normalizarTexto(programa.horario);
  const grupo = normalizarTexto(programa.grupo);
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

export function calcularEstadoGeneral(inscripcion, invitacion) {
  if (inscripcion) {
    if (String(inscripcion.estadoPago || "").toLowerCase().includes("pag")) {
      return { texto: "Inscrito con pago registrado", tono: "success" };
    }
    return { texto: "InscripciÃ³n pendiente de pago", tono: "warning" };
  }

  if (invitacion) {
    return { texto: "InvitaciÃ³n disponible", tono: "info" };
  }

  return { texto: "Sin programa asignado", tono: "neutral" };
}

export function normalizarPeriodoTexto(periodo) {
  return String(periodo || "").toLowerCase().includes("verano") ? "Ciclo verano" : "AÃ±o escolar";
}

export function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarEstadoPagoPadres(...valores) {
  const texto = normalizarTexto(valores.filter(Boolean).join(" "));
  if (["completado", "pagado", "validado", "pago validado", "exitoso"].some((item) => texto.includes(item))) return "pagado";
  if (["verificando", "verificacion", "por verificar", "revision", "proceso", "pendiente_validacion"].some((item) => texto.includes(item))) return "verificando";
  if (["observado", "rechazado", "no coincide", "observada"].some((item) => texto.includes(item))) return "observado";
  if (["cancelado", "anulado"].some((item) => texto.includes(item))) return "anulado";
  return "pendiente";
}

export function esProgramaCortoPadres(programa = {}) {
  const nombre = normalizarTexto(programa.programa || programa.nombre);
  if (nombre.includes("expres") || nombre.includes("express") || nombre.includes("maraton")) return true;

  const inicio = crearFechaLocal(programa.fechaInicio);
  const fin = crearFechaLocal(programa.fechaFin);
  if (!inicio || !fin) return false;

  const dias = Math.floor((fin.getTime() - inicio.getTime()) / 86400000) + 1;
  return dias > 0 && dias < 28;
}

export function obtenerProgramaPrincipalPadres(programas = []) {
  if (!Array.isArray(programas) || programas.length === 0) return null;

  const lista = [...programas];

  const tieneWord = (item) => Boolean(item.plantilla || item.creadoDesdeDocumento || item.plantillaValidada);

  const esActivo = (item) => {
    if (item.ventanaInscripcion) {
      return item.ventanaInscripcion.permitida !== false;
    }
    return true;
  };

  lista.sort((a, b) => {
    const wordA = tieneWord(a);
    const wordB = tieneWord(b);
    const activoA = esActivo(a);
    const activoB = esActivo(b);

    const score = (hasWord, isActive) => {
      if (hasWord && isActive) return 3;
      if (!hasWord && isActive) return 2;
      if (hasWord && !isActive) return 1;
      return 0;
    };

    return score(wordB, activoB) - score(wordA, activoA);
  });

  return lista[0] || null;
}

function crearFechaLocal(valor) {
  if (!valor) return null;
  const partes = String(valor).split("-").map(Number);
  if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) return null;
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

export function obtenerDiasCruzados(a, b) {
  const dias = [];
  for (const dia of a) {
    if (b.has(dia)) dias.push(dia);
  }
  return dias;
}

export function extraerDiasHorario(horario = "") {
  const texto = normalizarTexto(horario);
  const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  return new Set(dias.filter((dia) => texto.includes(dia)));
}

export function limpiarTexto(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ");
}
