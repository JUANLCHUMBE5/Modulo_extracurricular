import { isApiMode, apiClient } from "../../../services/apiClient";
import { adaptarInscripcion, adaptarAsistencia } from "../../../services/adapters";
import {
  listarInvitadosMock,
  listarMatriculadosMock,
  listarAsistenciasProgramaMock,
  obtenerListaAsistenciaMock,
} from "../utils/coordinacionServiceMock";

export async function listarInvitados(programaId: string | number) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/invitados`);
    if (!res.success) throw new Error(res.message || "Error al listar invitados");
    return res.data;
  }
  return listarInvitadosMock(programaId);
}

export async function listarMatriculados(programaId: string | number) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/matriculados`);
    if (!res.success) throw new Error(res.message || "Error al listar matriculados");
    return res.data.map(adaptarInscripcion);
  }
  return listarMatriculadosMock(programaId);
}

export async function listarAsistenciasPrograma(programaId: string | number) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/asistencias`);
    if (!res.success) throw new Error(res.message || "Error al listar asistencias");
    return res.data.map(adaptarAsistencia);
  }
  return listarAsistenciasProgramaMock(programaId);
}

export async function obtenerErroresCarga(cargaId: string | number) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/coordinacion/cargas/${cargaId}/errores`);
    if (!res.success) return [];
    return res.data;
  }
  return [];
}

export async function obtenerListaAsistencia(programaId: string | number) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/lista-asistencia`);
    if (!res.success) throw new Error(res.message || "Error al obtener lista de asistencia");
    return res.data;
  }
  return obtenerListaAsistenciaMock(programaId);
}
