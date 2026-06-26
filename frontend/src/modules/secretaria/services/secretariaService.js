import { isApiMode, apiClient } from "../../../services/apiClient";
import {
  adaptarEstudiante,
  adaptarInscripcion,
} from "../../../services/adapters";
import {
  listarProgramas,
} from "../../coordinacion/services/coordinacionService";
import {
  normalizarPeriodo,
  programaDisponibleParaEdad,
  programaDisponibleParaGrado,
} from "./secretariaServiceUtils";
import {
  buscarEstudiantePorDniMock,
  buscarEstudiantesPorNombreMock,
  listarProgramasPorPeriodoMock,
  obtenerProgramaPorIdMock,
  registrarInscripcionMock,
  registrarDocumentoGeneradoMock,
  derivarInscripcionCajaMock,
  buscarInscripcionEstudianteMock,
  listarInscripcionesEstudianteMock,
} from "../utils/secretariaServiceMock";

export async function buscarEstudiantePorDni(dni, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes/${dni}`, {
      params: { periodo }
    });
    if (!res.success) return null;
    if (res.data) {
      const student = adaptarEstudiante(res.data);
      if (student) {
        student.periodo = normalizarPeriodo(periodo) === "verano" ? "Ciclo verano" : "Año escolar";
      }
      return student;
    }
    return null;
  }
  return buscarEstudiantePorDniMock(dni, periodo);
}

export async function buscarEstudiantesPorNombre(nombre, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes`, {
      params: { nombre, periodo }
    });
    if (!res.success || !Array.isArray(res.data)) return [];
    return res.data.map((item) => {
      const student = adaptarEstudiante(item);
      if (student) {
        student.periodo = normalizarPeriodo(periodo) === "verano" ? "Ciclo verano" : "Año escolar";
      }
      return student;
    });
  }
  return buscarEstudiantesPorNombreMock(nombre, periodo);
}

export async function listarProgramasPorPeriodo(periodo, gradoAlumno = "", edadAlumno = "") {
  if (isApiMode()) {
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
  return listarProgramasPorPeriodoMock(periodo, gradoAlumno, edadAlumno);
}

export async function obtenerProgramaPorId(programaId, periodo) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}`);
    if (!res.success) return null;
    return res.data;
  }
  return obtenerProgramaPorIdMock(programaId, periodo);
}

export async function registrarInscripcion(payload) {
  if (isApiMode()) {
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
  return registrarInscripcionMock(payload);
}

export async function registrarDocumentoGenerado({
  estudiante,
  inscripcion,
  usuario = "Secretaría",
  tipoDocumento = "Comunicado personalizado",
}) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/inscripciones/${inscripcion.id}/documento`, {
      estudiante_id: estudiante?.id || estudiante?.dni || inscripcion.dniEstudiante,
      usuario,
      tipo_documento: tipoDocumento,
      plantilla: inscripcion.plantilla || ""
    });
    if (!res.success) throw new Error(res.message || "Error al registrar documento");
    return res.data;
  }
  return registrarDocumentoGeneradoMock({ estudiante, inscripcion, usuario, tipoDocumento });
}

export async function derivarInscripcionCaja(inscripcionId, datos = {}) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/inscripciones/${inscripcionId}/derivar-caja`, datos);
    if (!res.success) throw new Error(res.message || "Error al derivar inscripción a Cajera");
    return adaptarInscripcion(res.data);
  }
  return derivarInscripcionCajaMock(inscripcionId, datos);
}

export async function buscarInscripcionEstudiante(estudiante, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/inscripciones/buscar`, {
      params: { dni: estudiante?.dni || estudiante?.dniEstudiante, periodo }
    });
    if (!res.success || !res.data) return null;
    return adaptarInscripcion(res.data);
  }
  return buscarInscripcionEstudianteMock(estudiante, periodo);
}

export async function listarInscripcionesEstudiante(estudiante, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/inscripciones`, {
      params: { dni: estudiante?.dni || estudiante?.dniEstudiante, periodo }
    });
    if (!res.success || !Array.isArray(res.data)) return [];
    return res.data.map(adaptarInscripcion);
  }
  return listarInscripcionesEstudianteMock(estudiante, periodo);
}
