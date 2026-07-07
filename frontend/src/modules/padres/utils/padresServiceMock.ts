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
  limpiarTexto,
  normalizarPeriodoTexto,
  programaDisponibleParaGrado,
  programaVisibleEnPortalPadres,
  resolverHorarioPorGrado,
  resolverDocentePorGrado,
  tieneHorariosPorGrupo,
} from "../services/padresServiceUtils";
import { calcularCuposDisponibles } from "../../secretaria/services/secretariaServiceUtils";
import {
  generarPagoIdPadres,
  obtenerInvitaciones,
  obtenerInscripciones,
  obtenerPagos,
  obtenerDocumentos,
  encontrarPagoActivoPadres,
  validarCruceHorarioPadres,
} from "./padresServiceMockHelpers";

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenerResumenPadreMock(dni: string) {
  await delay();
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = (apiDb as any).estudiantes?.[dniLimpio] || null;

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

export async function guardarDatosApoderadoPadresMock(dni: string, datos: any) {
  await delay(300);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = (apiDb as any).estudiantes?.[dniLimpio];
  if (!estudiante) throw new Error("No se encontró información del estudiante.");

  estudiante.apoderado = limpiarTexto(datos.apoderado);
  estudiante.telefonoApoderado = limpiarTexto(datos.telefono);
  estudiante.correoApoderado = limpiarTexto(datos.correo);
  estudiante.enviarPdfCorreo = Boolean(datos.enviarPdfCorreo && estudiante.correoApoderado);

  (apiDb as any).inscripciones = ((apiDb as any).inscripciones || []).map((inscripcion: any) => {
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

export async function registrarInscripcionPadresMock(dni: string, programaId: string, payload: any) {
  await delay(450);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = (apiDb as any).estudiantes?.[dniLimpio];
  if (!estudiante) throw new Error("No se encontró el estudiante.");

  const programa = ((apiDb as any).programas || []).find((item: any) => item.id === programaId);
  if (!programa) throw new Error("El programa ya no existe.");

  if (!programa.invitacionMasiva) {
    const invitados = (apiDb as any).invitadosPorPrograma?.[programaId] || [];
    const esInvitado = invitados.some((item: any) => item.dni === dniLimpio);
    if (!esInvitado) {
      throw new Error("No está en la lista de invitados para este programa.");
    }
  }

  const registradas = ((apiDb as any).inscripciones || []).filter(
    (item: any) => item.dniEstudiante === dniLimpio && item.estadoInscripcion !== "Anulada"
  );
  const yaInscrito = registradas.some((item: any) => item.programaId === programaId);
  if (yaInscrito) throw new Error("Ya está inscrito en este programa.");

  const horarioResuelto = resolverHorarioPorGrado(programa, estudiante.grado) || programa.horario;
  validarCruceHorarioPadres(dniLimpio, programaId, payload.periodo || programa.periodo, horarioResuelto);

  const id = `INS-${Date.now().toString().slice(-6)}`;
  const nuevaInscripcion = {
    id,
    dniEstudiante: dniLimpio,
    codigoEstudiante: estudiante.codigoEstudiante || "",
    nombresEstudiante: estudiante.nombres,
    gradoEstudiante: estudiante.grado,
    seccionEstudiante: estudiante.seccion,
    nivelEstudiante: estudiante.nivel,
    programaId,
    programa: programa.nombre,
    horario: horarioResuelto,
    fechaRegistro: fechaActualIso(),
    estadoInscripcion: "Pendiente de pago",
    estadoPago: "Pendiente",
    periodo: normalizarPeriodoTexto(payload.periodo || programa.periodo),
    costo: Number(programa.costo || 0),
    origenRegistro: "Portal padres",
    apoderado: estudiante.apoderado || "",
    telefono: estudiante.telefonoApoderado || "",
    correo: estudiante.correoApoderado || "",
    enviarPdfCorreo: estudiante.enviarPdfCorreo || false,
    concesionarios: programa.concesionarios || "",
    detalleAlmuerzo: programa.detalleAlmuerzo || "",
    detalleCosto: programa.detalleCosto || "",
    requisitos: programa.requisitos || "",
    modalidadCobro: programa.modalidadCobro || "No definido",
    duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programmeFechaFin(programa)),
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programmeFechaFin(programa),
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    plantilla: programa.plantilla || "",
    plantillaValidada: Boolean(programa.plantillaValidada),
    plantillaVariables: programa.plantillaVariables || [],
    seleccion: payload.seleccion || "",
    nivelCambridge: payload.nivelCambridge || "",
  };

  if (!Array.isArray((apiDb as any).inscripciones)) (apiDb as any).inscripciones = [];
  (apiDb as any).inscripciones.push(nuevaInscripcion);

  estudiante.estadoInscripcion = nuevaInscripcion.estadoInscripcion;
  await saveApiDb();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "padres" } }));
  }

  return nuevaInscripcion;
}

