import { apiDb, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { adaptarPrograma } from "../../../services/adapters";
import {
  calcularDuracionTexto,
  fechaActualIso,
  normalizarDuracionAvisoDias,
  obtenerVentanaInscripcion,
} from "../../../services/dateService";
import {
  calcularEstadoGeneral,
  esProgramaCambridgePadres,
  extraerDiasHorario,
  limpiarTexto,
  normalizarEstadoPagoPadres,
  normalizarPeriodoTexto,
  normalizarTexto,
  obtenerDiasCruzados,
  obtenerProgramaPrincipalPadres,
  programaDisponibleParaGrado,
  programaVisibleEnPortalPadres,
  resolverDocentePorGrado,
  resolverHorarioPorGrado,
  tieneHorariosPorGrupo,
} from "../services/padresServiceUtils";

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

function obtenerGradoCompleto(grado, nivel, respaldoGrado = "") {
  let g = String(grado || "").trim();
  if (!g) return String(respaldoGrado || "").trim();
  const gLower = g.toLowerCase();
  if (!gLower.includes("primaria") && !gLower.includes("secundaria") && !gLower.includes("inicial")) {
    const n = String(nivel || "").trim();
    if (n) {
      g = `${g} ${n}`;
    }
  }
  return g;
}

export async function obtenerResumenPadreMock(dni) {
  await delay();
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = apiDb.estudiantes[dniLimpio] || null;

  if (!estudiante) {
    throw new Error("No se encontró información del estudiante.");
  }

  const invitaciones = obtenerInvitaciones(dniLimpio, estudiante);
  const inscripciones = obtenerInscripciones(estudiante, dniLimpio);
  const pagos = obtenerPagos(dniLimpio, inscripciones);
  const documentos = obtenerDocumentos(dniLimpio, estudiante);
  const inscripcionActual = obtenerProgramaPrincipalPadres(inscripciones);
  const invitacionActual = obtenerProgramaPrincipalPadres(invitaciones);

  return {
    estudiante,
    invitaciones,
    inscripciones,
    pagos,
    documentos,
    inscripcionActual,
    invitacionActual,
    estadoGeneral: calcularEstadoGeneral(inscripcionActual, invitacionActual),
  };
}

export async function guardarDatosApoderadoPadresMock(dni, datos) {
  await delay(300);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = apiDb.estudiantes[dniLimpio];
  if (!estudiante) throw new Error("No se encontró información del estudiante.");

  estudiante.apoderado = limpiarTexto(datos.apoderado);
  estudiante.telefonoApoderado = limpiarTexto(datos.telefono);
  estudiante.correoApoderado = limpiarTexto(datos.correo);
  estudiante.enviarPdfCorreo = Boolean(datos.enviarPdfCorreo && estudiante.correoApoderado);

  apiDb.inscripciones = apiDb.inscripciones.map((inscripcion) => {
    if (inscripcion.dniEstudiante !== dniLimpio) return inscripcion;
    return {
      ...inscripcion,
      apoderado: estudiante.apoderado,
      telefono: estudiante.telefonoApoderado,
      correo: estudiante.correoApoderado,
      enviarPdfCorreo: estudiante.enviarPdfCorreo,
    };
  });

  await saveApiDb();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "padres" } }));
  }
  return estudiante;
}

