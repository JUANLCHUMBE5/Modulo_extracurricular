import {
  listarPagos,
  registrarPago,
  actualizarPago,
  obtenerResumenCaja,
  anularPago,
  registrarEgreso,
} from "../cajaService";
import { normalizePago, buildPagoPayload } from "../models/pagoModel";

export async function listarPagosController(periodo, filtros) {
  const pagos = await listarPagos(periodo, filtros);
  return pagos.map(normalizePago);
}

export async function registrarPagoController(datos) {
  const payload = buildPagoPayload(datos);
  const pago = await registrarPago(payload);
  return normalizePago(pago);
}

export async function registrarEgresoController(datos) {
  const payload = buildPagoPayload(datos);
  const egreso = await registrarEgreso(payload);
  return normalizePago(egreso);
}

export async function actualizarPagoController(id, datos) {
  const payload = buildPagoPayload(datos);
  const pago = await actualizarPago(id, payload);
  return normalizePago(pago);
}

export async function obtenerResumenCajaController(periodo) {
  return await obtenerResumenCaja(periodo);
}

export async function anularPagoController(id) {
  return await anularPago(id);
}
