export function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizarPeriodo(periodo) {
  return String(periodo || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

export function descomponerGrado(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

export function coincideGrado(gradoGrupo, gradoAlumnoNormalizado) {
  const grupo = descomponerGrado(gradoGrupo);
  if (!grupo.numero || !gradoAlumnoNormalizado?.numero) return false;
  if (grupo.numero !== gradoAlumnoNormalizado.numero) return false;
  return !grupo.nivel || grupo.nivel === gradoAlumnoNormalizado.nivel;
}

export function formatearGrado(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

export function tieneHorariosPorGrupo(programa) {
  return Array.isArray(programa?.horariosPorGrupo) && programa.horariosPorGrupo.length > 0;
}

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

export function programaDisponibleParaGrado(programa, gradoAlumno = "") {
  if (normalizarPeriodo(programa?.periodo) === "verano") return true;
  if (tieneHorariosPorGrupo(programa)) {
    return Boolean(resolverHorarioPorGrado(programa, gradoAlumno));
  }

  const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
  if (!gradosAplicables.length) return true;

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return false;

  return gradosAplicables.some((grado) => coincideGrado(grado, gradoNormalizado));
}

export function programaDisponibleParaEdad(programa, edadAlumno = "") {
  const minimo = Number(programa?.edadMinima || 0);
  const maximo = Number(programa?.edadMaxima || 0);
  if (!minimo && !maximo) return true;
  const edad = Number(edadAlumno);
  if (!Number.isFinite(edad) || edad <= 0) return true;
  if (minimo && edad < minimo) return false;
  if (maximo && edad > maximo) return false;
  return true;
}

export function extraerNumeroCupos(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (Number.isFinite(numero)) return numero;
  const match = String(valor).match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function calcularCuposDisponibles(programa) {
  const disponiblesDirectos = extraerNumeroCupos(programa?.cuposDisponibles);
  if (disponiblesDirectos !== null) return Math.max(0, disponiblesDirectos);
  const cupos = extraerNumeroCupos(programa?.cupos);
  const ocupados = extraerNumeroCupos(programa?.cuposOcupados) || 0;
  if (cupos !== null) return Math.max(0, cupos - ocupados);
  return 0;
}

export function clavesAlumnoInscripcion(alumno) {
  const claves = [];
  if (alumno.dniEstudiante || alumno.dni) claves.push(`dni:${alumno.dniEstudiante || alumno.dni}`);
  if (alumno.codigoEstudiante) claves.push(`codigo:${normalizarTexto(alumno.codigoEstudiante)}`);
  const nombre = normalizarTexto(alumno.nombresEstudiante || alumno.nombres);
  if (nombre) claves.push(`nombre:${nombre}`);
  return claves;
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

export function normalizarEstadoPagoSecretaria(valor = "") {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function esProgramaCambridge(programa = {}) {
  const texto = normalizarTexto([
    programa.nombre,
    programa.programa,
    programa.categoria,
    programa.tipoComunicado,
    programa.tipo_comunicado,
    programa.plantilla,
  ].filter(Boolean).join(" "));
  return texto.includes("cambridge") ||
    texto.includes("cambrigde") ||
    texto.includes("cabringde") ||
    texto.includes("camringde") ||
    texto.includes("certificacion cam") ||
    texto.includes("ingles") ||
    texto.includes("ingless");
}

export function normalizarSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  return ["A", "B", "C"].includes(seleccion) ? seleccion : "";
}

export function obtenerDatosCambridgeSeguros(programa, payload = {}) {
  if (!esProgramaCambridge(programa)) {
    return { seleccion: "", nivelCambridge: "" };
  }

  return {
    seleccion: normalizarSeleccionCambridge(payload.seleccion),
    nivelCambridge: String(payload.nivelCambridge || "").trim(),
  };
}

export function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  if (alumno.codigoEstudiante) return `codigo:${normalizarTexto(alumno.codigoEstudiante)}`;
  return `nombre:${normalizarTexto(alumno.nombres)}:${alumno.grado || ""}:${alumno.seccion || ""}`;
}
