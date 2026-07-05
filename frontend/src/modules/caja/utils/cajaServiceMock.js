import { apiDb, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { fechaActualIso } from "../../../services/dateService";
import {
  esRegistroWeb,
  filtrarReporteCaja,
  normalizarEstadoPago,
  normalizarPeriodo,
  normalizarTexto,
  obtenerEstadoRevisionWeb,
} from "../cajaServiceUtils";

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function calcularSiguienteRecibo(startValue, existingNros) {
  if (!startValue) return "";
  const match = String(startValue).match(/^(.*?)(\d+)$/);
  if (!match) return startValue;
  const prefix = match[1];
  const startNumStr = match[2];
  const S = Number(startNumStr);
  const padLength = startNumStr.length;

  let maxM = 0;
  let foundAny = false;

  for (const nro of existingNros) {
    if (!nro) continue;
    const nroStr = String(nro).trim();
    if (nroStr.startsWith(prefix)) {
      const numPart = nroStr.slice(prefix.length);
      if (/^\d+$/.test(numPart)) {
        const val = Number(numPart);
        if (!foundAny || val > maxM) {
          maxM = val;
          foundAny = true;
        }
      }
    }
  }

  let nextVal;
  if (!foundAny || maxM < S) {
    nextVal = S;
  } else {
    nextVal = maxM + 1;
  }

  return prefix + String(nextVal).padStart(padLength, "0");
}

export async function listarPagosMock(periodo = "escolar", filtros = {}) {
  await esperar(400);
  await syncApiDb();

  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  const periodoNormalizado = normalizarPeriodo(periodo);
  const programasVigentes = obtenerProgramasVigentesCaja(periodoNormalizado);
  let pagos = [...apiDb.pagos].filter((p) => normalizarPeriodo(p.periodo || periodoNormalizado) === periodoNormalizado);

  if (filtros.estudianteDni) {
    pagos = pagos.filter((p) => (p.estudianteDni || p.dniEstudiante) === filtros.estudianteDni);
  }
  if (filtros.estado) {
    pagos = pagos.filter((p) => p.estado === filtros.estado);
  }
  if (filtros.programa) {
    pagos = pagos.filter((p) => coincideProgramaFiltroCaja(p, filtros.programa, programasVigentes));
  }

  return pagos
    .map((pago) => enriquecerPagoConProgramaCaja(pago, programasVigentes))
    .sort((a, b) => new Date(b.fecha || b.fechaPago || 0) - new Date(a.fecha || a.fechaPago || 0));
}

function enriquecerPagoConProgramaCaja(pago = {}, programasVigentes = null) {
  const inscripcion = (apiDb.inscripciones || []).find((item) =>
    (pago.inscripcionId && item.id === pago.inscripcionId) ||
    (
      item.dniEstudiante === (pago.dniEstudiante || pago.estudianteDni) &&
      (
        (pago.programaId && item.programaId === pago.programaId) ||
        normalizarTexto(item.programa) === normalizarTexto(pago.programa || pago.programaNombre)
      )
    )
  );
  const programa = resolverProgramaVigenteCaja(
    {
      programaId: pago.programaId || inscripcion?.programaId,
      programa: pago.programa || pago.programaNombre || inscripcion?.programa,
      periodo: pago.periodo,
    },
    programasVigentes
  );

  return {
    ...pago,
    programaId: pago.programaId || inscripcion?.programaId || programa?.id || "",
    programa: pago.programa || pago.programaNombre || inscripcion?.programa || programa?.nombre || "",
    programaNombre: pago.programaNombre || pago.programa || inscripcion?.programa || programa?.nombre || "",
    programaFechaInicio: programa?.fechaInicio || inscripcion?.fechaInicio || "",
    programaFechaFin: programa?.fechaFin || inscripcion?.fechaFin || "",
    estadoPrograma: programa?.estado || "",
    nombresEstudiante: pago.nombresEstudiante || inscripcion?.nombresEstudiante || "",
  };
}

export async function registrarPagoMock(datosPago) {
  await esperar(500);
  await syncApiDb();

  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  if (!apiDb.correlativos) apiDb.correlativos = {};
  const nroRecibo = apiDb.correlativos.reciboActual || apiDb.correlativos.recibo || "REC-0001";
  apiDb.correlativos.reciboActual = incrementarCorrelativo(nroRecibo);

  const DniEstudiante = datosPago.dniEstudiante || datosPago.estudianteDni || "";
  const nombresEstudiante = datosPago.nombresEstudiante || datosPago.estudianteNombre || "";
  const programa = datosPago.programa || datosPago.programaNombre || "";
  const pagoDuplicado = encontrarPagoActivoDuplicado(datosPago);

  if (pagoDuplicado) {
    const estadoDuplicado = normalizarEstadoPago(pagoDuplicado.estado || pagoDuplicado.estadoPago || pagoDuplicado.estadoVerificacion);
    if (estadoDuplicado === "pagado") {
      throw new Error("Este estudiante ya tiene un pago aprobado para este taller. No se puede cobrar nuevamente.");
    }
    if (estadoDuplicado === "verificando") {
      throw new Error("El padre ya envio un pago web para este taller. Cajera debe validarlo u observarlo, no registrar otro cobro.");
    }
    throw new Error("Ya existe un pago activo para esta inscripcion. No se puede registrar un pago duplicado.");
  }

  const pago = {
    id: generarPagoId(),
    ...datosPago,
    nroRecibo: nroRecibo,
    origenRegistro: datosPago.origenRegistro || "Cajera",
    estudianteDni: datosPago.estudianteDni || DniEstudiante,
    estudianteNombre: datosPago.estudianteNombre || nombresEstudiante,
    dniEstudiante: DniEstudiante,
    nombresEstudiante,
    programaNombre: datosPago.programaNombre || programa,
    programa,
    periodo: normalizarPeriodo(datosPago.periodo),
    monto: Number(datosPago.monto || 0),
    fecha: datosPago.fecha || datosPago.fechaPago || fechaActualIso(),
    estado: datosPago.estado || "pendiente",
    createdAt: fechaActualIso(),
  };

  apiDb.pagos.push(pago);
  sincronizarPagoConInscripcion(pago);
  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));

  return pago;
}

