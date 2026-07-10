import { isApiMode, apiClient } from "../../../services/apiClient";
import { adaptarPrograma } from "../../../services/adapters";
import { apiDb, saveApiDb, syncApiDb, dispatchApiDbUpdated } from "../../../services/dbApi";
import { normalizarDuracionAvisoDias } from "../../../services/dateService";
import {
  listarCategoriasMock,
  crearCategoriaMock,
  eliminarCategoriaMock,
  listarProgramasMock,
  obtenerProgramaMock,
  crearProgramaMock,
  editarProgramaMock,
  cambiarEstadoProgramaMock,
  eliminarProgramaMock,
} from "../utils/coordinacionServiceMock";

const CONFIG_INSTITUCIONAL_INICIAL = {
  logoInstitucion: null,
  logoCambridge: null,
  firmaCoordinacion: null,
  firmaDireccion: null,
  selloInstitucion: null,
};

function normalizarConfiguracionInstitucional(valor = {}) {
  return {
    ...CONFIG_INSTITUCIONAL_INICIAL,
    ...(valor && typeof valor === "object" ? valor : {}),
  };
}

export async function listarCategorias() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/categorias");
    if (!res.success) throw new Error(res.message || "Error al listar categorías");
    return res.data;
  }
  return listarCategoriasMock();
}

export async function crearCategoria(nombre: string) {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/extracurricular/categorias", { nombre });
    if (!res.success) throw new Error(res.message || "Error al crear categoría");
    return res.data;
  }
  return crearCategoriaMock(nombre);
}

export async function eliminarCategoria(nombre: string) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/categorias/${nombre}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar categoría");
    return nombre;
  }
  return eliminarCategoriaMock(nombre);
}

export async function listarProgramas() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/programas");
    if (!res.success) throw new Error(res.message || "Error al listar programas");
    return res.data.map(adaptarPrograma);
  }
  return listarProgramasMock();
}

