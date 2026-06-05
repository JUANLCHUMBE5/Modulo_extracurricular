import { apiDb, nextApiId, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { isApiMode, apiClient } from "../../../services/apiClient";
import {
  adaptarEstudiante,
  adaptarInscripcion,
  adaptarPago,
  adaptarPrograma,
  adaptarAsistencia,
} from "../../../services/adapters";
import {
  buscarInvitacionPorDniPeriodo,
  listarProgramas,
  obtenerPrograma,
} from "../../coordinacion/services/coordinacionService";
import {
  calcularDuracionTexto,
  fechaActualInput,
  fechaActualIso,
  normalizarDuracionAvisoDias,
  normalizarFecha,
  obtenerVentanaInscripcion,
} from "../../../services/dateService";

export async function buscarEstudiantePorDni(dni, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes/${dni}`, {
      params: { periodo }
    });
    if (!res.success) return null;
    return res.data ? adaptarEstudiante(res.data) : null;
  }

  await esperar(350);
  await syncApiDb();
  const periodoNormalizado = normalizarPeriodo(periodo);
  const estudiante = apiDb.estudiantes[dni];
  const invitacionPeriodo = periodoNormalizado === "verano"
    ? null
    : await buscarInvitacionPorDniPeriodo(dni, periodoNormalizado);

  if (!estudiante && invitacionPeriodo) {
    return adaptarInvitadoComoEstudiante(invitacionPeriodo, periodoNormalizado);
  }

  if (!estudiante) return null;

  if (invitacionPeriodo) {
    return adaptarEstudianteBase(estudiante, periodoNormalizado, invitacionPeriodo);
  }

  return {
    ...estudiante,
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

export async function buscarEstudiantesPorNombre(nombre, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes`, {
      params: { nombre, periodo }
    });
    if (!res.success || !Array.isArray(res.data)) return [];
    return res.data.map(adaptarEstudiante);
  }

  await esperar(350);
  await syncApiDb();
  const periodoNormalizado = normalizarPeriodo(periodo);
  const termino = normalizarTexto(nombre);
  if (termino.length < 3) return [];

  const resultados = [];
  const vistos = new Set();

  Object.values(apiDb.estudiantes).forEach((estudiante) => {
    const textoBusqueda = normalizarTexto(`${estudiante.nombres} ${estudiante.codigoEstudiante || ""}`);
    if (!textoBusqueda.includes(termino)) return;

    vistos.add(claveAlumno(estudiante));
    const invitacion = periodoNormalizado === "verano"
      ? null
      : buscarInvitacionEnMemoria(estudiante.dni, periodoNormalizado, estudiante.grado);
    resultados.push(invitacion
      ? adaptarEstudianteBase(estudiante, periodoNormalizado, invitacion)
      : {
          ...estudiante,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
    estadoInscripción: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
          estadoPago: obtenerEstadoPagoPorPeriodo(estudiante.dni, periodoNormalizado),
          origenRegistro: "Base general de estudiantes",
          tipoAlumno: periodoNormalizado === "verano" ? "Alumno interno" : estudiante.tipoAlumno,
          tieneInvitacion: false,
          programaAsignado: "",
          requiereUniforme: false,
          requiereIndumentaria: false,
        });
  });

  if (periodoNormalizado !== "verano") {
    apiDb.programas
      .filter((programa) => normalizarPeriodo(programa.periodo) === periodoNormalizado)
      .forEach((programa) => {
        (apiDb.invitadosPorPrograma[programa.id] || []).forEach((invitado) => {
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

export async function listarProgramasPorPeriodo(periodo, gradoAlumno = "", edadAlumno = "") {
  const programas = await listarProgramas();
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

export async function obtenerProgramaPorId(programaId, periodo) {
  const programa = await obtenerPrograma(programaId);
  if (normalizarPeriodo(programa.periodo) !== normalizarPeriodo(periodo)) return null;
  return adaptarProgramaCoordinacion(programa);
}

export async function registrarInscripcion(payload) {
  if (isApiMode()) {
    const apiPayload = {
      estudiante_id: payload.dniEstudiante,
      programa_id: payload.programaId,
      origen_inscripcion: "presencial",
      usuario_registro: payload.usuarioRegistro || "Secretaria",
      seccion: payload.seccionEstudiante || payload.seccion || "",
      grado: payload.gradoEstudiante || payload.grado || "",
      apoderado: payload.apoderado || "",
      telefono_apoderado: payload.telefono || "",
      correo_apoderado: payload.correo || "",
      talla_uniforme: payload.tallaUniforme || "",
      talla_polo: payload.tallaPolo || "",
      talla_short: payload.tallaShort || "",
      seleccion: payload.seleccion || "",
      nivel_cambridge: payload.nivelCambridge || ""
    };
    const res = await apiClient.post("/api/v1/extracurricular/inscripciones", apiPayload);
    if (!res.success) throw new Error(res.message || "Error al registrar inscripción");
    return adaptarInscripcion(res.data);
  }

  await esperar(500);
  await syncApiDb();
  finalizarProgramasVencidos();

  const periodoPayload = normalizarPeriodo(payload.periodo);
  if (payload.esExterno && periodoPayload !== "verano") {
    throw new Error("El alumno externo solo puede registrarse en ciclo verano.");
  }

  const programa = apiDb.programas.find((item) => item.id === payload.programaId);
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
    if (!programaDisponibleParaEdad(programa, edadRegistro)) {
      throw new Error("El programa no esta disponible para la edad del alumno. Coordinacion debe revisar el rango de edades.");
    }
  }
  if (periodoPayload !== "verano" && !programaDisponibleParaGrado(programa, payload.gradoEstudiante)) {
    throw new Error("El programa no esta disponible para el grado del alumno. Coordinacion debe revisar los grados habilitados.");
  }

  const clavesPayload = clavesAlumnoInscripcion(payload);
  const duplicada = apiDb.inscripciones.some((item) =>
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
  };

  apiDb.inscripciones.push(registro);
  programa.cuposOcupados = Number(programa.cuposOcupados || 0) + 1;

  if (payload.esNuevoVerano) {
    apiDb.estudiantes[payload.dniEstudiante] = {
      ...(apiDb.estudiantes[payload.dniEstudiante] || {}),
      dni: payload.dniEstudiante,
      codigoEstudiante: payload.codigoEstudiante || `EXT-${payload.dniEstudiante}`,
      nombres: payload.nombresEstudiante,
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
      origenRegistro: "Secretaria - alumno externo verano",
    };
  }

  const estudiante = apiDb.estudiantes[payload.dniEstudiante];
  if (estudiante) {
    estudiante.apoderado = payload.apoderado;
    estudiante.telefonoApoderado = payload.telefono;
    estudiante.estadoInscripcion = registro.estadoInscripcion;
  }

  await saveApiDb();
  return registro;
}

export async function registrarDocumentoGenerado({
  estudiante,
  inscripcion,
  usuario = "Secretaría",
  tipoDocumento = "Comunicado personalizado",
}) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/inscripciones/${inscripcion.id}/documento`, {
      estudiante_id: estudiante?.id || estudiante?.dni || inscripcion.dniEstudiante,
      usuario,
      tipo_documento: tipoDocumento,
      plantilla: inscripcion.plantilla || ""
    });
    if (!res.success) throw new Error(res.message || "Error al registrar documento");
    return res.data;
  }

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

  apiDb.documentosGenerados.unshift(documento);
  const registro = apiDb.inscripciones.find((item) => item.id === inscripcion.id);
  if (registro) {
    registro.documentoGenerado = true;
    registro.ultimoDocumentoGeneradoId = documento.id;
    registro.ultimoDocumentoGeneradoEn = documento.fecha;
  }
  await saveApiDb();
  return documento;
}

export async function derivarInscripcionCaja(inscripcionId, datos = {}) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/inscripciones/${inscripcionId}/derivar-caja`, datos);
    if (!res.success) throw new Error(res.message || "Error al derivar inscripción a Caja");
    return adaptarInscripcion(res.data);
  }

  await esperar(250);
  await syncApiDb();

  const inscripcion = apiDb.inscripciones.find((item) => item.id === inscripcionId);
  if (!inscripcion) {
    throw new Error("No se encontro la inscripcion para derivar a Caja.");
  }
  if (inscripcion.derivadoCaja) {
    throw new Error("Esta inscripcion ya fue derivada a Caja. Para cobrar otro taller, registre una nueva inscripcion.");
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
    throw new Error("El padre ya envio un pago web para esta inscripcion. Caja debe validarlo u observarlo, no crear otro cobro.");
  }

  const actualizada = {
    ...inscripcion,
    ...datos,
    derivadoCaja: true,
    estadoCaja: "Derivado a Caja",
    estadoInscripcion: inscripcion.estadoPago === "Pagado" ? "Pago validado" : "Derivado a Caja",
    fechaDerivacionCaja: fechaActualIso(),
  };

  Object.assign(inscripcion, actualizada);

  const estudiante = apiDb.estudiantes[inscripcion.dniEstudiante || datos.dniEstudiante];
  if (estudiante) {
    estudiante.estadoInscripcion = inscripcion.estadoInscripcion;
    estudiante.estadoCaja = inscripcion.estadoCaja;
  }

  await saveApiDb();
  return actualizada;
}

export async function buscarInscripcionEstudiante(estudiante, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/inscripciones/buscar`, {
      params: { dni: estudiante?.dni || estudiante?.dniEstudiante, periodo }
    });
    if (!res.success || !res.data) return null;
    return adaptarInscripcion(res.data);
  }

  await esperar(200);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const clavesEstudiante = clavesAlumnoInscripcion(estudiante);
  if (!clavesEstudiante.length) return null;

  const inscripciones = [...apiDb.inscripciones]
    .reverse()
    .filter((item) =>
    item.estadoInscripcion !== "Anulada" &&
      normalizarPeriodo(item.periodo) === periodoNormalizado &&
      clavesAlumnoInscripcion(item).some((clave) => clavesEstudiante.includes(clave))
    );

  const pendienteCaja = inscripciones.find((item) =>
    !item.derivadoCaja &&
    normalizarEstadoPagoSecretaria(item.estadoPago) !== "pagado"
  );
  const inscripcion = pendienteCaja || inscripciones.find((item) => item.programaId === estudiante?.programaAsignado) || inscripciones[0] || null;
  return sincronizarInscripcionConProgramaActual(inscripcion);
}

export async function listarInscripcionesEstudiante(estudiante, periodo = "escolar") {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/inscripciones`, {
      params: { dni: estudiante?.dni || estudiante?.dniEstudiante, periodo }
    });
    if (!res.success || !Array.isArray(res.data)) return [];
    return res.data.map(adaptarInscripcion);
  }

  await esperar(160);
  await syncApiDb();

  const periodoNormalizado = normalizarPeriodo(periodo);
  const clavesEstudiante = clavesAlumnoInscripcion(estudiante);
  if (!clavesEstudiante.length) return [];

  return [...apiDb.inscripciones]
    .reverse()
    .filter((item) =>
      item.estadoInscripcion !== "Anulada" &&
      normalizarPeriodo(item.periodo) === periodoNormalizado &&
      clavesAlumnoInscripcion(item).some((clave) => clavesEstudiante.includes(clave))
    )
    .map((item) => sincronizarInscripcionConProgramaActual(item) || item);
}

