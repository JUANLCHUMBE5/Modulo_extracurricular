import {
  obtenerProgramasActivos,
  validarDni,
  validarQR,
  registrarAsistencia,
} from "../auxiliarService";
import { normalizeAsistencia, buildAsistenciaPayload } from "../models/auxiliarModel";

export async function obtenerProgramasActivosController() {
  return await obtenerProgramasActivos();
}

export async function validarDniController(busqueda, programaId) {
  return await validarDni(busqueda, programaId);
}

export async function validarQRController(codigo) {
  return await validarQR(codigo);
}

export async function registrarAsistenciaController(datos, observacion) {
  const payload = buildAsistenciaPayload(datos);
  const result = await registrarAsistencia(payload, observacion);
  return normalizeAsistencia(result);
}
