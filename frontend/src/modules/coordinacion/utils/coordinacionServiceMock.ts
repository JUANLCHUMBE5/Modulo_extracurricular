import { apiDb as apiDbRaw, nextApiId, saveApiDb, syncApiDb } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;
import { resolverHorarioPorGrado, resolverDocentePorGrado } from "../../secretaria/services/secretariaServiceUtils";
import {
  calcularDuracionTexto,
  fechaActualInput,
  fechaActualIso,
  normalizarDuracionAvisoDias,
  normalizarFecha,
} from "../../../services/dateService";
import { esProgramaCambridge } from "./coordinacionProgramUtils";
import {
  agregarGradoProgramaDesdeAlumno,
  claveAlumno,
  conCuposDisponibles,
  debeArchivarPorFecha,
  debeFinalizarPorFecha,
  detectarProgramaPorCurso,
  limpiarTexto,
  normalizarFila,
  normalizarPeriodo,
  programaVencido,
  textoSeguro,
  validarArchivoExcelFrontend,
  validarDatosPrograma,
  sincronizarGradosProgramaConInvitados
} from "../services/coordinacionServiceUtils";
import {
  normalizarPeriodosGuardados,
  finalizarProgramasVencidos,
  normalizarAlumnoCarga,
  listarInvitadosMock,
  listarMatriculadosMock,
} from "./coordinacionServiceMockHelpers";
export {
  normalizarPeriodosGuardados,
  listarInvitadosMock,
  listarMatriculadosMock,
};

import {
  buscarAlumnoCargaPorDniMock,
  confirmarCargaAlumnosMock,
  listarHistorialCargasMock,
  eliminarCargaAlumnosMock,
} from "./coordinacionServiceMockCarga";
export {
  buscarAlumnoCargaPorDniMock,
  confirmarCargaAlumnosMock,
  listarHistorialCargasMock,
  eliminarCargaAlumnosMock,
};

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizarTextoSimple = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const esCategoriaAcademica = (programa: any = {}) => {
  const norm = normalizarTextoSimple(programa.categoria);
  return norm.includes("academ") || norm.includes("vacaciones utiles");
};

export async function listarCategoriasMock() {
  await delay(300);
  await syncApiDb();
  return [...apiDb.categorias];
}

export async function crearCategoriaMock(nombre) {
  await delay(300);
  if (apiDb.categorias.includes(nombre)) throw new Error("La categoría ya existe.");
  apiDb.categorias.push(nombre);
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return nombre;
}

export async function eliminarCategoriaMock(nombre) {
  await delay(300);
  await syncApiDb();
  const categoria = String(nombre || "").trim();
  if (!categoria) throw new Error("Seleccione una categoría para quitar.");

  const estaEnUso = apiDb.programas.some((programa) =>
    String(programa.categoria || "").toLowerCase() === categoria.toLowerCase()
  );
  if (estaEnUso) {
    throw new Error("No se puede quitar una categoría que ya está usada por programas registrados.");
  }

  apiDb.categorias = apiDb.categorias.filter((item) =>
    String(item).toLowerCase() !== categoria.toLowerCase()
  );
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return categoria;
}

export async function listarProgramasMock() {
  await delay(400);
  await syncApiDb();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  return apiDb.programas.map(conCuposDisponibles);
}

export async function obtenerProgramaMock(id) {
  await delay(300);
  await syncApiDb();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  const programa = apiDb.programas.find((item) => item.id === id);
  if (!programa) throw new Error("Programa no encontrado.");
  return conCuposDisponibles(programa);
}