function esperar(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sincronizarInscripcionConProgramaActual(inscripcion) {
  if (!inscripcion) return null;

  const programa = apiDb.programas.find((item) =>
    item.id === inscripcion.programaId ||
    normalizarTexto(item.nombre) === normalizarTexto(inscripcion.programa)
  );
  if (!programa) {
    const plantillaInscripcion = obtenerPlantillaProgramaLocal(null, inscripcion?.programaId);
    return {
      ...inscripcion,
      plantilla: plantillaInscripcion.plantilla || inscripcion.plantilla || "",
      plantillaBase64: obtenerPlantillaBase64(inscripcion, null),
      plantillaVariables: obtenerPlantillaVariables(inscripcion, null),
      plantillaValidada: Boolean(plantillaInscripcion.plantillaValidada || inscripcion.plantillaValidada),
    };
  }
  if (!programaDisponibleParaGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado)) return null;
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);

  return {
    ...inscripcion,
    programa: programa.nombre || inscripcion.programa,
    horario: resolverHorarioPorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario) || inscripcion.horario,
    docente: resolverDocentePorGrado(programa, inscripcion.gradoEstudiante || inscripcion.grado) || inscripcion.docente || "No definido",
    costo: Number(programa.costo ?? inscripcion.costo ?? 0),
    modalidadCobro: programa.modalidadCobro || inscripcion.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || inscripcion.fechaInicio || "",
    fechaFin: programa.fechaFin || inscripcion.fechaFin || "",
    cicloI: programa.cicloI || inscripcion.cicloI || "",
    cicloII: programa.cicloII || inscripcion.cicloII || "",
    duracionTaller: programa.duracionTaller || inscripcion.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias || inscripcion.duracionAvisoDias, 7),
    gradosAplicables: programa.gradosAplicables || inscripcion.gradosAplicables || [],
    horariosPorGrupo: programa.horariosPorGrupo || inscripcion.horariosPorGrupo || [],
    grupo: programa.grupo || inscripcion.grupo || "",
    grupoEtario: programa.grupoEtario || inscripcion.grupoEtario || programa.grupo || "",
    requisitos: programa.requisitos || inscripcion.requisitos || "",
    plantilla: plantillaPrograma.plantilla || inscripcion.plantilla || "",
    plantillaBase64: obtenerPlantillaBase64(inscripcion, programa),
    plantillaVariables: obtenerPlantillaVariables(inscripcion, programa),
    plantillaValidada: Boolean(plantillaPrograma.plantillaValidada || inscripcion.plantillaValidada),
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
  };
}

