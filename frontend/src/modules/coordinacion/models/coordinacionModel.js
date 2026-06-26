export function normalizePrograma(p = {}) {
  return {
    id: p.id || "",
    nombre: p.nombre || p.nombre_programa || "",
    categoria: p.categoria || "",
    fechaInicio: p.fechaInicio || p.fecha_inicio || "",
    fechaFin: p.fechaFin || p.fecha_fin || "",
    costo: Number(p.costo ?? p.monto ?? 0),
    cupos: Number(p.cupos || 0),
    cuposOcupados: Number(p.cuposOcupados || p.cupos_ocupados || 0),
    gradosAplicables: p.gradosAplicables || p.grados || [],
    periodo: p.periodo || "escolar",
    modalidadCobro: p.modalidadCobro || p.modalidad_cobro || "Mensual",
    horario: p.horario || "",
    grupo: p.grupo || "",
    estado: p.estado || p.estado_programa || "Habilitado"
  };
}

export function buildProgramaPayload(datos = {}) {
  return {
    ...datos,
    costo: Number(datos.costo || 0),
    cupos: Number(datos.cupos || 0)
  };
}