export async function actualizarPagoMock(pagoId, datosActualizados) {
  await esperar(400);
  await syncApiDb();

  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  const index = apiDb.pagos.findIndex((p) => p.id === pagoId);
  if (index === -1) throw new Error("Pago no encontrado.");

  const DniEstudiante = datosActualizados.dniEstudiante || datosActualizados.estudianteDni || apiDb.pagos[index].dniEstudiante || "";
  const nombresEstudiante = datosActualizados.nombresEstudiante || datosActualizados.estudianteNombre || apiDb.pagos[index].nombresEstudiante || "";
  const programa = datosActualizados.programa || datosActualizados.programaNombre || apiDb.pagos[index].programa || "";

  apiDb.pagos[index] = {
    ...apiDb.pagos[index],
    ...datosActualizados,
    estudianteDni: datosActualizados.estudianteDni || DniEstudiante,
    estudianteNombre: datosActualizados.estudianteNombre || nombresEstudiante,
    dniEstudiante: DniEstudiante,
    nombresEstudiante,
    programaNombre: datosActualizados.programaNombre || programa,
    programa,
    periodo: normalizarPeriodo(datosActualizados.periodo || apiDb.pagos[index].periodo),
    monto: Number(datosActualizados.monto || 0),
    fecha: datosActualizados.fecha || datosActualizados.fechaPago || apiDb.pagos[index].fecha,
    updatedAt: fechaActualIso(),
  };
  sincronizarPagoConInscripcion(apiDb.pagos[index]);

  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));

  return apiDb.pagos[index];
}

export async function obtenerResumenCajaMock(periodo = "escolar") {
  await esperar(300);
  await syncApiDb();

  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  const periodoNormalizado = normalizarPeriodo(periodo);
  const pagos = apiDb.pagos.filter((p) => normalizarPeriodo(p.periodo || periodoNormalizado) === periodoNormalizado);
  const inscripciones = obtenerInscripcionesCaja(periodoNormalizado);

  const pagosCompletados = pagos.filter((p) => p.estado === "completado" || p.estado === "validado");
  const pagosIngresos = pagosCompletados.filter((p) => p.formaPago !== "Egreso");
  const pagosEgresos = pagosCompletados.filter((p) => p.formaPago === "Egreso");

  const totalIngreso = pagosIngresos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalEgreso = pagosEgresos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

  const totalPendiente = inscripciones
    .filter((inscripcion) => normalizarEstadoPago(inscripcion.estadoPago) === "pendiente")
    .reduce((sum, inscripcion) => sum + Number(inscripcion.costo || 0), 0);

  const totalCancelado = pagos.filter((p) => p.estado === "cancelado").reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

  return {
    totalIngreso,
    totalEgreso,
    totalIngresoNeto: totalIngreso - totalEgreso,
    totalPendiente,
    totalCancelado,
    cantidadPagos: pagosIngresos.length,
    cantidadEgresos: pagosEgresos.length,
    cantidadPendientes: inscripciones.filter((inscripcion) => normalizarEstadoPago(inscripcion.estadoPago) === "pendiente").length,
  };
}