function obtenerPlantillaBase64(inscripcion, programa) {
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa, programa?.id || inscripcion?.programaId);
  return plantillaPrograma.plantillaBase64 || inscripcion?.plantillaBase64 || "";
}

function obtenerPlantillaVariables(inscripcion, programa) {
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa, programa?.id || inscripcion?.programaId);
  return plantillaPrograma.plantillaVariables.length ? plantillaPrograma.plantillaVariables : (inscripcion?.plantillaVariables || []);
}

function obtenerPlantillaProgramaLocal(programa = null, programaId = "") {
  const id = programa?.id || programaId || "";
  const plantillaGuardada = apiDb.plantillasPorPrograma?.[id] || {};
  const variablesPrograma = Array.isArray(programa?.plantillaVariables) ? programa.plantillaVariables : [];
  const variablesGuardadas = Array.isArray(plantillaGuardada.plantillaVariables) ? plantillaGuardada.plantillaVariables : [];
  const plantillaBase64 = programa?.plantillaBase64 || plantillaGuardada.plantillaBase64 || "";

  return {
    plantilla: programa?.plantilla || plantillaGuardada.plantilla || "",
    plantillaBase64,
    plantillaVariables: variablesPrograma.length ? variablesPrograma : variablesGuardadas,
    plantillaValidada: Boolean(programa?.plantillaValidada || plantillaGuardada.plantillaValidada || plantillaBase64),
  };
}

