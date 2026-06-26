import { isApiMode, apiClient } from "../../../services/apiClient";
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
  textoSeguro
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
