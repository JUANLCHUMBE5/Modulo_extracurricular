export function normalizeResumenPadres(resumen = {}) {
  return {
    estudiante: resumen.estudiante || null,
    invitaciones: resumen.invitaciones || [],
    inscripciones: resumen.inscripciones || [],
    pagos: resumen.pagos || [],
    documentos: resumen.documentos || [],
    inscripcionActual: resumen.inscripcionActual || null,
    invitacionActual: resumen.invitacionActual || null,
    estadoGeneral: resumen.estadoGeneral || "No inscrito"
  };
}

export function buildInscripcionPadresPayload(datos = {}) {
  return {
    apoderado: datos.apoderado || "",
    telefono: datos.telefono || "",
    correo: datos.correo || "",
    enviarPdfCorreo: Boolean(datos.enviarPdfCorreo)
  };
}
