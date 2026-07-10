import { apiClient } from "../../../services/apiClient";
import {
  adaptarEstudiante,
  adaptarInscripcion,
  adaptarPrograma,
} from "../../../services/adapters";
import {
  listarProgramas,
} from "../../coordinacion/services/coordinacionService";
import {
  normalizarPeriodo,
  programaDisponibleParaEdad,
  programaDisponibleParaGrado,
  resolverHorarioPorGrado,
  resolverDocentePorGrado,
  calcularCuposDisponibles,
  tieneHorariosPorGrupo,
} from "./secretariaServiceUtils";

function adaptarEstudianteConInvitacion(data: any, periodo: string) {
  if (!data) return null;

  // Si viene en formato plano de mock (o ya adaptado)
  if (!data.estudiante) {
    const student = adaptarEstudiante(data);
    if (student) {
      student.periodo = normalizarPeriodo(periodo) === "verano" ? "Ciclo verano" : "Año escolar";
    }
    return student;
  }

  // Si viene en formato envuelto de la API: { estudiante, invitaciones }
  const student = adaptarEstudiante(data.estudiante);
  if (!student) return null;

  student.periodo = normalizarPeriodo(periodo) === "verano" ? "Ciclo verano" : "Año escolar";

  const invitacion = Array.isArray(data.invitaciones) && data.invitaciones[0];
  if (invitacion) {
    const prog = invitacion.programa || {};
    const inv = invitacion.invitado || {};

    if (inv.nombres) student.nombres = inv.nombres;
    if (inv.codigoEstudiante || inv.codigo_estudiante) {
      student.codigoEstudiante = inv.codigoEstudiante || inv.codigo_estudiante;
    }

    let gradoInvitado = inv.grado || "";
    const nivelInvitado = inv.nivel_educativo || inv.nivel || student.nivel || "";
    if (gradoInvitado && /^\d+$/.test(String(gradoInvitado).trim()) && nivelInvitado) {
      if (nivelInvitado.toLowerCase().includes("inicial")) {
        gradoInvitado = `${gradoInvitado} inicial`;
      } else {
        gradoInvitado = `${gradoInvitado} ${nivelInvitado}`;
      }
    }
    if (gradoInvitado) student.grado = gradoInvitado;
    if (inv.seccion) student.seccion = inv.seccion;

    const cuposDisponibles = calcularCuposDisponibles(prog);
    const horarioResuelto = resolverHorarioPorGrado(prog, student.grado || "");
    const horarioConfigurado = Boolean(horarioResuelto || !tieneHorariosPorGrupo(prog));

    student.tieneInvitacion = true;
    student.programaAsignado = invitacion.programaId || prog.id || "";
    student.programaNombre = prog.nombre || prog.nombre_programa || "";
    student.programaGrupo = prog.grupo || "";
    student.programaGrupoEtario = prog.grupo_etario || prog.grupoEtario || prog.grupo || "";
    student.programaHorario = horarioResuelto || (tieneHorariosPorGrupo(prog) ? "Horario no configurado para este grado" : (prog.horario || ""));
    student.programaDisponible = programaDisponibleParaGrado(prog, student.grado || "");
    student.programaHorarioConfigurado = horarioConfigurado;
    student.programaDocente = resolverDocentePorGrado(prog, student.grado || "");
    student.programaCosto = Number(prog.monto ?? prog.precio ?? prog.costo ?? 0);
    student.programaCupos = cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos";
    student.programaCuposDisponibles = cuposDisponibles;
    student.programaModalidadCobro = prog.modalidad_cobro || prog.modalidadCobro || "";
    student.programaRequisitos = prog.requisitos || "";
    student.programaFechaInicio = prog.fecha_inicio || prog.fechaInicio || "";
    student.programaFechaFin = prog.fecha_fin || prog.fechaFin || "";
    student.programaDuracionTaller = prog.duracion || prog.duracionTaller || "";
    student.programaDuracionAvisoDias = prog.duracion_aviso_dias || prog.duracionDias || prog.duracionAvisoDias || "";
    student.seleccion = inv.seleccion || "";
    student.nivelCambridge = inv.nivel_cambridge || inv.nivelCambridge || "";
    student.plantilla = prog.plantilla || "";
    student.plantillaBase64 = prog.plantilla_base64 || prog.plantillaBase64 || "";
    student.plantillaVariables = prog.plantilla_variables || prog.plantillaVariables || [];
    student.requiereUniforme = Boolean(prog.requiere_uniforme ?? prog.requiereUniforme);
    student.requiereIndumentaria = Boolean(prog.requiere_indumentaria ?? prog.requiereIndumentaria);
    if (inv.telefono_apoderado || inv.telefonoApoderado) {
      student.telefonoApoderado = inv.telefono_apoderado || inv.telefonoApoderado;
    }
  } else {
    student.tieneInvitacion = false;
    student.programaAsignado = "";
    student.requiereUniforme = false;
    student.requiereIndumentaria = false;
  }

  return student;
}

