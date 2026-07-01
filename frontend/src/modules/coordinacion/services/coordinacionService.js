import { isApiMode, apiClient } from "../../../services/apiClient";
import ExcelJS from "exceljs";
import {
  adaptarPrograma,
  adaptarInscripcion,
  adaptarAsistencia,
  adaptarEstudiante
} from "../../../services/adapters";
import {
  normalizarDuracionAvisoDias,
  fechaActualInput,
  calcularDuracionTexto,
} from "../../../services/dateService";
import { apiDb, saveApiDb, syncApiDb, dispatchApiDbUpdated } from "../../../services/dbApi";
import {
  validarArchivoExcelFrontend,
  limpiarTexto,
  textoSeguro,
  normalizarPeriodo
} from "./coordinacionServiceUtils";
import {
  listarCategoriasMock,
  crearCategoriaMock,
  eliminarCategoriaMock,
  listarProgramasMock,
  obtenerProgramaMock,
  crearProgramaMock,
  crearProgramaDesdeDocumentoMock,
  editarProgramaMock,
  cambiarEstadoProgramaMock,
  eliminarProgramaMock,
  listarInvitadosMock,
  listarMatriculadosMock,
  listarAsistenciasProgramaMock,
  buscarInvitacionPorDniPeriodoMock,
  importarInvitadosMock,
  buscarAlumnoCargaPorDniMock,
  confirmarCargaAlumnosMock,
  listarHistorialCargasMock,
  eliminarCargaAlumnosMock,
  obtenerActividadProgramaMock,
  obtenerListaAsistenciaMock,
  normalizarPeriodosGuardados
} from "../utils/coordinacionServiceMock";

const obtenerApiBase = () => String(
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? import.meta.env.VITE_LOCAL_API_URL : "") ||
  ""
).replace(/\/$/, "");

const obtenerMensajeConexionApi = () => {
  if (import.meta.env.PROD && !obtenerApiBase()) {
    return "No se pudo conectar con el backend. En la nube falta configurar VITE_API_URL con la URL publica de la API.";
  }
  return "No se pudo conectar con el servidor. Verifique que la API este ejecutandose.";
};

function prepararProgramasParaPreview(programas = []) {
  return programas.map((programa) => ({
    id: programa.id,
    nombre: programa.nombre,
    categoria: programa.categoria,
    periodo: programa.periodo,
    estado: programa.estado,
    plantilla: programa.plantilla,
    plantillaVariables: programa.plantillaVariables || [],
    gradosAplicables: programa.gradosAplicables || [],
    horariosPorGrupo: programa.horariosPorGrupo || [],
  }));
}

function claveRegistroPreview(registro) {
  if (!registro.programaId) return "";
  if (registro.dni) return `${registro.programaId}:dni:${registro.dni}`;
  const nombre = `${registro.nombres || ""} ${registro.apellidos || ""}`.trim().toLowerCase();
  return nombre ? `${registro.programaId}:nombre:${nombre}:${registro.grado}` : "";
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

function normalizarTextoSimple(valor = "") {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function esCategoriaAcademica(programa = {}) {
  const norm = normalizarTextoSimple(programa.categoria);
  return norm.includes("academ") || norm.includes("vacaciones utiles");
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

// --- EXPORTED SWITCHER API ---

export async function listarCategorias() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/categorias");
    if (!res.success) throw new Error(res.message || "Error al listar categorías");
    return res.data;
  }
  return listarCategoriasMock();
}

export async function crearCategoria(nombre) {
  if (isApiMode()) {
    const res = await apiClient.post("/api/v1/extracurricular/categorias", { nombre });
    if (!res.success) throw new Error(res.message || "Error al crear categoría");
    return res.data;
  }
  return crearCategoriaMock(nombre);
}

export async function eliminarCategoria(nombre) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/categorias/${nombre}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar categoría");
    return nombre;
  }
  return eliminarCategoriaMock(nombre);
}

export async function listarProgramas() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/programas");
    if (!res.success) throw new Error(res.message || "Error al listar programas");
    return res.data.map(adaptarPrograma);
  }
  return listarProgramasMock();
}

