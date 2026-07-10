import { apiClient, API_BASE_URL } from "../../../services/apiClient";
import { apiDb, syncApiDb } from "../../../services/dbApi";
import { adaptarEstudiante } from "../../../services/adapters";
import {
  limpiarTexto,
  textoSeguro,
  normalizarPeriodo,
  validarArchivoExcelFrontend,
  prepararProgramasParaPreview,
  combinarPreviewsCarga,
  gradoCorrespondeAlPrograma,
  normalizarAlumnoCarga,
} from "./coordinacionServiceUtils";

const obtenerApiBase = () => API_BASE_URL;

const obtenerMensajeConexionApi = () => {
  if (import.meta.env.PROD && !obtenerApiBase()) {
    return "No se pudo conectar con el backend. En la nube falta configurar VITE_API_URL con la URL publica de la API.";
  }
  return "No se pudo conectar con el servidor. Verifique que la API este ejecutandose.";
};

export async function previsualizarCargaAlumnos({
  periodo,
  archivoNombre,
  archivo,
  programaId,
}: {
  periodo: string;
  archivoNombre: string;
  archivo: File;
  programaId?: string;
}) {
  await syncApiDb();

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

export async function previsualizarCargaAlumnosMasiva({
  periodo,
  archivos,
  programaId,
  onProgress,
}: {
  periodo: string;
  archivos: File[];
  programaId?: string;
  onProgress?: (progress: any) => void;
}) {
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

export async function registrarAlumnoIndividualCarga({
  periodo,
  programaId,
  dni,
  nombre,
  grado,
  forzarGrado = false,
}: {
  periodo: string;
  programaId: string;
  dni: string;
  nombre: string;
  grado: string;
  forzarGrado?: boolean;
}) {
  await syncApiDb();

  const programa = (apiDb.programas || []).find((item: any) => String(item.id) === String(programaId));
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

  const existente = (apiDb.invitadosPorPrograma?.[programa.id] || []).find(
    (item: any) => String(item.dni || "").replace(/\D/g, "") === dniLimpio
  );
  if (existente) errores.push("El alumno ya existe en este programa.");
  if (
    programa.estado &&
    (String(programa.estado).toLowerCase() === "finalizado" || String(programa.estado).toLowerCase() === "archivado")
  ) {
    errores.push(
      `El programa ${
        programa.nombre || "seleccionado"
      } está ${programa.estado}. No se pueden registrar alumnos en programas finalizados o archivados.`
    );
  }
  if (errores.length) throw new Error(errores.join(" "));

  const estudianteDb = (apiDb.estudiantes || {})[dniLimpio] || {};
  const preview = {
    id: `PREVIEW-INDIVIDUAL-${Date.now()}`,
    periodo: normalizarPeriodo(periodo),
    archivoNombre: "Registro individual",
    archivos: ["Registro individual"],
    registros: [
      {
        fila: 1,
        dni: dniLimpio,
        nombres: nombreLimpio,
        apellidos: "",
        grado: gradoLimpio,
        seccion: estudianteDb.seccion || "",
        codigoEstudiante: estudianteDb.codigoEstudiante || "",
        nivelEducativo: estudianteDb.nivel || "",
        seleccion: "",
        curso: "",
        nivelCambridge: "",
        programaId: programa.id,
        programaNombre: programa.nombre,
        estado: "Valido",
        errores: [] as string[],
        estadoAlumno: "Invitado",
        telefono: estudianteDb.telefonoApoderado || "",
        correo: estudianteDb.correoApoderado || "",
      },
    ],
    resumen: {
      total: 1,
      validos: 1,
      errores: 0,
      duplicados: 0,
    },
  };

  return confirmarCargaAlumnos(preview);
}

export async function buscarAlumnoCargaPorDni(dni: string, periodo = "escolar") {
  const dniLimpio = limpiarTexto(dni).replace(/\D/g, "");
  if (!/^\d{8}$/.test(dniLimpio)) return null;

  const res = await apiClient.get(`/api/v1/extracurricular/secretaria/estudiantes/${dniLimpio}`, {
    params: { periodo: normalizarPeriodo(periodo) },
  });
  if (!res.success || !res.data) return null;
  return normalizarAlumnoCarga(adaptarEstudiante(res.data.estudiante));
}

export async function confirmarCargaAlumnos(preview: any) {
  const res = await apiClient.post(`/api/v1/extracurricular/coordinacion/cargas/confirmar`, preview);
  if (!res.success) throw new Error(res.message || "Error al confirmar carga de alumnos");
  return res.data;
}

export async function listarHistorialCargas() {
  const res = await apiClient.get("/api/v1/extracurricular/coordinacion/cargas");
  if (!res.success) throw new Error(res.message || "Error al listar historial de cargas");
  return Array.isArray(res.data) ? res.data : [];
}

export async function eliminarCargaAlumnos(cargaId: string | number) {
  const res = await apiClient.delete(`/api/v1/extracurricular/coordinacion/cargas/${cargaId}`);
  if (!res.success) throw new Error(res.message || "Error al eliminar carga");
  return res.data;
}
