import { apiDb, nextApiId, saveApiDb, syncApiDb } from "../../../services/dbApi";
import { isApiMode, apiClient } from "../../../services/apiClient";
import {
  adaptarPrograma,
  adaptarEstudiante,
  adaptarInscripcion,
  adaptarPago,
  adaptarAsistencia
} from "../../../services/adapters";
import {
  calcularDuracionTexto,
  fechaActualInput,
  fechaActualIso,
  normalizarDuracionAvisoDias,
  normalizarFecha,
} from "../../../services/dateService";
import { esProgramaCambridge } from "../utils/coordinacionProgramUtils";
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
} from "./coordinacionServiceUtils";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizarTextoSimple = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const esCategoriaAcademica = (programa = {}) =>
  normalizarTextoSimple(programa.categoria).includes("academ");
const obtenerApiBase = () => String(
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? import.meta.env.VITE_LOCAL_API_URL : "") ||
  ""
).replace(/\/$/, "");

export async function listarCategorias() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/categorias");
    if (!res.success) throw new Error(res.message || "Error al listar categorías");
    return res.data;
  }
  await delay(300);
  await syncApiDb();
  return [...apiDb.categorias];
}

export async function crearCategoria(nombre) {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/extracurricular/categorias", { nombre });
    if (!res.success) throw new Error(res.message || "Error al crear categoría");
    return res.data;
  }
  await delay(300);
  if (apiDb.categorias.includes(nombre)) throw new Error("La categoría ya existe.");
  apiDb.categorias.push(nombre);
  await saveApiDb();
  return nombre;
}

export async function eliminarCategoria(nombre) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/categorias/${nombre}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar categoría");
    return nombre;
  }
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
  return categoria;
}

export async function listarProgramas() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/programas");
    if (!res.success) throw new Error(res.message || "Error al listar programas");
    return res.data.map(adaptarPrograma);
  }
  await delay(400);
  await syncApiDb();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  return apiDb.programas.map(conCuposDisponibles);
}