export async function crearProgramaMock(datos) {
  await delay(700);
  await syncApiDb();
  finalizarProgramasVencidos();
  validarDatosPrograma(datos);
  const correlativo = nextApiId("nextProgramaId");
  const esCambridge = esProgramaCambridge(datos);
  const nuevo = {
    id: `PROG-${String(correlativo).padStart(3, "0")}`,
    cuposOcupados: 0,
    estado: "Habilitado",
    ...datos,
    periodo: normalizarPeriodo(datos.periodo),
    cupos: Number(datos.cupos),
    costo: Number(Number(datos.costo).toFixed(2)),
    edadMinima: datos.edadMinima || "",
    edadMaxima: datos.edadMaxima || "",
    fechaNacimientoDesde: datos.fechaNacimientoDesde || "",
    fechaNacimientoHasta: datos.fechaNacimientoHasta || "",
    duracionTaller: datos.duracionTaller || calcularDuracionTexto(datos.fechaInicio, datos.fechaFin),
    cicloI: datos.cicloI || "",
    cicloII: datos.cicloII || "",
    duracionAvisoDias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
    plantillaBase64: datos.plantillaBase64 || "",
    plantillaVariables: datos.plantillaVariables || [],
    plantillaValidada: Boolean(datos.plantillaValidada),
    requisitos: datos.requisitos || "",
    comunicado: datos.comunicado || "",
    comunicadoCompleto: datos.comunicadoCompleto || "",
    detalleCosto: datos.detalleCosto || "",
    detalleAlmuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
    gradosAplicables: esCambridge ? [] : (datos.gradosAplicables || []),
    invitacionMasiva: esCambridge ? false : Boolean(datos.invitacionMasiva),
    alcanceInvitacionMasiva: !esCambridge && datos.invitacionMasiva ? datos.alcanceInvitacionMasiva || "colegio" : "",
    anuncioImagen: !esCambridge && datos.invitacionMasiva ? datos.anuncioImagen || "" : "",
    anuncioImagenNombre: !esCambridge && datos.invitacionMasiva ? datos.anuncioImagenNombre || "" : "",
    anuncioImagenTamano: !esCambridge && datos.invitacionMasiva ? Number(datos.anuncioImagenTamano || 0) : 0,
    anuncioImagenComprimida: !esCambridge && datos.invitacionMasiva ? Boolean(datos.anuncioImagenComprimida) : false,
    requiereIndumentaria: Boolean(datos.requiereIndumentaria),
  };

  apiDb.programas.push(nuevo);
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return conCuposDisponibles(nuevo);
}