export async function obtenerEstudiantePorDniMock(dni, periodo = "") {
  await esperar(200);
  await syncApiDb();

  const periodoNormalizado = periodo ? normalizarPeriodo(periodo) : "";
  const inscripciones = [...(apiDb.inscripciones || [])]
    .filter((item) =>
      item.dniEstudiante === dni &&
      (!periodoNormalizado || normalizarPeriodo(item.periodo || periodoNormalizado) === periodoNormalizado)
    )
    .sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
  const pagosEstudiante = (apiDb.pagos || []).filter((pago) => pago.dniEstudiante === dni || pago.estudianteDni === dni);
  const estadosCerrados = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"];
  const esEstadoCerrado = (...valores) => {
    const texto = valores.map((valor) => normalizarTexto(valor)).join(" ");
    return estadosCerrados.some((estado) => texto.includes(estado));
  };
  const buscarPagoAsociado = (item) => pagosEstudiante.find((pago) =>
    (item.id && pago.inscripcionId === item.id) ||
    (
      (pago.dniEstudiante || pago.estudianteDni) === item.dniEstudiante &&
      (
        (item.programaId && pago.programaId === item.programaId) ||
        normalizarTexto(pago.programa || pago.programaNombre) === normalizarTexto(item.programa)
      )
    )
  );
  const isPaid = (item) => {
    const pagoAsociado = buscarPagoAsociado(item);
    return esEstadoCerrado(item.estadoPago, item.estadoInscripcion, pagoAsociado?.estado, pagoAsociado?.estadoPago, pagoAsociado?.estadoVerificacion);
  };

  // Solo considerar inscripciones que fueron derivadas a Caja
  const derivadas = inscripciones.filter((item) => item.derivadoCaja);
  const derivadasPendientes = derivadas.filter((item) => !isPaid(item));
  const inscripcion = derivadasPendientes[0]
    || derivadas[0]
    || null;

  const estudiante = apiDb.estudiantes[dni] || crearEstudianteDesdeInscripcion(inscripciones[0]);

  if (!estudiante) return null;

  // Hay inscripciones pero ninguna derivada a caja
  if (!inscripcion && inscripciones.length > 0) {
    return {
      ...estudiante,
      sinInscripcionCaja: true,
      requiereDerivacionCaja: true,
    };
  }

  if (!inscripcion) {
    return {
      ...estudiante,
      sinInscripcionCaja: true,
    };
  }

  return {
    ...estudiante,
    inscripcionCaja: inscripcion,
    inscripcionesCaja: derivadasPendientes,
    programaAsignado: inscripcion.programaId || estudiante.programaAsignado || "",
    programaNombre: inscripcion.programa || estudiante.programaNombre || "",
    programaCosto: inscripcion.costo ?? estudiante.programaCosto,
    sinInscripcionCaja: derivadasPendientes.length === 0,
    requiereDerivacionCaja: false,
  };
}

export async function obtenerOpcionesReporteCajaMock(periodo = "escolar") {
  await esperar(200);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const programas = obtenerProgramasVigentesCaja(periodoNormalizado).items
    .map((programa) => {
      const esArchivado = normalizarTexto(programa.estado) === "archivado";
      const idTag = programa.id ? `[${programa.id}] ` : "";
      return {
        value: programa.id,
        label: esArchivado 
          ? `${idTag}${programa.nombre || "Sin programa"} (Archivado)` 
          : `${idTag}${programa.nombre || "Sin programa"}`,
        esArchivado,
        nombre: programa.nombre || "Sin programa",
      };
    })
    .sort((a, b) => {
      if (a.esArchivado && !b.esArchivado) return 1;
      if (!a.esArchivado && b.esArchivado) return -1;
      return a.nombre.localeCompare(b.nombre);
    });

  const medios = new Set(
    [...(Array.isArray(apiDb.pagos) ? apiDb.pagos : [])]
      .filter((pago) => normalizarPeriodo(pago.periodo || periodoNormalizado) === periodoNormalizado)
      .map((pago) => pago.formaPago || pago.medioPago || "")
      .filter(Boolean)
  );

  return {
    programas,
    mediosPago: [...medios].sort().map((medio) => ({ value: medio, label: medio })),
  };
}

export async function listarBandejaPagosWebMock(periodo = "escolar") {
  await esperar(300);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const pagos = [...(Array.isArray(apiDb.pagos) ? apiDb.pagos : [])]
    .filter((pago) => normalizarPeriodo(pago.periodo || periodoNormalizado) === periodoNormalizado);
  const programas = new Map((apiDb.programas || []).map((programa) => [programa.id, programa]));

  return obtenerInscripcionesCaja(periodoNormalizado)
    .filter((inscripcion) => {
      const pago = encontrarPagoInscripcion(inscripcion, pagos);
      return esRegistroWeb(inscripcion.origenRegistro) || esRegistroWeb(pago?.origenRegistro);
    })
    .map((inscripcion) => {
      const pago = encontrarPagoInscripcion(inscripcion, pagos);
      const programa = programas.get(inscripcion.programaId) || {};
      const estadoRevision = obtenerEstadoRevisionWeb(inscripcion, pago);
      return {
        id: `${inscripcion.id}-${pago?.id || "sin-pago"}`,
        inscripcionId: inscripcion.id,
        pagoId: pago?.id || "",
        dniEstudiante: inscripcion.dniEstudiante || pago?.dniEstudiante || pago?.estudianteDni || "",
        estudiante: inscripcion.nombresEstudiante || pago?.nombresEstudiante || pago?.estudianteNombre || "",
        programaId: inscripcion.programaId || pago?.programaId || "",
        programa: inscripcion.programa || pago?.programa || pago?.programaNombre || programa.nombre || "",
        grado: inscripcion.gradoEstudiante || inscripcion.grado || "",
        seccion: inscripcion.seccion || inscripcion.seccionEstudiante || "",
        apoderado: inscripcion.apoderado || pago?.apoderado || "",
        telefono: inscripcion.telefono || pago?.telefono || "",
        telefonoOperacion: pago?.telefonoOperacion || inscripcion.pagoTelefono || "",
        numeroOperacion: pago?.numeroOperacion || pago?.referenciaPago || inscripcion.pagoReferencia || "",
        capturaPagoBase64: pago?.capturaPagoBase64 || "",
        capturaPagoNombre: pago?.capturaPagoNombre || inscripcion.pagoCapturaNombre || "",
        monto: Number(pago?.monto ?? inscripcion.costo ?? programa.costo ?? 0),
        formaPago: pago?.formaPago || pago?.medioPago || (inscripcion.derivadoCaja ? "Reserva Web" : (pago ? "Yape" : "Sin pago")),
        estadoRevision,
        estadoPago: normalizarEstadoPago(pago?.estado || inscripcion.estadoPago),
        estadoVerificacion: pago?.estadoVerificacion || "",
        estadoInscripcion: inscripcion.estadoInscripcion || "",
        observaciones: pago?.observaciones || pago?.observacionVerificacion || "",
        fechaRegistro: inscripcion.fechaRegistro || "",
        fechaPago: pago?.fechaPago || pago?.fecha || "",
        fecha: pago?.fecha || inscripcion.fechaRegistro || "",
        origen: inscripcion.origenRegistro || pago?.origenRegistro || "Portal padres",
      };
    })
    .sort((a, b) => new Date(b.fecha || b.fechaRegistro || 0) - new Date(a.fecha || a.fechaRegistro || 0));
}