export async function buscarEstudiantePorDni(dni: string, periodo = "escolar") {
  const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes/${dni}`, {
    params: { periodo }
  });
  if (!res.success) return null;
  if (res.data) {
    return adaptarEstudianteConInvitacion(res.data, periodo);
  }
  return null;
}

export async function buscarEstudiantesPorNombre(nombre: string, periodo = "escolar") {
  const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes`, {
    params: { nombre, periodo }
  });
  if (!res.success || !Array.isArray(res.data)) return [];
  return res.data.map((item) => adaptarEstudianteConInvitacion(item, periodo));
}

export async function listarProgramasPorPeriodo(periodo: string, gradoAlumno = "", edadAlumno = "") {
  const programas = await listarProgramas();
  const periodoNormalizado = normalizarPeriodo(periodo);
  return programas
    .filter((programa) =>
      normalizarPeriodo(programa.periodo) === periodoNormalizado &&
      programa.estado === "Habilitado" &&
      Number(programa.cuposDisponibles ?? 0) > 0 &&
      (periodoNormalizado === "verano"
        ? programaDisponibleParaEdad(programa, edadAlumno)
        : (!gradoAlumno || programaDisponibleParaGrado(programa, gradoAlumno)))
    );
}

export async function obtenerProgramaPorId(programaId: string, periodo?: string) {
  const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}`);
  if (!res.success) return null;
  return adaptarPrograma(res.data);
}

export async function registrarInscripcion(payload: any) {
  const apiPayload = {
    estudiante_id: payload.dniEstudiante,
    programa_id: payload.programaId,
    origen_inscripcion: "presencial",
    usuario_registro: payload.usuarioRegistro || "Asistente",
    seccion: payload.seccionEstudiante || payload.seccion || "",
    grado: payload.gradoEstudiante || payload.grado || "",
    apoderado: payload.apoderado || "",
    telefono_apoderado: payload.telefono || "",
    correo_apoderado: payload.correo || "",
    talla_uniforme: payload.tallaUniforme || "",
    talla_polo: payload.tallaPolo || "",
    talla_short: payload.tShort || payload.tallaShort || "",
    seleccion: payload.seleccion || "",
    nivel_cambridge: payload.nivelCambridge || "",
    es_externo: Boolean(payload.esExterno),
    nombres_estudiante: payload.nombresEstudiante || "",
    edad_estudiante: payload.edadEstudiante || "",
    domicilio_estudiante: payload.domicilioEstudiante || "",
    sexo_estudiante: payload.sexoEstudiante || ""
  };
  const res = await apiClient.post("/api/v1/extracurricular/inscripciones", apiPayload);
  if (!res.success) throw new Error(res.message || "Error al registrar inscripción");
  return adaptarInscripcion(res.data);
}

export async function registrarDocumentoGenerado({
  estudiante,
  inscripcion,
  usuario = "Secretaría",
  tipoDocumento = "Comunicado personalizado",
}: any) {
  const res = await apiClient.post(`/api/v1/extracurricular/inscripciones/${inscripcion.id}/documento`, {
    estudiante_id: estudiante?.id || estudiante?.dni || inscripcion.dniEstudiante,
    usuario,
    tipo_documento: tipoDocumento,
    plantilla: inscripcion.plantilla || ""
  });
  if (!res.success) throw new Error(res.message || "Error al registrar documento");
  return res.data;
}

export async function derivarInscripcionCaja(inscripcionId: string, datos = {}) {
  const res = await apiClient.put(`/api/v1/extracurricular/inscripciones/${inscripcionId}/derivar-caja`, datos);
  if (!res.success) throw new Error(res.message || "Error al derivar inscripción a Cajera");
  return adaptarInscripcion(res.data);
}

export async function buscarInscripcionEstudiante(estudiante: any, periodo = "escolar") {
  const res = await apiClient.get(`/api/v1/extracurricular/secretaria/inscripciones/buscar`, {
    params: { dni: estudiante?.dni || estudiante?.dniEstudiante, periodo }
  });
  if (!res.success || !res.data) return null;
  return adaptarInscripcion(res.data);
}

export async function listarInscripcionesEstudiante(estudiante: any, periodo = "escolar") {
  const res = await apiClient.get(`/api/v1/extracurricular/secretaria/inscripciones`, {
    params: { dni: estudiante?.dni || estudiante?.dniEstudiante, periodo }
  });
  if (!res.success || !Array.isArray(res.data)) return [];
  return res.data.map(adaptarInscripcion);
}
