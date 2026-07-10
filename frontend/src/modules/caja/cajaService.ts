import { apiClient } from "../../services/apiClient";
import { adaptarPago, adaptarEstudiante, adaptarInscripcion } from "../../services/adapters";

export async function listarPagos(periodo = "todos", filtros = {}) {
  if (periodo === "todos") {
    const [escolar, verano] = await Promise.all([
      listarPagos("escolar", filtros),
      listarPagos("verano", filtros),
    ]);
    return [...escolar, ...verano];
  }
  const res = await apiClient.get("/api/v1/extracurricular/pagos", {
    params: { periodo, ...filtros }
  });
  if (!res.success || !Array.isArray(res.data)) return [];
  return res.data.map(adaptarPago);
}

export async function obtenerHistorialAlumnoCaja(dniEstudiante: string) {
  if (!dniEstudiante) return [];

  const periodos = ["escolar", "verano"];
  const resultados = await Promise.all(
    periodos.map((periodo) => listarPagos(periodo, { estudianteDni: dniEstudiante }))
  );

  const vistos = new Set();
  return resultados
    .flat()
    .filter((pago) => {
      const key = pago.id || pago.pagoId || `${pago.periodo || ""}-${pago.programaId || pago.programa || ""}-${pago.fecha || pago.fechaPago || ""}`;
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.fecha || b.fechaPago || b.fechaRegistro || 0).getTime() - new Date(a.fecha || a.fechaPago || a.fechaRegistro || 0).getTime());
}

export async function registrarPago(datosPago: any) {
  const apiPayload = {
    inscripcion_id: datosPago.inscripcionId || "",
    dni_estudiante: datosPago.dniEstudiante || datosPago.estudianteDni || "",
    monto_pago: Number(datosPago.monto || 0),
    metodo_pago: datosPago.formaPago || datosPago.medioPago || datosPago.metodo || "Efectivo",
    estado_pago: datosPago.estado || "completado",
    numero_operacion: datosPago.numeroOperacion || datosPago.referenciaPago || "",
    telefono_operacion: datosPago.telefonoOperacion || "",
    origen_registro: "Cajera",
    nro_recibo: datosPago.nroRecibo || ""
  };
  const res = await apiClient.post("/api/v1/extracurricular/pagos", apiPayload);
  if (!res.success) throw new Error(res.message || "Error al registrar pago");
  return adaptarPago(res.data);
}