export async function validarPagoWebMock(pagoId, observaciones = "") {
  await syncApiDb();
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];
  const idx = apiDb.pagos.findIndex(p => p.id === pagoId);
  let nroRecibo = "";
  if (idx !== -1) {
    nroRecibo = apiDb.pagos[idx].nroRecibo || "";
    if (!nroRecibo) {
      if (!apiDb.correlativos) apiDb.correlativos = {};
      nroRecibo = apiDb.correlativos.reciboActual || apiDb.correlativos.recibo || "REC-0001";
      apiDb.correlativos.reciboActual = incrementarCorrelativo(nroRecibo);
    }
  }

  return actualizarEstadoPagoWeb(pagoId, {
    estado: "completado",
    estadoVerificacion: "validado",
    estadoInscripcion: "Pago validado",
    estadoPago: "Pagado",
    fechaPago: fechaActualIso(),
    observaciones,
    nroRecibo,
  });
}

export async function observarPagoWebMock(pagoId, observaciones = "Operacion no coincide con la verificacion.") {
  return actualizarEstadoPagoWeb(pagoId, {
    estado: "observado",
    estadoVerificacion: "observado",
    estadoInscripcion: "Pago observado",
    estadoPago: "Pendiente",
    observaciones,
  });
}

export async function rechazarPagoWebMock(pagoId, observaciones = "Pago rechazado por Cajera.") {
  return actualizarEstadoPagoWeb(pagoId, {
    estado: "anulado",
    estadoVerificacion: "anulado",
    estadoInscripcion: "pendiente_pago",
    estadoPago: "Pendiente",
    observaciones,
  });
}

