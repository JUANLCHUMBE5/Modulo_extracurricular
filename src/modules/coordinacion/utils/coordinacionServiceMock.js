import { apiDb, nextApiId, saveApiDb, syncApiDb } from "../../../services/dbApi";
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

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizarTextoSimple = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const esCategoriaAcademica = (programa = {}) => {
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

export async function listarInvitadosMock(programaId) {
  await delay(400);
  await syncApiDb();
  const todosInvitados = [...(apiDb.invitadosPorPrograma[programaId] || [])];

  const inscripcionesActivas = (apiDb.inscripciones || [])
    .filter((ins) => ins.programaId === programaId && ins.estadoInscripcion !== "Anulada");

  if (!inscripcionesActivas.length) return todosInvitados;

  const dnisMatriculados = new Set(
    inscripcionesActivas
      .map((ins) => String(ins.dniEstudiante || "").replace(/\D/g, ""))
      .filter(Boolean)
  );
  const codigosMatriculados = new Set(
    inscripcionesActivas
      .map((ins) => String(ins.codigoEstudiante || "").trim().toUpperCase())
      .filter(Boolean)
  );
  const nombresMatriculados = new Set(
    inscripcionesActivas
      .map((ins) => normalizarTextoSimple(ins.nombresEstudiante))
      .filter(Boolean)
  );

  return todosInvitados.filter((invitado) => {
    const dniInvitado = String(invitado.dni || "").replace(/\D/g, "");
    const codigoInvitado = String(invitado.codigoEstudiante || "").trim().toUpperCase();
    const nombreInvitado = normalizarTextoSimple(invitado.nombres);

    if (dniInvitado && dnisMatriculados.has(dniInvitado)) return false;
    if (codigoInvitado && codigosMatriculados.has(codigoInvitado)) return false;

    if (dniInvitado) {
      const estudianteBase = apiDb.estudiantes?.[dniInvitado];
      if (estudianteBase) {
        const codigoDesdeBase = String(estudianteBase.codigoEstudiante || "").trim().toUpperCase();
        if (codigoDesdeBase && codigosMatriculados.has(codigoDesdeBase)) return false;
      }
    }

    if (codigoInvitado) {
      const estudianteBase = Object.values(apiDb.estudiantes || {}).find(
        (e) => String(e.codigoEstudiante || "").trim().toUpperCase() === codigoInvitado
      );
      if (estudianteBase && estudianteBase.dni) {
        const dniDesdeBase = String(estudianteBase.dni).replace(/\D/g, "");
        if (dniDesdeBase && dnisMatriculados.has(dniDesdeBase)) return false;
      }
    }

    if (nombreInvitado && nombresMatriculados.has(nombreInvitado)) return false;

    return true;
  });
}

export async function listarMatriculadosMock(programaId) {
  await delay(400);
  await syncApiDb();
  return (apiDb.inscripciones || [])
    .filter((item) => item.programaId === programaId && item.estadoInscripcion !== "Anulada")
    .map((item) => {
      const dniBase = item.dniEstudiante || "";
      const estudianteBase = dniBase ? (apiDb.estudiantes?.[dniBase] || null) : null;
      return {
        id: item.id,
        dni: item.dniEstudiante || estudianteBase?.dni || "",
        codigoEstudiante: item.codigoEstudiante || estudianteBase?.codigoEstudiante || "",
        nombres: item.nombresEstudiante || estudianteBase?.nombres || "",
        grado: item.gradoEstudiante || item.grado || estudianteBase?.grado || "",
        seccion: item.seccion || item.seccionEstudiante || estudianteBase?.seccion || "",
        estadoInscripcion: item.estadoInscripcion || "",
        estadoPago: item.estadoPago || "",
        origenRegistro: item.origenRegistro || "Presencial",
        fechaRegistro: item.fechaRegistro || "",
        costo: item.costo,
        apoderado: item.apoderado || estudianteBase?.apoderado || "",
        telefono: item.telefono || estudianteBase?.telefonoApoderado || "",
      };
    });
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
    .sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0))
    .map((item) => ({
      id: item.id || "",
      inscripcionId: item.inscripcionId || "",
      pagoId: item.pagoId || "",
      dni: item.dniEstudiante || "",
      codigoEstudiante: item.codigoEstudiante || "",
      nombres: item.nombresEstudiante || "",
      programaId: item.programaId || programaId,
      programa: item.programa || programa?.nombre || "",
      horario: item.horario || "",
      estadoPago: item.estadoPago || "",
      estadoAcceso: item.estadoAcceso || "",
      observacion: item.observacion || "",
      origen: item.origen || "Auxiliar",
      fechaRegistro: item.fechaRegistro || "",
    }));
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

export async function buscarAlumnoCargaPorDniMock(dni) {
  await syncApiDb();
  const estudiante = apiDb.estudiantes?.[dni];
  if (!estudiante) return null;
  return normalizarAlumnoCarga(estudiante);
}

