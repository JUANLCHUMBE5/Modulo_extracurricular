import { apiDb, saveApiDb, syncApiDb } from "../../services/dbApi";
import { isApiMode, apiClient } from "../../services/apiClient";
import {
  adaptarEstudiante,
  adaptarInscripcion,
  adaptarPago,
  adaptarPrograma,
  adaptarAsistencia
} from "../../services/adapters";
import { fechaActualIso } from "../../services/dateService";

const esperar = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

export async function validarDni(busqueda) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/auxiliar/validar", {
      params: { busqueda }
    });
    if (!res.success) throw new Error(res.message || "Error al validar DNI");
    return res.data;
  }

  await esperar();
  await syncApiDb();

  const query = String(busqueda || "").trim();
  if (!query) {
    throw new Error("Ingrese un DNI o nombre para buscar.");
  }

  // Si es numérico (o parece DNI)
  if (/^\d+$/.test(query)) {
    const dniLimpio = limpiarDni(query);
    if (!/^\d{8}$/.test(dniLimpio)) {
      throw new Error("El DNI debe contener exactamente 8 numeros.");
    }
    return resolverValidacion({ dni: dniLimpio, codigoOriginal: dniLimpio });
  }

  // Si es texto, buscamos por nombre
  return resolverValidacionPorNombre(query);
}

function resolverValidacionPorNombre(nombreQuery) {
  const queryNormalizada = normalizarTexto(nombreQuery);
  if (queryNormalizada.length < 3) {
    throw new Error("El nombre de busqueda debe tener al menos 3 caracteres.");
  }

  // 1. Buscar en inscripciones activas (para tener taller directo)
  const inscripciones = obtenerInscripcionesActivas();
  const coincidenciaInscripcion = inscripciones.find(ins => 
    normalizarTexto(ins.nombresEstudiante).includes(queryNormalizada)
  );

  if (coincidenciaInscripcion) {
    const ids = normalizarIdentificadores({
      dni: coincidenciaInscripcion.dniEstudiante,
      codigoEstudiante: coincidenciaInscripcion.codigoEstudiante,
      inscripcionId: coincidenciaInscripcion.id,
      codigoOriginal: coincidenciaInscripcion.dniEstudiante
    });
    return resolverValidacion(ids);
  }

  // 2. Si no esta matriculado en un taller, buscar en la lista general de estudiantes del colegio
  const estudiantes = obtenerEstudiantes();
  const coincidenciaEstudiante = estudiantes.find(est => 
    normalizarTexto(est.nombres).includes(queryNormalizada)
  );

  if (coincidenciaEstudiante) {
    const ids = normalizarIdentificadores({
      dni: coincidenciaEstudiante.dni,
      codigoEstudiante: coincidenciaEstudiante.codigoEstudiante,
      codigoOriginal: coincidenciaEstudiante.dni
    });
    return resolverValidacion(ids);
  }

  throw new Error(`No se encontro ningun estudiante que coincida con "${nombreQuery}".`);
}

export async function validarQR(codigo) {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/auxiliar/validar-qr", {
      params: { codigo }
    });
    if (!res.success) throw new Error(res.message || "Error al validar QR");
    return res.data;
  }

  await esperar();
  await syncApiDb();

  const codigoLimpio = String(codigo || "").trim();
  if (!codigoLimpio) {
    throw new Error("Escanee o ingrese un codigo valido.");
  }

  return resolverValidacion(extraerIdentificadoresCodigo(codigoLimpio));
}

export async function registrarAsistencia(data, observacion = "") {
  if (isApiMode()) {
    const apiPayload = {
      inscripcion_id: data.inscripcionId || "",
      pago_id: data.pagoId || "",
      dni_estudiante: data.dni || data.dniEstudiante || "",
      estado_acceso: data.estadoAcceso || "presente",
      observacion: observacion || "",
      origen: "Auxiliar"
    };
    const res = await apiClient.post("/api/v1/extracurricular/asistencia", apiPayload);
    if (!res.success) throw new Error(res.message || "Error al registrar asistencia");
    return adaptarAsistencia(res.data);
  }

  await esperar(260);
  await syncApiDb();

  const textoObservacion = String(observacion || "").trim();
  if (/<[^>]+>/.test(textoObservacion)) {
    throw new Error("La observacion no debe contener HTML.");
  }

  const validacion = data?.estadoAcceso
    ? resolverValidacion(extraerIdentificadoresDesdeValidacion(data))
    : resolverValidacion(extraerIdentificadoresCodigo(data));

  if (!validacion.accesoPermitido) {
    throw new Error(validacion.accion || "No se puede registrar el ingreso.");
  }

  if (!Array.isArray(apiDb.asistencias)) apiDb.asistencias = [];

  const registro = {
    id: generarAsistenciaId(),
    inscripcionId: validacion.inscripcionId || "",
    pagoId: validacion.pagoId || "",
    dniEstudiante: validacion.dni || "",
    codigoEstudiante: validacion.codigoEstudiante || "",
    nombresEstudiante: validacion.nombres || "",
    programaId: validacion.programaId || "",
    programa: validacion.programa || "",
    horario: validacion.horario || "",
    estadoPago: validacion.estadoPago || "",
    estadoAcceso: validacion.estadoAcceso,
    observacion: textoObservacion,
    origen: "Auxiliar",
    fechaRegistro: fechaActualIso(),
  };

  apiDb.asistencias.push(registro);
  await saveApiDb();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mock-db-updated"));
  }

  return registro;
}