export async function obtenerPrograma(id) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${id}`);
    if (!res.success) throw new Error(res.message || "Error al obtener programa");
    return adaptarPrograma(res.data);
  }
  return obtenerProgramaMock(id);
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
      hora_limite_aviso: datos.horaLimiteAviso || "23:59",
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      usar_fecha_limite_inscripcion: Boolean(datos.usarFechaLimiteInscripcion),
      fecha_apertura_inscripcion: datos.fechaAperturaInscripcion || "",
      hora_apertura_inscripcion: datos.horaAperturaInscripcion || "",
      fecha_limite_inscripcion: datos.fechaLimiteInscripcion || "",
      hora_limite_inscripcion: datos.horaLimiteInscripcion || "",
      anuncio_imagen: datos.anuncioImagen || "",
      anuncio_imagen_nombre: datos.anuncioImagenNombre || "",
      talleres_deportivos: datos.talleresDeportivos || [],
      horarios_por_grupo: datos.horariosPorGrupo || [],
      horario: datos.horario || "Por definir",
      grupo: datos.grupo || "Por definir",
      edad_minima: datos.edadMinima || "",
      edad_maxima: datos.edadMaxima || "",
      grupo_etario: datos.grupoEtario || "",
      requisitos: datos.requisitos || "",
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      tipo_comunicado: datos.tipoComunicado || "",
      tipo_documento: datos.tipoDocumento || "",
      numero_documento: datos.numeroDocumento || "",
      area_tematica: datos.areaTematica || "",
      motivo_justificacion: datos.motivoJustificacion || datos.comunicado || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      incluye_almuerzo: Boolean(datos.incluyeAlmuerzo),
      horario_recepcion_almuerzo: datos.horarioRecepcionAlmuerzo || "",
      nivel_cambridge: datos.nivelCambridge || "",
      modalidades_cambridge: datos.modalidadesCambridge || [],
      costo_ciclo: datos.costoCiclo || datos.costo || "",
      monto_primer_pago: datos.montoPrimerPago || "",
      invitacion_masiva: Boolean(datos.invitacionMasiva),
      alcance_invitacion_masiva: datos.alcanceInvitacionMasiva || "colegio",
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      plantilla_validada: Boolean(datos.plantillaValidada),
      dias: datos.dias || [],
    };
    const res = await apiClient.post("/api/v1/extracurricular/programas", payload);
    if (!res.success) throw new Error(res.message || "Error al crear programa");
    dispatchApiDbUpdated();
    return adaptarPrograma(res.data);
  }
  return crearProgramaMock(datos);
}

export async function crearProgramaDesdeDocumento(datos) {
  if (isApiMode()) {
    const payload = {
      nombre_programa: datos.nombre,
      categoria: datos.categoria,
      fecha_inicio: datos.fechaInicio || fechaActualInput(),
      fecha_fin: datos.fechaFin || fechaActualInput(),
      monto: Number(datos.costo || 0),
      cupos: Number(datos.cupos || 0),
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      tipo_comunicado: datos.tipoComunicado || "",
      tipo_documento: datos.tipoDocumento || "",
      numero_documento: datos.numeroDocumento || "",
      area_tematica: datos.areaTematica || "",
      motivo_justificacion: datos.motivoJustificacion || datos.comunicado || "",
      requisitos: datos.requisitos || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      incluye_almuerzo: Boolean(datos.incluyeAlmuerzo),
      horario_recepcion_almuerzo: datos.horarioRecepcionAlmuerzo || "",
      nivel_cambridge: datos.nivelCambridge || "",
      modalidades_cambridge: datos.modalidadesCambridge || [],
      costo_ciclo: datos.costoCiclo || datos.costo || "",
      monto_primer_pago: datos.montoPrimerPago || "",
      creado_desde_documento: true,
      periodo: datos.periodo || "escolar",
      modalidad_cobro: datos.modalidadCobro || "Mensual",
      duracion_aviso_dias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
      hora_limite_aviso: datos.horaLimiteAviso || "23:59",
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      usar_fecha_limite_inscripcion: Boolean(datos.usarFechaLimiteInscripcion),
      fecha_apertura_inscripcion: datos.fechaAperturaInscripcion || "",
      hora_apertura_inscripcion: datos.horaAperturaInscripcion || "",
      fecha_limite_inscripcion: datos.fechaLimiteInscripcion || "",
      hora_limite_inscripcion: datos.horaLimiteInscripcion || "",
      grados: datos.gradosAplicables || [],
      horario: datos.horario || "Por definir",
      grupo: datos.grupo || "Por definir",
      edad_minima: datos.edadMinima || "",
      edad_maxima: datos.edadMaxima || "",
      grupo_etario: datos.grupoEtario || "",
      dias: datos.dias || [],
    };
    const res = await apiClient.post("/api/v1/extracurricular/programas/documento", payload);
    if (!res.success) throw new Error(res.message || "Error al crear programa desde documento");
    dispatchApiDbUpdated();
    return adaptarPrograma(res.data);
  }
  return crearProgramaDesdeDocumentoMock(datos);
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
      duracion_aviso_dias: normalizarDuracionAvisoDias(datos.duracionAvisoDias, 7),
      hora_limite_aviso: datos.horaLimiteAviso || "23:59",
      requiere_uniforme: Boolean(datos.requiereUniforme),
      requiere_indumentaria: Boolean(datos.requiereIndumentaria),
      usar_fecha_limite_inscripcion: Boolean(datos.usarFechaLimiteInscripcion),
      fecha_apertura_inscripcion: datos.fechaAperturaInscripcion || "",
      hora_apertura_inscripcion: datos.horaAperturaInscripcion || "",
      fecha_limite_inscripcion: datos.fechaLimiteInscripcion || "",
      hora_limite_inscripcion: datos.horaLimiteInscripcion || "",
      anuncio_imagen: datos.anuncioImagen || "",
      anuncio_imagen_nombre: datos.anuncioImagenNombre || "",
      talleres_deportivos: datos.talleresDeportivos || [],
      horarios_por_grupo: datos.horariosPorGrupo || [],
      horario: datos.horario || "Por definir",
      grupo: datos.grupo || "Por definir",
      edad_minima: datos.edadMinima || "",
      edad_maxima: datos.edadMaxima || "",
      grupo_etario: datos.grupoEtario || "",
      requisitos: datos.requisitos || "",
      comunicado: datos.comunicado || "",
      comunicado_completo: datos.comunicadoCompleto || "",
      tipo_comunicado: datos.tipoComunicado || "",
      tipo_documento: datos.tipoDocumento || "",
      numero_documento: datos.numeroDocumento || "",
      area_tematica: datos.areaTematica || "",
      motivo_justificacion: datos.motivoJustificacion || datos.comunicado || "",
      detalle_costo: datos.detalleCosto || "",
      detalle_almuerzo: datos.detalleAlmuerzo || "",
      concesionarios: datos.concesionarios || "",
      incluye_almuerzo: Boolean(datos.incluyeAlmuerzo),
      horario_recepcion_almuerzo: datos.horarioRecepcionAlmuerzo || "",
      nivel_cambridge: datos.nivelCambridge || "",
      modalidades_cambridge: datos.modalidadesCambridge || [],
      costo_ciclo: datos.costoCiclo || datos.costo || "",
      monto_primer_pago: datos.montoPrimerPago || "",
      invitacion_masiva: Boolean(datos.invitacionMasiva),
      alcance_invitacion_masiva: datos.alcanceInvitacionMasiva || "colegio",
      plantilla: datos.plantilla || "",
      plantilla_base64: datos.plantillaBase64 || "",
      plantilla_variables: datos.plantillaVariables || [],
      plantilla_validada: Boolean(datos.plantillaValidada),
      dias: datos.dias || [],
    };
    const res = await apiClient.put(`/api/v1/extracurricular/programas/${id}`, payload);
    if (!res.success) throw new Error(res.message || "Error al editar programa");
    dispatchApiDbUpdated();
    return adaptarPrograma(res.data);
  }
  return editarProgramaMock(id, datos);
}

export async function cambiarEstadoPrograma(id, nuevoEstado) {
  if (isApiMode()) {
    const res = await apiClient.put(`/api/v1/extracurricular/programas/${id}/estado`, { estado: nuevoEstado });
    if (!res.success) throw new Error(res.message || "Error al cambiar estado de programa");
    dispatchApiDbUpdated();
    return adaptarPrograma(res.data);
  }
  return cambiarEstadoProgramaMock(id, nuevoEstado);
}

export async function eliminarPrograma(id) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/programas/${id}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar programa");
    dispatchApiDbUpdated();
    return true;
  }
  return eliminarProgramaMock(id);
}

export async function listarInvitados(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/invitados`);
    if (!res.success) throw new Error(res.message || "Error al listar invitados");
    return res.data;
  }
  return listarInvitadosMock(programaId);
}