export async function obtenerPrograma(id) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${id}`);
    if (!res.success) throw new Error(res.message || "Error al obtener programa");
    return adaptarPrograma(res.data);
  }
  await delay(300);
  await syncApiDb();
  normalizarPeriodosGuardados();
  finalizarProgramasVencidos();
  const programa = apiDb.programas.find((item) => item.id === id);
  if (!programa) throw new Error("Programa no encontrado.");
  return conCuposDisponibles(programa);
}

export async function crearPrograma(datos) {
  if (isApiMode()) {
    const payload = {
      nombre_programa: datos.nombre,
      categoria: datos.categoria,
      fecha_inicio: datos.fechaInicio,
      fecha_fin: datos.fechaFin,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
      monto: Number(datos.costo || datos.precio || 0),
      cupos: Number(datos.cupos),
      grados: datos.gradosAplicables || [],
      responsable: datos.responsable || datos.docente || "",
      periodo: datos.periodo || "escolar",
      modalidad_cobro: datos.modalidadCobro || "Mensual",
      duracion_aviso_dias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      anuncio_imagen: datos.anuncioImagen || "",
      anuncio_imagen_nombre: datos.anuncioImagenNombre || "",
      talleres_deportivos: datos.talleresDeportivos || [],
      horarios_por_grupo: datos.horariosPorGrupo || [],
      requisitos: datos.requisitos || "",
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      invitacion_masiva: Boolean(datos.invitacionMasiva),
      alcance_invitacion_masiva: datos.alcanceInvitacionMasiva || "colegio",
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      plantilla_validada: Boolean(datos.plantillaValidada),
    };
    const res = await apiClient.post("/api/v1/extracurricular/programas", payload);
    if (!res.success) throw new Error(res.message || "Error al crear programa");
    return adaptarPrograma(res.data);
  }
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
    invitacionMasiva: Boolean(datos.invitacionMasiva),
    alcanceInvitacionMasiva: datos.invitacionMasiva ? datos.alcanceInvitacionMasiva || "colegio" : "",
    anuncioImagen: datos.invitacionMasiva ? datos.anuncioImagen || "" : "",
    anuncioImagenNombre: datos.invitacionMasiva ? datos.anuncioImagenNombre || "" : "",
    anuncioImagenTamano: datos.invitacionMasiva ? Number(datos.anuncioImagenTamano || 0) : 0,
    anuncioImagenComprimida: datos.invitacionMasiva ? Boolean(datos.anuncioImagenComprimida) : false,
    requiereIndumentaria: Boolean(datos.requiereIndumentaria),
  };

  apiDb.programas.push(nuevo);
  await saveApiDb();
  return conCuposDisponibles(nuevo);
}

export async function crearProgramaDesdeDocumento(datos) {
  if (isApiMode()) {
    const payload = {
      nombre_programa: datos.nombre,
      categoria: datos.categoria,
      fecha_inicio: datos.fechaInicio,
      fecha_fin: datos.fechaFin,
      monto: Number(datos.costo || 0),
      cupos: Number(datos.cupos || 0),
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      requisitos: datos.requisitos || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      creado_desde_documento: true,
      periodo: datos.periodo || "escolar",
      modalidad_cobro: datos.modalidadCobro || "Mensual",
      duracion_aviso_dias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      grados: datos.gradosAplicables || [],
      horario: datos.horario || "Por definir",
      grupo: datos.grupo || "Por definir",
    };
    const res = await apiClient.post("/api/v1/extracurricular/programas/documento", payload);
    if (!res.success) throw new Error(res.message || "Error al crear programa desde documento");
    return adaptarPrograma(res.data);
  }
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
    cupos: Number(datos.cupos) > 0 ? Number(datos.cupos) : 1,
    cuposOcupados: 0,
    costo: Number(datos.costo) > 0 ? Number(Number(datos.costo).toFixed(2)) : 1,
    modalidadCobro: datos.modalidadCobro || "Mensual",
    estado: "Deshabilitado",
    plantillaVariables: datos.plantillaVariables || [],
    plantillaValidada: true,
    requisitos: datos.requisitos || "",
    comunicado: datos.comunicado || "",
    comunicadoCompleto: datos.comunicadoCompleto || "",
    detalleCosto: datos.detalleCosto || "",
    detalleAlmuerzo: datos.detalleAlmuerzo || "",
    concesionarios: datos.concesionarios || "",
    requiereUniforme: Boolean(datos.requiereUniforme),
    requiereIndumentaria: Boolean(datos.requiereIndumentaria),
    invitacionMasiva: Boolean(datos.invitacionMasiva),
    alcanceInvitacionMasiva: datos.invitacionMasiva ? datos.alcanceInvitacionMasiva || "colegio" : "",
    anuncioImagen: datos.invitacionMasiva ? datos.anuncioImagen || "" : "",
    anuncioImagenNombre: datos.invitacionMasiva ? datos.anuncioImagenNombre || "" : "",
    anuncioImagenTamano: datos.invitacionMasiva ? Number(datos.anuncioImagenTamano || 0) : 0,
    anuncioImagenComprimida: datos.invitacionMasiva ? Boolean(datos.anuncioImagenComprimida) : false,
    creadoDesdeDocumento: true,
  };

  apiDb.programas.push(nuevo);
  await saveApiDb();
  return conCuposDisponibles(nuevo);
}

export async function editarPrograma(id, datos) {
  if (isApiMode()) {
    const payload = {
      nombre_programa: datos.nombre,
      categoria: datos.categoria,
      fecha_inicio: datos.fechaInicio,
      fecha_fin: datos.fechaFin,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
      monto: Number(datos.costo || datos.precio || 0),
      cupos: Number(datos.cupos),
      grados: datos.gradosAplicables || [],
      responsable: datos.responsable || datos.docente || "",
      periodo: datos.periodo || "escolar",
      modalidad_cobro: datos.modalidadCobro || "Mensual",
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      anuncio_imagen: datos.anuncioImagen || "",
      anuncio_imagen_nombre: datos.anuncioImagenNombre || "",
      talleres_deportivos: datos.talleresDeportivos || [],
      horarios_por_grupo: datos.horariosPorGrupo || [],
      requisitos: datos.requisitos || "",
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      invitacion_masiva: Boolean(datos.invitacionMasiva),
      alcance_invitacion_masiva: datos.alcanceInvitacionMasiva || "colegio",
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      plantilla_validada: Boolean(datos.plantillaValidada),
    };
    const res = await apiClient.put(`/api/v1/extracurricular/programas/${id}`, payload);
    if (!res.success) throw new Error(res.message || "Error al editar programa");
    return adaptarPrograma(res.data);
  }
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
    invitacionMasiva: Boolean(datos.invitacionMasiva),
    alcanceInvitacionMasiva: datos.invitacionMasiva ? datos.alcanceInvitacionMasiva || "colegio" : "",
    anuncioImagen: datos.invitacionMasiva ? datos.anuncioImagen || "" : "",
    anuncioImagenNombre: datos.invitacionMasiva ? datos.anuncioImagenNombre || "" : "",
    anuncioImagenTamano: datos.invitacionMasiva ? Number(datos.anuncioImagenTamano || 0) : 0,
    anuncioImagenComprimida: datos.invitacionMasiva ? Boolean(datos.anuncioImagenComprimida) : false,
    requiereIndumentaria: Boolean(datos.requiereIndumentaria),
  };

  await saveApiDb();
  return conCuposDisponibles(apiDb.programas[index]);
}

export async function cambiarEstadoPrograma(id, nuevoEstado) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/programas/${id}/estado`, { estado: nuevoEstado });
    if (!res.success) throw new Error(res.message || "Error al cambiar estado de programa");
    return adaptarPrograma(res.data);
  }
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
    throw new Error("El programa ya cumplió su fecha fin. Cree un nuevo ciclo para continuar.");
  }
  programa.estado = nuevoEstado;
  await saveApiDb();
  return conCuposDisponibles(programa);
}