function resolverValidacion(identificadores = {}) {
  const ids = normalizarIdentificadores(identificadores);
  const inscripcion = buscarInscripcion(ids);
  const estudiante = buscarEstudiante(ids, inscripcion);

  if (!inscripcion) {
    return crearRespuestaNoRegistrado(ids, estudiante);
  }

  const pago = encontrarPagoInscripcion(inscripcion, ids);
  const estadoNormalizado = resolverEstadoPago(inscripcion, pago);

  if (estadoNormalizado === "pagado") {
    return crearRespuestaInscripcion({
      inscripcion,
      estudiante,
      pago,
      estadoAcceso: "pagado",
      estadoPago: "Pagado",
      accesoPermitido: true,
      mensajeAcceso: "Pago validado",
      accion: "Ingreso permitido.",
      color: "verde",
    });
  }

  if (estadoNormalizado === "anulado") {
    return crearRespuestaInscripcion({
      inscripcion,
      estudiante,
      pago,
      estadoAcceso: "no_registrado",
      estadoPago: "Anulado",
      accesoPermitido: false,
      mensajeAcceso: "Pago anulado",
      accion: "Registro anulado. Verificar en Secretaria o Caja antes de permitir el ingreso.",
      color: "rojo",
    });
  }

  return crearRespuestaInscripcion({
    inscripcion,
    estudiante,
    pago,
    estadoAcceso: "pendiente",
    estadoPago: "Pendiente",
    accesoPermitido: false,
    mensajeAcceso: "Pago pendiente",
    accion: "Pago pendiente. Indicar que se acerque a Caja.",
    color: "amarillo",
  });
}

function crearRespuestaInscripcion({
  inscripcion,
  estudiante,
  pago,
  estadoAcceso,
  estadoPago,
  accesoPermitido,
  mensajeAcceso,
  accion,
  color,
}) {
  return {
    dni: inscripcion.dniEstudiante || estudiante?.dni || pago?.dniEstudiante || pago?.estudianteDni || "",
    codigoEstudiante: inscripcion.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombres: inscripcion.nombresEstudiante || estudiante?.nombres || pago?.nombresEstudiante || pago?.estudianteNombre || "Estudiante",
    grado: inscripcion.gradoEstudiante || estudiante?.grado || "",
    seccion: inscripcion.seccionEstudiante || estudiante?.seccion || "",
    programa: inscripcion.programa || pago?.programa || pago?.programaNombre || "Sin programa",
    programaId: inscripcion.programaId || pago?.programaId || "",
    horario: inscripcion.horario || "Horario no registrado",
    inscripcionId: inscripcion.id || "",
    estadoInscripcion: inscripcion.estadoInscripcion || "",
    estadoPago,
    estadoAcceso,
    accesoPermitido,
    mensajeAcceso,
    accion,
    color,
    pagoId: pago?.id || inscripcion.pagoId || "",
    fechaPago: pago?.fechaPago || pago?.fecha || inscripcion.fechaPago || "",
    monto: Number(pago?.monto ?? inscripcion.costo ?? 0),
  };
}

function crearRespuestaNoRegistrado(ids, estudiante) {
  return {
    dni: ids.dni || estudiante?.dni || "",
    codigoEstudiante: ids.codigoEstudiante || estudiante?.codigoEstudiante || "",
    nombres: estudiante?.nombres || ids.codigoOriginal || "Codigo no registrado",
    grado: estudiante?.grado || "",
    seccion: estudiante?.seccion || "",
    programa: "Sin inscripcion activa",
    programaId: "",
    horario: "No registrado",
    inscripcionId: "",
    estadoInscripcion: "No registrado",
    estadoPago: "No registrado",
    estadoAcceso: "no_registrado",
    accesoPermitido: false,
    mensajeAcceso: "No registrado",
    accion: "No esta registrado en un programa activo. Verificar en Secretaria antes de permitir el ingreso.",
    color: "rojo",
    pagoId: "",
    fechaPago: "",
    monto: 0,
  };
}

