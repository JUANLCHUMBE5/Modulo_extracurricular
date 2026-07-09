import { isApiMode, apiClient } from "../../services/apiClient";
import { adaptarPago, adaptarEstudiante, adaptarInscripcion } from "../../services/adapters";
import {
  listarPagosMock,
  registrarPagoMock,
  actualizarPagoMock,
  obtenerResumenCajaMock,
  obtenerEstudiantePorDniMock,
  obtenerOpcionesReporteCajaMock,
  listarBandejaPagosWebMock,
  validarPagoWebMock,
  observarPagoWebMock,
  rechazarPagoWebMock,
  generarReporteCajaMock,
  obtenerPagoPorIdMock,
  anularPagoMock,
  cancelarCorrelativoCajaMock,
  buscarEstudiantesCajaQueryMock,
  registrarEgresoMock,
  obtenerMetodosPagoMock,
  guardarMetodosPagoMock,
} from "./utils/cajaServiceMock";

export async function listarPagos(periodo = "todos", filtros = {}) {
  if (periodo === "todos") {
    const [escolar, verano] = await Promise.all([
      listarPagos("escolar", filtros),
      listarPagos("verano", filtros),
    ]);
    return [...escolar, ...verano];
  }
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/pagos", {
      params: { periodo, ...filtros }
    });
    if (!res.success || !Array.isArray(res.data)) return [];
    return res.data.map(adaptarPago);
  }
  return listarPagosMock(periodo, filtros);
}

export async function obtenerHistorialAlumnoCaja(dniEstudiante) {
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
    .sort((a, b) => new Date(b.fecha || b.fechaPago || b.fechaRegistro || 0) - new Date(a.fecha || a.fechaPago || a.fechaRegistro || 0));
}

export async function registrarPago(datosPago) {
  if (isApiMode()) {
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
  return registrarPagoMock(datosPago);
}

export async function actualizarPago(pagoId, datosActualizados) {
  if (isApiMode()) {
    const apiPayload = {
      ...datosActualizados,
      nro_recibo: datosActualizados.nroRecibo || datosActualizados.nro_recibo || ""
    };
    const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}`, apiPayload);
    if (!res.success) throw new Error(res.message || "Error al actualizar pago");
    return adaptarPago(res.data);
  }
  return actualizarPagoMock(pagoId, datosActualizados);
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
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/caja/resumen", {
      params: { periodo }
    });
    if (!res.success) throw new Error(res.message || "Error al obtener resumen de caja");
    return res.data;
  }
  return obtenerResumenCajaMock(periodo);
}

export async function obtenerEstudiantePorDni(dni, periodo = "") {
  if (isApiMode()) {
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
  return obtenerEstudiantePorDniMock(dni, periodo);
}

export async function generarReportePagos(filtros: any = {}) {
  // En ambos modos, se delega al listado de pagos
  const pagos = await listarPagos(filtros.periodo || "todos", filtros);
  return pagos;
}

export async function obtenerOpcionesReporteCaja(periodo = "todos") {
  if (periodo === "todos") {
    const [escolar, verano] = await Promise.all([
      obtenerOpcionesReporteCaja("escolar"),
      obtenerOpcionesReporteCaja("verano"),
    ]);
    
    const vistosProgramas = new Set();
    const programas = [...(escolar?.programas || []), ...(verano?.programas || [])].filter((p: any) => {
      const key = p.value || p.id || p.nombre || p;
      if (vistosProgramas.has(key)) return false;
      vistosProgramas.add(key);
      return true;
    });
    
    const vistosMedios = new Set();
    const mediosPago = [...(escolar?.mediosPago || []), ...(verano?.mediosPago || [])].filter((m: any) => {
      const key = m.value || m.id || m.nombre || m;
      if (vistosMedios.has(key)) return false;
      vistosMedios.add(key);
      return true;
    });

    const vistosGrados = new Set();
    const grados = [...(escolar?.grados || []), ...(verano?.grados || [])].filter((g: any) => {
      const key = g.value || g.id || g.nombre || g;
      if (vistosGrados.has(key)) return false;
      vistosGrados.add(key);
      return true;
    });

    const vistosSecciones = new Set();
    const secciones = [...(escolar?.secciones || []), ...(verano?.secciones || [])].filter((s: any) => {
      const key = s.value || s.id || s.nombre || s;
      if (vistosSecciones.has(key)) return false;
      vistosSecciones.add(key);
      return true;
    });

    return { programas, mediosPago, grados, secciones };
  }
  if (isApiMode()) {
  }
  return obtenerOpcionesReporteCajaMock(periodo);
}

export async function listarBandejaPagosWeb(periodo = "todos") {
  if (periodo === "todos") {
    const [escolar, verano] = await Promise.all([
      listarBandejaPagosWeb("escolar"),
      listarBandejaPagosWeb("verano"),
    ]);
    return [...escolar, ...verano];
  }
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/caja/bandeja-pagos-web", {
      params: { periodo }
    });
    if (!res.success || !Array.isArray(res.data)) return [];

    return res.data.map((item) => ({
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
  return listarBandejaPagosWebMock(periodo);
}

export async function validarPagoWeb(pagoId, observaciones = "") {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/validar`, { observaciones });
    if (!res.success) throw new Error(res.message || "Error al validar pago web");
    return adaptarPago(res.data);
  }
  return validarPagoWebMock(pagoId, observaciones);
}