export async function registrarInscripcionPadresMock(dni, datos, programaId = "", horarioPersonalizado = "", tallas = {}) {
  await delay(400);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = apiDb.estudiantes[dniLimpio];
  if (!estudiante) throw new Error("No se encontró información del estudiante.");

  const invitaciones = obtenerInvitaciones(dniLimpio, estudiante);
  const invitacionPrincipal = invitaciones[0] || null;
  const programaSeleccionadoId = programaId || invitacionPrincipal?.programaId;
  if (!programaSeleccionadoId) throw new Error("Seleccione un curso disponible para registrar.");
  const invitacion = invitaciones.find((item) => item.programaId === programaSeleccionadoId) || null;

  const rawPrograma = apiDb.programas.find((item) => item.id === programaSeleccionadoId);
  if (!rawPrograma) throw new Error("El programa ya no existe. Coordinación debe revisarlo.");
  const programa = adaptarPrograma(rawPrograma);
  if (programa.estado !== "Habilitado") throw new Error("El programa no está habilitado.");
  const esCambridge = esProgramaCambridgePadres(programa);
  const gradoRegistro = obtenerGradoCompleto(
    invitacion?.grado || estudiante.grado,
    invitacion?.nivelEducativo || invitacion?.nivel || estudiante.nivel || "",
    estudiante.grado
  );
  const seccionRegistro = invitacion?.seccion || estudiante.seccion;
  const codigoRegistro = invitacion?.codigoEstudiante || estudiante.codigoEstudiante || "";
  const nombresRegistro = invitacion?.nombres || estudiante.nombres;

  if (!invitacion && esCambridge) {
    throw new Error("Este programa requiere invitacion de Coordinación Académica.");
  }

  const ventana = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias, programa.horaLimiteAviso, programa);
  if (!ventana.permitida) throw new Error("El aviso de inscripcion web cerro. Acerquese a Cajera para evaluar el registro.");
  if (Number(programa.cuposOcupados || 0) >= Number(programa.cupos || 0)) {
    throw new Error("El programa no tiene cupos disponibles.");
  }

  if (!esCambridge && !programaDisponibleParaGrado(programa, gradoRegistro)) {
    throw new Error("El programa no esta disponible para el grado del estudiante.");
  }

  const inscripcionExistente = apiDb.inscripciones.find((item) =>
    item.programaId === programa.id &&
    item.estadoInscripcion !== "Anulada" &&
    item.dniEstudiante === dniLimpio
  );
  const duplicada = Boolean(inscripcionExistente);
  if (inscripcionExistente) {
    const pagoExistente = encontrarPagoActivoPadres(inscripcionExistente);
    const estadoExistente = normalizarEstadoPagoPadres(
      inscripcionExistente.estadoPago,
      inscripcionExistente.estadoInscripcion,
      pagoExistente?.estado,
      pagoExistente?.estadoVerificacion
    );
    if (estadoExistente === "pagado") {
      throw new Error("El estudiante ya esta matriculado y cancelado en este programa. No se puede volver a matricular.");
    }
  }
  if (duplicada) throw new Error("El estudiante ya tiene una inscripción registrada en este programa.");

  const horarioRegistro = horarioPersonalizado || invitacion?.horario || resolverHorarioPorGrado(programa, gradoRegistro) || (programa.invitacionMasiva ? programa.horario : "") || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || "Horario por confirmar";
  if (!programa.invitacionMasiva) {
    validarCruceHorarioPadres(dniLimpio, programa.id, programa.periodo, horarioRegistro);
  }

  const registro = {
    id: `INS-${Date.now().toString().slice(-6)}`,
    programaId: programa.id,
    periodo: programa.periodo,
    programa: programa.nombre,
    categoria: programa.categoria || "",
    alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "",
    horario: horarioRegistro,
    docente: resolverDocentePorGrado(programa, gradoRegistro),
    costo: Number(programa.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programa.fechaFin || "",
    cicloI: programa.cicloI || "",
    cicloII: programa.cicloII || "",
    duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    horaLimiteAviso: programa.horaLimiteAviso || "23:59",
    gradosAplicables: programa.gradosAplicables || [],
    horariosPorGrupo: programa.horariosPorGrupo || [],
    talleresDeportivos: programa.talleresDeportivos || [],
    grupo: programa.grupo || "",
    grupoEtario: programa.grupoEtario || programa.grupo || "",
    requisitos: programa.requisitos || "",
    comunicado: programa.comunicado || "",
    comunicadoCompleto: programa.comunicadoCompleto || "",
    detalleCosto: programa.detalleCosto || "",
    detalleAlmuerzo: programa.detalleAlmuerzo || "",
    concesionarios: programa.concesionarios || "",
    anuncioImagen: programa.anuncioImagen || "",
    anuncioImagenNombre: programa.anuncioImagenNombre || "",
    plantilla: programa.plantilla || "",
    plantillaBase64: "",
    plantillaVariables: programa.plantillaVariables || [],
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    tallaUniforme: tallas.tallaUniforme || "",
    tallaPolo: tallas.tallaPolo || "",
    tallaShort: tallas.tallaShort || "",
    seleccion: invitacion?.seleccion || estudiante.seleccion || "",
    nivelCambridge: invitacion?.nivelCambridge || estudiante.nivelCambridge || "",
    dniEstudiante: dniLimpio,
    codigoEstudiante: codigoRegistro,
    nombresEstudiante: nombresRegistro,
    gradoEstudiante: gradoRegistro,
    grado: gradoRegistro,
    seccion: seccionRegistro,
    apoderado: limpiarTexto(datos.apoderado || estudiante.apoderado),
    telefono: limpiarTexto(datos.telefono || estudiante.telefonoApoderado),
    correo: limpiarTexto(datos.correo || estudiante.correoApoderado),
    enviarPdfCorreo: Boolean(datos.enviarPdfCorreo && limpiarTexto(datos.correo || estudiante.correoApoderado)),
    observacion: invitacion ? "Registro solicitado desde portal de padres." : "Registro libre solicitado desde portal de padres.",
    estadoInscripcion: "Pendiente de pago",
    estadoPago: "Pendiente",
    origenRegistro: "Portal padres",
    fechaRegistro: fechaActualIso(),
  };

  apiDb.inscripciones.push(registro);
  programa.cuposOcupados = Number(programa.cuposOcupados || 0) + 1;
  await saveApiDb();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "padres" } }));
  }
  return registro;
}