function extraerNumeroCupos(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (Number.isFinite(numero)) return numero;
  const match = String(valor).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function calcularCuposDisponibles(programa) {
  const disponiblesDirectos = extraerNumeroCupos(programa?.cuposDisponibles);
  if (disponiblesDirectos !== null) return Math.max(0, disponiblesDirectos);
  const cupos = extraerNumeroCupos(programa?.cupos);
  const ocupados = extraerNumeroCupos(programa?.cuposOcupados) || 0;
  if (cupos !== null) return Math.max(0, cupos - ocupados);
  return 0;
}

function adaptarProgramaCoordinacion(programa, gradoAlumno = "") {
  const periodoNormalizado = normalizarPeriodo(programa.periodo);
  const cuposDisponibles = calcularCuposDisponibles(programa);
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);
  return {
    id: programa.id,
    nombre: programa.nombre,
    grupo: programa.grupo || "",
    grupoEtario: programa.grupoEtario || programa.grupo || "",
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    horario: resolverHorarioPorGrado(programa, gradoAlumno) || programa.horario,
    horariosPorGrupo: programa.horariosPorGrupo || [],
    gradosAplicables: programa.gradosAplicables || [],
    docente: resolverDocentePorGrado(programa, gradoAlumno),
    costo: Number(programa.costo ?? 0),
    cupos: cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos",
    cuposDisponibles,
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    uniforme: programa.requiereUniforme ? "Sí" : "No",
    modalidadCobro: programa.modalidadCobro || "",
    fechaInicio: programa.fechaInicio || "",
    fechaFin: programa.fechaFin || "",
    cicloI: programa.cicloI || "",
    cicloII: programa.cicloII || "",
    duracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    duracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    edadMinima: programa.edadMinima || "",
    edadMaxima: programa.edadMaxima || "",
    fechaNacimientoDesde: programa.fechaNacimientoDesde || "",
    fechaNacimientoHasta: programa.fechaNacimientoHasta || "",
    requisitos: programa.requisitos || "",
    plantilla: plantillaPrograma.plantilla,
    plantillaBase64: plantillaPrograma.plantillaBase64,
    plantillaVariables: plantillaPrograma.plantillaVariables,
    plantillaValidada: plantillaPrograma.plantillaValidada,
    invitacionMasiva: Boolean(programa.invitacionMasiva),
    estado: programa.estado,
  };
}