export async function confirmarCargaAlumnosMock(preview) {
  await delay(600);
  await syncApiDb();
  const validos = preview.registros.filter((item) => item.estado === "Valido");
  const registrosPorArchivo = new Map();
  const validosPorArchivo = new Map();
  const programasTocados = new Set();
  const nuevasCargas = [];

  (preview.registros || []).forEach((item) => {
    const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
    if (!registrosPorArchivo.has(archivoNombre)) registrosPorArchivo.set(archivoNombre, []);
    registrosPorArchivo.get(archivoNombre).push(item);
  });

  validos.forEach((item) => {
    const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
    if (!validosPorArchivo.has(archivoNombre)) validosPorArchivo.set(archivoNombre, []);
    validosPorArchivo.get(archivoNombre).push(item);
  });

  validos.forEach((item) => {
    if (!item.programaId) return;
    const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
    const grupoArchivo = validosPorArchivo.get(archivoNombre) || [];
    if (!grupoArchivo.cargaId) {
      const todayStr = new Date().toDateString();
      const existing = (apiDb.historialCargas || []).find(
        (c) =>
          c.archivoNombre === "Registro individual" &&
          c.fecha &&
          new Date(c.fecha).toDateString() === todayStr
      );
      if (archivoNombre === "Registro individual" && existing) {
        grupoArchivo.cargaId = existing.id;
      } else {
        grupoArchivo.cargaId = `CARGA-${Date.now().toString().slice(-8)}-${Math.random().toString(16).slice(2, 6)}`;
      }
      grupoArchivo.registrosHistorial = [];
    }
    const cargaId = grupoArchivo.cargaId;
    const existentes = apiDb.invitadosPorPrograma[item.programaId] || [];
    const programaCarga = apiDb.programas.find((programa) => programa.id === item.programaId);
    const clave = claveAlumno(item);
    const alumnoYaExiste = Boolean(clave && existentes.some((existente) => claveAlumno(existente) === clave));
    if (alumnoYaExiste) {
      item.estado = "Duplicado";
      item.errores = [...(item.errores || []), "Alumno ya existe en este taller vigente."];
      grupoArchivo.duplicadosConfirmacion = (grupoArchivo.duplicadosConfirmacion || 0) + 1;
      return;
    }
    if (!esProgramaCambridge(programaCarga)) {
      agregarGradoProgramaDesdeAlumno(programaCarga, item.grado);
      programasTocados.add(item.programaId);
    }
    const invitado = {
      cargaId,
      codigoEstudiante: item.codigoEstudiante || "",
      dni: item.dni,
      nombres: `${item.nombres} ${item.apellidos}`.trim(),
      grado: item.grado,
      seccion: item.seccion,
      nivelEducativo: item.nivelEducativo || "",
      seleccion: item.seleccion || "",
      nivelCambridge: item.nivelCambridge || "",
      periodo: normalizarPeriodo(preview.periodo),
      telefonoApoderado: item.telefono,
      correo: item.correo,
      observacion: item.observacion,
      archivoNombre,
      estado: item.estadoAlumno || "Invitado",
    };
    apiDb.invitadosPorPrograma[item.programaId] = [
      ...existentes,
      invitado,
    ];
    grupoArchivo.registrosHistorial.push({
      programaId: item.programaId,
      programaNombre: item.programaNombre || "",
      archivoNombre,
      dni: item.dni,
      codigoEstudiante: item.codigoEstudiante || "",
      nombres: invitado.nombres,
      grado: item.grado,
      seccion: item.seccion,
    });
  });

  programasTocados.forEach((programaId) => {
    sincronizarGradosProgramaConInvitados(programaId);
  });

  const duplicadosConfirmacionTotal = Array.from(validosPorArchivo.values()).reduce(
    (total, grupoArchivo) => total + (grupoArchivo.duplicadosConfirmacion || 0),
    0
  );

  validosPorArchivo.forEach((grupoArchivo, archivoNombre) => {
    if (!grupoArchivo.cargaId) return;
    const registrosArchivo = registrosPorArchivo.get(archivoNombre) || grupoArchivo;
    const importadosArchivo = (grupoArchivo.registrosHistorial || []).length;

    const todayStr = new Date().toDateString();
    const existingIndex = (apiDb.historialCargas || []).find(
      (c) =>
        c.archivoNombre === "Registro individual" &&
        c.fecha &&
        new Date(c.fecha).toDateString() === todayStr
    );

    if (archivoNombre === "Registro individual" && existingIndex !== -1) {
      const ec = apiDb.historialCargas[existingIndex];
      ec.registros = [...(ec.registros || []), ...(grupoArchivo.registrosHistorial || [])];
      ec.resumen = {
        importados: (ec.resumen?.importados || 0) + importadosArchivo,
        total: (ec.resumen?.total || 0) + registrosArchivo.length,
        errores: (ec.resumen?.errores || 0) + registrosArchivo.filter((item) => item.estado === "Error").length,
        duplicados: (ec.resumen?.duplicados || 0) + registrosArchivo.filter((item) => item.estado === "Duplicado").length,
      };
    } else {
      if (importadosArchivo === 0) return;
      nuevasCargas.push({
        id: grupoArchivo.cargaId,
        fecha: fechaActualIso(),
        periodo: normalizarPeriodo(preview.periodo),
        archivoNombre,
        archivos: [archivoNombre],
        resumen: {
          importados: importadosArchivo,
          total: registrosArchivo.length,
          errores: registrosArchivo.filter((item) => item.estado === "Error").length,
          duplicados: registrosArchivo.filter((item) => item.estado === "Duplicado").length,
        },
        registros: grupoArchivo.registrosHistorial || [],
      });
    }
  });

  apiDb.historialCargas = Array.isArray(apiDb.historialCargas) ? apiDb.historialCargas : [];
  apiDb.historialCargas = [...nuevasCargas, ...apiDb.historialCargas];

  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));

  const primerArchivoNombre = validos[0] ? (validos[0].archivoNombre || preview.archivoNombre || "Carga Excel") : "";
  const returnedCargaId = primerArchivoNombre ? (validosPorArchivo.get(primerArchivoNombre)?.cargaId || "") : "";

  return {
    cargaId: returnedCargaId,
    cargaIds: nuevasCargas.map((carga) => carga.id),
    cargas: nuevasCargas,
    importados: validos.length - duplicadosConfirmacionTotal,
    total: preview.resumen?.total || validos.length,
    errores: preview.resumen?.errores || 0,
    duplicados: (preview.resumen?.duplicados || 0) + duplicadosConfirmacionTotal,
  };
}

