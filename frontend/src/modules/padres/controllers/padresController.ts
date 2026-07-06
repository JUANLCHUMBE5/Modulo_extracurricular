import {
  obtenerResumenPadre,
  guardarDatosApoderadoPadres,
  registrarInscripcionPadres,
  registrarPagoVerificacionPadres,
} from "../services/padresService";
import { normalizeResumenPadres, buildInscripcionPadresPayload } from "../models/padresModel";

export async function obtenerResumenPadreController(dni) {
  const result = await obtenerResumenPadre(dni);
  return normalizeResumenPadres(result);
}

export async function guardarDatosApoderadoPadresController(dni, datos) {
  return await guardarDatosApoderadoPadres(dni, datos);
}

export async function registrarInscripcionPadresController(dni, datos, programaId, horario, tallas) {
  const payload = buildInscripcionPadresPayload(datos);
  return await registrarInscripcionPadres(dni, payload, programaId, horario, tallas);
}

export async function registrarPagoVerificacionPadresController(dni, inscripcionId, datosPago) {
  return await registrarPagoVerificacionPadres(dni, inscripcionId, datosPago);
}