export async function listarMatriculados(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/matriculados`);
    if (!res.success) throw new Error(res.message || "Error al listar matriculados");
    return res.data.map(adaptarInscripcion);
  }
  return listarMatriculadosMock(programaId);
}

export async function listarAsistenciasPrograma(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/asistencias`);
    if (!res.success) throw new Error(res.message || "Error al listar asistencias");
    return res.data.map(adaptarAsistencia);
  }
  return listarAsistenciasProgramaMock(programaId);
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
  return buscarInvitacionPorDniPeriodoMock(dni, periodo);
}

export async function importarInvitados(programaId, lista) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/programas/${programaId}/invitados`, { lista });
    if (!res.success) throw new Error(res.message || "Error al importar invitados");
    return res.data;
  }
  return importarInvitadosMock(programaId, lista);
}

export async function previsualizarCargaAlumnos({ periodo, archivoNombre, archivo, programaId }) {
  await syncApiDb();
  normalizarPeriodosGuardados();

  if (!archivo) throw new Error("Seleccione un archivo Excel.");
  validarArchivoExcelFrontend({ archivoNombre, archivo });

  const periodoNormalizado = normalizarPeriodo(periodo);
  const programasPeriodo = (apiDb.programas || []).filter((programa) =>
    normalizarPeriodo(programa.periodo) === periodoNormalizado
  );
  const programaSeleccionado = programaId
    ? programasPeriodo.find((programa) => String(programa.id) === String(programaId)) || null
    : null;

  if (programaId && !programaSeleccionado) {
    throw new Error("Seleccione un programa habilitado del periodo actual antes de cargar el Excel.");
  }

  // Leer y procesar localmente en el frontend usando ExcelJS
  const filas = await leerExcelLocal(archivo);
  const registros = validarRegistrosLocal({
    filas,
    programasPeriodo,
    programaSeleccionado,
    existentes: apiDb.invitadosPorPrograma || {},
    estudiantes: apiDb.estudiantes || {},
  });

  return {
    id: `PREVIEW-${Date.now()}`,
    periodo: periodoNormalizado,
    archivoNombre: renombrarArchivoLocal(archivo.name),
    registros,
    resumen: {
      total: registros.length,
      validos: registros.filter((item) => item.estado === "Valido").length,
      errores: registros.filter((item) => item.estado === "Error").length,
      duplicados: registros.filter((item) => item.estado === "Duplicado").length,
    },
  };
}

export async function previsualizarCargaAlumnosMasiva({ periodo, archivos, programaId, onProgress }) {
  const lista = Array.from(archivos || []);
  if (!lista.length) throw new Error("Seleccione al menos un archivo Excel.");
  if (lista.length > 15) throw new Error("Puede subir hasta 15 archivos Excel por carga.");

  const totalBytes = lista.reduce((total, archivo) => total + Number(archivo.size || 0), 0);
  if (totalBytes > 50 * 1024 * 1024) {
    throw new Error("La carga masiva no debe superar 50 MB en total.");
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

export async function registrarAlumnoIndividualCarga({ periodo, programaId, dni, nombre, grado, forzarGrado = false }) {
  await syncApiDb();
  normalizarPeriodosGuardados();

  const programa = (apiDb.programas || []).find((item) => String(item.id) === String(programaId));
  if (!programa) throw new Error("Seleccione un programa o curso.");

  const dniLimpio = limpiarTexto(dni).replace(/\D/g, "");
  const nombreLimpio = limpiarTexto(nombre);
  const gradoLimpio = limpiarTexto(grado);
  const errores = [];

  if (!/^\d{8}$/.test(dniLimpio)) errores.push("DNI inválido. Debe tener 8 dígitos.");
  if (!textoSeguro(nombreLimpio)) errores.push("Falta nombre.");
  if (!textoSeguro(gradoLimpio)) errores.push("Falta grado.");

  const gradoNoCorresponde = gradoLimpio && !gradoCorrespondeAlPrograma(programa, gradoLimpio);
  if (gradoNoCorresponde && !forzarGrado) {
    return {
      requiereConfirmacion: true,
      mensaje: `El grado "${gradoLimpio}" no está dentro de los grados configurados para el taller "${programa.nombre}". ¿Está seguro de inscribir al alumno en este taller?`,
    };
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
  return buscarAlumnoCargaPorDniMock(dniLimpio);
}

export async function confirmarCargaAlumnos(preview) {
  if (isApiMode()) {
    const res = await apiClient.post(`/api/v1/extracurricular/coordinacion/cargas/confirmar`, preview);
    if (!res.success) throw new Error(res.message || "Error al confirmar carga de alumnos");
    return res.data;
  }
  return confirmarCargaAlumnosMock(preview);
}

export async function listarHistorialCargas() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/coordinacion/cargas");
    if (!res.success) throw new Error(res.message || "Error al listar historial de cargas");
    return Array.isArray(res.data) ? res.data : [];
  }
  return listarHistorialCargasMock();
}

const CONFIG_INSTITUCIONAL_INICIAL = {
  logoInstitucion: null,
  logoCambridge: null,
  firmaCoordinacion: null,
  firmaDireccion: null,
  selloInstitucion: null,
};

function normalizarConfiguracionInstitucional(valor = {}) {
  return {
    ...CONFIG_INSTITUCIONAL_INICIAL,
    ...(valor && typeof valor === "object" ? valor : {}),
  };
}

export async function obtenerConfiguracionInstitucional() {
  if (isApiMode()) {
    const res = await apiClient.get("/api/v1/extracurricular/coordinacion/configuracion-institucional");
    if (!res.success) throw new Error(res.message || "Error al obtener configuracion institucional");
    return normalizarConfiguracionInstitucional(res.data);
  }

  await syncApiDb();
  return normalizarConfiguracionInstitucional(apiDb.configuracionInstitucional);
}

export async function guardarConfiguracionInstitucional(configuracion) {
  const normalizada = normalizarConfiguracionInstitucional(configuracion);
  if (isApiMode()) {
    const res = await apiClient.put("/api/v1/extracurricular/coordinacion/configuracion-institucional", normalizada);
    if (!res.success) throw new Error(res.message || "Error al guardar configuracion institucional");
    dispatchApiDbUpdated();
    return normalizarConfiguracionInstitucional(res.data);
  }

  await syncApiDb();
  apiDb.configuracionInstitucional = normalizada;
  await saveApiDb();
  return normalizada;
}

export async function eliminarCargaAlumnos(cargaId) {
  if (isApiMode()) {
    const res = await apiClient.delete(`/api/v1/extracurricular/coordinacion/cargas/${cargaId}`);
    if (!res.success) throw new Error(res.message || "Error al eliminar carga");
    return res.data;
  }
  return eliminarCargaAlumnosMock(cargaId);
}

export async function obtenerActividadPrograma(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/actividad`);
    if (!res.success) throw new Error(res.message || "Error al obtener actividad del programa");
    return res.data;
  }
  return obtenerActividadProgramaMock(programaId);
}

