export interface RespuestaInscripcionParams {
  inscripcion: any;
  estudiante: any;
  pago: any;
  programa: string;
  programaId: string;
  estadoAcceso: string;
  estadoPago: string;
  accesoPermitido: boolean;
  mensajeAcceso: string;
  accion: string;
  color: string;
  horario: string;
}

/**
 * Construye la respuesta unificada del estado de ingreso para un estudiante inscrito.
 */
export function crearRespuestaInscripcion({
  inscripcion,
  estudiante,
  pago,
  programa,
  programaId,
  estadoAcceso,
  estadoPago,
  accesoPermitido,
  mensajeAcceso,
  accion,
  color,
  horario,
}: RespuestaInscripcionParams): any {
  const programaValido = (valor: any) => {
    const texto = String(valor || "").trim();
    return texto && texto.toLowerCase() !== "sin programa" ? texto : "";
  };
  return {
    dni: inscripcion.dniEstudiante || estudiante?.dni || pago?.dniEstudiante || pago?.estudianteDni || "",
    codigoEstudiante: inscripcion.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombres: inscripcion.nombresEstudiante || estudiante?.nombres || pago?.nombresEstudiante || pago?.estudianteNombre || "Estudiante",
    grado: inscripcion.gradoEstudiante || estudiante?.grado || "",
    seccion: inscripcion.seccionEstudiante || estudiante?.seccion || "",
    programa: programaValido(programa) || programaValido(inscripcion.programa) || programaValido(pago?.programa) || programaValido(pago?.programaNombre) || "Sin programa",
    programaId: programaId || inscripcion.programaId || pago?.programaId || "",
    horario: horario || inscripcion.horario || "Horario no registrado",
    inscripcionId: inscripcion.id || "",
    estadoInscripcion: inscripcion.estadoInscripcion || "",
    estadoPago,
    estadoAcceso,
    accesoPermitido,
    mensajeAcceso,
    accion,
    color,
    pagoId: pago?.id || inscripcion.pagoId || "",
    fechaPago: pago?.fechaPago || pago?.fecha || inscripcion.fechaPago || "",
    monto: Number(pago?.monto ?? inscripcion.costo ?? 0),
  };
}

/**
 * Construye la respuesta de error estÃ¡ndar para un estudiante no registrado en el sistema.
 */
export function crearRespuestaNoRegistrado(ids: any, estudiante: any): any {
  return {
    dni: ids.dni || estudiante?.dni || "",
    codigoEstudiante: ids.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombres: estudiante?.nombres || ids.codigoOriginal || "Codigo no registrado",
    grado: estudiante?.grado || "",
    seccion: estudiante?.seccion || "",
    programa: "Sin inscripcion activa",
    programaId: "",
    horario: "No registrado",
    inscripcionId: "",
    estadoInscripcion: "No registrado",
    estadoPago: "No registrado",
    estadoAcceso: "no_registrado",
    accesoPermitido: false,
    mensajeAcceso: "No registrado",
    accion: "No esta registrado en un programa activo. Verificar en Asistente antes de permitir el ingreso.",
    color: "rojo",
    pagoId: "",
    fechaPago: "",
    monto: 0,
  };
}

