import { obtenerGradoCompletoApi, normalizarTextoApi, resolverHorarioPorGradoApi, tieneHorariosPorGrupoApi } from "../../../common/shared/mappers.js";

/**
 * Busca y retorna la inscripción relacionada a un registro de asistencia.
 */
export function buscarInscripcionAsistencia(db: any, asistencia: any = {}, programmeId: string = ""): any {
  const dni = asistencia.dniEstudiante || asistencia.dni || "";
  return (db.inscripciones || []).find((item: any) => asistencia.inscripcionId && item.id === asistencia.inscripcionId)
    || (db.inscripciones || []).find((item: any) =>
      dni &&
      item.dniEstudiante === dni &&
      (
        (programmeId && item.programaId === programmeId) ||
        (asistencia.programaId && item.programaId === asistencia.programaId)
      )
    )
    || null;
}

/**
 * Toma una asistencia y la completa con el horario, grado e ID de inscripción/programa.
 */
export function enriquecerAsistenciaPrograma(db: any, asistencia: any = {}, programaId: string = ""): any {
  const inscripcion = buscarInscripcionAsistencia(db, asistencia, programaId);
  const estudiante = db.estudiantes?.[asistencia.dniEstudiante || inscripcion?.dniEstudiante] || null;
  const programa = (db.programas || []).find((item: any) => item.id === (inscripcion?.programaId || asistencia.programaId || programaId))
    || null;
  const gradoEstudiante = inscripcion?.gradoEstudiante
    || inscripcion?.grado
    || (estudiante ? obtenerGradoCompletoApi(estudiante.grado, estudiante.nivel) : "")
    || "";
  const horario = asistencia.horario
    || inscripcion?.horario
    || resolverHorarioPorGradoApi(programa, gradoEstudiante)
    || (programa && tieneHorariosPorGrupoApi(programa) ? "Horario no configurado para este grado" : programa?.horario)
    || "";

  return {
    ...asistencia,
    inscripcionId: asistencia.inscripcionId || inscripcion?.id || "",
    dniEstudiante: asistencia.dniEstudiante || inscripcion?.dniEstudiante || estudiante?.dni || "",
    codigoEstudiante: asistencia.codigoEstudiante || inscripcion?.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombresEstudiante: asistencia.nombresEstudiante
      || inscripcion?.nombresEstudiante
      || (estudiante ? `${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim() : ""),
    programaId: asistencia.programaId || inscripcion?.programaId || programaId || "",
    programa: asistencia.programa || inscripcion?.programa || programa?.nombre || "",
    horario,
    estadoPago: asistencia.estadoPago || inscripcion?.estadoPago || "Pendiente",
  };
}