export async function eliminarPrograma(id) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/programas/${id}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar programa");
    return true;
  }
  await delay(400);
  await syncApiDb();
  const index = apiDb.programas.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Programa no encontrado.");

  apiDb.programas.splice(index, 1);
  delete apiDb.invitadosPorPrograma[id];
  await saveApiDb();
  return true;
}

export async function listarInvitados(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/invitados`);
    if (!res.success) throw new Error(res.message || "Error al listar invitados");
    return res.data;
  }
  await delay(400);
  await syncApiDb();
  return [...(apiDb.invitadosPorPrograma[programaId] || [])];
}

export async function listarMatriculados(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/matriculados`);
    if (!res.success) throw new Error(res.message || "Error al listar matriculados");
    return res.data.map(adaptarInscripcion);
  }
  await delay(400);
  await syncApiDb();
  return (apiDb.inscripciones || [])
    .filter((item) => item.programaId === programaId && item.estadoInscripcion !== "Anulada")
    .map((item) => ({
      id: item.id,
      dni: item.dniEstudiante || "",
      codigoEstudiante: item.codigoEstudiante || "",
      nombres: item.nombresEstudiante || "",
      grado: item.gradoEstudiante || item.grado || "",
      seccion: item.seccion || "",
      estadoInscripcion: item.estadoInscripcion || "",
      estadoPago: item.estadoPago || "",
      origenRegistro: item.origenRegistro || "Presencial",
      fechaRegistro: item.fechaRegistro || "",
      costo: item.costo,
      apoderado: item.apoderado || "",
      telefono: item.telefono || "",
    }));
}

export async function listarAsistenciasPrograma(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/asistencias`);
    if (!res.success) throw new Error(res.message || "Error al listar asistencias");
    return res.data.map(adaptarAsistencia);
  }
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

export async function buscarInvitacionPorDniPeriodo(dni, periodo) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/invitaciones/buscar`, {
      params: { dni, periodo }
    });
    if (!res.success) return null;
    if (!res.data) return null;
    return {
      programaId: res.data.programaId,
      programa: adaptarPrograma(res.data.programa),
      invitado: res.data.invitado
    };
  }
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

