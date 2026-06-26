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
} from "./utils/cajaServiceMock";

export async function listarPagos(periodo = "escolar", filtros = {}) {
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

export async function obtenerResumenCaja(periodo = "escolar") {
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

export async function generarReportePagos(filtros = {}) {
  // En ambos modos, se delega al listado de pagos
  const pagos = await listarPagos(filtros.periodo || "escolar", filtros);
  return pagos;
}

export async function obtenerOpcionesReporteCaja(periodo = "escolar") {
  // Nota: En modo API real se podría llamar a un endpoint, pero como no existía en el código original,
  // delegamos a mock o definimos por API. El original solo usaba mock.
  if (isApiMode()) {
    // Si hay endpoint de opciones se llama aquí, de lo contrario se asume mock o comportamiento genérico.
    // Para ser fiel a la estructura original, delegamos a mock si no hay llamada API definida.
  }
  return obtenerOpcionesReporteCajaMock(periodo);
}

export async function listarBandejaPagosWeb(periodo = "escolar") {
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

export async function generarReporteCaja(filtros = {}) {
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