export async function crearProgramaDesdeDocumentoMock(datos) {
  await delay(700);
  await syncApiDb();
  finalizarProgramasVencidos();

  if (!String(datos.nombre || "").trim()) throw new Error("Ingrese el nombre del programa.");
  if (!datos.plantilla || !datos.plantillaBase64 || !datos.plantillaValidada) {
    throw new Error("Suba un Word apto con variables antes de guardar.");
  }

  const correlativo = nextApiId("nextProgramaId");
  const esCambridge = esProgramaCambridge(datos);
  const nuevo = {
    ...datos,
    id: `PROG-${String(correlativo).padStart(3, "0")}`,
    periodo: normalizarPeriodo(datos.periodo || "escolar"),
    categoria: datos.categoria || apiDb.categorias[0] || "General",
    grupo: datos.grupo || "Por definir",
    horario: datos.horario || "Por definir",
    gradosAplicables: esCambridge
      ? []
      : Array.isArray(datos.gradosAplicables) && datos.gradosAplicables.length
        ? datos.gradosAplicables
        : ["3 anos", "4 anos", "5 anos", "1", "2", "3", "4", "5", "6"],
    edadMinima: datos.edadMinima || "",
    edadMaxima: datos.edadMaxima || "",
    fechaNacimientoDesde: datos.fechaNacimientoDesde || "",
    fechaNacimientoHasta: datos.fechaNacimientoHasta || "",
    dias: Array.isArray(datos.dias) ? datos.dias : [],
    horariosPorGrupo: Array.isArray(datos.horariosPorGrupo) ? datos.horariosPorGrupo : [],
    fechaInicio: datos.fechaInicio || fechaActualInput(),
    fechaFin: datos.fechaFin || fechaActualInput(),
    duracionTaller: datos.duracionTaller || calcularDuracionTexto(datos.fechaInicio, datos.fechaFin),
    cicloI: datos.cicloI || "",
    cicloII: datos.cicloII || "",
    duracionAvisoDias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
    horaLimiteAviso: datos.horaLimiteAviso || "23:59",
    cupos: Number(datos.cupos) > 0 ? Number(datos.cupos) : 1,
    cuposOcupados: 0,
    costo: Number(datos.costo) > 0 ? Number(Number(datos.costo).toFixed(2)) : 1,
    modalidadCobro: datos.modalidadCobro || "Mensual",
    estado: "Deshabilitado",
    plantillaVariables: datos.plantillaVariables || [],
    plantillaValidada: true,
    requisitos: datos.requisitos || "",
    invitacionMasiva: esCambridge ? false : Boolean(datos.invitacionMasiva),
    alcanceInvitacionMasiva: esCambridge ? "" : (datos.alcanceInvitacionMasiva || ""),
    comunicado: datos.comunicado || "",
    comunicadoCompleto: datos.comunicadoCompleto || "",
    detalleCosto: datos.detalleCosto || "",
    detalleAlmuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
    requiereUniforme: Boolean(datos.requiereUniforme),
    requiereIndumentaria: Boolean(datos.requiereIndumentaria),
    anuncioImagen: !esCambridge && datos.invitacionMasiva ? datos.anuncioImagen || "" : "",
    anuncioImagenNombre: !esCambridge && datos.invitacionMasiva ? datos.anuncioImagenNombre || "" : "",
    anuncioImagenTamano: !esCambridge && datos.invitacionMasiva ? Number(datos.anuncioImagenTamano || 0) : 0,
    anuncioImagenComprimida: !esCambridge && datos.invitacionMasiva ? Boolean(datos.anuncioImagenComprimida) : false,
    creadoDesdeDocumento: true,
  };

  apiDb.programas.push(nuevo);
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return conCuposDisponibles(nuevo);
}