export async function generarReporteCajaMock(filtros = {}) {
  await esperar(450);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(filtros.periodo || "escolar");
  const programasVigentes = obtenerProgramasVigentesCaja(periodoNormalizado);
  const pagos = [...(Array.isArray(apiDb.pagos) ? apiDb.pagos : [])]
    .filter((pago) => normalizarPeriodo(pago.periodo || periodoNormalizado) === periodoNormalizado);

  if (filtros.tipoReporte === "pagos_registrados" || filtros.tipoReporte === "pagos_realizados") {
    return filtrarReporteCaja(pagos.map((pago) => crearFilaPago(pago, programasVigentes)).filter(Boolean), filtros);
  }

  const inscripciones = obtenerInscripcionesCaja(periodoNormalizado);

  const filas = inscripciones.map((inscripcion) => {
    const pago = encontrarPagoInscripcion(inscripcion, pagos);
    const programa = resolverProgramaVigenteCaja(inscripcion, programasVigentes);
    if (!programa) return null;
    const estudiante = apiDb.estudiantes?.[inscripcion.dniEstudiante] || null;
    const monto = Number(pago?.monto ?? inscripcion.costo ?? programa.costo ?? 0);
    const estadoPago = normalizarEstadoPago(pago?.estado || inscripcion.estadoPago);
    const fechaBase = pago?.fechaPago || pago?.fecha || inscripcion.fechaRegistro || "";
    const esWebReserva = inscripcion.derivadoCaja || inscripcion.estadoCaja === "reservado_caja" || String(inscripcion.estadoInscripcion).toLowerCase().includes("reserva");

    const formaPago = esWebReserva
      ? (pago ? `Reserva / Web / ${pago.formaPago || pago.medioPago || "Efectivo"}` : "Reserva / Web")
      : (pago?.formaPago || pago?.medioPago || "Sin pago");

    const origen = (pago ? (pago.origenRegistro || (pago.formaPago === "Yape" ? "Portal padres" : "Cajera")) : (inscripcion.origenRegistro || (esWebReserva ? "Portal padres" : "Sin origen"))) || "Sin origen";

    return {
      id: inscripcion.id,
      inscripcionId: inscripcion.id,
      dniEstudiante: inscripcion.dniEstudiante || pago?.dniEstudiante || pago?.estudianteDni || "",
      estudiante: estudiante ? `${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim() : inscripcion.nombresEstudiante || pago?.nombresEstudiante || pago?.estudianteNombre || "Sin nombre",
      programaId: programa.id,
      programa: programa.nombre || inscripcion.programa || pago?.programa || pago?.programaNombre || "",
      periodo: periodoNormalizado,
      monto,
      estadoPago,
      estadoInscripcion: inscripcion.estadoInscripcion || "",
      formaPago,
      numeroOperacion: pago?.numeroOperacion || pago?.referenciaPago || inscripcion.pagoReferencia || "",
      telefonoOperacion: pago?.telefonoOperacion || inscripcion.pagoTelefono || "",
      origen,
      fuente: "inscripcion",
      pagoId: pago?.id || "",
      fecha: fechaBase,
      fechaRegistro: inscripcion.fechaRegistro || "",
      fechaPago: pago?.fechaPago || pago?.fecha || "",
      apoderado: inscripcion.apoderado || "",
      telefono: inscripcion.telefono || "",
      puedePagarCaja: true,
      nroRecibo: pago?.nroRecibo || pago?.nro_recibo || "",
      grado: inscripcion.gradoEstudiante || inscripcion.grado || (estudiante ? estudiante.grado : ""),
      seccion: inscripcion.seccion || inscripcion.seccionEstudiante || (estudiante ? estudiante.seccion : ""),
      descuentoAprobado: inscripcion.descuentoAprobado || false,
      descuentoTipo: inscripcion.descuentoTipo || "",
      descuentoMonto: inscripcion.descuentoMonto || 0,
      costoOriginal: inscripcion.costoOriginal ?? programa.costo ?? 0,
      descuentoJustificacion: inscripcion.descuentoJustificacion || "",
      observaciones: pago ? (pago.observaciones || pago.observacion || pago.pagoObservacionCaja || "") : (inscripcion.pagoObservacionCaja || ""),
    };
  }).filter(Boolean);

  return filtrarReporteCaja(filas, filtros);
}

export async function obtenerPagoPorIdMock(pagoId) {
  await syncApiDb();
  if (!Array.isArray(apiDb.pagos)) return null;
  return apiDb.pagos.find((p) => p.id === pagoId) || null;
}

export async function anularPagoMock(pagoId, observaciones = "Pago anulado por Cajera.") {
  await syncApiDb();
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];
  const index = apiDb.pagos.findIndex((pago) => pago.id === pagoId);
  if (index === -1) throw new Error("No se encontró el pago a anular.");

  apiDb.pagos[index] = {
    ...apiDb.pagos[index],
    estado: "anulado",
    estadoVerificacion: "anulado",
    estadoInscripcion: "pendiente_pago",
    estadoPago: "Anulado",
    observaciones,
    updatedAt: fechaActualIso(),
  };

  const pagoActualizado = apiDb.pagos[index];
  const inscripcionIndex = (apiDb.inscripciones || []).findIndex((inscripcion) =>
    inscripcion.id === pagoActualizado.inscripcionId
  );

  if (inscripcionIndex !== -1) {
    apiDb.inscripciones[inscripcionIndex] = {
      ...apiDb.inscripciones[inscripcionIndex],
      estadoPago: "Pendiente",
      estadoInscripcion: "pendiente_pago",
      fechaPago: "",
      pagoObservacionCaja: observaciones,
    };
  }

  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));
  return pagoActualizado;
}

// --- MOCK INTERNAL HELPERS ---

function generarPagoId() {
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const usados = new Set(pagos.map((pago) => String(pago.id || "")));
  let id = `PAG-${Date.now().toString().slice(-8)}`;
  while (usados.has(id)) {
    id = `PAG-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90) + 10}`;
  }
  return id;
}

function crearEstudianteDesdeInscripcion(inscripcion) {
  if (!inscripcion) return null;

  return {
    dni: inscripcion.dniEstudiante || "",
    codigoEstudiante: inscripcion.codigoEstudiante || "",
    nombres: inscripcion.nombresEstudiante || "",
    apellidos: "",
    grado: inscripcion.gradoEstudiante || inscripcion.grado || "",
    seccion: inscripcion.seccionEstudiante || inscripcion.seccion || "",
    tipoAlumno: inscripcion.tipoAlumno || "",
    apoderado: inscripcion.apoderado || "",
    telefonoApoderado: inscripcion.telefono || "",
    correoApoderado: inscripcion.correo || "",
    estadoInscripcion: inscripcion.estadoInscripcion || "Pendiente de pago",
  };
}

function obtenerProgramasVigentesCaja(periodoNormalizado = "escolar") {
  const porId = new Map();
  const porNombre = new Map();
  const items = [];

  [...(Array.isArray(apiDb.programas) ? apiDb.programas : [])]
    .filter((programa) => normalizarPeriodo(programa.periodo || periodoNormalizado) === periodoNormalizado)
    .filter((programa) => !["eliminado"].includes(normalizarTexto(programa.estado)))
    .forEach((programa) => {
      if (!programa?.id) return;

      const nombreKey = normalizarTexto(programa.nombre);
      if (nombreKey && porNombre.has(nombreKey)) return;

      const item = {
        ...programa,
        nombre: programa.nombre || "Sin programa",
      };
      items.push(item);
      porId.set(item.id, item);
      if (nombreKey) porNombre.set(nombreKey, item);
    });

  return { items, porId, porNombre };
}

function resolverProgramaVigenteCaja(registro = {}, programasVigentes) {
  const catalogo = programasVigentes || obtenerProgramasVigentesCaja(normalizarPeriodo(registro.periodo));
  const porId = catalogo.porId || new Map();
  const porNombre = catalogo.porNombre || new Map();
  const id = registro.programaId || registro.programaAsignado || "";
  const nombre = registro.programa || registro.programaNombre || "";

  return porId.get(id) || porNombre.get(normalizarTexto(nombre)) || null;
}

function coincideProgramaFiltroCaja(registro = {}, programaId = "todos", programasVigentes) {
  if (!programaId || programaId === "todos") return true;
  const programa = resolverProgramaVigenteCaja(registro, programasVigentes);
  return programa?.id === programaId;
}

async function actualizarEstadoPagoWeb(pagoId, cambios) {
  await esperar(350);
  await syncApiDb();

  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];
  const index = apiDb.pagos.findIndex((pago) => pago.id === pagoId);
  if (index === -1) throw new Error("No se encontro el pago enviado por Padres.");

  const pagoActualizado = {
    ...apiDb.pagos[index],
    ...cambios,
    updatedAt: fechaActualIso(),
  };
  apiDb.pagos[index] = pagoActualizado;

  const inscripcionIndex = (apiDb.inscripciones || []).findIndex((inscripcion) =>
    inscripcion.id === pagoActualizado.inscripcionId ||
    (
      inscripcion.dniEstudiante === (pagoActualizado.dniEstudiante || pagoActualizado.estudianteDni) &&
      (
        inscripcion.programaId === pagoActualizado.programaId ||
        normalizarTexto(inscripcion.programa) === normalizarTexto(pagoActualizado.programa || pagoActualizado.programaNombre)
      )
    )
  );

  if (inscripcionIndex !== -1) {
    const esAprobacion = cambios.estado === "completado" || cambios.estadoVerificacion === "validado";
    apiDb.inscripciones[inscripcionIndex] = {
      ...apiDb.inscripciones[inscripcionIndex],
      estadoPago: cambios.estadoPago,
      estadoInscripcion: cambios.estadoInscripcion,
      pagoId: pagoActualizado.id,
      fechaPago: cambios.fechaPago || apiDb.inscripciones[inscripcionIndex].fechaPago || "",
      pagoObservacionCaja: cambios.observaciones || "",
      // Al aprobar un pago web, marcar como derivadoCaja para que figure como ingreso en el reporte de Caja
      ...(esAprobacion ? { derivadoCaja: true } : {}),
    };
  }

  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));
  return pagoActualizado;
}

function obtenerInscripcionesCaja(periodoNormalizado) {
  return [...(apiDb.inscripciones || [])]
    .filter((inscripcion) =>
      normalizarPeriodo(inscripcion.periodo || periodoNormalizado) === periodoNormalizado &&
      inscripcion.estadoInscripcion !== "Anulada"
    );
}

function crearFilaPago(pago, programasVigentes = null) {
  if (pago.formaPago === "Egreso") {
    return {
      id: pago.id,
      pagoId: pago.id,
      inscripcionId: "",
      dniEstudiante: pago.dniEstudiante || "",
      estudiante: pago.nombresEstudiante || "Egreso de Caja",
      programaId: "",
      programa: "Egreso / Gasto",
      periodo: normalizarPeriodo(pago.periodo),
      monto: Number(pago.monto || 0),
      estadoPago: "pagado",
      estadoInscripcion: "",
      formaPago: "Egreso",
      numeroOperacion: pago.numeroOperacion || "",
      telefonoOperacion: "",
      origen: "Cajera",
      fuente: "pago",
      fecha: pago.fechaPago || pago.fecha || "",
      fechaRegistro: "",
      fechaPago: pago.fechaPago || pago.fecha || "",
      apoderado: "",
      telefono: "",
      nroRecibo: pago.nroRecibo || pago.nro_recibo || "",
      grado: "",
      seccion: "",
      descuentoAprobado: false,
      descuentoTipo: "",
      descuentoMonto: 0,
      observaciones: pago.observaciones || "",
    };
  }

  const program = resolverProgramaVigenteCaja(pago, programasVigentes || obtenerProgramasVigentesCaja(normalizarPeriodo(pago.periodo)));
  if (!program) return null;

  const inscripcion = (apiDb.inscripciones || []).find((ins) => ins.id === pago.inscripcionId) || null;
  const estudiante = apiDb.estudiantes?.[pago.dniEstudiante || pago.estudianteDni] || null;
  const esWebReserva = inscripcion ? (inscripcion.derivadoCaja || inscripcion.estadoCaja === "reservado_caja" || String(inscripcion.estadoInscripcion).toLowerCase().includes("reserva")) : false;

  const formaPago = esWebReserva
    ? `Reserva / Web / ${pago.formaPago || pago.medioPago || "Efectivo"}`
    : (pago.formaPago || pago.medioPago || "Sin medio");

  return {
    id: pago.id,
    pagoId: pago.id,
    inscripcionId: pago.inscripcionId || "",
    dniEstudiante: pago.dniEstudiante || pago.estudianteDni || "",
    estudiante: estudiante ? `${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim() : pago.nombresEstudiante || pago.estudianteNombre || "Sin nombre",
    programaId: program.id,
    programa: program.nombre || pago.programa || pago.programaNombre || "",
    periodo: normalizarPeriodo(pago.periodo),
    monto: Number(pago.monto || 0),
    estadoPago: normalizarEstadoPago(pago.estado),
    estadoInscripcion: "",
    formaPago,
    numeroOperacion: pago.numeroOperacion || pago.referenciaPago || "",
    telefonoOperacion: pago.telefonoOperacion || "",
    origen: esWebReserva ? "Portal padres" : "Cajera",
    fuente: "pago",
    fecha: pago.fechaPago || pago.fecha || "",
    fechaRegistro: "",
    fechaPago: pago.fechaPago || pago.fecha || "",
    apoderado: pago.apoderado || "",
    telefono: pago.telefono || "",
    nroRecibo: pago.nroRecibo || pago.nro_recibo || "",
    grado: inscripcion ? (inscripcion.gradoEstudiante || inscripcion.grado || (estudiante ? estudiante.grado : "")) : (estudiante ? estudiante.grado : ""),
    seccion: inscripcion ? (inscripcion.seccion || inscripcion.seccionEstudiante || (estudiante ? estudiante.seccion : "")) : (estudiante ? estudiante.seccion : ""),
    descuentoAprobado: inscripcion ? (inscripcion.descuentoAprobado || false) : false,
    descuentoTipo: inscripcion ? (inscripcion.descuentoTipo || "") : "",
    descuentoMonto: inscripcion ? (inscripcion.descuentoMonto || 0) : 0,
    costoOriginal: inscripcion ? (inscripcion.costoOriginal ?? program.costo ?? 0) : (program.costo ?? 0),
    descuentoJustificacion: inscripcion ? (inscripcion.descuentoJustificacion || "") : "",
    observaciones: pago.observaciones || pago.observacion || (inscripcion ? inscripcion.pagoObservacionCaja : "") || "",
  };
}

function encontrarPagoInscripcion(inscripcion, pagos) {
  return pagos.find((pago) => pago.inscripcionId && pago.inscripcionId === inscripcion.id)
    || pagos.find((pago) =>
      (pago.dniEstudiante || pago.estudianteDni) === inscripcion.dniEstudiante &&
      (pago.programaId === inscripcion.programaId ||
        normalizarTexto(pago.programa || pago.programaNombre) === normalizarTexto(inscripcion.programa))
    )
    || null;
}

function encontrarPagoActivoDuplicado(datosPago = {}) {
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const inscripcionId = datosPago.inscripcionId || "";
  const dniEstudiante = datosPago.dniEstudiante || datosPago.estudianteDni || "";
  const programaId = datosPago.programaId || "";
  const programaNombre = normalizarTexto(datosPago.programa || datosPago.programaNombre);

  return pagos.find((pago) => {
    const estado = normalizarEstadoPago(pago.estado || pago.estadoPago || pago.estadoVerificacion);
    if (["observado", "anulado"].includes(estado)) return false;
    if (inscripcionId && pago.inscripcionId === inscripcionId) return true;

    const mismoDni = (pago.dniEstudiante || pago.estudianteDni) === dniEstudiante;
    if (!mismoDni) return false;
    if (programaId && pago.programaId === programaId) return true;
    return programaNombre && normalizarTexto(pago.programa || pago.programaNombre) === programaNombre;
  }) || null;
}

function sincronizarPagoConInscripcion(pago) {
  if (!Array.isArray(apiDb.inscripciones)) return;

  const index = apiDb.inscripciones.findIndex((inscripcion) =>
    (pago.inscripcionId && inscripcion.id === pago.inscripcionId) ||
    (
      inscripcion.dniEstudiante === (pago.dniEstudiante || pago.estudianteDni) &&
      (
        inscripcion.programaId === pago.programaId ||
        normalizarTexto(inscripcion.programa) === normalizarTexto(pago.programa || pago.programaNombre)
      )
    )
  );

  if (index === -1) return;

  const estadoPago = pago.estado === "completado"
    ? "Pagado"
    : pago.estado === "cancelado"
    ? "Anulado"
    : "Pendiente";

  apiDb.inscripciones[index] = {
    ...apiDb.inscripciones[index],
    estadoPago,
    estadoInscripcion: estadoPago === "Pagado" ? "Pago validado" : apiDb.inscripciones[index].estadoInscripcion,
    pagoId: pago.id,
    fechaPago: pago.fechaPago || pago.fecha,
  };
}

function incrementarCorrelativo(valor) {
  if (!valor) return "";
  const match = String(valor).match(/^(.*?)(\d+)$/);
  if (!match) return valor;
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = Number(numStr) + 1;
  const paddedNum = String(nextNum).padStart(numStr.length, "0");
  return prefix + paddedNum;
}

export async function buscarEstudiantesCajaQueryMock(query) {
  await esperar(200);
  await syncApiDb();
  const q = normalizarTexto(query);
  if (!q) return [];

  const estudiantes = Object.values(apiDb.estudiantes || {});
  const matchingEstudiantes = estudiantes.filter((e) => {
    const nombresComp = `${e.nombres || ""} ${e.apellidos || ""}`;
    return (
      normalizarTexto(e.dni || "").includes(q) ||
      normalizarTexto(e.nombres || "").includes(q) ||
      normalizarTexto(e.apellidos || "").includes(q) ||
      normalizarTexto(nombresComp).includes(q)
    );
  });

  return matchingEstudiantes.map((e) => ({
    dni: e.dni || "",
    nombres: `${e.nombres || ""} ${e.apellidos || ""}`.trim() || "Sin Nombre",
  }));
}

export async function cancelarCorrelativoCajaMock(tipo, motivo, dniEstudiante = "", nombresEstudiante = "", nroRecibo = "") {
  await esperar(300);
  await syncApiDb();

  if (!apiDb.correlativos) apiDb.correlativos = {};
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  let val = "";
  if (nroRecibo) {
    val = String(nroRecibo).trim();
    if (tipo === "recibo" && val === apiDb.correlativos.reciboActual) {
      apiDb.correlativos.reciboActual = incrementarCorrelativo(val);
    } else if (tipo === "reciboVirtual" && val === apiDb.correlativos.reciboVirtualActual) {
      apiDb.correlativos.reciboVirtualActual = incrementarCorrelativo(val);
    } else if (tipo === "egreso" && val === apiDb.correlativos.egresoActual) {
      apiDb.correlativos.egresoActual = incrementarCorrelativo(val);
    }
  } else {
    if (tipo === "recibo") {
      val = apiDb.correlativos.reciboActual || "REC-0001";
      apiDb.correlativos.reciboActual = incrementarCorrelativo(val);
    } else if (tipo === "reciboVirtual") {
      val = apiDb.correlativos.reciboVirtualActual || "V-0001";
      apiDb.correlativos.reciboVirtualActual = incrementarCorrelativo(val);
    } else if (tipo === "egreso") {
      val = apiDb.correlativos.egresoActual || "EGR-0001";
      apiDb.correlativos.egresoActual = incrementarCorrelativo(val);
    } else {
      throw new Error("Tipo de correlativo no válido.");
    }
  }

  if (!val) {
    throw new Error("No se encontró un correlativo actual para este tipo.");
  }

  const nuevoPagoAnulado = {
    id: `PAG-CANC-${String(Date.now()).slice(-6)}`,
    inscripcionId: null,
    dniEstudiante: dniEstudiante || "ANULADO",
    nombresEstudiante: nombresEstudiante || (tipo === "egreso" ? `EGRESO ANULADO: ${val}` : `RECIBO ANULADO: ${val}`),
    programa: "",
    programaId: "",
    periodo: "escolar",
    monto: 0,
    formaPago: tipo === "reciboVirtual" ? "Yape" : "Efectivo",
    nroRecibo: val,
    estado: "anulado",
    fecha: fechaActualIso(),
    fechaPago: fechaActualIso(),
    origenRegistro: "Caja",
    observaciones: `Correlativo cancelado/anulado por Cajera. Motivo: ${motivo}`,
    createdAt: fechaActualIso(),
  };

  apiDb.pagos.push(nuevoPagoAnulado);
  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));

  return nuevoPagoAnulado;
}