export async function registrarPagoVerificacionPadresMock(dni, inscripcionId, datosPago = {}) {
  await delay(650);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  if (!dniLimpio) throw new Error("No se encontro el DNI del estudiante.");
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  const inscripcionIndex = (apiDb.inscripciones || []).findIndex((item) =>
    item.id === inscripcionId &&
    item.dniEstudiante === dniLimpio &&
    item.estadoInscripcion !== "Anulada"
  );
  if (inscripcionIndex === -1) throw new Error("No se encontro una inscripcion pendiente para pagar.");

  const inscripcion = apiDb.inscripciones[inscripcionIndex];
  const pagoActivo = encontrarPagoActivoPadres(inscripcion);
  const estadoActual = normalizarEstadoPagoPadres(
    inscripcion.estadoPago,
    inscripcion.estadoInscripcion,
    pagoActivo?.estado,
    pagoActivo?.estadoVerificacion
  );
  if (estadoActual === "pagado") {
    throw new Error("Cajera ya registro este pago como cancelado. No puede enviar otro pago web.");
  }
  if (estadoActual === "verificando") {
    throw new Error("Ya existe un pago web en verificacion para esta inscripcion.");
  }
  const referencia = String(datosPago.referencia || "").trim();
  const telefono = String(datosPago.telefono || "").replace(/\D/g, "").slice(0, 9);
  const captura = datosPago.captura || null;

  if (!referencia) {
    throw new Error("Ingrese el numero de operacion de Yape.");
  }
  if (!captura?.base64) {
    throw new Error("Adjunte la captura del pago para iniciar la verificacion.");
  }

  const pago = {
    id: generarPagoIdPadres(),
    inscripcionId: inscripcion.id,
    dniEstudiante: dniLimpio,
    estudianteDni: dniLimpio,
    nombresEstudiante: inscripcion.nombresEstudiante || "",
    estudianteNombre: inscripcion.nombresEstudiante || "",
    programaId: inscripcion.programaId || "",
    programa: inscripcion.programa || "",
    programaNombre: inscripcion.programa || "",
    periodo: inscripcion.periodo || "escolar",
    concepto: "Inscripcion",
    monto: Number(inscripcion.costo || 0),
    formaPago: "Yape",
    medioPago: "Yape",
    estado: "verificando",
    estadoVerificacion: "pendiente",
    numeroOperacion: referencia,
    referenciaPago: referencia,
    telefonoOperacion: telefono,
    capturaPagoNombre: captura.nombre || "",
    capturaPagoTipo: captura.tipo || "",
    capturaPagoBase64: captura.base64 || "",
    fecha: fechaActualIso(),
    fechaPago: "",
    origenRegistro: "Portal padres - pago por verificar",
    createdAt: fechaActualIso(),
  };

  apiDb.pagos.push(pago);
  apiDb.inscripciones[inscripcionIndex] = {
    ...inscripcion,
    estadoPago: "Pendiente",
    estadoInscripcion: "Pago en proceso",
    pagoId: pago.id,
    pagoReferencia: referencia,
    pagoTelefono: telefono,
    pagoCapturaNombre: captura.nombre || "",
  };

  await saveApiDb();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "padres" } }));
  }
  return pago;
}

