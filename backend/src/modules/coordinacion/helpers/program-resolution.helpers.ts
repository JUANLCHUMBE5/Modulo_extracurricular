import { resolverHorarioPorGradoApi, tieneHorariosPorGrupoApi, obtenerGradoCompletoApi, normalizarTextoApi } from "../../../common/shared/mappers.js";
import { mismoCodigo, normalizarTexto } from "./identity.helpers.js";

/**
 * Resuelve el horario asignado a una inscripción (incluyendo horarios dinámicos por grupo).
 */
export function obtenerHorarioDeInscripcion(db: any, inscripcion: any, estudiante: any): string {
  const prog = (db.programas || []).find((p: any) => p.id === inscripcion?.programaId);
  
  if (prog && tieneHorariosPorGrupoApi(prog)) {
    const gradoEst = inscripcion?.gradoEstudiante 
      || inscripcion?.grado 
      || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "");
    const horarioDinamico = resolverHorarioPorGradoApi(prog, gradoEst);
    if (horarioDinamico) return horarioDinamico;
  }
  
  if (inscripcion?.horario && !inscripcion.horario.includes("no configurado") && !inscripcion.horario.includes("No registrado")) {
    return inscripcion.horario;
  }
  
  if (!prog) return "";
  
  const gradoEst = inscripcion?.gradoEstudiante 
    || inscripcion?.grado 
    || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "");
    
  return resolverHorarioPorGradoApi(prog, gradoEst)
    || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario)
    || "";
}

/**
 * Comprueba si el nombre del programa es un texto válido y no "sin programa".
 */
export function nombreProgramaValido(valor: any): string {
  const texto = String(valor || "").trim();
  return texto && normalizarTexto(texto) !== "sin programa" ? texto : "";
}

/**
 * Busca un programa en la base de datos comparando por nombre de forma normalizada.
 */
export function buscarProgramaPorNombre(db: any, nombre: any): any {
  const nombreNormalizado = normalizarTexto(nombreProgramaValido(nombre));
  if (!nombreNormalizado) return null;
  return (db.programas || []).find((programa: any) =>
    normalizarTexto(programa.nombre || programa.programa || programa.nombre_programa) === nombreNormalizado
  ) || null;
}