function programmeFechaFin(p: any) {
  return p.fechaFin || "";
}

export async function registrarPagoPadresMock(dni: string, inscripcionId: string, datosPago: any) {
  await delay(500);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const inscripcion = ((apiDb as any).inscripciones || []).find((item: any) => item.id === inscripcionId);
  if (!inscripcion) throw new Error("No se encontró la inscripción correspondiente.");

  const pagoActivo = encontrarPagoActivoPadres(inscripcion);
  if (pagoActivo) {
    throw new Error("Ya existe un pago en proceso o completado para esta inscripción.");
  }

  const id = generarPagoIdPadres();
  const nuevoPago = {
    id,
    inscripcionId,
    dniEstudiante: dniLimpio,
    nombresEstudiante: inscripcion.nombresEstudiante || "",
    programa: inscripcion.programa || "",
    programaId: inscripcion.programaId || "",
    periodo: normalizarPeriodoTexto(inscripcion.periodo),
    monto: Number(datosPago.monto || inscripcion.costo || 0),
    formaPago: datosPago.formaPago || "Yape",
    numeroOperacion: datosPago.numeroOperacion || "",
    telefonoOperacion: datosPago.telefonoOperacion || "",
    capturaPagoBase64: datosPago.capturaPagoBase64 || "",
    capturaPagoNombre: datosPago.capturaPagoNombre || "comprobante.jpg",
    estado: "Por Verificar",
    fecha: fechaActualIso(),
    fechaPago: fechaActualIso(),
    origenRegistro: "Portal padres",
    observaciones: "Pago enviado desde el portal por el apoderado.",
    createdAt: fechaActualIso(),
  };

  if (!Array.isArray((apiDb as any).pagos)) (apiDb as any).pagos = [];
  (apiDb as any).pagos.push(nuevoPago);

  inscripcion.estadoPago = "Pendiente de validación";
  inscripcion.estadoInscripcion = "Pago por verificar";
  inscripcion.pagoId = id;
  inscripcion.pagoReferencia = nuevoPago.numeroOperacion;
  inscripcion.pagoTelefono = nuevoPago.telefonoOperacion;
  inscripcion.pagoCapturaNombre = nuevoPago.capturaPagoNombre;

  const estudiante = (apiDb as any).estudiantes?.[dniLimpio];
  if (estudiante) {
    estudiante.estadoInscripcion = inscripcion.estadoInscripcion;
  }

  await saveApiDb();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "padres" } }));
  }

  return nuevoPago;
}

export async function registrarPagoVerificacionPadresMock(dni: string, inscripcionId: string, datosPago: any) {
  return registrarPagoPadresMock(dni, inscripcionId, datosPago);
}

