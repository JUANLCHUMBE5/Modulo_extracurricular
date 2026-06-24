import { apiDb, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { esDiaCorrecto } from "./auxiliarAnalytics";
import { fechaActualIso } from "../../../services/dateService";

const esperar = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerProgramasActivosMock() {
  await esperar();
  await syncApiDb();
  return (apiDb.programas || []).filter(p => p.estado !== "Archivado");
}

export async function validarDniMock(busqueda, programaId = "") {
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
    return resolverValidacion({ dni: dniLimpio, codigoOriginal: dniLimpio, programaId });
  }

  // Si es texto, buscamos por nombre
  return resolverValidacionPorNombre(query, programaId);
}

export async function validarQRMock(codigo) {
  await esperar();
  await syncApiDb();

  const codigoLimpio = String(codigo || "").trim();
  if (!codigoLimpio) {
    throw new Error("Escanee o ingrese un codigo valido.");
  }

  return resolverValidacion(extraerIdentificadoresCodigo(codigoLimpio));
}

export async function registrarAsistenciaMock(data, observacion = "") {
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

// --- HELPER MOCK FUNCTIONS ---

function resolverValidacionPorNombre(nombreQuery, programaId = "") {
  const queryNormalizada = normalizarTexto(nombreQuery);
  if (queryNormalizada.length < 3) {
    throw new Error("El nombre de busqueda debe tener al menos 3 caracteres.");
  }

  // 1. Buscar en inscripciones activas
  const inscripciones = obtenerInscripcionesActivas();

  let matchesInscripcion = inscripciones.filter(ins =>
    normalizarTexto(ins.nombresEstudiante).includes(queryNormalizada)
  );

  if (programaId) {
    matchesInscripcion = matchesInscripcion.filter(ins => mismoCodigo(ins.programaId, programaId));
  }

  const resultadosInscripciones = matchesInscripcion.map(ins => {
    const ids = normalizarIdentificadores({
      dni: ins.dniEstudiante,
      codigoEstudiante: ins.codigoEstudiante,
      inscripcionId: ins.id,
      programaId: ins.programaId
    });
    try {
      return resolverValidacion(ids);
    } catch {
      return {
        dni: ins.dniEstudiante,
        codigoEstudiante: ins.codigoEstudiante,
        nombres: ins.nombresEstudiante,
        grado: ins.gradoEstudiante || "",
        seccion: ins.seccionEstudiante || "",
        programa: ins.programa || "",
        horario: ins.horario || "",
        estadoAcceso: "no_registrado",
        accesoPermitido: false,
        inscripcionId: ins.id
      };
    }
  });

  // 2. Si no hay filtro de programa, buscar en la lista general de estudiantes
  let resultadosEstudiantes = [];
  if (!programaId) {
    const estudiantes = obtenerEstudiantes();
    const dniConInscripcion = new Set(matchesInscripcion.map(ins => ins.dniEstudiante));

    const matchesEstudiante = estudiantes.filter(est => {
      const nomCompleto = `${est.nombres || ""} ${est.apellidos || ""}`;
      return normalizarTexto(nomCompleto).includes(queryNormalizada) && !dniConInscripcion.has(est.dni);
    });

    resultadosEstudiantes = matchesEstudiante.map(est => {
      const ids = normalizarIdentificadores({
        dni: est.dni,
        codigoEstudiante: est.codigoEstudiante
      });
      return resolverValidacion(ids);
    });
  }

  const todosResultados = [...resultadosInscripciones, ...resultadosEstudiantes];

  if (todosResultados.length === 0) {
    throw new Error(`No se encontro ningun estudiante que coincida con "${nombreQuery}".`);
  }

  if (todosResultados.length === 1) {
    return todosResultados[0];
  }

  return { isMultiple: true, matches: todosResultados };
}

function resolverValidacion(identificadores = {}) {
  const ids = normalizarIdentificadores(identificadores);
  const inscripcion = buscarInscripcion(ids);
  const estudiante = buscarEstudiante(ids, inscripcion);
  if (!inscripcion) {
    const studentDni = ids.dni || estudiante?.dni;
    let programaPreInscrito = null;
    if (studentDni) {
      for (const [progId, listaInvitados] of Object.entries(apiDb.invitadosPorPrograma || {})) {
        const esInvitado = (listaInvitados || []).some(inv => {
          const invDni = String(inv?.dni || "").replace(/\D/g, "");
          const targetDniStr = String(studentDni || "").replace(/\D/g, "");
          return invDni === targetDniStr && invDni !== "";
        });
        if (esInvitado) {
          const prog = (apiDb.programas || []).find(p => p.id === progId);
          if (prog) {
            programaPreInscrito = prog;
            break;
          }
        }
      }
    }

    if (programaPreInscrito) {
      return {
        dni: studentDni || ids.codigoOriginal || "",
        codigoEstudiante: ids.codigoEstudiante || estudiante?.codigoEstudiante || "",
        nombres: estudiante?.nombres || ids.codigoOriginal || "Estudiante",
        grado: estudiante?.grado || "",
        seccion: estudiante?.seccion || "",
        programa: programaPreInscrito.nombre,
        programaId: programaPreInscrito.id,
        horario: programaPreInscrito.horario || "No registrado",
        inscripcionId: "",
        estadoInscripcion: "Pre-inscrito",
        estadoPago: "Pendiente",
        estadoAcceso: "pre_inscrito",
        accesoPermitido: false,
        mensajeAcceso: "No inscrito",
        accion: `No está inscrito. Acercarse a Caja o Asistente para proceder con la matrícula en ${programaPreInscrito.nombre}.`,
        color: "rojo",
        pagoId: "",
        fechaPago: "",
        monto: Number(programaPreInscrito.costo || 0),
      };
    }

    return crearRespuestaNoRegistrado(ids, estudiante);
  }

  const pago = encontrarPagoInscripcion(inscripcion, ids);
  const estadoNormalizado = resolverEstadoPago(inscripcion, pago);
  if (estadoNormalizado === "pagado") {
    // 1. Validar rango de fechas (vigencia del taller)
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const hoyStr = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);

    if (inscripcion.fechaInicio && hoyStr < inscripcion.fechaInicio) {
      const fechaFmt = inscripcion.fechaInicio.split("-").reverse().join("/");
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Taller no iniciado",
        accion: `El taller aún no ha iniciado. La fecha de inicio es el ${fechaFmt}.`,
        color: "rojo",
      });
    }

    if (inscripcion.fechaFin && hoyStr > inscripcion.fechaFin) {
      const fechaFmt = inscripcion.fechaFin.split("-").reverse().join("/");
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Taller finalizado",
        accion: `El taller ya ha finalizado (finalizó el ${fechaFmt}).`,
        color: "rojo",
      });
    }

    // 2. Validar día de la semana
    if (!esDiaCorrecto(inscripcion.horario)) {
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "dia-incorrecto",
        estadoPago: "Pagado",
        accesoPermitido: false,
        mensajeAcceso: "Hoy no le toca este taller",
        accion: "El alumno está matriculado en este taller, pero las clases corresponden a otros días de la semana.",
        color: "rojo",
      });
    }

    const minsRestantes = obtenerMinutosRestantesIngresoReciente(
      apiDb.asistencias || [],
      ids.dni || estudiante?.dni,
      ids.codigoEstudiante || estudiante?.codigoEstudiante,
      inscripcion.programaId
    );

    if (minsRestantes > 0) {
      return crearRespuestaInscripcion({
        inscripcion,
        estudiante,
        pago,
        estadoAcceso: "ya_registrado",
        estadoPago: "Pagado",
        accesoPermitido: false,
        value: "Ya registrado",
        mensajeAcceso: "Ya registrado",
        accion: `Este estudiante ya registró su ingreso hace poco. Podrá registrarse nuevamente en ${minsRestantes} minuto(s).`,
        color: "rojo",
      });
    }

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
      estadoAcceso: "anulado",
      estadoPago: "Anulado",
      accesoPermitido: false,
      value: "Registro anulado",
      mensajeAcceso: "Pago anulado",
      accion: "Registro anulado. Verificar en Asistente o Cajera antes de permitir el ingreso.",
      color: "rojo",
    });
  }

  const esProceso = pago && (pago.estado === "Por Verificar" || pago.estado === "Por verificar" || pago.estado === "Pago en proceso");
  return crearRespuestaInscripcion({
    inscripcion,
    estudiante,
    pago,
    estadoAcceso: "pendiente",
    estadoPago: esProceso ? "Pago en proceso" : "Pendiente",
    accesoPermitido: false,
    mensajeAcceso: esProceso ? "Pago en proceso" : "Pago pendiente",
    accion: esProceso
      ? "Tiene un pago en proceso de verificación. Debe acercarse a Caja para su aprobación."
      : "Falta pagar. Debe acercarse a Caja para regularizar el pago.",
    color: "rojo",
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
    accion: "No esta registrado en un programa activo. Verificar en Asistente antes de permitir el ingreso.",
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
  if (candidatas.length === 0) return null;

  if (ids.programaId) {
    const porPrograma = candidatas.filter((item) => mismoCodigo(item.programaId, ids.programaId));
    if (porPrograma.length) return ordenarPorFecha(porPrograma)[0] || null;
  }

  // Priorizar las inscripciones de hoy
  const candidatasHoy = candidatas.filter(item => esDiaCorrecto(item.horario));
  if (candidatasHoy.length > 0) {
    const paid = candidatasHoy.filter(ins => {
      const p = encontrarPagoInscripcion(ins, ids);
      const estNorm = resolverEstadoPago(ins, p);
      return estNorm === "pagado";
    });
    if (paid.length > 0) return ordenarPorFecha(paid)[0];

    const processing = candidatasHoy.filter(ins => {
      const p = encontrarPagoInscripcion(ins, ids);
      return p && (p.estado === "Por Verificar" || p.estado === "Por verificar" || p.estado === "Pago en proceso");
    });
    if (processing.length > 0) return ordenarPorFecha(processing)[0];

    return ordenarPorFecha(candidatasHoy)[0];
  }

  // Si no hay de hoy, retornar la mejor de cualquier otro día (para mostrar advertencia de Día Incorrecto)
  const paid = candidatas.filter(ins => {
    const p = encontrarPagoInscripcion(ins, ids);
    const estNorm = resolverEstadoPago(ins, p);
    return estNorm === "pagado";
  });
  if (paid.length > 0) return ordenarPorFecha(paid)[0];

  const processing = candidatas.filter(ins => {
    const p = encontrarPagoInscripcion(ins, ids);
    return p && (p.estado === "Por Verificar" || p.estado === "Por verificar" || p.estado === "Pago en proceso");
  });
  if (processing.length > 0) return ordenarPorFecha(processing)[0];

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

function obtenerMinutosRestantesIngresoReciente(asistenciasList, studentDni, studentCode, programId, nowMs = Date.now()) {
  if (!Array.isArray(asistenciasList)) return 0;

  const cleanDni = studentDni ? String(studentDni).replace(/\D/g, "") : "";
  const cleanCode = studentCode ? String(studentCode).trim() : "";

  let maxRestante = 0;

  asistenciasList.forEach(ast => {
    const astDni = ast.dniEstudiante ? String(ast.dniEstudiante).replace(/\D/g, "") : "";
    const astCode = ast.codigoEstudiante ? String(ast.codigoEstudiante).trim() : "";

    const coincideEstudiante = (cleanDni && astDni === cleanDni) || (cleanCode && astCode === cleanCode);
    if (!coincideEstudiante) return;

    const coincidePrograma = ast.programaId === programId;
    if (!coincidePrograma) return;

    const fechaAst = new Date(ast.fechaRegistro);
    if (isNaN(fechaAst.getTime())) return;

    const diffMs = nowMs - fechaAst.getTime();
    const limiteMs = 15 * 60 * 1000;
    if (diffMs >= 0 && diffMs < limiteMs) {
      const mins = Math.ceil((limiteMs - diffMs) / 60000);
      if (mins > maxRestante) maxRestante = mins;
    }
  });

  return maxRestante;
}
