import { apiDb, nextApiId, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { buscarInvitacionPorDniPeriodo } from "../../coordinacion/services/coordinacionService";
import {
  listarProgramasMock,
  obtenerProgramaMock,
} from "../../coordinacion/utils/coordinacionServiceMock";
import {
  calcularDuracionTexto,
  fechaActualIso,
  normalizarDuracionAvisoDias,
} from "../../../services/dateService";
import {
  calcularCuposDisponibles,
  claveAlumno,
  clavesAlumnoInscripcion,
  normalizarEstadoPagoSecretaria,
  normalizarPeriodo,
  normalizarTexto,
  programaDisponibleParaEdad,
  programaDisponibleParaGrado,
  resolverDocentePorGrado,
  resolverHorarioPorGrado,
  tieneHorariosPorGrupo,
  obtenerDatosCambridgeSeguros,
} from "../services/secretariaServiceUtils";
import {
  obtenerGradoCompleto,
  obtenerEstadoInscripcionPorPeriodo,
  obtenerEstadoPagoPorPeriodo,
  buscarInvitacionEnMemoria,
  obtenerPlantillaProgramaLocal,
  adaptarInvitadoComoEstudiante,
  adaptarEstudianteBase,
  finalizarProgramasVencidos,
  validarVentanaInscripcionRegular,
  validarCruceHorarioAlumno,
  encontrarPagoActivoInscripcion,
  sincronizarInscripcionConProgramaActual,
  adaptarProgramaCoordinacion,
} from "./secretariaServiceMockHelpers";

export { finalizarProgramasVencidos };

const esperar = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export async function buscarEstudiantePorDniMock(dni: string, periodo = "escolar") {
  await esperar(350);
  await syncApiDb();
  const periodoNormalizado = normalizarPeriodo(periodo);
  const estudiante = (apiDb as any).estudiantes?.[dni];
  const invitacionPeriodo = await buscarInvitacionPorDniPeriodo(dni, periodoNormalizado);

  if (!estudiante && invitacionPeriodo) {
    return adaptarInvitadoComoEstudiante(invitacionPeriodo, periodoNormalizado);
  }

  if (!estudiante) return null;

  if (invitacionPeriodo) {
    return adaptarEstudianteBase(estudiante, periodoNormalizado, invitacionPeriodo);
  }

  const gradoCompleto = obtenerGradoCompleto(estudiante.grado, estudiante.nivel);
  return {
    ...estudiante,
    grado: gradoCompleto,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(dni, periodoNormalizado),
    origenRegistro: "Base general de estudiantes",
    tipoAlumno: periodoNormalizado === "verano" ? "Alumno interno" : estudiante.tipoAlumno,
    tieneInvitacion: false,
    programaAsignado: "",
    requiereUniforme: false,
    requiereIndumentaria: false,
  };
}

export async function buscarEstudiantesPorNombreMock(nombre: string, periodo = "escolar") {
  await esperar(350);
  await syncApiDb();
  const periodoNormalizado = normalizarPeriodo(periodo);
  const termino = normalizarTexto(nombre);
  if (termino.length < 3) return [];

  const resultados: any[] = [];
  const vistos = new Set();

  Object.values((apiDb as any).estudiantes || {}).forEach((estudiante: any) => {
    const textoBusqueda = normalizarTexto(`${estudiante.nombres} ${estudiante.codigoEstudiante || ""}`);
    if (!textoBusqueda.includes(termino)) return;

    vistos.add(claveAlumno(estudiante));
    const invitacion = buscarInvitacionEnMemoria(estudiante.dni, periodoNormalizado, estudiante.grado);
    if (invitacion) {
      resultados.push(adaptarEstudianteBase(estudiante, periodoNormalizado, invitacion));
    } else {
      const gradoCompletoNombre = obtenerGradoCompleto(estudiante.grado, estudiante.nivel);
      resultados.push({
          ...estudiante,
          grado: gradoCompletoNombre,
          periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
          estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
          "estadoInscripción": obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
          estadoPago: obtenerEstadoPagoPorPeriodo(estudiante.dni, periodoNormalizado),
          origenRegistro: "Base general de estudiantes",
          tipoAlumno: periodoNormalizado === "verano" ? "Alumno interno" : estudiante.tipoAlumno,
          tieneInvitacion: false,
          programaAsignado: "",
          requiereUniforme: false,
          requiereIndumentaria: false,
        });
    }
  });

  if (periodoNormalizado !== "verano") {
    ((apiDb as any).programas || [])
      .filter((programa: any) => normalizarPeriodo(programa.periodo) === periodoNormalizado)
      .forEach((programa: any) => {
        ((apiDb as any).invitadosPorPrograma?.[programa.id] || []).forEach((invitado: any) => {
          const clave = claveAlumno(invitado);
          if (vistos.has(clave)) return;

          const textoBusqueda = normalizarTexto(`${invitado.nombres} ${invitado.codigoEstudiante || ""}`);
          if (!textoBusqueda.includes(termino)) return;

          vistos.add(clave);
          resultados.push(adaptarInvitadoComoEstudiante({
            programaId: programa.id,
            programa,
            invitado,
          }, periodoNormalizado));
        });
      });
  }

  return resultados.slice(0, 8);
}

export async function listarProgramasPorPeriodoMock(periodo: string, gradoAlumno = "", edadAlumno = "") {
  const programas = await listarProgramasMock();
  const periodoNormalizado = normalizarPeriodo(periodo);
  return programas
    .filter((programa) =>
      normalizarPeriodo(programa.periodo) === periodoNormalizado &&
      programa.estado === "Habilitado" &&
      Number(programa.cuposDisponibles ?? 0) > 0 &&
      (periodoNormalizado === "verano"
        ? programaDisponibleParaEdad(programa, edadAlumno)
        : (!gradoAlumno || programaDisponibleParaGrado(programa, gradoAlumno)))
    )
    .map((programa) => adaptarProgramaCoordinacion(programa, gradoAlumno));
}

export async function obtenerProgramaPorIdMock(programaId: string, periodo: string) {
  const programa = await obtenerProgramaMock(programaId);
  if (!programa) return null;
  if (normalizarPeriodo(programa.periodo) !== normalizarPeriodo(periodo)) return null;
  return adaptarProgramaCoordinacion(programa);
}

export async function registrarInscripcionMock(payload: any) {
  await esperar(500);
  await syncApiDb();
  finalizarProgramasVencidos();

  const periodoPayload = normalizarPeriodo(payload.periodo);
  if (payload.esExterno && periodoPayload !== "verano") {
    throw new Error("El alumno externo solo puede registrarse en ciclo verano.");
  }

  const programa = ((apiDb as any).programas || []).find((item: any) => item.id === payload.programaId);
  if (!programa) throw new Error("El programa ya no existe. Coordinación debe revisarlo.");
  if (programa.estado !== "Habilitado") {
    throw new Error("No se puede registrar la inscripción porque el programa no está habilitado.");
  }
  if (Number(programa.cuposOcupados || 0) >= Number(programa.cupos || 0)) {
    throw new Error("No se puede registrar la inscripción porque el programa no tiene cupos disponibles.");
  }
  validarVentanaInscripcionRegular(programa, payload);
  const horarioResuelto = resolverHorarioPorGrado(programa, payload.gradoEstudiante);
  if (periodoPayload === "verano") {
    const edadRegistro = Number(payload.edadEstudiante || payload.edadAlumno);
    const tieneRangoEdad = Number(programa.edadMinima || 0) > 0 || Number(programa.edadMaxima || 0) > 0;
    if (tieneRangoEdad && (!Number.isFinite(edadRegistro) || edadRegistro <= 0)) {
      throw new Error("Ingrese la edad del alumno para validar el programa de verano.");
    }
    if (!programaDisponibleParaEdad(programa, String(edadRegistro))) {
      throw new Error("El programa no esta disponible para la edad del alumno. Coordinación Académica debe revisar el rango de edades.");
    }
  }
  if (periodoPayload !== "verano" && !programaDisponibleParaGrado(programa, payload.gradoEstudiante)) {
    throw new Error("El programa no esta disponible para el grado del alumno. Coordinación Académica debe revisar los grados habilitados.");
  }

  const clavesPayload = clavesAlumnoInscripcion(payload);
  const duplicada = ((apiDb as any).inscripciones || []).some((item: any) =>
    item.programaId === payload.programaId &&
    item.estadoInscripcion !== "Anulada" &&
    clavesAlumnoInscripcion(item).some((clave) => clavesPayload.includes(clave))
  );

  if (duplicada) throw new Error("El alumno ya tiene una inscripción registrada en este programa.");

  if (!programa.invitacionMasiva) {
    validarCruceHorarioAlumno(payload, horarioResuelto || programa.horario);
  }

  const datosCambridge = obtenerDatosCambridgeSeguros(programa, payload);
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);
  const registro = {
    id: `INS-${Date.now().toString().slice(-6)}`,
    estadoInscripcion: "Pendiente de pago",
    estadoPago: "Pendiente",
    fechaRegistro: fechaActualIso(),
    ...payload,
    programa: programa.nombre,
    horario: horarioResuelto || programa.horario,
    docente: resolverDocentePorGrado(programa, payload.gradoEstudiante),
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
    grupo: programa.grupo || "",
    grupoEtario: programa.grupoEtario || programa.grupo || "",
    requisitos: programa.requisitos || "",
    plantilla: plantillaPrograma.plantilla,
    plantillaBase64: plantillaPrograma.plantillaBase64,
    plantillaVariables: plantillaPrograma.plantillaVariables,
    plantillaValidada: plantillaPrograma.plantillaValidada,
    seleccion: datosCambridge.seleccion,
    nivelCambridge: datosCambridge.nivelCambridge,
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    tipoComunicado: programa.tipoComunicado || "Otro genérico",
    tipoDocumento: programa.tipoDocumento || "Comunicado",
    numeroDocumento: programa.numeroDocumento || "",
    areaTematica: programa.areaTematica || "No aplica",
    motivoJustificacion: programa.motivoJustificacion || programa.comunicado || "",
    nombreCiclo: programa.nombreCiclo || "Ciclo I",
    duracion: programa.duracion || programa.duracionTaller || "",
    tablaHorariosNivel: programa.tablaHorariosNivel || [],
    incluyeAlmuerzo: Boolean(programa.incluyeAlmuerzo),
    horarioRecepcionAlmuerzo: programa.horarioRecepcionAlmuerzo || "",
    modalidadesCambridge: programa.modalidadesCambridge || [],
    costoCiclo: programa.costoCiclo || (programa.costo ? String(programa.costo) : ""),
    montoPrimerPago: programa.montoPrimerPago || "",
    comunicado: programmeComunicado(programa),
    comunicadoCompleto: programmeComunicadoCompleto(programa),
  };

  if (!Array.isArray((apiDb as any).inscripciones)) (apiDb as any).inscripciones = [];
  (apiDb as any).inscripciones.push(registro);
  programa.cuposOcupados = Number(programa.cuposOcupados || 0) + 1;

  if (payload.esNuevoVerano) {
    if (!(apiDb as any).estudiantes) (apiDb as any).estudiantes = {};
    (apiDb as any).estudiantes[payload.dniEstudiante] = {
      ...((apiDb as any).estudiantes[payload.dniEstudiante] || {}),
      dni: payload.dniEstudiante,
      codigoEstudiante: payload.codigoEstudiante || `EXT-${payload.dniEstudiante}`,
      nombres: payload.nombresEstudiante,
      close: false,
      edad: payload.edadEstudiante || "",
      domicilio: payload.domicilioEstudiante || "",
      sexo: payload.sexoEstudiante || payload.sexo || "",
      grado: payload.gradoEstudiante || "",
      seccion: payload.seccionEstudiante || "",
      tipoAlumno: payload.tipoAlumno || "Alumno externo",
      fechaNacimiento: payload.fechaNacimiento || "",
      estadoInscripcion: registro.estadoInscripcion,
      apoderado: payload.apoderado,
      telefonoApoderado: payload.telefono,
      correoApoderado: payload.correo || "",
      medioEnvio: payload.medioEnvio || "Impreso",
      colegioProcedencia: payload.colegioProcedencia || "",
      periodo: "Ciclo verano",
      origenRegistro: "Asistente - alumno externo verano",
    };
  }

  const estudiante = (apiDb as any).estudiantes?.[payload.dniEstudiante];
  if (estudiante) {
    estudiante.apoderado = payload.apoderado;
    estudiante.telefonoApoderado = payload.telefono;
    estudiante.estadoInscripcion = registro.estadoInscripcion;
  }

  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "secretaria" } }));
  return registro;
}

