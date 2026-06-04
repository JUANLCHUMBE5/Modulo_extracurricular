import { apiDb, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { isApiMode, apiClient } from "../../../services/apiClient";
import {
  adaptarEstudiante,
  adaptarInscripcion,
  adaptarPago,
  adaptarPrograma,
} from "../../../services/adapters";
import {
  calcularDuracionTexto,
  fechaActualIso,
  normalizarDuracionAvisoDias,
  obtenerVentanaInscripcion,
} from "../../../services/dateService";

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerResumenPadre(dni) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/padres/resumen/${dni}`);
    if (!res.success) throw new Error(res.message || "Error al obtener resumen de padres");
    
    const data = res.data || {};
    const estudiante = adaptarEstudiante(data.estudiante);
    const invitaciones = (data.invitaciones || []).map(adaptarPrograma);
    const inscripciones = (data.inscripciones || []).map(adaptarInscripcion);
    const pagos = (data.pagos || []).map(adaptarPago);
    const documentos = data.documentos || [];
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

export async function guardarDatosApoderadoPadres(dni, datos) {
  if (isApiMode()) {
    const payload = {
      apoderado: limpiarTexto(datos.apoderado),
      telefono: limpiarTexto(datos.telefono),
      correo: limpiarTexto(datos.correo),
      enviar_pdf_correo: Boolean(datos.enviarPdfCorreo && datos.correo),
    };
    const res = await apiClient.put(`/api/v1/extracurricular/padres/${dni}/apoderado`, payload);
    if (!res.success) throw new Error(res.message || "Error al actualizar datos de apoderado");
    return adaptarEstudiante(res.data);
  }

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
  return estudiante;
}

export async function registrarInscripcionPadres(dni, datos, programaId = "", horarioPersonalizado = "", tallas = {}) {
  if (isApiMode()) {
    const payload = {
      estudiante_id: dni,
      programa_id: programaId,
      horario: horarioPersonalizado,
      origen_inscripcion: "Portal padres",
      apoderado: limpiarTexto(datos.apoderado),
      telefono_apoderado: limpiarTexto(datos.telefono),
      correo_apoderado: limpiarTexto(datos.correo),
      enviar_pdf_correo: Boolean(datos.enviarPdfCorreo && datos.correo),
      talla_uniforme: tallas.tallaUniforme || "",
      talla_polo: tallas.tallaPolo || "",
      talla_short: tallas.tallaShort || "",
    };
    const res = await apiClient.post("/api/v1/extracurricular/inscripciones", payload);
    if (!res.success) throw new Error(res.message || "Error al registrar inscripción");
    return adaptarInscripcion(res.data);
  }

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

  const programa = apiDb.programas.find((item) => item.id === programaSeleccionadoId);
  if (!programa) throw new Error("El programa ya no existe. Coordinación debe revisarlo.");
  if (programa.estado !== "Habilitado") throw new Error("El programa no está habilitado.");
  const gradoRegistro = invitacion?.grado || estudiante.grado;
  const seccionRegistro = invitacion?.seccion || estudiante.seccion;
  const codigoRegistro = invitacion?.codigoEstudiante || estudiante.codigoEstudiante || "";
  const nombresRegistro = invitacion?.nombres || estudiante.nombres;

  if (!invitacion && !programa.invitacionMasiva) {
    throw new Error("Este programa requiere invitacion de Coordinacion.");
  }

  const ventana = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias);
  if (!ventana.permitida) throw new Error("El aviso de inscripcion web cerro. Acerquese a Caja para evaluar el registro.");
  if (Number(programa.cuposOcupados || 0) >= Number(programa.cupos || 0)) {
    throw new Error("El programa no tiene cupos disponibles.");
  }

  if (!programaDisponibleParaGrado(programa, gradoRegistro)) {
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
    docente: programa.responsable || programa.docente || "No definido",
    costo: Number(programa.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programa.fechaFin || "",
    cicloI: programa.cicloI || "",
    cicloII: programa.cicloII || "",
    duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    gradosAplicables: programa.gradosAplicables || [],
    horariosPorGrupo: programa.horariosPorGrupo || [],
    talleresDeportivos: programa.talleresDeportivos || [],
    grupo: programa.grupo || "",
    grupoEtario: programa.grupoEtario || programa.grupo || "",
    requisitos: programa.requisitos || "",
    comunicado: programa.comunicado || "",
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
  return registro;
}

export async function registrarPagoVerificacionPadres(dni, inscripcionId, datosPago = {}) {
  if (isApiMode()) {
    const formData = new FormData();
    formData.append("inscripcion_id", inscripcionId);
    formData.append("metodo_pago", "Yape");
    formData.append("referencia", String(datosPago.referencia || "").trim());
    formData.append("telefono", String(datosPago.telefono || "").replace(/\D/g, "").slice(0, 9));
    
    if (datosPago.captura?.file) {
      formData.append("comprobante", datosPago.captura.file);
    } else {
      formData.append("comprobante_base64", datosPago.captura?.base64 || "");
      formData.append("comprobante_nombre", datosPago.captura?.nombre || "");
    }
    
    const res = await apiClient.post("/api/v1/extracurricular/pagos/comprobante", formData);
    if (!res.success) throw new Error(res.message || "Error al subir comprobante de pago");
    return adaptarPago(res.data);
  }

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
    throw new Error("Caja ya registro este pago como cancelado. No puede enviar otro pago web.");
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
    estadoInscripcion: "Pago en verificacion",
    pagoId: pago.id,
    pagoReferencia: referencia,
    pagoTelefono: telefono,
    pagoCapturaNombre: captura.nombre || "",
  };

  await saveApiDb();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mock-db-updated"));
  }
  return pago;
}

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

  apiDb.programas.forEach((programa) => {
    if (!programaVisibleEnPortalPadres(programa)) return;

    if (programa.invitacionMasiva && programaDisponibleParaGrado(programa, estudiante?.grado)) {
      resultado.push({
        id: `${programa.id}-masiva-${dni}`,
        programaId: programa.id,
        programa: programa.nombre,
        categoria: programa.categoria || "",
        alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "colegio",
        periodo: normalizarPeriodoTexto(programa.periodo),
        horario: resolverHorarioPorGrado(programa, estudiante?.grado) || programa.horario || "Horario por confirmar",
        responsable: programa.responsable || programa.docente || "Responsable por definir",
        costo: Number(programa.costo || 0),
        modalidadCobro: programa.modalidadCobro || "No definido",
        requisitos: programa.requisitos || "Sin requisitos adicionales",
        comunicado: programa.comunicado || "",
        detalleCosto: programa.detalleCosto || "",
        detalleAlmuerzo: programa.detalleAlmuerzo || "",
        concesionarios: programa.concesionarios || "",
        anuncioImagen: programa.anuncioImagen || "",
        anuncioImagenNombre: programa.anuncioImagenNombre || "",
        talleresDeportivos: programa.talleresDeportivos || [],
        requiereUniforme: Boolean(programa.requiereUniforme),
        requiereIndumentaria: Boolean(programa.requiereIndumentaria),
        seleccion: estudiante?.seleccion || "",
        nivelCambridge: estudiante?.nivelCambridge || "",
        estadoPrograma: programa.estado || "No definido",
        estadoInvitacion: "Invitacion masiva",
        fechaInicio: programa.fechaInicio || "",
        fechaFin: programa.fechaFin || "",
        cicloI: programa.cicloI || "",
        cicloII: programa.cicloII || "",
        duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
        duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
        ventanaInscripcion: obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias),
      });
    }

    const invitados = apiDb.invitadosPorPrograma[programa.id] || [];
    invitados
      .filter((invitado) => invitado.dni === dni)
      .forEach((invitado) => {
        if (resultado.some((item) => item.programaId === programa.id)) return;
        const gradoEstudiante = invitado.grado || estudiante?.grado;
        if (!programaDisponibleParaGrado(programa, gradoEstudiante)) return;

        resultado.push({
          id: `${programa.id}-${invitado.dni || invitado.codigoEstudiante || invitado.nombres}`,
          programaId: programa.id,
          programa: programa.nombre,
          categoria: programa.categoria || "",
          alcanceInvitacionMasiva: programa.alcanceInvitacionMasiva || "colegio",
          periodo: normalizarPeriodoTexto(programa.periodo),
          horario: resolverHorarioPorGrado(programa, invitado.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || "Horario por confirmar",
          responsable: programa.responsable || programa.docente || "Responsable por definir",
          costo: Number(programa.costo || 0),
          modalidadCobro: programa.modalidadCobro || "No definido",
          requisitos: programa.requisitos || "Sin requisitos adicionales",
          comunicado: programa.comunicado || "",
          detalleCosto: programa.detalleCosto || "",
          detalleAlmuerzo: programa.detalleAlmuerzo || "",
          concesionarios: programa.concesionarios || "",
          anuncioImagen: programa.anuncioImagen || "",
          anuncioImagenNombre: programa.anuncioImagenNombre || "",
          talleresDeportivos: programa.talleresDeportivos || [],
          requiereUniforme: Boolean(programa.requiereUniforme),
          requiereIndumentaria: Boolean(programa.requiereIndumentaria),
          seleccion: invitado.seleccion || "",
          nivelCambridge: invitado.nivelCambridge || "",
          estadoPrograma: programa.estado || "No definido",
          estadoInvitacion: invitado.estado || "Invitado",
          fechaInicio: programa.fechaInicio || "",
          fechaFin: programa.fechaFin || "",
          cicloI: programa.cicloI || "",
          cicloII: programa.cicloII || "",
          duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
          duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
          ventanaInscripcion: obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias),
        });
      });
  });

  return resultado;
}

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

function esProgramaCortoPadres(programa = {}) {
  const nombre = normalizarTexto(programa.programa || programa.nombre);
  if (nombre.includes("expres") || nombre.includes("express") || nombre.includes("maraton")) return true;

  const inicio = crearFechaLocal(programa.fechaInicio);
  const fin = crearFechaLocal(programa.fechaFin);
  if (!inicio || !fin) return false;

  const dias = Math.floor((fin.getTime() - inicio.getTime()) / 86400000) + 1;
  return dias > 0 && dias < 28;
}

function obtenerProgramaPrincipalPadres(programas = []) {
  return programas.find((item) => !esProgramaCortoPadres(item)) || programas[0] || null;
}

function crearFechaLocal(valor) {
  if (!valor) return null;
  const partes = String(valor).split("-").map(Number);
  if (partes.length !== 3 || partes.some((parte) => Number.isNaN(parte))) return null;
  return new Date(partes[0], partes[1] - 1, partes[2]);
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
  const programa = apiDb.programas.find((item) => {
    if (inscripcion.programaId) return item.id === inscripcion.programaId;
    return normalizarTexto(item.nombre) === normalizarTexto(inscripcion.programa);
  });

  if (!programa) {
    return normalizarInscripcion({
      ...inscripcion,
      estadoInscripcion: "Requiere revision",
      estadoPago: inscripcion.estadoPago || "Pendiente",
      estadoPrograma: "Programa eliminado",
      horario: "Programa eliminado por Coordinacion",
    });
  }

  if (!programaDisponibleParaGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado)) {
    return normalizarInscripcion({
      ...inscripcion,
      estadoInscripcion: "Requiere revision",
      estadoPago: inscripcion.estadoPago || "Pendiente",
      costo: 0,
      horario: "Programa no disponible para este grado",
      estadoPrograma: programa.estado || "",
      programa: programa.nombre || inscripcion.programa,
    });
  }

  return normalizarInscripcion({
    ...inscripcion,
    programa: programa.nombre || inscripcion.programa,
    horario: resolverHorarioPorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || (programa.invitacionMasiva ? programa.horario : "") || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || inscripcion.horario,
    docente: programa.responsable || programa.docente || inscripcion.docente,
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
    estadoPrograma: programa.estado || "",
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
    inscripcion.estadoInscripción ||
    inscripcion.estadoInscripción ||
    inscripcion.estadoInscripción ||
    "Pendiente";
}

function resolverHorarioPorGrado(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return "";

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return "";
  let gradoDelTurno = "";
  const grupo = grupos.find((item) => {
    gradoDelTurno = (item.grados || []).find((grado) => coincideGrado(grado, gradoNormalizado)) || "";
    return Boolean(gradoDelTurno);
  });

  if (!grupo) return "";
  const grados = formatearGrado(gradoDelTurno || gradoAlumno);
  const aula = grupo.aula ? ` · Aula ${grupo.aula}` : "";
  return `${grados ? `${grados}: ` : ""}${grupo.dia} almuerzo ${grupo.almuerzoInicio || "14:20"}-${grupo.almuerzoFin || "15:10"}, clase ${grupo.horaInicio || ""}-${grupo.horaFin || ""}${aula}`;
}

function coincideGrado(gradoGrupo, gradoAlumnoNormalizado) {
  const grupo = descomponerGrado(gradoGrupo);
  if (!grupo.numero || !gradoAlumnoNormalizado?.numero) return false;
  if (grupo.numero !== gradoAlumnoNormalizado.numero) return false;
  return !grupo.nivel || !gradoAlumnoNormalizado.nivel || grupo.nivel === gradoAlumnoNormalizado.nivel;
}

function formatearGrado(valor) {
  const [nivel, grado] = String(valor || "").split(":");
  if (!nivel || !grado) return valor;
  return `${nivel} ${grado}`;
}

function tieneHorariosPorGrupo(programa) {
  return Array.isArray(programa?.horariosPorGrupo) && programa.horariosPorGrupo.length > 0;
}

function programaDisponibleParaGrado(programa, gradoAlumno = "") {
  if (programa?.invitacionMasiva) return programaDisponibleParaAlcanceMasivo(programa, gradoAlumno);

  if (tieneHorariosPorGrupo(programa)) {
    return Boolean(resolverHorarioPorGrado(programa, gradoAlumno));
  }

  const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
  if (!gradosAplicables.length) return true;

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return false;

  return gradosAplicables.some((grado) => coincideGrado(grado, gradoNormalizado));
}

function programaDisponibleParaAlcanceMasivo(programa, gradoAlumno = "") {
  const alcance = normalizarTexto(programa?.alcanceInvitacionMasiva || "colegio");
  if (!alcance || alcance === "colegio" || alcance === "todos") return true;

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.nivel) return false;

  if (alcance === "primaria" || alcance === "secundaria" || alcance === "inicial") {
    return gradoNormalizado.nivel === alcance;
  }

  if (alcance === "grados" || alcance === "seleccionados") {
    const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
    if (!gradosAplicables.length || !gradoNormalizado.numero) return false;
    return gradosAplicables.some((grado) => coincideGrado(grado, gradoNormalizado));
  }

  return true;
}

function programaVisibleEnPortalPadres(programa) {
  return Boolean(programa) && programa.estado === "Habilitado";
}

function calcularEstadoGeneral(inscripcion, invitacion) {
  if (inscripcion) {
    if (String(inscripcion.estadoPago || "").toLowerCase().includes("pag")) {
      return { texto: "Inscrito con pago registrado", tono: "success" };
    }
    return { texto: "Inscripción pendiente de pago", tono: "warning" };
  }

  if (invitacion) {
    return { texto: "Invitación disponible", tono: "info" };
  }

  return { texto: "Sin programa asignado", tono: "neutral" };
}

function normalizarPeriodoTexto(periodo) {
  return String(periodo || "").toLowerCase().includes("verano") ? "Ciclo verano" : "Año escolar";
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarEstadoPagoPadres(...valores) {
  const texto = normalizarTexto(valores.filter(Boolean).join(" "));
  if (["completado", "pagado", "validado", "pago validado"].some((item) => texto.includes(item))) return "pagado";
  if (["verificando", "verificacion", "por verificar", "revision"].some((item) => texto.includes(item))) return "verificando";
  if (["observado", "rechazado", "no coincide"].some((item) => texto.includes(item))) return "observado";
  if (["cancelado", "anulado"].some((item) => texto.includes(item))) return "anulado";
  return "pendiente";
}

function encontrarPagoActivoPadres(inscripcion = {}) {
  const registro = inscripcion || {};
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const programaNombre = normalizarTexto(registro.programa);

  return pagos.find((pago) => {
    const estado = normalizarEstadoPagoPadres(pago.estado, pago.estadoPago, pago.estadoVerificacion);
    if (["observado", "anulado"].includes(estado)) return false;
    if (pago.inscripcionId && pago.inscripcionId === registro.id) return true;

    const mismoDni = (pago.dniEstudiante || pago.estudianteDni) === registro.dniEstudiante;
    if (!mismoDni) return false;
    if (pago.programaId && pago.programaId === registro.programaId) return true;
    return programaNombre && normalizarTexto(pago.programa || pago.programaNombre) === programaNombre;
  }) || null;
}

function descomponerGrado(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
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

function obtenerDiasCruzados(a, b) {
  const dias = [];
  for (const dia of a) {
    if (b.has(dia)) dias.push(dia);
  }
  return dias;
}

function extraerDiasHorario(horario = "") {
  const texto = normalizarTexto(horario);
  const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  return new Set(dias.filter((dia) => texto.includes(dia)));
}

function limpiarTexto(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ");
}

export async function obtenerProgramasCoordinacion() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/programas");
    if (!res.success) throw new Error(res.message || "Error al obtener programas");
    return res.data.map(adaptarPrograma).map((programa) => {
      const cupos = Number(programa.cupos || 0);
      const cuposOcupados = Number(programa.cuposOcupados || 0);
      const cuposDisponibles = Math.max(0, cupos - cuposOcupados);
      const duracionAvisoDias = normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7);
      const ventanaInscripcion = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), duracionAvisoDias);
      const requiereGradoCompatible = !programa.invitacionMasiva && (
        Array.isArray(programa.horariosPorGrupo) && programa.horariosPorGrupo.length > 0 ||
        (Array.isArray(programa.gradosAplicables) && programa.gradosAplicables.length > 0)
      );

      return {
        ...programa,
        requiereGradoCompatible,
        registrable: Boolean(programa.invitacionMasiva) && programa.estado === "Habilitado" && cuposDisponibles > 0 && ventanaInscripcion.permitida,
      };
    });
  }

  await delay(300);
  await syncApiDb();
  return apiDb.programas.map((programa) => {
    const cupos = Number(programa.cupos || 0);
    const cuposOcupados = Number(programa.cuposOcupados || 0);
    const cuposDisponibles = Math.max(0, cupos - cuposOcupados);
    const duracionAvisoDias = normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7);
    const ventanaInscripcion = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), duracionAvisoDias);
    const requiereGradoCompatible = !programa.invitacionMasiva && (
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
      requiereGradoCompatible,
      periodo: normalizarPeriodoTexto(programa.periodo),
      estado: programa.estado || "Habilitado",
      cupos,
      cuposOcupados,
      cuposDisponibles,
      costo: Number(programa.costo || 0),
      responsable: programa.responsable || programa.docente || "Por definir",
      anuncioImagen: programa.anuncioImagen || "",
      anuncioImagenNombre: programa.anuncioImagenNombre || "",
      fechaInicio: programa.fechaInicio || "",
      fechaFin: programa.fechaFin || "",
      cicloI: programa.cicloI || "",
      cicloII: programa.cicloII || "",
      duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
      duracionAvisoDias,
      ventanaInscripcion,
      registrable: Boolean(programa.invitacionMasiva) && programa.estado === "Habilitado" && cuposDisponibles > 0 && ventanaInscripcion.permitida,
    };
  });
}