export async function actualizarPago(pagoId: string, datosActualizados: any) {
  const apiPayload = {
    ...datosActualizados,
    nro_recibo: datosActualizados.nroRecibo || datosActualizados.nro_recibo || ""
  };
  const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}`, apiPayload);
  if (!res.success) throw new Error(res.message || "Error al actualizar pago");
  return adaptarPago(res.data);
}

export async function obtenerResumenCaja(periodo = "todos") {
  if (periodo === "todos") {
    const [escolar, verano] = await Promise.all([
      obtenerResumenCaja("escolar"),
      obtenerResumenCaja("verano"),
    ]);
    return {
      totalIngreso: (escolar?.totalIngreso || 0) + (verano?.totalIngreso || 0),
      totalEgreso: (escolar?.totalEgreso || 0) + (verano?.totalEgreso || 0),
      totalIngresoNeto: (escolar?.totalIngresoNeto || 0) + (verano?.totalIngresoNeto || 0),
      totalPendiente: (escolar?.totalPendiente || 0) + (verano?.totalPendiente || 0),
      totalCancelado: (escolar?.totalCancelado || 0) + (verano?.totalCancelado || 0),
      cantidadPagos: (escolar?.cantidadPagos || 0) + (verano?.cantidadPagos || 0),
      cantidadEgresos: (escolar?.cantidadEgresos || 0) + (verano?.cantidadEgresos || 0),
      cantidadPendientes: (escolar?.cantidadPendientes || 0) + (verano?.cantidadPendientes || 0),
    };
  }
  const res = await apiClient.get("/api/v1/extracurricular/caja/resumen", {
    params: { periodo }
  });
  if (!res.success) throw new Error(res.message || "Error al obtener resumen de caja");
  return res.data;
}

export async function obtenerEstudiantePorDni(dni: string, periodo = "") {
  const res = await apiClient.get(`/api/v1/extracurricular/caja/estudiantes/${dni}`, {
    params: { periodo }
  });
  if (!res.success || !res.data) return null;

  const estudiante = adaptarEstudiante(res.data.estudiante || res.data);
  const inscripcion = res.data.inscripcionCaja ? adaptarInscripcion(res.data.inscripcionCaja) : null;
  const inscripcionesCaja = Array.isArray(res.data.inscripcionesCaja)
    ? res.data.inscripcionesCaja.map(adaptarInscripcion).filter(Boolean)
    : inscripcion
      ? [inscripcion]
      : [];

  if (!inscripcion) {
    return {
      ...estudiante,
      sinInscripcionCaja: true,
      requiereDerivacionCaja: res.data.requiereDerivacionCaja || false,
      inscripcionesCaja,
    };
  }

  return {
    ...estudiante,
    inscripcionCaja: inscripcion,
    inscripcionesCaja,
    programaAsignado: inscripcion.programaId || estudiante.programaAsignado || "",
    programaNombre: inscripcion.programa || estudiante.programaNombre || "",
    programaCosto: inscripcion.costo ?? estudiante.programaCosto,
    sinInscripcionCaja: res.data.sinInscripcionCaja || false,
    requiereDerivacionCaja: res.data.requiereDerivacionCaja || false
  };
}

export async function generarReportePagos(filtros: any = {}) {
  const pagos = await listarPagos(filtros.periodo || "todos", filtros);
  return pagos;
}

export async function obtenerOpcionesReporteCaja(periodo = "todos") {
  const pagos = await listarPagos(periodo);
  
  const programasSet = new Set<string>();
  const mediosPagoSet = new Set<string>();
  const gradosSet = new Set<string>();
  const seccionesSet = new Set<string>();
  
  pagos.forEach((pago: any) => {
    if (pago.programa) programasSet.add(pago.programa);
    if (pago.formaPago) mediosPagoSet.add(pago.formaPago);
    if (pago.grado) gradosSet.add(pago.grado);
    if (pago.seccion) seccionesSet.add(pago.seccion);
  });
  
  return {
    programas: Array.from(programasSet).map(p => ({ value: p, label: p })),
    mediosPago: Array.from(mediosPagoSet).map(m => ({ value: m, label: m })),
    grados: Array.from(gradosSet).map(g => ({ value: g, label: g })),
    secciones: Array.from(seccionesSet).map(s => ({ value: s, label: s })),
  };
}

export async function listarBandejaPagosWeb(periodo = "todos") {
  if (periodo === "todos") {
    const [escolar, verano] = await Promise.all([
      listarBandejaPagosWeb("escolar"),
      listarBandejaPagosWeb("verano"),
    ]);
    return [...escolar, ...verano];
  }
  const res = await apiClient.get("/api/v1/extracurricular/caja/bandeja-pagos-web", {
    params: { periodo }
  });
  if (!res.success || !Array.isArray(res.data)) return [];

  return res.data.map((item: any) => ({
    id: item.id || `${item.inscripcionId}-${item.pago_id || item.id || "sin-pago"}`,
    inscripcionId: item.inscripcionId,
    pagoId: item.pago_id || item.id || "",
    dniEstudiante: item.dniEstudiante || "",
    estudiante: item.estudiante || "",
    programaId: item.programaId || "",
    programa: item.programa || "",
    grado: item.grado || "",
    seccion: item.seccion || "",
    apoderado: item.apoderado || "",
    telefono: item.telefono || "",
    telefonoOperacion: item.telefonoOperacion || "",
    numeroOperacion: item.numeroOperacion || "",
    capturaPagoBase64: item.capturaPagoBase64 || "",
    capturaPagoNombre: item.capturaPagoNombre || "",
    monto: Number(item.monto || 0),
    formaPago: item.formaPago || "Yape",
    estadoRevision: item.estadoRevision || "pendiente",
    estadoPago: item.estadoPago || "pendiente",
    estadoVerificacion: item.estadoVerificacion || "",
    estadoInscripcion: item.estadoInscripcion || "",
    observaciones: item.observaciones || "",
    fechaRegistro: item.fechaRegistro || "",
    fechaPago: item.fechaPago || "",
    fecha: item.fecha || "",
    origen: item.origen || "Portal padres",
  }));
}

export async function validarPagoWeb(pagoId: string, observaciones = "") {
  const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/validar`, { observaciones });
  if (!res.success) throw new Error(res.message || "Error al validar pago web");
  return adaptarPago(res.data);
}