function programmeComunicado(p: any) {
  return p.comunicado || "";
}

function programmeComunicadoCompleto(p: any) {
  return p.comunicadoCompleto || "";
}

export async function registrarDocumentoGeneradoMock({
  estudiante,
  inscripcion,
  usuario = "Secretaría",
  tipoDocumento = "Comunicado personalizado",
}: any) {
  await esperar(250);
  await syncApiDb();

  const documento = {
    id: `DOC-${String(nextApiId("nextDocumentoId")).padStart(3, "0")}`,
    alumno: inscripcion.nombresEstudiante || estudiante?.nombres || "",
    dniEstudiante: inscripcion.dniEstudiante || estudiante?.dni || "",
    programa: inscripcion.programa,
    programaId: inscripcion.programaId,
    fecha: fechaActualIso(),
    usuario,
    tipoDocumento,
    plantilla: inscripcion.plantilla || "",
  };

  if (!Array.isArray((apiDb as any).documentosGenerados)) (apiDb as any).documentosGenerados = [];
  (apiDb as any).documentosGenerados.unshift(documento);
  const registro = ((apiDb as any).inscripciones || []).find((item: any) => item.id === inscripcion.id);
  if (registro) {
    registro.documentoGenerado = true;
    registro.ultimoDocumentoGeneradoId = documento.id;
    registro.ultimoDocumentoGeneradoEn = documento.fecha;
  }
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "secretaria" } }));
  return documento;
}