function adaptarEstudianteBase(estudiante, periodoNormalizado, invitacionPeriodo) {
  const { programa, invitado = {} } = invitacionPeriodo;
  const gradoInvitacion = invitado.grado || estudiante.grado;
  const seccionInvitacion = invitado.seccion || estudiante.seccion;
  const nivelInvitacion = invitado.nivelEducativo || estudiante.nivel || "";
  const horarioResuelto = resolverHorarioPorGrado(programa, gradoInvitacion);
  const horarioConfigurado = Boolean(horarioResuelto || !tieneHorariosPorGrupo(programa));
  const cuposDisponibles = calcularCuposDisponibles(programa);
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);
  return {
    ...estudiante,
    codigoEstudiante: invitado.codigoEstudiante || estudiante.codigoEstudiante || "",
    nombres: invitado.nombres || estudiante.nombres,
    grado: gradoInvitacion,
    seccion: seccionInvitacion,
    nivel: nivelInvitacion,
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
    estadoInscripción: obtenerEstadoInscripcionPorPeriodo(estudiante.dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(estudiante.dni, periodoNormalizado),
    origenRegistro: "Base general de estudiantes + carga Excel de Coordinación",
    tieneInvitacion: true,
    programaAsignado: invitacionPeriodo.programaId,
    programaNombre: programa.nombre,
    programaGrupo: programa.grupo || "",
    programaGrupoEtario: programa.grupoEtario || programa.grupo || "",
    programaHorario: horarioResuelto || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario),
    programaDisponible: programaDisponibleParaGrado(programa, gradoInvitacion),
    programaHorarioConfigurado: horarioConfigurado,
    programaDocente: resolverDocentePorGrado(programa, gradoInvitacion),
    programaCosto: Number(programa.costo ?? 0),
    programaCupos: cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos",
    programaCuposDisponibles: cuposDisponibles,
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programa.requisitos || "",
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    programaDuracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    programaDuracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    seleccion: invitado.seleccion || "",
    nivelCambridge: invitado.nivelCambridge || "",
    plantilla: plantillaPrograma.plantilla,
    plantillaBase64: plantillaPrograma.plantillaBase64,
    plantillaVariables: plantillaPrograma.plantillaVariables,
    plantillaValidada: plantillaPrograma.plantillaValidada,
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
  };
}

