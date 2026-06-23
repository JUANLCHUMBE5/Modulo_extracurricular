import { isApiMode, apiClient } from "../../services/apiClient";
import { adaptarInscripcion } from "../../services/adapters";
import {
  obtenerPanelDireccionMock,
  buscarInscripcionesParaDescuentoMock,
  aplicarDescuentoInscripcionMock,
  removerDescuentoInscripcionMock,
  obtenerCorrelativosMock,
  guardarCorrelativosMock
} from "./utils/direccionServiceMock";
import {
  descargarReporteDireccionExcel,
  descargarReportePersonalizadoExcel
} from "./utils/direccionExcelReport";

export async function obtenerPanelDireccion(filtros = {}) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/reportes/resumen", {
      params: filtros
    });
    if (!res.success) throw new Error(res.message || "Error al obtener panel de dirección");
    return res.data;
  }
  return obtenerPanelDireccionMock(filtros);
}

export async function descargarReporteDireccion(tipoReporte, filtros = {}) {
  const panel = await obtenerPanelDireccion(filtros);
  return descargarReporteDireccionExcel(panel, tipoReporte, filtros);
}

export async function descargarReportePersonalizado({ tipoDatos, filtros = {}, columnas = [], periodo = "todos" }) {
  const panel = await obtenerPanelDireccion({ periodo, anio: filtros.anio });
  return descargarReportePersonalizadoExcel({ panel, tipoDatos, filtros, columnas, periodo });
}

export async function buscarInscripcionesParaDescuento(busqueda) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/direccion/descuentos/buscar", {
      params: { q: busqueda }
    });
    if (!res.success) throw new Error(res.message || "Error al buscar inscripciones");
    return res.data.map(adaptarInscripcion);
  }
  return buscarInscripcionesParaDescuentoMock(busqueda);
}

export async function aplicarDescuentoInscripcion(inscripcionId, datosDescuento) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/direccion/descuentos/aplicar`, {
      inscripcionId,
      ...datosDescuento
    });
    if (!res.success) throw new Error(res.message || "Error al aplicar descuento");
    return adaptarInscripcion(res.data);
  }
  return aplicarDescuentoInscripcionMock(inscripcionId, datosDescuento);
}

export async function removerDescuentoInscripcion(inscripcionId) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/direccion/descuentos/remover/${inscripcionId}`);
    if (!res.success) throw new Error(res.message || "Error al remover descuento");
    return adaptarInscripcion(res.data);
  }
  return removerDescuentoInscripcionMock(inscripcionId);
}

export async function obtenerCorrelativos() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/direccion/correlativos");
    if (!res.success) throw new Error(res.message || "Error al obtener correlativos");
    return res.data;
  }
  return obtenerCorrelativosMock();
}

export async function guardarCorrelativos({ recibo, reciboVirtual, egreso }) {
  if (isApiMode()) {
    const res = await apiClient.put("/api/v1/extracurricular/direccion/correlativos", { recibo, reciboVirtual, egreso });
    if (!res.success) throw new Error(res.message || "Error al guardar correlativos");
    return res.data;
  }
  return guardarCorrelativosMock({ recibo, reciboVirtual, egreso });
}