export async function registrarEgresoMock(datosEgreso) {
  await esperar(400);
  await syncApiDb();

  if (!apiDb.correlativos) apiDb.correlativos = {};
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  const nroRecibo = apiDb.correlativos.egresoActual || apiDb.correlativos.egreso || "EGR-0001";
  apiDb.correlativos.egresoActual = incrementarCorrelativo(nroRecibo);

  const nuevoEgreso = {
    id: `PAG-EGR-${String(Date.now()).slice(-6)}`,
    inscripcionId: null,
    dniEstudiante: datosEgreso.dni || "",
    nombresEstudiante: datosEgreso.beneficiario || "Egreso de Caja",
    programa: "",
    programaId: "",
    monto: Number(datosEgreso.monto || 0),
    formaPago: "Egreso",
    nroRecibo: nroRecibo,
    periodo: normalizarPeriodo(datosEgreso.periodo || "escolar"),
    fecha: datosEgreso.fecha || fechaActualIso(),
    fechaPago: datosEgreso.fecha || fechaActualIso(),
    estado: "completado",
    origenRegistro: "Caja",
    observaciones: datosEgreso.concepto || "Egreso registrado",
    createdAt: fechaActualIso()
  };

  apiDb.pagos.push(nuevoEgreso);
  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));

  return nuevoEgreso;
}