export async function reservarCupoCajaPadresMock(dni: string, programaId: string, payload: any) {
  await delay(450);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = (apiDb as any).estudiantes?.[dniLimpio];
  if (!estudiante) throw new Error("No se encontró el estudiante.");

  const programa = ((apiDb as any).programas || []).find((item: any) => item.id === programaId);
  if (!programa) throw new Error("El programa ya no existe.");

  const registradas = ((apiDb as any).inscripciones || []).filter(
    (item: any) => item.dniEstudiante === dniLimpio && item.estadoInscripcion !== "Anulada"
  );
  const yaInscrito = registradas.some((item: any) => item.programaId === programaId);
  if (yaInscrito) throw new Error("Ya está inscrito en este programa o reservó vacante.");

  const cuposDisponibles = calcularCuposDisponibles(programa);
  if (cuposDisponibles <= 0) {
    throw new Error("No quedan vacantes disponibles en este taller.");
  }

  const horarioResuelto = resolverHorarioPorGrado(programa, estudiante.grado) || programa.horario;
  validarCruceHorarioPadres(dniLimpio, programaId, payload.periodo || programa.periodo, horarioResuelto);

  const id = `INS-${Date.now().toString().slice(-6)}`;
  const nuevaInscripcion = {
    id,
    dniEstudiante: dniLimpio,
    codigoEstudiante: estudiante.codigoEstudiante || "",
    nombresEstudiante: estudiante.nombres,
    gradoEstudiante: estudiante.grado,
    seccionEstudiante: estudiante.seccion,
    nivelEstudiante: estudiante.nivel,
    programaId,
    programa: programa.nombre,
    horario: horarioResuelto,
    fechaRegistro: fechaActualIso(),
    estadoInscripcion: "Reserva vacante",
    estadoPago: "Pendiente",
    periodo: normalizarPeriodoTexto(payload.periodo || programa.periodo),
    costo: Number(programa.costo || 0),
    origenRegistro: "Portal padres",
    apoderado: estudiante.apoderado || "",
    telefono: estudiante.telefonoApoderado || "",
    correo: estudiante.correoApoderado || "",
    enviarPdfCorreo: estudiante.enviarPdfCorreo || false,
    concesionarios: programa.concesionarios || "",
    detalleAlmuerzo: programa.detalleAlmuerzo || "",
    detalleCosto: programa.detalleCosto || "",
    requisitos: programa.requisitos || "",
    modalidadCobro: programa.modalidadCobro || "No definido",
    duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programmeFechaFin(programa)),
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programmeFechaFin(programa),
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    plantilla: programa.plantilla || "",
    plantillaValidada: Boolean(programa.plantillaValidada),
    plantillaVariables: programa.plantillaVariables || [],
    derivadoCaja: true,
    estadoCaja: "reservado_caja",
  };

  if (!Array.isArray((apiDb as any).inscripciones)) (apiDb as any).inscripciones = [];
  (apiDb as any).inscripciones.push(nuevaInscripcion);
  programa.cuposOcupados = Number(programa.cuposOcupados || 0) + 1;
  estudiante.estadoInscripcion = nuevaInscripcion.estadoInscripcion;
  await saveApiDb();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "padres" } }));
  }

  return nuevaInscripcion;
}

export async function obtenerProgramasCoordinacionMock(dni: string, periodo = "escolar") {
  await delay(400);
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const estudiante = (apiDb as any).estudiantes?.[dniLimpio];
  if (!estudiante) throw new Error("Estudiante no encontrado.");

  const gradoEstudiante = estudiante.grado || "";
  const periodoNormalizado = normalizarPeriodoTexto(periodo);
  const inscripciones = ((apiDb as any).inscripciones || []).filter(
    (item: any) => item.dniEstudiante === dniLimpio && item.estadoInscripcion !== "Anulada"
  );

  return ((apiDb as any).programas || [])
    .map(adaptarPrograma)
    .filter((programa: any) => {
      if (normalizarPeriodoTexto(programa.periodo) !== periodoNormalizado) return false;
      const cuposDisponibles = calcularCuposDisponibles(programa);
      const esCambridge = esProgramaCambridgePadres(programa);
      const yaInscrito = inscripciones.some((item: any) => item.programaId === programa.id);
      if (yaInscrito) return false;

      const ventanaInscripcion = obtenerVentanaInscripcion(
        programa.fechaInicio,
        new Date(),
        programa.duracionAvisoDias,
        programa.horaLimiteAviso,
        programa
      );
      const duracionAvisoDias = normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7);

      (programa as any).cuposDisponibles = cuposDisponibles;
      (programa as any).cupos = cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos";
      (programa as any).horario = resolverHorarioPorGrado(programa, gradoEstudiante) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || "Horario por confirmar";
      (programa as any).docente = resolverDocentePorGrado(programa, gradoEstudiante);
      (programa as any).costo = Number(programa.costo || 0);
      (programa as any).modalidadCobro = programa.modalidadCobro || "No definido";
      (programa as any).fechaInicio = programa.fechaInicio || "";
      (programa as any).fechaFin = programmeFechaFin(programa);
      (programa as any).cicloI = programa.cicloI || "";
      (programa as any).cicloII = programa.cicloII || "";
      (programa as any).duracionTaller = programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programmeFechaFin(programa));
      (programa as any).duracionAvisoDias = duracionAvisoDias;
      (programa as any).horaLimiteAviso = programa.horaLimiteAviso || "23:59";
      (programa as any).ventanaInscripcion = ventanaInscripcion;
      (programa as any).registrable = !esCambridge && programaVisibleEnPortalPadres(programa) && cuposDisponibles > 0;

      return true;
    });
}

export function obtenerProgramaPrincipalPadres(lista: any[]) {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  return obtenerProgramaPrincipalPadresRaw(lista);
}

function obtenerProgramaPrincipalPadresRaw(lista: any[]) {
  const normales = lista.filter((item: any) => !esProgramaCambridgePadres(item));
  if (normales.length > 0) return normales[0];
  return lista[0] || null;
}