export async function observarPagoWeb(pagoId: string, observaciones = "Operacion no coincide con la verificacion.") {
  const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/observar`, { observaciones });
  if (!res.success) throw new Error(res.message || "Error al observar pago web");
  return adaptarPago(res.data);
}

export async function rechazarPagoWeb(pagoId: string, observaciones = "Pago rechazado por Cajera.") {
  const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/rechazar`, { observaciones });
  if (!res.success) throw new Error(res.message || "Error al rechazar pago web");
  return adaptarPago(res.data);
}

export async function generarReporteCaja(filtros: any = {}) {
  const period = filtros.periodo || "todos";
  if (period === "todos") {
    const [escolar, verano] = await Promise.all([
      generarReporteCaja({ ...filtros, periodo: "escolar" }),
      generarReporteCaja({ ...filtros, periodo: "verano" }),
    ]);
    return [...escolar, ...verano];
  }
  const res = await apiClient.get("/api/v1/extracurricular/caja/reporte", {
    params: filtros
  });
  if (!res.success || !Array.isArray(res.data)) return [];
  return res.data.map(adaptarPago);
}

export async function obtenerPagoPorId(pagoId: string) {
  const res = await apiClient.get(`/api/v1/extracurricular/pagos/${pagoId}`);
  if (!res.success) return null;
  return adaptarPago(res.data);
}

export async function anularPago(pagoId: string, observaciones = "Pago anulado por Cajera.") {
  const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/anular`, { observaciones });
  if (!res.success) throw new Error(res.message || "Error al anular pago");
  return adaptarPago(res.data);
}

export async function cancelarCorrelativoCaja(tipo: string, motivo: string, dniEstudiante = "", nombresEstudiante = "", nroRecibo = "") {
  const res = await apiClient.post("/api/v1/extracurricular/caja/correlativos/cancelar", {
    tipo,
    motivo,
    dniEstudiante,
    nombresEstudiante,
    nroRecibo
  });
  if (!res.success) throw new Error(res.message || "Error al cancelar correlativo");
  return res.data;
}

export async function buscarEstudiantesCajaQuery(query: string) {
  const res = await apiClient.get("/api/v1/extracurricular/caja/estudiantes/buscar/query", {
    params: { q: query }
  });
  if (!res.success) return [];
  return res.data;
}

export async function registrarEgresoCaja(datosEgreso: any) {
  const res = await apiClient.post("/api/v1/extracurricular/caja/egresos", datosEgreso);
  if (!res.success) throw new Error(res.message || "Error al registrar egreso");
  return res.data;
}

const LOCAL_STORAGE_METODOS_KEY = "san_rafael_caja_metodos_pago";

export async function obtenerMetodosPago() {
  try {
    const res = await apiClient.get("/api/v1/extracurricular/caja/metodos-pago");
    if (res && res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn("Backend does not support /api/v1/extracurricular/caja/metodos-pago, using localStorage fallback.");
  }
  
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_METODOS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading localStorage:", e);
  }
  return ["Efectivo", "Yape", "Plin", "Transferencia", "Tarjeta"];
}

export async function guardarMetodosPago(metodos: string[]) {
  try {
    const res = await apiClient.post("/api/v1/extracurricular/caja/metodos-pago", { metodos });
    if (res && res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn("Backend does not support /api/v1/extracurricular/caja/metodos-pago, saving to localStorage fallback.");
  }
  
  try {
    localStorage.setItem(LOCAL_STORAGE_METODOS_KEY, JSON.stringify(metodos));
  } catch (e) {
    console.error("Error saving to localStorage:", e);
  }
  return metodos;
}