export async function obtenerErroresCarga(cargaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/coordinacion/cargas/${cargaId}/errores`);
    if (!res.success) return [];
    return res.data;
  }
  // En mock, los errores siempre retornan vacío
  return [];
}

export async function obtenerListaAsistencia(programaId) {
  if (isApiMode()) {
    const res = await apiClient.get(`/api/v1/extracurricular/programas/${programaId}/lista-asistencia`);
    if (!res.success) throw new Error(res.message || "Error al obtener lista de asistencia");
    return res.data;
  }
  return obtenerListaAsistenciaMock(programaId);
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

// --- UTILERIAS LOCALES DE PROCESAMIENTO EXCEL FRONTEND ---

async function leerExcelLocal(archivo) {
  const arrayBuffer = await archivo.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(arrayBuffer, {
      ignoreNodes: ["dataValidations", "conditionalFormatting", "extLst"],
    });
  } catch (err) {
    throw new Error("El archivo no se pudo abrir como Excel .xlsx válido. Verifique que no esté dañado, protegido o guardado en otro formato.");
  }

  const hoja = workbook.worksheets[0];
  if (!hoja) throw new Error("El Excel no contiene hojas para validar.");

  const { encabezados, filaEncabezado } = obtenerEncabezadosLocal(hoja);
  const encabezadosCarga = encabezados.filter((item) => COLUMNAS_CARGA_EXCEL_LOCAL.has(item.nombre));
  validarColumnasObligatoriasLocal(encabezadosCarga);

  const filas = [];
  hoja.eachRow((row, rowNumber) => {
    if (rowNumber <= filaEncabezado) return;
    const fila = {};
    encabezadosCarga.forEach(({ nombre, columna }) => {
      fila[nombre] = limpiarTextoLocal(row.getCell(columna).text);
    });
    if (Object.values(fila).some(Boolean)) filas.push({ filaExcel: rowNumber, ...fila });
  });

  return filas;
}

const COLUMNAS_CARGA_EXCEL_LOCAL = new Set([
  "alumno",
  "apellidos",
  "codigo_estudiante",
  "curso_programa",
  "dni",
  "dni_o_codigo",
  "grado",
  "id",
  "nivel_cambridge",
  "nivel_educativo",
  "nombres",
  "observacion",
  "programa",
  "seccion",
  "seleccion",
]);

function obtenerEncabezadosLocal(hoja) {
  for (let fila = 1; fila <= Math.min(10, hoja.rowCount); fila += 1) {
    const encabezados = [];
    hoja.getRow(fila).eachCell((cell, columna) => {
      const nombre = normalizarEncabezadoLocal(cell.text);
      if (nombre) encabezados.push({ nombre, columna });
    });

    const disponibles = new Set(encabezados.map((item) => item.nombre));
    if (esFormatoCargaMasivaLocal(disponibles) || esFormatoCargaGeneralLocal(disponibles) || esFormatoCargaCambridgeLocal(disponibles) || esFormatoDocenteTalleresLocal(disponibles)) {
      return { encabezados, filaEncabezado: fila };
    }
  }

  throw new Error("No se encontró la fila de encabezados del Excel.");
}

function validarColumnasObligatoriasLocal(encabezados) {
  const disponibles = new Set(encabezados.map((item) => item.nombre));
  const formatoEstandar = esFormatoEstandarLocal(disponibles);
  const formatoNombreCompleto = esFormatoNombreCompletoLocal(disponibles);
  const formatoDocenteTalleres = esFormatoDocenteTalleresLocal(disponibles);
  const formatoCambridgeLista = esFormatoCambridgeListaLocal(disponibles);
  const formatoCargaMasiva = esFormatoCargaMasivaLocal(disponibles);
  
  const obligatorias = formatoCargaMasiva
    ? [
        disponibles.has("dni_o_codigo") ? "dni_o_codigo" : (disponibles.has("dni") ? "dni" : "codigo_estudiante"),
        disponibles.has("alumno") ? "alumno" : "nombres",
        "grado",
        "nivel_educativo"
      ]
    : formatoEstandar
    ? ["dni", "alumno", "nivel_educativo", "grado", "curso_programa"]
    : formatoCambridgeLista
      ? ["dni", "grado", "seleccion", "curso_programa"]
      : esFormatoCargaCambridgeLocal(disponibles) && !esFormatoCargaGeneralLocal(disponibles)
      ? ["dni", "alumno", "grado", "seleccion"]
      : formatoDocenteTalleres
        ? ["alumno", "nivel_educativo", "grado", "curso_programa"]
      : formatoNombreCompleto
        ? ["nombres", "grado", "curso_programa"]
      : ["dni", "nombres", "apellidos", "grado", "curso_programa"];
      
  const faltantes = obligatorias.filter((columna) => !disponibles.has(columna));
  if (faltantes.length) throw new Error(`Faltan columnas obligatorias: ${faltantes.join(", ")}.`);
}

function esFormatoCargaMasivaLocal(disponibles) {
  return (disponibles.has("dni") || disponibles.has("codigo_estudiante") || disponibles.has("dni_o_codigo")) &&
    disponibles.has("grado") &&
    (disponibles.has("alumno") || disponibles.has("nombres")) &&
    disponibles.has("nivel_educativo");
}

function esFormatoCargaGeneralLocal(disponibles) {
  return disponibles.has("curso_programa") &&
    (disponibles.has("dni") || disponibles.has("id") || disponibles.has("alumno") || disponibles.has("nombres"));
}

function esFormatoDocenteTalleresLocal(disponibles) {
  return disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

function esFormatoCargaCambridgeLocal(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("seleccion");
}

function esFormatoCambridgeListaLocal(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("curso_programa") &&
    disponibles.has("seleccion") &&
    (disponibles.has("alumno") || disponibles.has("nombres"));
}

function esFormatoEstandarLocal(disponibles) {
  return disponibles.has("dni") &&
    disponibles.has("alumno") &&
    disponibles.has("nivel_educativo") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa");
}

function esFormatoNombreCompletoLocal(disponibles) {
  return disponibles.has("nombres") &&
    disponibles.has("grado") &&
    disponibles.has("curso_programa") &&
    !disponibles.has("apellidos");
}

function normalizarEncabezadoLocal(valor) {
  const encabezado = normalizarComparacionLocal(valor)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const alias = {
    apellido: "apellidos",
    apellidos_y_nombres: "alumno",
    nombre_y_apellido: "alumno",
    nombre_y_apellidos: "alumno",
    nombre_apellido: "alumno",
    nombre_apellidos: "alumno",
    cod_estudiante: "codigo_estudiante",
    codigo: "codigo_estudiante",
    cod_alumno: "codigo_estudiante",
    codigo_alumno: "codigo_estudiante",
    cod_est: "codigo_estudiante",
    codigoestudiante: "codigo_estudiante",
    codigo_de_estudiante: "codigo_estudiante",
    codigo_de_estudainte: "codigo_estudiante",
    curso: "curso_programa",
    curso_taller: "curso_programa",
    nombre: "nombres",
    nombres_y_apellidos: "alumno",
    programa: "curso_programa",
    modalidad: "seleccion",
    selecci_n: "seleccion",
    taller: "curso_programa",
    nivel: "nivel_educativo",
    nivel_educativo: "nivel_educativo",
    niveleducativo: "nivel_educativo",
    dni_o_codigo_de_estudiante: "dni_o_codigo",
    dni_o_codigo_de_estudainte: "dni_o_codigo",
    dni_o_codigo: "dni_o_codigo",
    dni_codigo: "dni_o_codigo",
  };
  return alias[encabezado] || encabezado;
}

function normalizarComparacionLocal(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolverEstudianteBaseLocal(fila, indice) {
  const porDni = indice.porDni.get(fila.dni);
  const porCodigo = indice.porCodigo.get(normalizarComparacionLocal(fila.codigoEstudiante));
  const coincidenciasNombre = indice.porNombre.get(normalizarComparacionLocal(fila.alumno)) || [];
  const porNombre = coincidenciasNombre.length === 1 ? coincidenciasNombre[0] : null;
  const estudiante = porDni || porCodigo || porNombre;

  if (!estudiante) return fila;
  const nombreExcel = normalizarComparacionLocal(fila.alumno);
  const nombreRegistrado = normalizarComparacionLocal(estudiante.nombres);
  const conflictoIdentidad = nombreExcel && nombreRegistrado && nombreExcel !== nombreRegistrado;

  if (conflictoIdentidad && (porDni || porCodigo)) {
    const origen = porDni ? `DNI ${fila.dni}` : `codigo ${fila.codigoEstudiante}`;
    return {
      ...fila,
      erroresDatos: [
        ...(fila.erroresDatos || []),
        `El ${origen} ya pertenece a ${estudiante.nombres}; el Excel indica ${fila.alumno}.`,
      ],
    };
  }

  const updatedFila = { ...fila };
  if (!updatedFila.dni && estudiante.dni) {
    updatedFila.dni = estudiante.dni;
  }
  if (!updatedFila.codigoEstudiante && estudiante.codigoEstudiante) {
    updatedFila.codigoEstudiante = estudiante.codigoEstudiante;
  }
  if (!updatedFila.nivelEducativo && (estudiante.nivel || estudiante.nivelEducativo)) {
    updatedFila.nivelEducativo = estudiante.nivel || estudiante.nivelEducativo;
  }
  if (!updatedFila.seccion && estudiante.seccion) {
    updatedFila.seccion = estudiante.seccion;
  }
  if (estudiante.nombres) {
    const parts = separarAlumnoCompletoLocal(estudiante.nombres);
    updatedFila.nombres = parts.nombres;
    updatedFila.apellidos = parts.apellidos;
    updatedFila.alumno = estudiante.nombres;
  }

  return {
    ...updatedFila,
    estudianteRegistradoDni: estudiante.dni || "",
    estudianteRegistradoCodigo: estudiante.codigoEstudiante || "",
    estudianteRegistradoNombre: estudiante.nombres || "",
  };
}

function crearIndiceEstudiantesLocal(estudiantes = {}) {
  const porDni = new Map();
  const porCodigo = new Map();
  const porNombre = new Map();

  Object.values(estudiantes || {}).forEach((estudiante) => {
    if (!estudiante) return;
    const dni = limpiarTextoLocal(estudiante.dni);
    const codigo = normalizarComparacionLocal(estudiante.codigoEstudiante);
    const nombre = normalizarComparacionLocal(estudiante.nombres);
    if (dni) porDni.set(dni, estudiante);
    if (codigo) porCodigo.set(codigo, estudiante);
    if (nombre) {
      const lista = porNombre.get(nombre) || [];
      lista.push(estudiante);
      porNombre.set(nombre, lista);
    }
  });

  return { porDni, porCodigo, porNombre };
}

function normalizarFilaLocal(fila) {
  const alumno = separarAlumnoCompletoLocal(fila.alumno);
  const nivelCambridge = limpiarTextoLocal(fila.nivel_cambridge);
  const nombres = limpiarTextoLocal(fila.nombres) || alumno.nombres;
  const apellidos = limpiarTextoLocal(fila.apellidos) || alumno.apellidos;

  let dni = limpiarTextoLocal(fila.dni);
  let codigoEstudiante = limpiarTextoLocal(fila.codigo_estudiante);
  const rawDniOrCodigo = limpiarTextoLocal(fila.dni_o_codigo);
  if (rawDniOrCodigo) {
    if (/^\d{8}$/.test(rawDniOrCodigo)) {
      dni = rawDniOrCodigo;
    } else {
      codigoEstudiante = rawDniOrCodigo;
    }
  }

  const rawCurso = limpiarTextoLocal(fila.curso_programa) || limpiarTextoLocal(fila.curso) || limpiarTextoLocal(fila.programa);
  const rawSeleccion = limpiarTextoLocal(fila.seleccion);
  const esSeleccionGrupo = /^[A-Z]$/i.test(rawSeleccion);
  const curso = rawCurso || (!esSeleccionGrupo ? rawSeleccion : "");

  return {
    codigoEstudiante,
    idExcel: limpiarTextoLocal(fila.id),
    dni,
    alumno: limpiarTextoLocal(fila.alumno) || `${nombres} ${apellidos}`.trim(),
    nombres,
    apellidos,
    nivelEducativo: limpiarTextoLocal(fila.nivel_educativo),
    grado: limpiarTextoLocal(fila.grado),
    seccion: limpiarTextoLocal(fila.seccion).toUpperCase(),
    seleccion: limpiarTextoLocal(fila.seleccion).toUpperCase(),
    nivelCambridge,
    curso,
    observacion: limpiarTextoLocal(fila.observacion),
    estadoAlumno: "Invitado",
  };
}

function separarAlumnoCompletoLocal(valor) {
  const partes = limpiarTextoLocal(valor).split(/\s+/).filter(Boolean);
  if (!partes.length) return { nombres: "", apellidos: "" };
  if (partes.length === 1) return { nombres: partes[0], apellidos: "" };
  return {
    nombres: partes.slice(0, Math.max(1, partes.length - 2)).join(" "),
    apellidos: partes.slice(Math.max(1, partes.length - 2)).join(" "),
  };
}

function limpiarTextoLocal(valor) {
  return String(valor ?? "").trim().replace(/[<>]/g, "");
}

function validarRegistrosLocal({
  filas,
  programasPeriodo,
  programaSeleccionado,
  existentes,
  estudiantes
}) {
  const clavesArchivo = new Set();
  const indiceEstudiantes = crearIndiceEstudiantesLocal(estudiantes);

  return filas.map((fila, index) => {
    const normalizada = resolverEstudianteBaseLocal(normalizarFilaLocal(fila), indiceEstudiantes);
    const programaDetectado = programaSeleccionado ||
      detectarProgramaPorCursoLocal(normalizada.curso, programasPeriodo) ||
      (normalizada.nivelCambridge ? detectarProgramaCambridgeLocal(programasPeriodo) : null);
    const errores = validarFilaCargaLocal(normalizada, programaDetectado, { programaSeleccionado: Boolean(programaSeleccionado) });
    const clave = claveAlumnoLocal(normalizada);
    const claveArchivo = programaDetectado ? `${programaDetectado.id}:${clave}` : clave;
    const existentesPrograma = new Set((existentes[programaDetectado?.id] || []).map(claveAlumnoLocal));
    const duplicadoArchivo = Boolean(claveArchivo && clavesArchivo.has(claveArchivo));
    const duplicadoPrograma = Boolean(clave && existentesPrograma.has(clave));

    if (claveArchivo) clavesArchivo.add(claveArchivo);
    if (duplicadoArchivo) errores.push("Alumno duplicado en el archivo.");
    if (duplicadoPrograma) errores.push("Alumno ya existe en el programa.");

    const estado = errores.length > 0
      ? (duplicadoArchivo || duplicadoPrograma ? "Duplicado" : "Error")
      : "Valido";

    return {
      fila: fila.filaExcel || index + 2,
      ...normalizada,
      programaId: programaDetectado?.id || "",
      programaNombre: programaDetectado?.nombre || "",
      estado,
      errores,
    };
  });
}

function validarFilaCargaLocal(fila, programaDetectado, opciones = {}) {
  const errores = [...(fila.erroresDatos || [])];
  const esCambridge = programaDetectado && esProgramaCambridgeLocal(programaDetectado);
  if (!fila.dni) {
    errores.push("Falta DNI y no se pudo resolver con el codigo de estudiante.");
  } else if (!/^\d{8}$/.test(fila.dni)) {
    errores.push("DNI invalido. Debe tener 8 digitos.");
  }
  if (!textoSeguroLocal(fila.alumno || `${fila.nombres} ${fila.apellidos}`)) errores.push("Falta alumno.");
  if (!textoSeguroLocal(fila.grado)) errores.push("Falta grado.");
  if (opciones.programaSeleccionado) {
    if (fila.curso && !coincideCursoLocal(fila.curso, programaDetectado.nombre)) {
      errores.push(`El taller en el Excel ("${fila.curso}") no coincide con el seleccionado ("${programaDetectado.nombre}").`);
    }
  } else {
    if (!textoSeguroLocal(fila.curso) && !textoSeguroLocal(fila.nivelCambridge)) errores.push("Falta curso o nivel Cambridge.");
    if (fila.curso && !programaDetectado) errores.push("El programa indicado no existe en el periodo seleccionado.");
    if (!fila.curso && fila.nivelCambridge && !programaDetectado) errores.push("No se encontro un programa Cambridge para esta carga.");
    if (esCambridge && !/^[ABC]$/.test(fila.seleccion)) errores.push("Para Cambridge, seleccion debe indicar A, B o C.");
  }
  if (programaDetectado && String(programaDetectado.estado || "Habilitado") !== "Habilitado") {
    errores.push(`El programa ${programaDetectado.nombre || "seleccionado"} esta ${programaDetectado.estado}. Habilitelo antes de cargar alumnos.`);
  }
  if (programaDetectado && !esCambridge) {
    const nivelEstudiante = fila.nivelEducativo || fila.nivel;
    const gradoCompleto = obtenerGradoCompletoLocal(fila.grado, nivelEstudiante);
    if (!gradoCorrespondeAlPrograma(programaDetectado, gradoCompleto)) {
      errores.push("El alumno no esta dentro de su grado correspondiente para este taller.");
    }
  }
  if (fila.observacion && /[<>]/.test(fila.observacion)) errores.push("Observacion contiene caracteres no permitidos.");
  return errores;
}

function obtenerGradoCompletoLocal(grado, nivel) {
  const g = String(grado || "").trim();
  const n = String(nivel || "").trim().toLowerCase();
  
  if (g.includes(":")) return g;
  
  let nivelPrefijo = "";
  if (n.includes("prim") || g.toLowerCase().includes("prim")) {
    nivelPrefijo = "Primaria";
  } else if (n.includes("sec") || g.toLowerCase().includes("sec")) {
    nivelPrefijo = "Secundaria";
  } else if (n.includes("ini") || g.toLowerCase().includes("ini")) {
    nivelPrefijo = "Inicial";
  } else {
    const num = parseInt(g.replace(/\D/g, ""), 10);
    if (num >= 1 && num <= 6) {
      nivelPrefijo = "Primaria";
    } else if (num >= 7 && num <= 11) {
      nivelPrefijo = "Secundaria";
    } else {
      nivelPrefijo = "Primaria";
    }
  }

  const soloNum = g.replace(/\D/g, "");
  return `${nivelPrefijo}:${soloNum}`;
}

function textoSeguroLocal(valor) {
  return limpiarTextoLocal(valor).length > 0;
}

function coincideCursoLocal(curso, programa) {
  const a = normalizarComparacionLocal(curso);
  const b = normalizarComparacionLocal(programa);
  if (a === b) return true;

  const tokensA = tokensCursoLocal(a);
  const tokensB = tokensCursoLocal(b);
  if (!tokensA.length || !tokensB.length) return false;

  const coincidencias = tokensA.filter((token) => tokensB.includes(token)).length;
  const coberturaCurso = coincidencias / tokensA.length;
  const coberturaPrograma = coincidencias / tokensB.length;

  return coberturaCurso >= 0.85 && coberturaPrograma >= 0.6;
}

function tokensCursoLocal(valor) {
  const ignorar = new Set(["curso", "programa", "taller", "de", "del", "la", "el", "y", "para"]);
  return normalizarComparacionLocal(valor)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !ignorar.has(token));
}

function esProgramaCambridgeLocal(programa) {
  const texto = normalizarComparacionLocal([
    programa.nombre,
    programa.programa,
    programa.categoria,
    programa.tipoComunicado,
    programa.tipo_comunicado,
    programa.plantilla,
    ...(programa.plantillaVariables || []),
  ].filter(Boolean).join(" "));
  return /\bcambridge\b/.test(texto) ||
    /\bcambrigde\b/.test(texto) ||
    /\bcabringde\b/.test(texto) ||
    /\bcamringde\b/.test(texto) ||
    /\bingles?s?\b/.test(texto) ||
    /\bcertificacion\b/.test(texto) ||
    /\bpreparacion\b/.test(texto) ||
    (programa.plantillaVariables || []).some((variable) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(variable)
    );
}

function detectarProgramaCambridgeLocal(programas) {
  const candidatos = programas.filter((programa) => esProgramaCambridgeLocal(programa));
  if (candidatos.length === 1) return candidatos[0];
  if (!candidatos.length && programas.length === 1) return programas[0];
  return candidatos.find((programa) => String(programa.estado || "Habilitado") === "Habilitado") || null;
}

function detectarProgramaPorCursoLocal(curso, programas) {
  if (!curso) return null;
  const directo = programas.find((programa) => coincideCursoLocal(curso, programa.nombre));
  if (directo) return directo;
  return /\bcambridge\b/.test(normalizarComparacionLocal(curso)) ? detectarProgramaCambridgeLocal(programas) : null;
}

function claveAlumnoLocal(alumno) {
  const dni = String(alumno.dni || "").replace(/\D/g, "");
  if (dni) return `dni:${dni}`;
  if (alumno.codigoEstudiante) return `codigo:${normalizarComparacionLocal(alumno.codigoEstudiante)}`;
  const nombre = normalizarComparacionLocal(`${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim());
  return nombre ? `nombre:${nombre}:${normalizarComparacionLocal(alumno.grado)}` : "";
}

function renombrarArchivoLocal(nombre) {
  const extension = /\.xls$/i.test(nombre) ? "xls" : "xlsx";
  return `carga-${Date.now()}.${extension}`;
}