export async function importarInvitados(programaId, lista) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/programas/${programaId}/invitados`, { lista });
    if (!res.success) throw new Error(res.message || "Error al importar invitados");
    return res.data;
  }
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
  return { importados: nuevos.length, duplicados };
}

export async function previsualizarCargaAlumnos({ periodo, archivoNombre, archivo, programaId }) {
  await syncApiDb();
  normalizarPeriodosGuardados();

  if (!archivo) throw new Error("Seleccione un archivo Excel.");
  validarArchivoExcelFrontend({ archivoNombre, archivo });

  const formData = new FormData();
  formData.append("periodo", periodo);
  formData.append("archivo", archivo);
  formData.append("programas", JSON.stringify(prepararProgramasParaPreview(apiDb.programas)));
  formData.append("existentes", JSON.stringify(apiDb.invitadosPorPrograma));
  formData.append("estudiantes", JSON.stringify(apiDb.estudiantes || {}));
  if (programaId) formData.append("programaId", programaId);

  const response = await fetch(`${obtenerApiBase()}/api/coordinacion/cargas/preview`, {
    method: "POST",
    body: formData,
  }).catch(() => {
    throw new Error(obtenerMensajeConexionApi());
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "No se pudo validar el archivo Excel.");
  }

  return data;
}

function prepararProgramasParaPreview(programas = []) {
  return programas.map((programa) => ({
    id: programa.id,
    nombre: programa.nombre,
    categoria: programa.categoria,
    periodo: programa.periodo,
    estado: programa.estado,
    plantilla: programa.plantilla,
    plantillaVariables: programa.plantillaVariables || [],
  }));
}

export async function previsualizarCargaAlumnosMasiva({ periodo, archivos, programaId, onProgress }) {
  const lista = Array.from(archivos || []);
  if (!lista.length) throw new Error("Seleccione al menos un archivo Excel.");
  if (lista.length > 6) throw new Error("Puede subir hasta 6 archivos Excel por carga.");

  const totalBytes = lista.reduce((total, archivo) => total + Number(archivo.size || 0), 0);
  if (totalBytes > 25 * 1024 * 1024) {
    throw new Error("La carga masiva no debe superar 25 MB en total.");
  }

  const previews = [];
  for (const [index, archivo] of lista.entries()) {
    onProgress?.({
      actual: index + 1,
      total: lista.length,
      porcentaje: Math.round((index / lista.length) * 100),
      archivo: archivo.name,
      estado: "validando",
    });

    const preview = await previsualizarCargaAlumnos({
      periodo,
      archivoNombre: archivo.name,
      archivo,
      programaId,
    });
    previews.push(preview);

    onProgress?.({
      actual: index + 1,
      total: lista.length,
      porcentaje: Math.round(((index + 1) / lista.length) * 100),
      archivo: archivo.name,
      estado: "completado",
    });
  }

  return combinarPreviewsCarga({ periodo, previews });
}

function combinarPreviewsCarga({ periodo, previews }) {
  const claves = new Set();
  const registros = [];

  previews.forEach((preview, archivoIndex) => {
    const archivoNombre = preview.archivoNombre || `Archivo ${archivoIndex + 1}`;
    preview.registros.forEach((registro) => {
      const item = {
        ...registro,
        archivoNombre,
        fila: `${archivoIndex + 1}.${registro.fila}`,
      };

      const clave = claveRegistroPreview(item);
      if (item.estado === "Valido" && clave && claves.has(clave)) {
        item.estado = "Duplicado";
        item.errores = [...(item.errores || []), "Alumno duplicado entre archivos de la misma carga."];
      }

      if (item.estado === "Valido" && clave) claves.add(clave);
      registros.push(item);
    });
  });

  return {
    id: `PREVIEW-MASIVO-${Date.now()}`,
    periodo,
    archivoNombre: previews.map((preview) => preview.archivoNombre).join(", "),
    archivos: previews.map((preview) => preview.archivoNombre),
    registros,
    resumen: {
      total: registros.length,
      validos: registros.filter((item) => item.estado === "Valido").length,
      errores: registros.filter((item) => item.estado === "Error").length,
      duplicados: registros.filter((item) => item.estado === "Duplicado").length,
    },
  };
}

function claveRegistroPreview(registro) {
  if (!registro.programaId) return "";
  if (registro.dni) return `${registro.programaId}:dni:${registro.dni}`;
  const nombre = `${registro.nombres || ""} ${registro.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `${registro.programaId}:nombre:${nombre}:${registro.grado}:${registro.seccion}` : "";
}