function adaptarInvitadoComoEstudiante(invitacionPeriodo, periodoNormalizado) {
  const { programa, invitado } = invitacionPeriodo;
  const horarioResuelto = resolverHorarioPorGrado(programa, invitado.grado);
  const horarioConfigurado = Boolean(horarioResuelto || !tieneHorariosPorGrupo(programa));
  const cuposDisponibles = calcularCuposDisponibles(programa);
  const plantillaPrograma = obtenerPlantillaProgramaLocal(programa);
  return {
    dni: invitado.dni || "",
    codigoEstudiante: invitado.codigoEstudiante || "",
    nombres: invitado.nombres,
    grado: invitado.grado || "No definido",
    seccion: invitado.seccion || "No definido",
    tipoAlumno: "Alumno invitado",
    periodo: periodoNormalizado === "verano" ? "Ciclo verano" : "Año escolar",
    estadoInscripcion: obtenerEstadoInscripcionPorPeriodo(invitado.dni, periodoNormalizado),
    estadoPago: obtenerEstadoPagoPorPeriodo(invitado.dni, periodoNormalizado),
    origenRegistro: "Carga Excel de Coordinación",
    tieneInvitacion: true,
    programaAsignado: invitacionPeriodo.programaId,
    programaNombre: programa.nombre,
    programaGrupo: programa.grupo || "",
    programaGrupoEtario: programa.grupoEtario || programa.grupo || "",
    programaHorario: horarioResuelto || (tieneHorariosPorGrupo(programa) ? "Horario no configurado para este grado" : programa.horario),
    programaDisponible: programaDisponibleParaGrado(programa, invitado.grado),
    programaHorarioConfigurado: horarioConfigurado,
    programaDocente: resolverDocentePorGrado(programa, invitado.grado),
    programaCosto: Number(programa.costo ?? 0),
    programaCupos: cuposDisponibles > 0 ? `${cuposDisponibles} cupos disponibles` : "Sin cupos",
    programaCuposDisponibles: cuposDisponibles,
    programaModalidadCobro: programa.modalidadCobro || "",
    programaRequisitos: programa.requisitos || "",
    programaFechaInicio: programa.fechaInicio || "",
    programaFechaFin: programa.fechaFin || "",
    programaDuracionTaller: programa.duracionTaller || calcularDuracionTexto(programa.fechaInicio, programa.fechaFin),
    programaDuracionAvisoDias: normalizarDuracionAvisoDias(programa.duracionAvisoDias, 7),
    seleccion: invitado.seleccion || "",
    nivelCambridge: invitado.nivelCambridge || "",
    plantilla: plantillaPrograma.plantilla,
    plantillaBase64: plantillaPrograma.plantillaBase64,
    plantillaVariables: plantillaPrograma.plantillaVariables,
    plantillaValidada: plantillaPrograma.plantillaValidada,
    requiereUniforme: Boolean(programa.requiereUniforme),
    requiereIndumentaria: Boolean(programa.requiereIndumentaria),
    telefonoApoderado: invitado.telefonoApoderado || "",
  };
}