export async function reservarCupoCajaPadresMock(dni, inscripcionId) {
  await delay(350);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const index = (apiDb.inscripciones || []).findIndex((item) =>
    item.id === inscripcionId &&
    item.dniEstudiante === dniLimpio &&
    item.estadoInscripcion !== "Anulada"
  );
  if (index === -1) throw new Error("No se encontro la inscripcion para reservar el pago en Caja.");

  apiDb.inscripciones[index] = {
    ...apiDb.inscripciones[index],
    derivadoCaja: true,
    estadoCaja: "reservado_caja",
    estadoPago: "pendiente",
    estadoInscripcion: "Reserva pendiente",
    fechaReservaCaja: fechaActualIso(),
    observacionCaja: "Reserva generada desde portal de padres para pago presencial en Caja.",
  };

  const estudiante = apiDb.estudiantes?.[dniLimpio];
  if (estudiante) {
    estudiante.estadoInscripcion = "Reserva pendiente";
    estudiante.estadoCaja = "reservado_caja";
  }

  await saveApiDb();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "padres" } }));
  }
  return apiDb.inscripciones[index];
}

export async function obtenerProgramasCoordinacionMock() {
  await delay(300);
  await syncApiDb();
  return apiDb.programas.map(adaptarPrograma).map((programa) => {
    const cupos = Number(programa.cupos || 0);
    const cuposOcupados = Number(programa.cuposOcupados || 0);
    const cuposDisponibles = Math.max(0, cupos - cuposOcupados);
    const duracionAvisoDias = normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7);
    const ventanaInscripcion = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), duracionAvisoDias, programa.horaLimiteAviso, programa);
    const esCambridge = esProgramaCambridgePadres(programa);
    const requiereGradoCompatible = !esCambridge && !programa.invitacionMasiva && (
      tieneHorariosPorGrupo(programa) ||
      (Array.isArray(programa.gradosAplicables) && programa.gradosAplicables.length > 0)
    );

    return {
      id: programa.id,
      nombre: programa.nombre,
      categoria: programa.categoria,
      alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "colegio",
      horario: programa.horario || "Por confirmar",
      horariosPorGrupo: programa.horariosPorGrupo || [],
      gradosAplicables: programa.gradosAplicables || [],
      invitacionMasiva: Boolean(programa.invitacionMasiva),
      talleresDeportivos: programa.talleresDeportivos || [],
      requiereUniforme: Boolean(programa.requiereUniforme),
      requiereIndumentaria: Boolean(programa.requiereIndumentaria),
      creadoDesdeDocumento: Boolean(programa.creadoDesdeDocumento),
      plantilla: programa.plantilla || "",
      plantillaValidada: Boolean(programa.plantillaValidada),
      requiereGradoCompatible,
      periodo: normalizarPeriodoTexto(programa.periodo),
      estado: programmeEstado(programa),
      cupos,
      cuposOcupados,
      cuposDisponibles,
      costo: Number(programa.costo || 0),
      responsable: programa.responsable || programa.docente || "Por definir",
      anuncioImagen: programa.anuncioImagen || "",
      anuncioImagenNombre: programmeAnuncioImagenNombre(programa),
      fechaInicio: programa.fechaInicio || "",
      fechaFin: programa.fechaFin || "",
      cicloI: programa.cicloI || "",
      cicloII: programa.cicloII || "",
      duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
      duracionAvisoDias,
      horaLimiteAviso: programa.horaLimiteAviso || "23:59",
      ventanaInscripcion,
      registrable: !esCambridge && programaVisibleEnPortalPadres(programa) && cuposDisponibles > 0,
    };
  });
}

// Helper getter functions to prevent errors
function programmeEstado(p) { return p.estado || "Habilitado"; }
function programmeAnuncioImagenNombre(p) { return p.anuncioImagenNombre || ""; }

