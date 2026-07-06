import {
  obtenerPanelDireccion,
  buscarInscripcionesParaDescuento,
  aplicarDescuentoInscripcion,
  removerDescuentoInscripcion,
  obtenerCorrelativos,
  guardarCorrelativos,
} from "../direccionService";
import { normalizeDescuento, buildDescuentoPayload } from "../models/direccionModel";

export async function obtenerPanelDireccionController(filtros) {
  return await obtenerPanelDireccion(filtros);
}

export async function buscarInscripcionesParaDescuentoController(busqueda) {
  return await buscarInscripcionesParaDescuento(busqueda);
}

export async function aplicarDescuentoInscripcionController(inscripcionId, datos) {
  const payload = buildDescuentoPayload(datos);
  return await aplicarDescuentoInscripcion(inscripcionId, payload);
}

export async function removerDescuentoInscripcionController(inscripcionId) {
  return await removerDescuentoInscripcion(inscripcionId);
}

export async function obtenerCorrelativosController() {
  return await obtenerCorrelativos();
}

export async function guardarCorrelativosController(correlativos) {
  return await guardarCorrelativos(correlativos);
}