function buscarInvitacionEnMemoria(dni, periodo, gradoAlumno = "") {
  if (!dni) return null;
  const periodoNormalizado = normalizarPeriodo(periodo);

  for (const programa of apiDb.programas) {
    if (normalizarPeriodo(programa.periodo) !== periodoNormalizado) continue;
    const invitado = (apiDb.invitadosPorPrograma[programa.id] || []).find((item) => item.dni === dni);
    if (invitado) return { programaId: programa.id, programa, invitado };
  }

  return null;
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

function resolverDocentePorGrado(programa, gradoAlumno = "") {
  const grupos = programa?.horariosPorGrupo || [];
  if (!Array.isArray(grupos) || grupos.length === 0) return programa.responsable || programa.docente || "No definido";

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return programa.responsable || programa.docente || "No definido";
  const grupo = grupos.find((item) =>
    (item.grados || []).some((grado) => coincideGrado(grado, gradoNormalizado))
  );

  if (grupo && grupo.responsable && grupo.responsable.trim()) {
    return grupo.responsable;
  }
  return programa.responsable || programa.docente || "No definido";
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
  if (normalizarPeriodo(programa?.periodo) === "verano") return true;
  if (tieneHorariosPorGrupo(programa)) {
    return Boolean(resolverHorarioPorGrado(programa, gradoAlumno));
  }

  const gradosAplicables = Array.isArray(programa?.gradosAplicables) ? programa.gradosAplicables : [];
  if (!gradosAplicables.length) return true;

  const gradoNormalizado = descomponerGrado(gradoAlumno);
  if (!gradoNormalizado.numero) return false;

  return gradosAplicables.some((grado) => coincideGrado(grado, gradoNormalizado));
}

function programaDisponibleParaEdad(programa, edadAlumno = "") {
  const minimo = Number(programa?.edadMinima || 0);
  const maximo = Number(programa?.edadMaxima || 0);
  if (!minimo && !maximo) return true;
  const edad = Number(edadAlumno);
  if (!Number.isFinite(edad) || edad <= 0) return true;
  if (minimo && edad < minimo) return false;
  if (maximo && edad > maximo) return false;
  return true;
}

function descomponerGrado(valor) {
  const texto = normalizarTexto(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}

function normalizarPeriodo(periodo) {
  return String(periodo || "").toLowerCase().includes("verano") ? "verano" : "escolar";
}

function finalizarProgramasVencidos() {
  const hoy = normalizarFecha(fechaActualInput());
  if (!hoy) return;

  let cambio = false;
  apiDb.programas.forEach((programa) => {
    if (programa.estado === "Finalizado") return;
    const fechaFin = normalizarFecha(programa.fechaFin);
    if (!fechaFin || fechaFin >= hoy) return;

    programa.estado = "Finalizado";
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    cambio = true;
  });

  if (cambio) saveApiDb();
}

function validarVentanaInscripcionRegular(programa, payload = {}) {
  if (payload.registroCaja) return;

  const ventana = obtenerVentanaInscripcion(programa.fechaInicio, new Date(), programa.duracionAvisoDias);
  if (ventana.permitida) return;

  throw new Error("El aviso de inscripcion regular cerro. Derive al padre a Caja para evaluar y registrar la matricula.");
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerEstadoInscripcionPorPeriodo(dni, periodo) {
  if (!dni) return "No inscrito";
  const inscripcion = [...apiDb.inscripciones]
    .reverse()
    .find((item) =>
      item.dniEstudiante === dni &&
      normalizarPeriodo(item.periodo) === normalizarPeriodo(periodo)
    );

  return inscripcion?.estadoInscripcion || "No inscrito";
}

function obtenerEstadoPagoPorPeriodo(dni, periodo) {
  if (!dni) return "Sin pago";
  const inscripcion = [...apiDb.inscripciones]
    .reverse()
    .find((item) =>
      item.dniEstudiante === dni &&
      normalizarPeriodo(item.periodo) === normalizarPeriodo(periodo)
    );

  return inscripcion?.estadoPago || "Sin pago";
}

function clavesAlumnoInscripcion(alumno) {
  const claves = [];
  if (alumno.dniEstudiante || alumno.dni) claves.push(`dni:${alumno.dniEstudiante || alumno.dni}`);
  if (alumno.codigoEstudiante) claves.push(`codigo:${normalizarTexto(alumno.codigoEstudiante)}`);
  const nombre = normalizarTexto(alumno.nombresEstudiante || alumno.nombres);
  if (nombre) claves.push(`nombre:${nombre}`);
  return claves;
}

function validarCruceHorarioAlumno(payload, horarioNuevo = "") {
  const diasNuevo = extraerDiasHorario(horarioNuevo);
  if (!diasNuevo.size) return;

  const clavesPayload = clavesAlumnoInscripcion(payload);
  const periodoPayload = normalizarPeriodo(payload.periodo);
  const cruce = apiDb.inscripciones
    .map((item) => ({
      item,
      diasExistentes: extraerDiasHorario(item.horario),
      diasCruzados: obtenerDiasCruzados(diasNuevo, extraerDiasHorario(item.horario)),
    }))
    .find(({ item, diasCruzados }) =>
      item.estadoInscripcion !== "Anulada" &&
      item.programaId !== payload.programaId &&
      normalizarPeriodo(item.periodo) === periodoPayload &&
      clavesAlumnoInscripcion(item).some((clave) => clavesPayload.includes(clave)) &&
      diasCruzados.length > 0
    );

  if (cruce) {
    throw new Error(`El alumno ya tiene una inscripcion con cruce de dia (${cruce.diasCruzados.join(", ")}) en ${cruce.item.programa || "otro programa"}.`);
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

function normalizarEstadoPagoSecretaria(valor = "") {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function esProgramaCambridge(programa = {}) {
  return normalizarTexto([
    programa.nombre,
    programa.programa,
    programa.categoria,
    programa.plantilla,
  ].filter(Boolean).join(" ")).includes("cambridge");
}

function obtenerDatosCambridgeSeguros(programa, payload = {}) {
  if (!esProgramaCambridge(programa)) {
    return { seleccion: "", nivelCambridge: "" };
  }

  return {
    seleccion: normalizarSeleccionCambridge(payload.seleccion),
    nivelCambridge: String(payload.nivelCambridge || "").trim(),
  };
}

function normalizarSeleccionCambridge(valor = "") {
  const seleccion = String(valor || "").trim().toUpperCase();
  return ["A", "B", "C"].includes(seleccion) ? seleccion : "";
}

function encontrarPagoActivoInscripcion(inscripcion = {}) {
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const programaNombre = normalizarTexto(inscripcion.programa);

  return pagos.find((pago) => {
    const estado = normalizarEstadoPagoSecretaria([pago.estado, pago.estadoPago, pago.estadoVerificacion].join(" "));
    if (estado.includes("observado") || estado.includes("rechazado") || estado.includes("anulado") || estado.includes("cancelado")) {
      return false;
    }
    if (pago.inscripcionId && pago.inscripcionId === inscripcion.id) return true;

    const mismoDni = (pago.dniEstudiante || pago.estudianteDni) === inscripcion.dniEstudiante;
    if (!mismoDni) return false;
    if (pago.programaId && pago.programaId === inscripcion.programaId) return true;
    return programaNombre && normalizarTexto(pago.programa || pago.programaNombre) === programaNombre;
  }) || null;
}

function claveAlumno(alumno) {
  if (alumno.dni) return `dni:${alumno.dni}`;
  if (alumno.codigoEstudiante) return `codigo:${normalizarTexto(alumno.codigoEstudiante)}`;
  return `nombre:${normalizarTexto(alumno.nombres)}:${alumno.grado || ""}:${alumno.seccion || ""}`;
}