export async function editarProgramaMock(id, datos) {
  await delay(700);
  await syncApiDb();
  finalizarProgramasVencidos();
  validarDatosPrograma(datos);
  const index = apiDb.programas.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Programa no encontrado.");

  let nuevoEstado = apiDb.programas[index].estado;
  if (nuevoEstado === "Finalizado") {
    const hoy = normalizarFecha(fechaActualInput());
    const fechaFin = normalizarFecha(datos.fechaFin);
    if (fechaFin && hoy && fechaFin >= hoy) {
      nuevoEstado = "Habilitado";
    }
  }

  const esCambridge = esProgramaCambridge(datos);
  apiDb.programas[index] = {
    ...apiDb.programas[index],
    ...datos,
    id,
    estado: nuevoEstado,
    periodo: normalizarPeriodo(datos.periodo),
    cupos: Number(datos.cupos),
    costo: Number(Number(datos.costo).toFixed(2)),
    edadMinima: datos.edadMinima || "",
    edadMaxima: datos.edadMaxima || "",
    fechaNacimientoDesde: datos.fechaNacimientoDesde || "",
    fechaNacimientoHasta: datos.fechaNacimientoHasta || "",
    duracionTaller: datos.duracionTaller || calcularDuracionTexto(datos.fechaInicio, datos.fechaFin),
    cicloI: datos.cicloI || "",
    cicloII: datos.cicloII || "",
    duracionAvisoDias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
    plantillaBase64: datos.plantillaBase64 || "",
    plantillaVariables: datos.plantillaVariables || [],
    plantillaValidada: Boolean(datos.plantillaValidada),
    requisitos: datos.requisitos || "",
    comunicado: datos.comunicado || "",
    comunicadoCompleto: datos.comunicadoCompleto || "",
    detalleCosto: datos.detalleCosto || "",
    detalleAlmuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
    gradosAplicables: esCambridge ? [] : (datos.gradosAplicables || []),
    invitacionMasiva: esCambridge ? false : Boolean(datos.invitacionMasiva),
    alcanceInvitacionMasiva: !esCambridge && datos.invitacionMasiva ? datos.alcanceInvitacionMasiva || "colegio" : "",
    anuncioImagen: !esCambridge && datos.invitacionMasiva ? datos.anuncioImagen || "" : "",
    anuncioImagenNombre: !esCambridge && datos.invitacionMasiva ? datos.anuncioImagenNombre || "" : "",
    anuncioImagenTamano: !esCambridge && datos.invitacionMasiva ? Number(datos.anuncioImagenTamano || 0) : 0,
    anuncioImagenComprimida: !esCambridge && datos.invitacionMasiva ? Boolean(datos.anuncioImagenComprimida) : false,
    requiereIndumentaria: Boolean(datos.requiereIndumentaria),
  };

  const oldName = apiDb.programas[index].nombre;

  if (Array.isArray(apiDb.inscripciones)) {
    apiDb.inscripciones = apiDb.inscripciones.map(item => {
      if (item.programaId === id) {
        return {
          ...item,
          programa: apiDb.programas[index].nombre,
          categoria: apiDb.programas[index].categoria,
          periodo: apiDb.programas[index].periodo || "escolar",
          horario: resolverHorarioPorGrado(apiDb.programas[index], item.gradoEstudiante || item.grado || "") || apiDb.programas[index].horario || "",
          docente: resolverDocentePorGrado(apiDb.programas[index], item.gradoEstudiante || item.grado || ""),
          costo: apiDb.programas[index].costo,
          modalidadCobro: apiDb.programas[index].modalidadCobro || "Mensual",
          fechaInicio: apiDb.programas[index].fechaInicio,
          fechaFin: apiDb.programas[index].fechaFin,
          requisitos: apiDb.programas[index].requisitos || "",
          comunicado: apiDb.programas[index].comunicado || "",
          comunicadoCompleto: apiDb.programas[index].comunicadoCompleto || "",
          detalleCosto: apiDb.programas[index].detalleCosto || "",
          detalleAlmuerzo: apiDb.programas[index].detalleAlmuerzo || "",
          concesionarios: apiDb.programas[index].concesionarios || "",
          plantilla: apiDb.programas[index].plantilla || "",
          plantillaBase64: apiDb.programas[index].plantillaBase64 || "",
          plantillaVariables: apiDb.programas[index].plantillaVariables || [],
          plantillaValidada: apiDb.programas[index].plantillaValidada
        };
      }
      return item;
    });
  }

  if (Array.isArray(apiDb.pagos)) {
    apiDb.pagos = apiDb.pagos.map(item => {
      const isLinkedToInscripcion = item.inscripcionId && (apiDb.inscripciones || []).some(ins => ins.id === item.inscripcionId && ins.programaId === id);
      const isLinkedByProgramId = item.programaId === id;
      const isLinkedByProgramName = oldName && String(item.programa).trim().toLowerCase() === String(oldName).trim().toLowerCase();

      if (isLinkedToInscripcion || isLinkedByProgramId || isLinkedByProgramName) {
        return {
          ...item,
          programaId: id,
          programa: apiDb.programas[index].nombre,
          periodo: apiDb.programas[index].periodo || "escolar"
        };
      }
      return item;
    });
  }

  if (Array.isArray(apiDb.asistencias)) {
    apiDb.asistencias = apiDb.asistencias.map(item => {
      const isLinkedByProgramId = item.programaId === id;
      const isLinkedByProgramName = oldName && String(item.programa).trim().toLowerCase() === String(oldName).trim().toLowerCase();

      if (isLinkedByProgramId || isLinkedByProgramName) {
        return {
          ...item,
          programaId: id,
          programa: apiDb.programas[index].nombre,
          horario: resolverHorarioPorGrado(apiDb.programas[index], item.gradoEstudiante || item.grado || "") || apiDb.programas[index].horario || ""
        };
      }
      return item;
    });
  }

  if (Array.isArray(apiDb.documentosGenerados)) {
    apiDb.documentosGenerados = apiDb.documentosGenerados.map(item => {
      const isLinkedByProgramId = item.programaId === id;
      const isLinkedByProgramName = oldName && String(item.programa).trim().toLowerCase() === String(oldName).trim().toLowerCase();

      if (isLinkedByProgramId || isLinkedByProgramName) {
        return {
          ...item,
          programaId: id,
          programa: apiDb.programas[index].nombre
        };
      }
      return item;
    });
  }

  if (apiDb.invitadosPorPrograma && apiDb.invitadosPorPrograma[id]) {
    apiDb.invitadosPorPrograma[id] = apiDb.invitadosPorPrograma[id].map(invitado => ({
      ...invitado,
      periodo: apiDb.programas[index].periodo || "escolar"
    }));
  }

  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return conCuposDisponibles(apiDb.programas[index]);
}

