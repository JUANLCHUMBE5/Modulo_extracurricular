import { apiDb, saveApiDb, syncApiDb } from "../../services/dbApi";
import { fechaActualIso } from "../../services/dateService";

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizarPeriodo(periodo) {
  const mapa = { escolar: "escolar", verano: "verano", ambos: "ambos" };
  return mapa[periodo] || "escolar";
}

export async function listarPagos(periodo = "escolar", filtros = {}) {
  await esperar(400);
  await syncApiDb();
  
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];
  
  const periodoNormalizado = normalizarPeriodo(periodo);
  let pagos = [...apiDb.pagos].filter((p) => normalizarPeriodo(p.periodo || periodoNormalizado) === periodoNormalizado);
  
  if (filtros.estudianteDni) {
    pagos = pagos.filter((p) => (p.estudianteDni || p.dniEstudiante) === filtros.estudianteDni);
  }
  if (filtros.estado) {
    pagos = pagos.filter((p) => p.estado === filtros.estado);
  }
  if (filtros.programa) {
    pagos = pagos.filter((p) => p.programaId === filtros.programa || p.programa === filtros.programa);
  }
  
  return pagos.sort((a, b) => new Date(b.fecha || b.fechaPago || 0) - new Date(a.fecha || a.fechaPago || 0));
}