export async function derivarInscripcionCajaMock(inscripcionId: string, datos: any = {}) {
  await esperar(250);
  await syncApiDb();

  const inscripcion = ((apiDb as any).inscripciones || []).find((item: any) => item.id === inscripcionId);
  if (!inscripcion) {
    throw new Error("No se encontro la inscripcion para derivar a Cajera.");
  }
  if (inscripcion.derivadoCaja) {
    throw new Error("Esta inscripcion ya fue derivada a Cajera. Para cobrar otro taller, registre una nueva inscripcion.");
  }
  const pagoActivo = encontrarPagoActivoInscripcion(inscripcion);
  if (pagoActivo) {
    const estado = normalizarEstadoPagoSecretaria([
      pagoActivo.estado,
      pagoActivo.estadoPago,
      pagoActivo.estadoVerificacion,
      inscripcion.estadoPago,
      inscripcion.estadoInscripcion,
    ].join(" "));
    if (estado.includes("pag") || estado.includes("completado") || estado.includes("validado")) {
      throw new Error("Esta inscripcion ya tiene un pago web aprobado. No se puede derivar ni cobrar nuevamente.");
    }
    throw new Error("El padre ya envio un pago web para esta inscripcion. Cajera debe validarlo u observarlo, no crear otro cobro.");
  }

  const actualizada = {
    ...inscripcion,
    ...datos,
    derivadoCaja: true,
    estadoCaja: "Derivado a Cajera",
    estadoInscripcion: inscripcion.estadoPago === "Pagado" ? "Pago validado" : "Derivado a Cajera",
    fechaDerivacionCaja: fechaActualIso(),
  };

  Object.assign(inscripcion, actualizada);

  const estudiante = (apiDb as any).estudiantes?.[inscripcion.dniEstudiante || datos.dniEstudiante];
  if (estudiante) {
    estudiante.estadoInscripcion = inscripcion.estadoInscripcion;
    estudiante.estadoCaja = inscripcion.estadoCaja;
  }

  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "secretaria" } }));
  return actualizada;
}

