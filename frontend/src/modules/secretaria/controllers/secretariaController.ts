import {
  buscarEstudiantePorDni,
  buscarEstudiantesPorNombre,
  listarProgramasPorPeriodo,
  registrarInscripcion,
  derivarInscripcionCaja,
  buscarInscripcionEstudiante,
} from "../services/secretariaService";
import { normalizeEstudiante, buildInscripcionPayload } from "../models/secretariaModel";

export async function buscarEstudiantePorDniController(dni, periodo) {
  const result = await buscarEstudiantePorDni(dni, periodo);
  return result ? normalizeEstudiante(result) : null;
}

export async function buscarEstudiantesPorNombreController(nombre, periodo) {
  const result = await buscarEstudiantesPorNombre(nombre, periodo);
  return result.map(normalizeEstudiante);
}

export async function listarProgramasPorPeriodoController(periodo, grado, edad) {
  return await listarProgramasPorPeriodo(periodo, grado, edad);
}

export async function registrarInscripcionController(datos) {
  const payload = buildInscripcionPayload(datos);
  return await registrarInscripcion(payload);
}

export async function derivarInscripcionCajaController(id, userDni, username) {
  return await derivarInscripcionCaja(id, userDni, username);
}

export async function buscarInscripcionEstudianteController(dni, progId) {
  return await buscarInscripcionEstudiante(dni, progId);
}