export async function cambiarEstadoProgramaMock(id, nuevoEstado) {
  await delay(400);
  await syncApiDb();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  const programa = apiDb.programas.find((item) => item.id === id);
  if (!programa) throw new Error("Programa no encontrado.");
  if (programa.estado === "Finalizado" && programaVencido(programa)) {
    throw new Error("El programa ya finalizó por fecha de vigencia. Modifique la fecha fin para volver a usarlo.");
  }
  if (nuevoEstado === "Habilitado" && programaVencido(programa)) {
    programa.estado = "Finalizado";
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    await saveApiDb();
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
    throw new Error("El programa ya cumplió su fecha fin. Cree un nuevo ciclo para continuar.");
  }
  programa.estado = nuevoEstado;
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return conCuposDisponibles(programa);
}

export async function eliminarProgramaMock(id) {
  await delay(400);
  await syncApiDb();
  const index = apiDb.programas.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Programa no encontrado.");

  apiDb.programas[index].estado = "Archivado";
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return true;
}



export async function listarAsistenciasProgramaMock(programaId) {
  await delay(400);
  await syncApiDb();
  const programa = apiDb.programas.find((item) => String(item.id) === String(programaId));
  const nombrePrograma = normalizarTextoSimple(programa?.nombre);

  return (apiDb.asistencias || [])
    .filter((item) => {
      const coincideId = item.programaId && String(item.programaId) === String(programaId);
      const coincideNombre = nombrePrograma && normalizarTextoSimple(item.programa) === nombrePrograma;
      return coincideId || coincideNombre;
    })
    .sort((a, b) => new Date(b.fechaRegistro || 0).getTime() - new Date(a.fechaRegistro || 0).getTime())
    .map((item) => {
      const inscripcion = buscarInscripcionAsistenciaMock(item, programaId);
      const estudiante = apiDb.estudiantes?.[item.dniEstudiante || inscripcion?.dniEstudiante] || null;
      const programaBase = programa
        || apiDb.programas.find((prog) => String(prog.id) === String(inscripcion?.programaId || item.programaId))
        || null;
      const rawGrado = inscripcion?.gradoEstudiante || inscripcion?.grado || estudiante?.grado || "";
      const rawNivel = estudiante?.nivel || "";
      const gradoEstudiante = rawGrado && rawNivel && !String(rawGrado).toLowerCase().includes(String(rawNivel).toLowerCase())
        ? `${rawGrado} ${rawNivel}`
        : rawGrado;
      return {
        id: item.id || "",
        inscripcionId: item.inscripcionId || inscripcion?.id || "",
        pagoId: item.pagoId || "",
        dni: item.dniEstudiante || inscripcion?.dniEstudiante || estudiante?.dni || "",
        codigoEstudiante: item.codigoEstudiante || inscripcion?.codigoEstudiante || estudiante?.codigoEstudiante || "",
        nombres: item.nombresEstudiante
          || inscripcion?.nombresEstudiante
          || (estudiante ? `${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim() : ""),
        programaId: item.programaId || inscripcion?.programaId || programaId,
        programa: item.programa || inscripcion?.programa || programaBase?.nombre || "",
        horario: item.horario || inscripcion?.horario || resolverHorarioPorGrado(programaBase, gradoEstudiante) || programaBase?.horario || "",
        estadoPago: item.estadoPago || inscripcion?.estadoPago || "Pendiente",
        estadoAcceso: item.estadoAcceso || "",
        observacion: item.observacion || "",
        origen: item.origen || "Auxiliar",
        fechaRegistro: item.fechaRegistro || "",
      };
    });
}

function buscarInscripcionAsistenciaMock(asistencia: any = {}, programaId = "") {
  const dni = asistencia.dniEstudiante || asistencia.dni || "";
  const nombrePrograma = normalizarTextoSimple(asistencia.programa);
  return (apiDb.inscripciones || []).find((item) => asistencia.inscripcionId && item.id === asistencia.inscripcionId)
    || (apiDb.inscripciones || []).find((item) =>
      dni &&
      item.dniEstudiante === dni &&
      (
        (programaId && String(item.programaId) === String(programaId)) ||
        (asistencia.programaId && String(item.programaId) === String(asistencia.programaId)) ||
        (nombrePrograma && normalizarTextoSimple(item.programa) === nombrePrograma)
      )
    )
    || null;
}

export async function buscarInvitacionPorDniPeriodoMock(dni, periodo) {
  await delay(250);
  await syncApiDb();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  const programasPeriodo = apiDb.programas.filter((programa) =>
    normalizarPeriodo(programa.periodo) === normalizarPeriodo(periodo)
  );

  for (const programa of programasPeriodo) {
    const invitado = (apiDb.invitadosPorPrograma[programa.id] || [])
      .find((alumno) =>
        alumno.dni === dni &&
        normalizarPeriodo(alumno.periodo || programa.periodo) === normalizarPeriodo(periodo)
      );

    if (invitado) {
      return {
        programaId: programa.id,
        programa: conCuposDisponibles(programa),
        invitado,
      };
    }
  }

  return null;
}

export async function importarInvitadosMock(programaId, lista) {
  await delay(800);
  const existentes = apiDb.invitadosPorPrograma[programaId] || [];
  const dniExistentes = new Set(existentes.map((item) => item.dni));
  const nuevos = lista.filter((item) => !dniExistentes.has(item.dni));
  const duplicados = lista.length - nuevos.length;
  const programa = apiDb.programas.find((item) => item.id === programaId);
  apiDb.invitadosPorPrograma[programaId] = [
    ...existentes,
    ...nuevos.map((item) => ({
      ...item,
      periodo: item.periodo || normalizarPeriodo(programa?.periodo),
    })),
  ];
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return { importados: nuevos.length, duplicados };
}



export async function obtenerActividadProgramaMock(programaId) {
  await delay(200);
  await syncApiDb();
  const alumnos = apiDb.invitadosPorPrograma[programaId]?.length || 0;
  const inscripciones = apiDb.inscripciones.filter((item) => item.programaId === programaId).length;
  const documentos = (apiDb.documentosGenerados || []).filter((item) => item.programaId === programaId).length;
  return { alumnos, inscripciones, documentos, tieneActividad: alumnos + inscripciones + documentos > 0 };
}

export async function obtenerListaAsistenciaMock(programaId) {
  await delay(500);
  await syncApiDb();
  const invitados = apiDb.invitadosPorPrograma[programaId] || [];
  return invitados.map((estudiante) => ({
    ...estudiante,
    asistencia: Array.from({ length: 5 }, (_, index) => ({
      sesion: index + 1,
      fecha: `2026-04-${String(7 + index * 7).padStart(2, "0")}`,
      asistio: Math.random() > 0.3,
    })),
  }));
}