// --- INTERNAL HELPERS ---

function generarPagoIdPadres() {
  const usados = new Set((apiDb.pagos || []).map((pago) => String(pago.id || "")));
  let id = `PAG-${Date.now().toString().slice(-8)}`;
  while (usados.has(id)) {
    id = `PAG-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90) + 10}`;
  }
  return id;
}

function obtenerInvitaciones(dni, estudiante = null) {
  const resultado = [];

  apiDb.programas.map(adaptarPrograma).forEach((programa) => {
    if (!programaVisibleEnPortalPadres(programa)) return;

    if (programa.invitacionMasiva && programaDisponibleParaGrado(programa, estudiante?.grado)) {
      resultado.push({
        id: `${programa.id}-masiva-${dni}`,
        programaId: programmeId(programa),
        programa: programa.nombre,
        categoria: programa.categoria || "",
        alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "colegio",
        periodo: normalizarPeriodoTexto(programa.periodo),
        horario: resolverHorarioPorGrado(programa, estudiante?.grado) || programa.horario || "Horario por confirmar",
        responsable: resolverDocentePorGrado(programa, estudiante?.grado),
        costo: Number(programa.costo || 0),
        modalidadCobro: programa.modalidadCobro || "No definido",
        requisitos: programa.requisitos || "Sin requisitos adicionales",
        comunicado: programa.comunicado || "",
        comunicadoCompleto: programa.comunicadoCompleto || "",
        detalleCosto: programa.detalleCosto || "",
        detalleAlmuerzo: programa.detalleAlmuerzo || "",
        concesionarios: programa.concesionarios || "",
        anuncioImagen: programa.anuncioImagen || "",
        anuncioImagenNombre: programmeAnuncioImagenNombre(programa),
        talleresDeportivos: programa.talleresDeportivos || [],
        requiereUniforme: Boolean(programa.requiereUniforme),
        requiereIndumentaria: Boolean(programa.requiereIndumentaria),
        seleccion: estudiante?.seleccion || "",
        nivelCambridge: estudiante?.nivelCambridge || "",
        estadoPrograma: programmeEstado(programa),
        estadoInvitacion: "Invitacion masiva",
        fechaInicio: programa.fechaInicio || "",
        fechaFin: programa.fechaFin || "",
        cicloI: programa.cicloI || "",
        cicloII: programa.cicloII || "",
        duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
        duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
        horaLimiteAviso: programa.horaLimiteAviso || "23:59",
        ventanaInscripcion: obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias, programa.horaLimiteAviso, programa),
        creadoDesdeDocumento: Boolean(programa.creadoDesdeDocumento),
        plantilla: programa.plantilla || "",
        plantillaValidada: Boolean(programa.plantillaValidada),
        plantillaVariables: programa.plantillaVariables || []
      });
    }

    const invitados = apiDb.invitadosPorPrograma[programa.id] || [];
    const esCambridge = esProgramaCambridgePadres(programa);
    invitados
      .filter((invitado) => invitado.dni === dni)
      .forEach((invitado) => {
        if (resultado.some((item) => item.programaId === programa.id)) return;
        const gradoEstudiante = obtenerGradoCompleto(
          invitado.grado,
          invitado.nivelEducativo || invitado.nivel || estudiante?.nivel || "",
          estudiante?.grado
        );
        if (!esCambridge && !programaDisponibleParaGrado(programa, gradoEstudiante)) return;

        resultado.push({
          id: `${programa.id}-${invitado.dni || invitado.codigoEstudiante || invitado.nombres}`,
          programaId: programmeId(programa),
          programa: programa.nombre,
          categoria: programa.categoria || "",
          alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "colegio",
          periodo: normalizarPeriodoTexto(programa.periodo),
          horario: resolverHorarioPorGrado(programa, gradoEstudiante) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || "Horario por confirmar",
          responsable: resolverDocentePorGrado(programa, gradoEstudiante),
          costo: Number(programa.costo || 0),
          modalidadCobro: programa.modalidadCobro || "No definido",
          requisitos: programa.requisitos || "Sin requisitos adicionales",
          comunicado: programa.comunicado || "",
          comunicadoCompleto: programa.comunicadoCompleto || "",
          detalleCosto: programa.detalleCosto || "",
          detalleAlmuerzo: programa.detalleAlmuerzo || "",
          concesionarios: programa.concesionarios || "",
          anuncioImagen: programa.anuncioImagen || "",
          anuncioImagenNombre: programmeAnuncioImagenNombre(programa),
          talleresDeportivos: programa.talleresDeportivos || [],
          requiereUniforme: Boolean(programa.requiereUniforme),
          requiereIndumentaria: Boolean(programa.requiereIndumentaria),
          seleccion: invitado.seleccion || "",
          nivelCambridge: invitado.nivelCambridge || "",
          estadoPrograma: programmeEstado(programa),
          estadoInvitacion: invitado.estado || "Invitado",
          fechaInicio: programa.fechaInicio || "",
          fechaFin: programa.fechaFin || "",
          cicloI: programa.cicloI || "",
          cicloII: programa.cicloII || "",
          duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
          grado: gradoEstudiante,
          duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
          horaLimiteAviso: programmeHoraLimiteAviso(programa),
          ventanaInscripcion: obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias, programmeHoraLimiteAviso(programa), programa),
          creadoDesdeDocumento: Boolean(programa.creadoDesdeDocumento),
          plantilla: programa.plantilla || "",
          plantillaValidada: Boolean(programa.plantillaValidada),
          plantillaVariables: programa.plantillaVariables || []
        });
      });
  });

  return resultado;
}