export async function obtenerPrograma(id: string | number) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${id}`);
    if (!res.success) throw new Error(res.message || "Error al obtener programa");
    return adaptarPrograma(res.data);
  }
  return obtenerProgramaMock(id);
}

export async function crearPrograma(datos: any) {
  if (isApiMode()) {
    const payload = {
      nombre_programa: datos.nombre,
      categoria: datos.categoria,
      fecha_inicio: datos.fechaInicio,
      fecha_fin: datos.fechaFin,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
      monto: Number(datos.costo || datos.precio || 0),
      cupos: Number(datos.cupos),
      grados: datos.gradosAplicables || [],
      responsable: datos.responsable || datos.docente || "",
      periodo: datos.periodo || "escolar",
      modalidad_cobro: datos.modalidadCobro || "Mensual",
      duracion_aviso_dias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
      hora_limite_aviso: datos.horaLimiteAviso || "23:59",
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      usar_fecha_limite_inscripcion: Boolean(datos.usarFechaLimiteInscripcion),
      fecha_apertura_inscripcion: datos.fechaAperturaInscripcion || "",
      hora_apertura_inscripcion: datos.horaAperturaInscripcion || "",
      fecha_limite_inscripcion: datos.fechaLimiteInscripcion || "",
      hora_limite_inscripcion: datos.horaLimiteInscripcion || "",
      anuncio_imagen: datos.anuncioImagen || "",
      anuncio_imagen_nombre: datos.anuncioImagenNombre || "",
      talleres_deportivos: datos.talleresDeportivos || [],
      horarios_por_grupo: datos.horariosPorGrupo || [],
      horario: datos.horario || "Por definir",
      grupo: datos.grupo || "Por definir",
      edad_minima: datos.edadMinima || "",
      edad_maxima: datos.edadMaxima || "",
      grupo_etario: datos.grupoEtario || "",
      requisitos: datos.requisitos || "",
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      tipo_comunicado: datos.tipoComunicado || "",
      tipo_documento: datos.tipoDocumento || "",
      numero_documento: datos.numeroDocumento || "",
      area_tematica: datos.areaTematica || "",
      motivo_justificacion: datos.motivoJustificacion || datos.comunicado || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      incluye_almuerzo: Boolean(datos.incluyeAlmuerzo),
      horario_recepcion_almuerzo: datos.horarioRecepcionAlmuerzo || "",
      nivel_cambridge: datos.nivelCambridge || "",
      modalidades_cambridge: datos.modalidadesCambridge || [],
      costo_ciclo: datos.costoCiclo || datos.costo || "",
      monto_primer_pago: datos.montoPrimerPago || "",
      invitacion_masiva: Boolean(datos.invitacionMasiva),
      alcance_invitacion_masiva: datos.alcanceInvitacionMasiva || "colegio",
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      plantilla_validada: Boolean(datos.plantillaValidada),
      dias: datos.dias || [],
    };
    const res = await apiClient.post("/api/v1/extracurricular/programas", payload);
    if (!res.success) throw new Error(res.message || "Error al crear programa");
    dispatchApiDbUpdated();
    return adaptarPrograma(res.data);
  }
  return crearProgramaMock(datos);
}

export async function editarPrograma(id: string | number, datos: any) {
  if (isApiMode()) {
    const payload = {
      nombre_programa: datos.nombre,
      categoria: datos.categoria,
      fecha_inicio: datos.fechaInicio,
      fecha_fin: datos.fechaFin,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
      monto: Number(datos.costo || datos.precio || 0),
      cupos: Number(datos.cupos),
      grados: datos.gradosAplicables || [],
      responsable: datos.responsable || datos.docente || "",
      periodo: datos.periodo || "escolar",
      modalidad_cobro: datos.modalidadCobro || "Mensual",
      duracion_aviso_dias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
      hora_limite_aviso: datos.horaLimiteAviso || "23:59",
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      usar_fecha_limite_inscripcion: Boolean(datos.usarFechaLimiteInscripcion),
      fecha_apertura_inscripcion: datos.fechaAperturaInscripcion || "",
      hora_apertura_inscripcion: datos.horaAperturaInscripcion || "",
      fecha_limite_inscripcion: datos.fechaLimiteInscripcion || "",
      hora_limite_inscripcion: datos.horaLimiteInscripcion || "",
      anuncio_imagen: datos.anuncioImagen || "",
      anuncio_imagen_nombre: datos.anuncioImagenNombre || "",
      talleres_deportivos: datos.talleresDeportivos || [],
      horarios_por_grupo: datos.horariosPorGrupo || [],
      horario: datos.horario || "Por definir",
      grupo: datos.grupo || "Por definir",
      edad_minima: datos.edadMinima || "",
      edad_maxima: datos.edadMaxima || "",
      grupo_etario: datos.grupoEtario || "",
      requisitos: datos.requisitos || "",
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      tipo_comunicado: datos.tipoComunicado || "",
      tipo_documento: datos.tipoDocumento || "",
      numero_documento: datos.numeroDocumento || "",
      area_tematica: datos.areaTematica || "",
      motivo_justificacion: datos.motivoJustificacion || datos.comunicado || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      incluye_almuerzo: Boolean(datos.incluyeAlmuerzo),
      horario_recepcion_almuerzo: datos.horarioRecepcionAlmuerzo || "",
      nivel_cambridge: datos.nivelCambridge || "",
      modalidades_cambridge: datos.modalidadesCambridge || [],
      costo_ciclo: datos.costoCiclo || datos.costo || "",
      monto_primer_pago: datos.montoPrimerPago || "",
      invitacion_masiva: Boolean(datos.invitacionMasiva),
      alcance_invitacion_masiva: datos.alcanceInvitacionMasiva || "colegio",
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      plantilla_validada: Boolean(datos.plantillaValidada),
      dias: datos.dias || [],
    };
    const res = await apiClient.put(`/api/v1/extracurricular/programas/${id}`, payload);
    if (!res.success) throw new Error(res.message || "Error al editar programa");
    dispatchApiDbUpdated();
    return adaptarPrograma(res.data);
  }
  return editarProgramaMock(id, datos);
}

export async function cambiarEstadoPrograma(id: string | number, nuevoEstado: string) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/programas/${id}/estado`, { estado: nuevoEstado });
    if (!res.success) throw new Error(res.message || "Error al cambiar estado de programa");
    dispatchApiDbUpdated();
    return adaptarPrograma(res.data);
  }
  return cambiarEstadoProgramaMock(id, nuevoEstado);
}

export async function eliminarPrograma(id: string | number) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/programas/${id}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar programa");
    dispatchApiDbUpdated();
    return true;
  }
  return eliminarProgramaMock(id);
}

export async function obtenerConfiguracionInstitucional() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/coordinacion/configuracion-institucional");
    if (!res.success) throw new Error(res.message || "Error al obtener configuracion institucional");
    return normalizarConfiguracionInstitucional(res.data);
  }

  await syncApiDb();
  return normalizarConfiguracionInstitucional(apiDb.configuracionInstitucional);
}

export async function guardarConfiguracionInstitucional(configuracion: any) {
  const normalizada = normalizarConfiguracionInstitucional(configuracion);
  if (isApiMode()) {
    const res = await apiClient.put("/api/v1/extracurricular/coordinacion/configuracion-institucional", normalizada);
    if (!res.success) throw new Error(res.message || "Error al guardar configuracion institucional");
    dispatchApiDbUpdated();
    return normalizarConfiguracionInstitucional(res.data);
  }

  await syncApiDb();
  apiDb.configuracionInstitucional = normalizada;
  await saveApiDb();
  return normalizada;
}
