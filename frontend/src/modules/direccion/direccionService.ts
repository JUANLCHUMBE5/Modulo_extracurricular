import { apiClient } from "../../services/apiClient";
import { adaptarInscripcion } from "../../services/adapters";
import {
  descargarReporteDireccionExcel,
  descargarReportePersonalizadoExcel
} from "./utils/direccionExcelReport";

export async function obtenerPanelDireccion(filtros = {}) {
  const res = await apiClient.get("/api/v1/extracurricular/reportes/resumen", {
    params: filtros
  });
  if (!res.success) throw new Error(res.message || "Error al obtener panel de dirección");
  return res.data;
}

export async function descargarReporteDireccion(tipoReporte: string, filtros = {}) {
  const panel = await obtenerPanelDireccion(filtros);
  return descargarReporteDireccionExcel(panel, tipoReporte, filtros);
}

export async function descargarReportePersonalizado({ tipoDatos, filtros = {}, columnas = [], periodo = "todos" }: any) {
  const panel = await obtenerPanelDireccion({ periodo, anio: filtros.anio });
  return descargarReportePersonalizadoExcel({ panel, tipoDatos, filtros, columnas, periodo });
}

export async function buscarInscripcionesParaDescuento(busqueda: string) {
  const res = await apiClient.get("/api/v1/extracurricular/direccion/descuentos/buscar", {
    params: { q: busqueda }
  });
  if (!res.success) throw new Error(res.message || "Error al buscar inscripciones");
  return res.data.map(adaptarInscripcion);
}

export async function aplicarDescuentoInscripcion(inscripcionId: string, datosDescuento: any) {
  const res = await apiClient.post(`/api/v1/extracurricular/direccion/descuentos/aplicar`, {
    inscripcionId,
    ...datosDescuento
  });
  if (!res.success) throw new Error(res.message || "Error al aplicar descuento");
  return adaptarInscripcion(res.data);
}

export async function removerDescuentoInscripcion(inscripcionId: string) {
  const res = await apiClient.delete(`/api/v1/extracurricular/direccion/descuentos/remover/${inscripcionId}`);
  if (!res.success) throw new Error(res.message || "Error al remover descuento");
  return adaptarInscripcion(res.data);
}

export async function obtenerCorrelativos() {
  const res = await apiClient.get("/api/v1/extracurricular/direccion/correlativos");
  if (!res.success) throw new Error(res.message || "Error al obtener correlativos");
  return res.data;
}

export async function guardarCorrelativos(correlativos: any) {
  const res = await apiClient.put("/api/v1/extracurricular/direccion/correlativos", correlativos);
  if (!res.success) throw new Error(res.message || "Error al guardar correlativos");
  return res.data;
}