function programmeId(p) { return p.id || ""; }
function programmeHoraLimiteAviso(p) { return p.horaLimiteAviso || "23:59"; }

function obtenerInscripciones(estudiante, dni) {
  const claves = new Set([
    dni ? `dni:${dni}` : "",
    estudiante.codigoEstudiante ? `codigo:${normalizarTexto(estudiante.codigoEstudiante)}` : "",
    estudiante.nombres ? `nombre:${normalizarTexto(estudiante.nombres)}` : "",
  ].filter(Boolean));

  return [...apiDb.inscripciones]
    .filter((inscripcion) => {
      const clavesInscripcion = [
        inscripcion.dniEstudiante ? `dni:${inscripcion.dniEstudiante}` : "",
        inscripcion.codigoEstudiante ? `codigo:${normalizarTexto(inscripcion.codigoEstudiante)}` : "",
        inscripcion.nombresEstudiante ? `nombre:${normalizarTexto(inscripcion.nombresEstudiante)}` : "",
      ].filter(Boolean);

      return clavesInscripcion.some((clave) => claves.has(clave));
    })
    .map(sincronizarInscripcionConPrograma)
    .filter((inscripcion) => inscripcion.estadoInscripcion !== "Requiere revision")
    .sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
}

function obtenerPagos(dni, inscripciones) {
  const idsInscripcion = new Set(inscripciones.map((item) => item.id));
  return [...(apiDb.pagos || [])]
    .filter((pago) => pago.dniEstudiante === dni || idsInscripcion.has(pago.inscripcionId))
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function obtenerDocumentos(dni, estudiante) {
  const nombre = normalizarTexto(estudiante.nombres);
  return [...(apiDb.documentosGenerados || [])]
    .filter((documento) =>
      documento.dniEstudiante === dni ||
      normalizarTexto(documento.alumno) === nombre
    )
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
}

function sincronizarInscripcionConPrograma(inscripcion) {
  const rawPrograma = apiDb.programas.find((item) => {
    if (inscripcion.programaId) return item.id === inscripcion.programaId;
    return normalizarTexto(item.nombre || item.nombre_programa) === normalizarTexto(inscripcion.programa);
  });
  const programa = rawPrograma ? adaptarPrograma(rawPrograma) : null;

  if (!programa || programa.estado === "Archivado") {
    return normalizarInscripcion({
      ...inscripcion,
      estadoInscripcion: "Requiere revision",
      estadoPago: inscripcion.estadoPago || "Pendiente",
      estadoPrograma: "Programa archivado",
      horario: "Programa archivado por Coordinación Académica",
    });
  }

  if (!programaDisponibleParaGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado)) {
    return normalizarInscripcion({
      ...inscripcion,
      estadoInscripcion: "Requiere revision",
      estadoPago: inscripcion.estadoPago || "Pendiente",
      costo: 0,
      horario: "Programa no disponible para este grado",
      estadoPrograma: programmeEstado(programa),
      programa: programa.nombre || inscripcion.programa,
    });
  }

  return normalizarInscripcion({
    ...inscripcion,
    programa: programa.nombre || inscripcion.programa,
    horario: resolverHorarioPorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || (programa.invitacionMasiva ? programa.horario : "") || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || inscripcion.horario,
    docente: resolverDocentePorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || inscripcion.docente || "No definido",
    costo: Number(programa.costo ?? inscripcion.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || inscripcion.modalidadCobro,
    fechaInicio: programa.fechaInicio || inscripcion.fechaInicio,
    fechaFin: programa.fechaFin || inscripcion.fechaFin,
    cicloI: programa.cicloI || inscripcion.cicloI || "",
    cicloII: programa.cicloII || inscripcion.cicloII || "",
    duracionTaller: programa.duracionTaller || inscripcion.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias || inscripcion.duracionAvisoDias, 7),
    requisitos: programa.requisitos || inscripcion.requisitos,
    comunicado: programa.comunicado || inscripcion.comunicado || "",
    detalleCosto: programa.detalleCosto || inscripcion.detalleCosto || "",
    detalleAlmuerzo: programa.detalleAlmuerzo || inscripcion.detalleAlmuerzo || "",
    concesionarios: programa.concesionarios || inscripcion.concesionarios || "",
    requiereUniforme: Boolean(programa.requiereUniforme),
    estadoPrograma: programmeEstado(programa),
    horaLimiteAviso: programmeHoraLimiteAviso(programa),
  });
}