export async function observarPagoWeb(pagoId, observaciones = "Operacion no coincide con la verificacion.") {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/observar`, { observaciones });
    if (!res.success) throw new Error(res.message || "Error al observar pago web");
    return adaptarPago(res.data);
  }
  return observarPagoWebMock(pagoId, observaciones);
}

export async function rechazarPagoWeb(pagoId, observaciones = "Pago rechazado por Cajera.") {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/rechazar`, { observaciones });
    if (!res.success) throw new Error(res.message || "Error al rechazar pago web");
    return adaptarPago(res.data);
  }
  return rechazarPagoWebMock(pagoId, observaciones);
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
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/caja/reporte", {
      params: filtros
    });
    if (!res.success || !Array.isArray(res.data)) return [];
    return res.data.map(adaptarPago);
  }
  return generarReporteCajaMock(filtros);
}

export async function obtenerPagoPorId(pagoId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/pagos/${pagoId}`);
    if (!res.success) return null;
    return adaptarPago(res.data);
  }
  return obtenerPagoPorIdMock(pagoId);
}

export async function anularPago(pagoId, observaciones = "Pago anulado por Cajera.") {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/pagos/${pagoId}/anular`, { observaciones });
    if (!res.success) throw new Error(res.message || "Error al anular pago");
    return adaptarPago(res.data);
  }
  return anularPagoMock(pagoId, observaciones);
}

export async function cancelarCorrelativoCaja(tipo, motivo, dniEstudiante = "", nombresEstudiante = "", nroRecibo = "") {
  if (isApiMode()) {
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
  return cancelarCorrelativoCajaMock(tipo, motivo, dniEstudiante, nombresEstudiante, nroRecibo);
}

export async function buscarEstudiantesCajaQuery(query) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/caja/estudiantes/buscar/query", {
      params: { q: query }
    });
    if (!res.success) return [];
    return res.data;
  }
  return buscarEstudiantesCajaQueryMock(query);
}

export async function registrarEgresoCaja(datosEgreso) {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/extracurricular/caja/egresos", datosEgreso);
    if (!res.success) throw new Error(res.message || "Error al registrar egreso");
    return res.data;
  }
  return registrarEgresoMock(datosEgreso);
}

const LOCAL_STORAGE_METODOS_KEY = "san_rafael_caja_metodos_pago";

export async function obtenerMetodosPago() {
  if (isApiMode()) {
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
  return obtenerMetodosPagoMock();
}

export async function guardarMetodosPago(metodos: string[]) {
  if (isApiMode()) {
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
  return guardarMetodosPagoMock(metodos);
}
