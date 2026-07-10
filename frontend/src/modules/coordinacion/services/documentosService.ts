import { apiClient } from "../../../services/apiClient";
import { adaptarPrograma } from "../../../services/adapters";
import { normalizarDuracionAvisoDias, fechaActualInput } from "../../../services/dateService";

export async function crearProgramaDesdeDocumento(datos: any) {
  const payload = {
    nombre_programa: datos.nombre,
    categoria: datos.categoria,
    fecha_inicio: datos.fechaInicio || fechaActualInput(),
    fecha_fin: datos.fechaFin || fechaActualInput(),
    monto: Number(datos.costo || 0),
    cupos: Number(datos.cupos || 0),
    plantilla: datos.plantilla || "",
    plantilla_base64: datos.plantillaBase64 || "",
    plantilla_variables: datos.plantillaVariables || [],
    comunicado: datos.comunicado || "",
    comunicado_completo: datos.comunicadoCompleto || "",
    tipo_comunicado: datos.tipoComunicado || "",
    tipo_documento: datos.tipoDocumento || "",
    numero_documento: datos.numeroDocumento || "",
    area_tematica: datos.areaTematica || "",
    motivo_justificacion: datos.motivoJustificacion || datos.comunicado || "",
    requisitos: datos.requisitos || "",
    detalle_costo: datos.detalleCosto || "",
    detalle_almuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
    incluye_almuerzo: Boolean(datos.incluyeAlmuerzo),
    horario_recepcion_almuerzo: datos.horarioRecepcionAlmuerzo || "",
    nivel_cambridge: datos.nivelCambridge || "",
    modalidades_cambridge: datos.modalidadesCambridge || [],
    costo_ciclo: datos.costoCiclo || datos.costo || "",
    monto_primer_pago: datos.montoPrimerPago || "",
    creado_desde_documento: true,
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
    grados: datos.gradosAplicables || [],
    horario: datos.horario || "Por definir",
    grupo: datos.grupo || "Por definir",
    edad_minima: datos.edadMinima || "",
    edad_maxima: datos.edadMaxima || "",
    grupo_etario: datos.grupoEtario || "",
    dias: datos.dias || [],
  };
  const res = await apiClient.post("/api/v1/extracurricular/programas/documento", payload);
  if (!res.success) throw new Error(res.message || "Error al crear programa desde documento");
  return adaptarPrograma(res.data);
}

export async function buscarInvitacionPorDniPeriodo(dni: string, periodo: string) {
  const res = await apiClient.get(`/api/v1/extracurricular/invitaciones/buscar`, {
    params: { dni, periodo },
  });
  if (!res.success) return null;
  if (!res.data) return null;
  return {
    programaId: res.data.programaId,
    programa: adaptarPrograma(res.data.programa),
    invitado: res.data.invitado,
  };
}

export async function importarInvitados(programaId: string | number, lista: any[]) {
  const res = await apiClient.post(`/api/v1/extracurricular/programas/${programaId}/invitados`, { lista });
  if (!res.success) throw new Error(res.message || "Error al importar invitados");
  return res.data;
}

export async function obtenerActividadPrograma(programaId: string | number) {
  const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/actividad`);
  if (!res.success) throw new Error(res.message || "Error al obtener actividad del programa");
  return res.data;
}