export async function registrarAlumnoIndividualCarga({ periodo, programaId, dni, nombre, grado }) {
  await syncApiDb();
  normalizarPeriodosGuardados();

  const programa = (apiDb.programas || []).find((item) => String(item.id) === String(programaId));
  if (!programa) throw new Error("Seleccione un programa o curso.");
  if (!esCategoriaAcademica(programa)) throw new Error("La carga de alumnos solo permite programas de categoría Académico.");

  const dniLimpio = limpiarTexto(dni).replace(/\D/g, "");
  const nombreLimpio = limpiarTexto(nombre);
  const gradoLimpio = limpiarTexto(grado);
  const errores = [];

  if (!/^\d{8}$/.test(dniLimpio)) errores.push("DNI inválido. Debe tener 8 dígitos.");
  if (!textoSeguro(nombreLimpio)) errores.push("Falta nombre.");
  if (!textoSeguro(gradoLimpio)) errores.push("Falta grado.");
  if (gradoLimpio && !gradoCorrespondeAlPrograma(programa, gradoLimpio)) {
    errores.push("El alumno no está dentro de su grado correspondiente para este taller.");
  }

  const existente = (apiDb.invitadosPorPrograma?.[programa.id] || []).find((item) =>
    String(item.dni || "").replace(/\D/g, "") === dniLimpio
  );
  if (existente) errores.push("El alumno ya existe en este programa.");
  if (String(programa.estado || "Habilitado") !== "Habilitado") {
    errores.push(`El programa ${programa.nombre || "seleccionado"} está ${programa.estado}. Habilítelo antes de registrar alumnos.`);
  }
  if (errores.length) throw new Error(errores.join(" "));

  const preview = {
    id: `PREVIEW-INDIVIDUAL-${Date.now()}`,
    periodo: normalizarPeriodo(periodo),
    archivoNombre: "Registro individual",
    archivos: ["Registro individual"],
    registros: [{
      fila: 1,
      dni: dniLimpio,
      nombres: nombreLimpio,
      apellidos: "",
      grado: gradoLimpio,
      seccion: "",
      seleccion: "",
      curso: "",
      nivelCambridge: "",
      programaId: programa.id,
      programaNombre: programa.nombre,
      estado: "Valido",
      errores: [],
      estadoAlumno: "Invitado",
    }],
    resumen: {
      total: 1,
      validos: 1,
      errores: 0,
      duplicados: 0,
    },
  };

  return confirmarCargaAlumnos(preview);
}