function buscarInscripcion(ids) {
  const inscripciones = obtenerInscripcionesActivas();
  const pagos = obtenerPagos();

  if (ids.inscripcionId) {
    const directa = inscripciones.find((item) => mismoCodigo(item.id, ids.inscripcionId));
    if (directa) return directa;
  }

  if (ids.pagoId) {
    const pago = pagos.find((item) => mismoCodigo(item.id, ids.pagoId));
    if (pago?.inscripcionId) {
      const directa = inscripciones.find((item) => mismoCodigo(item.id, pago.inscripcionId));
      if (directa) return directa;
    }
  }

  const candidatas = inscripciones.filter((item) => coincideInscripcion(item, ids));
  if (ids.programaId) {
    const porPrograma = candidatas.filter((item) => mismoCodigo(item.programaId, ids.programaId));
    if (porPrograma.length) return ordenarPorFecha(porPrograma)[0] || null;
  }

  return ordenarPorFecha(candidatas)[0] || null;
}

function coincideInscripcion(inscripcion, ids) {
  if (!inscripcion) return false;
  if (ids.dni && limpiarDni(inscripcion.dniEstudiante) === ids.dni) return true;
  if (ids.codigoEstudiante && mismoCodigo(inscripcion.codigoEstudiante, ids.codigoEstudiante)) return true;
  if (ids.codigoOriginal && mismoCodigo(inscripcion.id, ids.codigoOriginal)) return true;
  if (ids.codigoOriginal && mismoCodigo(inscripcion.codigoEstudiante, ids.codigoOriginal)) return true;
  return false;
}

function buscarEstudiante(ids, inscripcion) {
  const estudiantes = obtenerEstudiantes();
  const dni = ids.dni || limpiarDni(inscripcion?.dniEstudiante);
  const codigo = ids.codigoEstudiante || inscripcion?.codigoEstudiante || "";

  return estudiantes.find((estudiante) => limpiarDni(estudiante.dni) === dni)
    || estudiantes.find((estudiante) => codigo && mismoCodigo(estudiante.codigoEstudiante, codigo))
    || null;
}

function encontrarPagoInscripcion(inscripcion, ids = {}) {
  const pagos = obtenerPagos();

  if (ids.pagoId) {
    const pagoDirecto = pagos.find((pago) => mismoCodigo(pago.id, ids.pagoId));
    if (pagoDirecto) return pagoDirecto;
  }

  if (inscripcion?.pagoId) {
    const pagoPorId = pagos.find((pago) => mismoCodigo(pago.id, inscripcion.pagoId));
    if (pagoPorId) return pagoPorId;
  }

  const pagoPorInscripcion = pagos.find((pago) =>
    pago.inscripcionId && inscripcion?.id && mismoCodigo(pago.inscripcionId, inscripcion.id)
  );
  if (pagoPorInscripcion) return pagoPorInscripcion;

  const coincidencias = pagos.filter((pago) => {
    const mismoDni = limpiarDni(pago.dniEstudiante || pago.estudianteDni) === limpiarDni(inscripcion?.dniEstudiante);
    const mismoPrograma = mismoCodigo(pago.programaId, inscripcion?.programaId)
      || normalizarTexto(pago.programa || pago.programaNombre) === normalizarTexto(inscripcion?.programa);
    return mismoDni && mismoPrograma;
  });

  return ordenarPorFecha(coincidencias, "fechaPago")[0] || null;
}

function extraerIdentificadoresCodigo(codigo) {
  const texto = String(codigo || "").trim();
  const ids = { codigoOriginal: texto };

  if (!texto) return ids;

  const desdeJson = extraerDesdeJson(texto);
  if (desdeJson) return normalizarIdentificadores({ ...ids, ...desdeJson });

  const desdeUrl = extraerDesdeUrl(texto);
  if (desdeUrl) return normalizarIdentificadores({ ...ids, ...desdeUrl });

  const dni = texto.match(/\b\d{8}\b/)?.[0] || "";
  const inscripcionId = texto.match(/\bINS-[A-Z0-9-]+\b/i)?.[0] || "";
  const pagoId = texto.match(/\bPAG-[A-Z0-9-]+\b/i)?.[0] || "";
  const codigoEstudiante = texto.match(/\b(?:EST|EXT)-[A-Z0-9-]+\b/i)?.[0] || "";

  return normalizarIdentificadores({
    ...ids,
    dni,
    inscripcionId,
    pagoId,
    codigoEstudiante,
  });
}

function extraerIdentificadoresDesdeValidacion(data = {}) {
  return normalizarIdentificadores({
    dni: data.dni || data.dniEstudiante,
    codigoEstudiante: data.codigoEstudiante,
    inscripcionId: data.inscripcionId,
    pagoId: data.pagoId,
    codigoOriginal: data.inscripcionId || data.codigoEstudiante || data.dni || "",
  });
}

