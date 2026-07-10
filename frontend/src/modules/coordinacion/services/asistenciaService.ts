import { apiClient } from "../../../services/apiClient";
import { adaptarInscripcion, adaptarAsistencia } from "../../../services/adapters";

export async function listarInvitados(programaId: string | number) {
  const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/invitados`);
  if (!res.success) throw new Error(res.message || "Error al listar invitados");
  return res.data;
}

export async function listarMatriculados(programaId: string | number) {
  const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/matriculados`);
  if (!res.success) throw new Error(res.message || "Error al listar matriculados");
  return res.data.map(adaptarInscripcion);
}

export async function listarAsistenciasPrograma(programaId: string | number) {
  const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/asistencias`);
  if (!res.success) throw new Error(res.message || "Error al listar asistencias");
  return res.data.map(adaptarAsistencia);
}

export async function obtenerErroresCarga(cargaId: string | number) {
  const res = await apiClient.get(`/api/v1/extracurricular/coordinacion/cargas/${cargaId}/errores`);
  if (!res.success) return [];
  return res.data;
}

export async function obtenerListaAsistencia(programaId: string | number) {
  const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/lista-asistencia`);
  if (!res.success) throw new Error(res.message || "Error al obtener lista de asistencia");
  return res.data;
}