export async function buscarAlumnoCargaPorDni(dni, periodo = "escolar") {
  const dniLimpio = limpiarTexto(dni).replace(/\D/g, "");
  if (!/^\d{8}$/.test(dniLimpio)) return null;

  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes/${dniLimpio}`, {
      params: { periodo: normalizarPeriodo(periodo) },
    });
    if (!res.success || !res.data) return null;
    return normalizarAlumnoCarga(adaptarEstudiante(res.data));
  }

  await syncApiDb();
  const estudiante = apiDb.estudiantes?.[dniLimpio];
  if (!estudiante) return null;
  return normalizarAlumnoCarga(estudiante);
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

function gradoCorrespondeAlPrograma(programa = {}, gradoAlumno = "") {
  const gradoNormalizado = descomponerGradoCarga(gradoAlumno);
  if (!gradoNormalizado.numero) return false;

  const gradosConfigurados = obtenerGradosConfiguradosPrograma(programa);
  if (!gradosConfigurados.length) return true;

  return gradosConfigurados.some((grado) =>
    gradosCoincidenCarga(descomponerGradoCarga(grado), gradoNormalizado)
  );
}

function obtenerGradosConfiguradosPrograma(programa = {}) {
  const grados = [];
  if (Array.isArray(programa.gradosAplicables)) {
    grados.push(...programa.gradosAplicables);
  }
  if (Array.isArray(programa.horariosPorGrupo)) {
    programa.horariosPorGrupo.forEach((grupo) => {
      if (Array.isArray(grupo.grados)) grados.push(...grupo.grados);
    });
  }
  return grados.filter(Boolean);
}

function descomponerGradoCarga(valor = "") {
  const texto = normalizarTextoSimple(valor).replace(":", " ");
  const nivel = ["inicial", "primaria", "secundaria"].find((item) => texto.includes(item)) || "";
  const numero = texto.match(/\d+/)?.[0] || "";
  return { nivel, numero };
}
function gradosCoincidenCarga(gradoPrograma, gradoAlumno) {
  if (!gradoPrograma.numero || !gradoAlumno.numero) return false;
  if (gradoPrograma.numero !== gradoAlumno.numero) return false;
  return !gradoPrograma.nivel || !gradoAlumno.nivel || gradoPrograma.nivel === gradoAlumno.nivel;
}

export async function confirmarCargaAlumnos(preview) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/coordinacion/cargas/confirmar`, preview);
    if (!res.success) throw new Error(res.message || "Error al confirmar carga de alumnos");
    return res.data;
  }
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
    agregarGradoProgramaDesdeAlumno(programaCarga, item.grado);
    programasTocados.add(item.programaId);
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
    const existingIndex = (apiDb.historialCargas || []).findIndex(
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

export async function listarHistorialCargas() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/coordinacion/cargas");
    if (!res.success) throw new Error(res.message || "Error al listar historial de cargas");
    return Array.isArray(res.data) ? res.data : [];
  }
  await delay(200);
  await syncApiDb();
  return Array.isArray(apiDb.historialCargas) ? [...apiDb.historialCargas] : [];
}

export async function eliminarCargaAlumnos(cargaId) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/coordinacion/cargas/${cargaId}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar carga");
    return res.data;
  }
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
  return { cargaId, eliminados };
}

export async function obtenerActividadPrograma(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/actividad`);
    if (!res.success) throw new Error(res.message || "Error al obtener actividad del programa");
    return res.data;
  }
  await delay(200);
  await syncApiDb();
  const alumnos = apiDb.invitadosPorPrograma[programaId]?.length || 0;
  const inscripciones = apiDb.inscripciones.filter((item) => item.programaId === programaId).length;
  const documentos = (apiDb.documentosGenerados || []).filter((item) => item.programaId === programaId).length;
  return { alumnos, inscripciones, documentos, tieneActividad: alumnos + inscripciones + documentos > 0 };
}

export async function obtenerErroresCarga(cargaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/coordinacion/cargas/${cargaId}/errores`);
    if (!res.success) return [];
    return res.data;
  }
  await delay(250);
  await syncApiDb();
  return [];
}

export async function obtenerListaAsistencia(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/lista-asistencia`);
    if (!res.success) throw new Error(res.message || "Error al obtener lista de asistencia");
    return res.data;
  }
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

function normalizarPeriodosGuardados() {
  let cambio = false;
  apiDb.programas.forEach((programa) => {
    const normalizado = normalizarPeriodo(programa.periodo);
    if (programa.periodo !== normalizado) {
      programa.periodo = normalizado;
      cambio = true;
    }
  });
  if (cambio) saveApiDb();
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

  if (cambio) saveApiDb();
}

function obtenerMensajeConexionApi() {
  if (import.meta.env.PROD && !obtenerApiBase()) {
    return "No se pudo conectar con el backend. En la nube falta configurar VITE_API_URL con la URL publica de la API.";
  }

  return "No se pudo conectar con el servidor. Verifique que la API este ejecutandose.";
}