function extraerDesdeJson(texto) {
  try {
    const json = JSON.parse(texto);
    if (!json || typeof json !== "object") return null;
    return idsDesdeObjeto(json);
  } catch {
    return null;
  }
}

function extraerDesdeUrl(texto) {
  try {
    const url = new URL(texto);
    const params = Object.fromEntries(url.searchParams.entries());
    const segmentos = url.pathname.split("/").filter(Boolean).join(" ");
    return idsDesdeObjeto({ ...params, codigo: `${segmentos} ${url.hash || ""}` });
  } catch {
    return null;
  }
}

function idsDesdeObjeto(obj = {}) {
  const codigo = obj.codigo || obj.code || obj.qr || obj.token || "";
  const textoExtendido = [
    codigo,
    obj.id,
    obj.path,
    obj.payload,
    obj.inscripcion,
    obj.registro,
  ].filter(Boolean).join(" ");

  return {
    dni: obj.dni || obj.dniEstudiante || obj.estudianteDni || textoExtendido.match(/\b\d{8}\b/)?.[0] || "",
    codigoEstudiante: obj.codigoEstudiante || obj.codigoAlumno || textoExtendido.match(/\b(?:EST|EXT)-[A-Z0-9-]+\b/i)?.[0] || "",
    inscripcionId: obj.inscripcionId || obj.idInscripcion || obj.registroId || textoExtendido.match(/\bINS-[A-Z0-9-]+\b/i)?.[0] || "",
    pagoId: obj.pagoId || obj.idPago || textoExtendido.match(/\bPAG-[A-Z0-9-]+\b/i)?.[0] || "",
    programaId: obj.programaId || obj.idPrograma || "",
  };
}

function normalizarIdentificadores(ids = {}) {
  return {
    dni: limpiarDni(ids.dni || ids.dniEstudiante || ids.estudianteDni),
    codigoEstudiante: limpiarCodigo(ids.codigoEstudiante || ids.codigoAlumno),
    inscripcionId: limpiarCodigo(ids.inscripcionId || ids.idInscripcion),
    pagoId: limpiarCodigo(ids.pagoId || ids.idPago),
    programaId: limpiarCodigo(ids.programaId || ids.idPrograma),
    codigoOriginal: String(ids.codigoOriginal || ids.codigo || "").trim(),
  };
}

function obtenerInscripcionesActivas() {
  return (Array.isArray(apiDb.inscripciones) ? apiDb.inscripciones : [])
    .filter((item) => normalizarTexto(item.estadoInscripcion) !== "anulada");
}

function obtenerPagos() {
  return Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
}

function obtenerEstudiantes() {
  if (Array.isArray(apiDb.estudiantes)) return apiDb.estudiantes;
  if (apiDb.estudiantes && typeof apiDb.estudiantes === "object") return Object.values(apiDb.estudiantes);
  return [];
}

function ordenarPorFecha(items, campoPreferido = "fechaRegistro") {
  return [...items].sort((a, b) => {
    const fechaA = new Date(a?.[campoPreferido] || a?.fechaPago || a?.fecha || a?.createdAt || 0).getTime();
    const fechaB = new Date(b?.[campoPreferido] || b?.fechaPago || b?.fecha || b?.createdAt || 0).getTime();
    return fechaB - fechaA;
  });
}

function normalizarEstadoPago(valor) {
  const texto = normalizarTexto(valor);
  if (["completado", "pagado", "validado", "pago validado"].some((estado) => texto.includes(estado))) return "pagado";
  if (["cancelado", "anulado", "rechazado"].some((estado) => texto.includes(estado))) return "anulado";
  return "pendiente";
}

function resolverEstadoPago(inscripcion, pago) {
  const estadoPago = normalizarEstadoPago(pago?.estado);
  const estadoInscripcion = normalizarEstadoPago(inscripcion?.estadoPago);

  if (estadoPago === "pagado" || estadoInscripcion === "pagado") return "pagado";
  if (estadoPago === "anulado" || estadoInscripcion === "anulado") return "anulado";
  return "pendiente";
}

function generarAsistenciaId() {
  const base = Date.now().toString().slice(-8);
  const sufijo = Math.floor(Math.random() * 90) + 10;
  return `ASI-${base}-${sufijo}`;
}

function limpiarDni(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 8);
}

function limpiarCodigo(valor) {
  return String(valor || "").trim().toUpperCase();
}

function mismoCodigo(a, b) {
  const valorA = limpiarCodigo(a);
  const valorB = limpiarCodigo(b);
  return Boolean(valorA && valorB && valorA === valorB);
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