export async function registrarPago(datosPago) {
  await esperar(500);
  await syncApiDb();
  
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];
  
  const dniEstudiante = datosPago.dniEstudiante || datosPago.estudianteDni || "";
  const nombresEstudiante = datosPago.nombresEstudiante || datosPago.estudianteNombre || "";
  const programa = datosPago.programa || datosPago.programaNombre || "";

  const pago = {
    id: generarPagoId(),
    ...datosPago,
    estudianteDni: datosPago.estudianteDni || dniEstudiante,
    estudianteNombre: datosPago.estudianteNombre || nombresEstudiante,
    dniEstudiante,
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

function generarPagoId() {
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const usados = new Set(pagos.map((pago) => String(pago.id || "")));
  let id = `PAG-${Date.now().toString().slice(-8)}`;
  while (usados.has(id)) {
    id = `PAG-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90) + 10}`;
  }
  return id;
}

export async function actualizarPago(pagoId, datosActualizados) {
  await esperar(400);
  await syncApiDb();
  
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];
  
  const index = apiDb.pagos.findIndex((p) => p.id === pagoId);
  if (index === -1) throw new Error("Pago no encontrado.");

  const dniEstudiante = datosActualizados.dniEstudiante || datosActualizados.estudianteDni || apiDb.pagos[index].dniEstudiante || "";
  const nombresEstudiante = datosActualizados.nombresEstudiante || datosActualizados.estudianteNombre || apiDb.pagos[index].nombresEstudiante || "";
  const programa = datosActualizados.programa || datosActualizados.programaNombre || apiDb.pagos[index].programa || "";
  
  apiDb.pagos[index] = {
    ...apiDb.pagos[index],
    ...datosActualizados,
    estudianteDni: datosActualizados.estudianteDni || dniEstudiante,
    estudianteNombre: datosActualizados.estudianteNombre || nombresEstudiante,
    dniEstudiante,
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

export async function obtenerResumenCaja(periodo = "escolar") {
  await esperar(300);
  await syncApiDb();
  
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];
  
  const periodoNormalizado = normalizarPeriodo(periodo);
  const pagos = apiDb.pagos.filter((p) => normalizarPeriodo(p.periodo || periodoNormalizado) === periodoNormalizado);
  const inscripciones = obtenerInscripcionesCaja(periodoNormalizado);
  
  const totalIngreso = pagos
    .filter((p) => p.estado === "completado")
    .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  
  const totalPendiente = inscripciones
    .filter((inscripcion) => normalizarEstadoPago(inscripcion.estadoPago) === "pendiente")
    .reduce((sum, inscripcion) => sum + Number(inscripcion.costo || 0), 0);
  
  const totalCancelado = pagos
    .filter((p) => p.estado === "cancelado")
    .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  
  return {
    totalIngreso,
    totalPendiente,
    totalCancelado,
    cantidadPagos: pagos.filter((p) => p.estado === "completado").length,
    cantidadPendientes: inscripciones.filter((inscripcion) => normalizarEstadoPago(inscripcion.estadoPago) === "pendiente").length,
  };
}

export async function obtenerEstudiantePorDni(dni, periodo = "") {
  await esperar(200);
  await syncApiDb();

  const periodoNormalizado = periodo ? normalizarPeriodo(periodo) : "";
  const inscripciones = [...(apiDb.inscripciones || [])]
    .filter((item) =>
      item.dniEstudiante === dni &&
      (!periodoNormalizado || normalizarPeriodo(item.periodo || periodoNormalizado) === periodoNormalizado)
    )
    .sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
  const inscripcion = inscripciones.find((item) => item.derivadoCaja) || inscripciones[0];
  const estudiante = apiDb.estudiantes[dni] || crearEstudianteDesdeInscripcion(inscripcion);

  if (!estudiante) return null;

  if (!inscripcion) {
    return {
      ...estudiante,
      sinInscripcionCaja: true,
    };
  }

  return {
    ...estudiante,
    inscripcionCaja: inscripcion,
    programaAsignado: inscripcion.programaId || estudiante.programaAsignado || "",
    programaNombre: inscripcion.programa || estudiante.programaNombre || "",
    programaCosto: inscripcion.costo ?? estudiante.programaCosto,
  };
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

export async function generarReportePagos(filtros = {}) {
  await esperar(500);
  const pagos = await listarPagos(filtros.periodo || "escolar", filtros);
  return pagos;
}

export async function obtenerOpcionesReporteCaja(periodo = "escolar") {
  await esperar(200);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const programas = [...(apiDb.programas || [])]
    .filter((programa) => normalizarPeriodo(programa.periodo || periodoNormalizado) === periodoNormalizado)
    .map((programa) => ({
      value: programa.id,
      label: programa.nombre,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

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

export async function generarReporteCaja(filtros = {}) {
  await esperar(450);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(filtros.periodo || "escolar");
  const pagos = [...(Array.isArray(apiDb.pagos) ? apiDb.pagos : [])]
    .filter((pago) => normalizarPeriodo(pago.periodo || periodoNormalizado) === periodoNormalizado);

  if (filtros.tipoReporte === "pagos_registrados" || filtros.tipoReporte === "pagos_realizados") {
    return filtrarReporteCaja(pagos.map(crearFilaPago), filtros);
  }

  const inscripciones = obtenerInscripcionesCaja(periodoNormalizado);

  const programas = new Map((apiDb.programas || []).map((programa) => [programa.id, programa]));
  const filas = inscripciones.map((inscripcion) => {
    const pago = encontrarPagoInscripcion(inscripcion, pagos);
    const programa = programas.get(inscripcion.programaId) || {};
    const monto = Number(pago?.monto ?? inscripcion.costo ?? programa.costo ?? 0);
    const estadoPago = normalizarEstadoPago(pago?.estado || inscripcion.estadoPago);
    const fechaBase = pago?.fechaPago || pago?.fecha || inscripcion.fechaRegistro || "";

    return {
      id: inscripcion.id,
      inscripcionId: inscripcion.id,
      dniEstudiante: inscripcion.dniEstudiante || pago?.dniEstudiante || pago?.estudianteDni || "",
      estudiante: inscripcion.nombresEstudiante || pago?.nombresEstudiante || pago?.estudianteNombre || "",
      programaId: inscripcion.programaId || pago?.programaId || "",
      programa: inscripcion.programa || pago?.programa || pago?.programaNombre || programa.nombre || "",
      periodo: periodoNormalizado,
      monto,
      estadoPago,
      estadoInscripcion: inscripcion.estadoInscripcion || "",
      formaPago: pago?.formaPago || pago?.medioPago || "Sin pago",
      origen: inscripcion.origenRegistro || pago?.origenRegistro || "Sin origen",
      fuente: "inscripcion",
      pagoId: pago?.id || "",
      fecha: fechaBase,
      fechaRegistro: inscripcion.fechaRegistro || "",
      fechaPago: pago?.fechaPago || pago?.fecha || "",
      apoderado: inscripcion.apoderado || "",
      telefono: inscripcion.telefono || "",
    };
  });

  return filtrarReporteCaja(filas, filtros);
}

function obtenerInscripcionesCaja(periodoNormalizado) {
  return [...(apiDb.inscripciones || [])]
    .filter((inscripcion) =>
      normalizarPeriodo(inscripcion.periodo || periodoNormalizado) === periodoNormalizado &&
      inscripcion.estadoInscripcion !== "Anulada"
    );
}

function crearFilaPago(pago) {
  return {
    id: pago.id,
    pagoId: pago.id,
    inscripcionId: pago.inscripcionId || "",
    dniEstudiante: pago.dniEstudiante || pago.estudianteDni || "",
    estudiante: pago.nombresEstudiante || pago.estudianteNombre || "",
    programaId: pago.programaId || "",
    programa: pago.programa || pago.programaNombre || "",
    periodo: normalizarPeriodo(pago.periodo),
    monto: Number(pago.monto || 0),
    estadoPago: normalizarEstadoPago(pago.estado),
    estadoInscripcion: "",
    formaPago: pago.formaPago || pago.medioPago || "Sin medio",
    origen: "Caja",
    fuente: "pago",
    fecha: pago.fechaPago || pago.fecha || "",
    fechaRegistro: "",
    fechaPago: pago.fechaPago || pago.fecha || "",
    apoderado: pago.apoderado || "",
    telefono: pago.telefono || "",
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

function filtrarReporteCaja(filas, filtros) {
  return filas
    .filter((fila) => {
      if (filtros.programa && filtros.programa !== "todos" && fila.programaId !== filtros.programa) return false;
      if (filtros.medioPago && filtros.medioPago !== "todos" && fila.formaPago !== filtros.medioPago) return false;
      if (filtros.desde && normalizarFechaReporte(fila.fecha) < filtros.desde) return false;
      if (filtros.hasta && normalizarFechaReporte(fila.fecha) > filtros.hasta) return false;

      if (filtros.tipoReporte === "por_cobrar" || filtros.tipoReporte === "pagos_pendientes") return fila.estadoPago === "pendiente";
      if (filtros.tipoReporte === "inscripciones") return fila.fuente === "inscripcion";
      if (filtros.tipoReporte === "registro_web") return normalizarTexto(fila.origen).includes("portal padres") || normalizarTexto(fila.origen).includes("web");
      return true;
    })
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function normalizarEstadoPago(valor) {
  const texto = normalizarTexto(valor);
  if (["completado", "pagado", "validado", "pago validado"].some((item) => texto.includes(item))) return "pagado";
  if (["cancelado", "anulado"].some((item) => texto.includes(item))) return "anulado";
  return "pendiente";
}

function normalizarFechaReporte(valor) {
  return String(valor || "").slice(0, 10);
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
