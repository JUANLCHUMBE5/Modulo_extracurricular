export function normalizeEstudiante(estudiante = {}) {
  return {
    dni: estudiante.dni || "",
    codigoEstudiante: estudiante.codigoEstudiante || "",
    nombres: estudiante.nombres || "",
    apellidos: estudiante.apellidos || "",
    grado: estudiante.grado || "",
    seccion: estudiante.seccion || "",
    nivel: estudiante.nivel || "",
    sexo: estudiante.sexo || "M",
    fechaNacimiento: estudiante.fechaNacimiento || "",
    tipoAlumno: estudiante.tipoAlumno || "Alumno interno",
    estadoMatricula: estudiante.estadoMatricula || "Activo",
    apoderado: estudiante.apoderado || "",
    telefonoApoderado: estudiante.telefonoApoderado || "",
    correoApoderado: estudiante.correoApoderado || "",
    estadoInscripcion: estudiante.estadoInscripcion || "Pendiente de pago",
    estadoCaja: estudiante.estadoCaja || "Al día",
    periodo: estudiante.periodo || ""
  };
}

export function buildInscripcionPayload(datos = {}) {
  return {
    dniEstudiante: datos.dniEstudiante || "",
    programaId: datos.programaId || "",
    usuarioRegistro: datos.usuarioRegistro || "Asistente",
    seccionEstudiante: datos.seccionEstudiante || datos.seccion || "",
    gradoEstudiante: datos.gradoEstudiante || datos.grado || "",
    apoderado: datos.apoderado || "",
    telefono: datos.telefono || "",
    correo: datos.correo || "",
    tallaUniforme: datos.tallaUniforme || "",
    tallaPolo: datos.tallaPolo || "",
    tallaShort: datos.tallaShort || "",
    nivelCambridge: datos.nivelCambridge || "",
    seleccion: datos.seleccion || ""
  };
}