export async function listarHistorialCargasMock() {
  await delay(200);
  await syncApiDb();
  return Array.isArray(apiDb.historialCargas) ? [...apiDb.historialCargas] : [];
}

export async function eliminarCargaAlumnosMock(cargaId) {
  await delay(400);
  await syncApiDb();
  apiDb.historialCargas = Array.isArray(apiDb.historialCargas) ? apiDb.historialCargas : [];
  const carga = apiDb.historialCargas.find((item) => item.id === cargaId);
  if (!carga) throw new Error("No se encontro la carga seleccionada.");

  const registros = Array.isArray(carga.registros) ? carga.registros : [];
  const tieneInscripcion = registros.some((registro) =>
    apiDb.inscripciones.some((inscripcion) =>
      inscripcion.programaId === registro.programaId &&
      inscripcion.dniEstudiante === registro.dni &&
      inscripcion.estadoInscripcion !== "Anulada"
    )
  );
  if (tieneInscripcion) {
    throw new Error("No se puede borrar esta carga porque uno o mas alumnos ya tienen inscripcion activa.");
  }

  let eliminados = 0;
  const programasAfectados = new Set(registros.map((registro) => registro.programaId).filter(Boolean));
  programasAfectados.forEach((programaId) => {
    const actuales = apiDb.invitadosPorPrograma[programaId] || [];
    const filtrados = actuales.filter((invitado) => invitado.cargaId !== cargaId);
    eliminados += actuales.length - filtrados.length;
    apiDb.invitadosPorPrograma[programaId] = filtrados;
    sincronizarGradosProgramaConInvitados(programaId);
  });

  apiDb.historialCargas = apiDb.historialCargas.filter((item) => item.id !== cargaId);
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return { cargaId, eliminados };
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

// --- MOCK INTERNAL HELPERS ---
export function normalizarPeriodosGuardados() {
  let cambio = false;
  apiDb.programas.forEach((programa) => {
    const normalizado = normalizarPeriodo(programa.periodo);
    if (programa.periodo !== normalizado) {
      programa.periodo = normalizado;
      cambio = true;
    }
  });
  if (cambio) {
    saveApiDb();
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  }
}

function finalizarProgramasVencidos() {
  const hoy = normalizarFecha(fechaActualInput());
  if (!hoy) return;

  let cambio = false;
  apiDb.programas.forEach((programa) => {
    if (!debeFinalizarPorFecha(programa, hoy)) return;
    programa.estado = "Finalizado";
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    cambio = true;
  });

  if (cambio) {
    saveApiDb();
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  }
}

function normalizarAlumnoCarga(estudiante = {}) {
  const nombres = limpiarTexto(estudiante.nombres);
  const apellidos = limpiarTexto(estudiante.apellidos);
  const nombreCompleto = [nombres, apellidos].filter(Boolean).join(" ").trim() || nombres;

  return {
    dni: limpiarTexto(estudiante.dni).replace(/\D/g, ""),
    nombre: nombreCompleto,
    grado: limpiarTexto(estudiante.grado || estudiante.gradoNombre || estudiante.grado_nombre),
  };
}