function normalizarInscripcion(inscripcion) {
  return {
    ...inscripcion,
    estadoInscripcion: obtenerEstadoInscripcion(inscripcion),
    estadoPago: inscripcion.estadoPago || "Pendiente",
    costo: Number(inscripcion.costo || 0),
  };
}

function obtenerEstadoInscripcion(inscripcion) {
  return inscripcion.estadoInscripcion ||
    inscripcion["estadoInscripción"] ||
    "Pendiente";
}

function encontrarPagoActivoPadres(inscripcion = {}) {
  const registro = inscripcion || {};
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const programaNombre = normalizarTexto(registro.programa);

  return pagos.find((pago) => {
    const estado = normalizarEstadoPagoPadres(pago.estado, pago.estadoPago, pago.estadoVerificacion);
    if (["observado", "anulado"].includes(estado)) return false;
    if (pago.inscripcionId && pago.inscripcionId === registro.id) return true;
    if (pago.inscripcionId && registro.id && pago.inscripcionId !== registro.id) return false;

    const mismoDni = (pago.dniEstudiante || pago.estudianteDni) === registro.dniEstudiante;
    if (!mismoDni) return false;
    if (pago.programaId && pago.programaId === registro.programaId) return true;
    if (pago.programaId && registro.programaId && pago.programaId !== registro.programaId) return false;
    return programaNombre && normalizarTexto(pago.programa || pago.programaNombre) === programaNombre;
  }) || null;
}

function validarCruceHorarioPadres(dni, programaId, periodo, horarioNuevo = "") {
  const diasNuevo = extraerDiasHorario(horarioNuevo);
  if (!diasNuevo.size) return;

  const periodoNormalizado = normalizarPeriodoTexto(periodo);
  const cruce = apiDb.inscripciones
    .map((item) => ({
      item,
      diasCruzados: obtenerDiasCruzados(diasNuevo, extraerDiasHorario(item.horario)),
    }))
    .find(({ item, diasCruzados }) =>
      item.estadoInscripcion !== "Anulada" &&
      item.programaId !== programaId &&
      item.dniEstudiante === dni &&
      normalizarPeriodoTexto(item.periodo) === periodoNormalizado &&
      diasCruzados.length > 0
    );

  if (cruce) {
    throw new Error(`El estudiante ya tiene una inscripcion con cruce de dia (${cruce.diasCruzados.join(", ")}) en ${cruce.item.programa || "otro programa"}.`);
  }
}
