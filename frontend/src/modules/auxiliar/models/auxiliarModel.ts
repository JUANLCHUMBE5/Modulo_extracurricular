export function normalizeAsistencia(asistencia = {}) {
  return {
    id: asistencia.id || "",
    inscripcionId: asistencia.inscripcionId || "",
    pagoId: asistencia.pagoId || "",
    dniEstudiante: asistencia.dniEstudiante || "",
    codigoEstudiante: asistencia.codigoEstudiante || "",
    nombresEstudiante: asistencia.nombresEstudiante || "",
    programaId: asistencia.programaId || "",
    programa: asistencia.programa || "",
    horario: asistencia.horario || "",
    estadoPago: asistencia.estadoPago || "completado",
    estadoAcceso: asistencia.estadoAcceso || "presente",
    observacion: asistencia.observacion || "",
    origen: asistencia.origen || "Auxiliar",
    fechaRegistro: asistencia.fechaRegistro || ""
  };
}

export function buildAsistenciaPayload(datos = {}) {
  return {
    inscripcionId: datos.inscripcionId || "",
    pagoId: datos.pagoId || "",
    dni: datos.dni || datos.dniEstudiante || "",
    estadoAcceso: datos.estadoAcceso || "presente",
    observacion: datos.observacion || ""
  };
}