export async function buscarInscripcionEstudianteMock(estudiante: any, periodo = "escolar") {
  await esperar(200);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const clavesEstudiante = clavesAlumnoInscripcion(estudiante);
  if (!clavesEstudiante.length) return null;

  const inscripciones = [...((apiDb as any).inscripciones || [])]
    .reverse()
    .filter((item: any) =>
      item.estadoInscripcion !== "Anulada" &&
      normalizarPeriodo(item.periodo) === periodoNormalizado &&
      clavesAlumnoInscripcion(item).some((clave) => clavesEstudiante.includes(clave))
    );

  const isPaid = (item: any) => ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(est => String(item.estadoPago || "").toLowerCase().includes(est) || String(item.estadoInscripcion || "").toLowerCase().includes(est));
  const pendiente = inscripciones.find((item) => !isPaid(item));
  const inscripcion = pendiente || inscripciones.find((item) => item.programaId === estudiante?.programaAsignado) || inscripciones[0] || null;
  return sincronizarInscripcionConProgramaActual(inscripcion);
}

export async function listarInscripcionesEstudianteMock(estudiante: any, periodo = "escolar") {
  await esperar(160);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const clavesEstudiante = clavesAlumnoInscripcion(estudiante);
  if (!clavesEstudiante.length) return [];

  return [...((apiDb as any).inscripciones || [])]
    .reverse()
    .filter((item: any) =>
      item.estadoInscripcion !== "Anulada" &&
      normalizarPeriodo(item.periodo) === periodoNormalizado &&
      clavesAlumnoInscripcion(item).some((clave) => clavesEstudiante.includes(clave))
    )
    .map((item) => sincronizarInscripcionConProgramaActual(item) || item);
}
