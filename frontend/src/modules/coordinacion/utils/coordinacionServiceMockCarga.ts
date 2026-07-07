import { apiDb as apiDbRaw, saveApiDb, syncApiDb } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;
import {
  fechaActualIso,
  fechaActualInput,
} from "../../../services/dateService";
import {
  normalizarPeriodo,
  claveAlumno,
  agregarGradoProgramaDesdeAlumno,
  sincronizarGradosProgramaConInvitados,
} from "../services/coordinacionServiceUtils";
import { esProgramaCambridge } from "./coordinacionProgramUtils";
import { normalizarAlumnoCarga } from "./coordinacionServiceMockHelpers";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export async function buscarAlumnoCargaPorDniMock(dni: string) {
  await syncApiDb();
  const estudiante = apiDb.estudiantes?.[dni];
  if (!estudiante) return null;
  return normalizarAlumnoCarga(estudiante);
}

export async function confirmarCargaAlumnosMock(preview: any) {
  await delay(600);
  await syncApiDb();
  const validos = preview.registros.filter((item: any) => item.estado === "Valido");
  const registrosPorArchivo = new Map<string, any[]>();
  const validosPorArchivo = new Map<string, any>();
  const programasTocados = new Set<string>();
  const nuevasCargas: any[] = [];

  (preview.registros || []).forEach((item: any) => {
    const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
    if (!registrosPorArchivo.has(archivoNombre)) registrosPorArchivo.set(archivoNombre, []);
    registrosPorArchivo.get(archivoNombre)!.push(item);
  });

  validos.forEach((item: any) => {
    const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
    if (!validosPorArchivo.has(archivoNombre)) validosPorArchivo.set(archivoNombre, []);
    validosPorArchivo.get(archivoNombre)!.push(item);
  });

  validos.forEach((item: any) => {
    if (!item.programaId) return;
    const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
    const grupoArchivo = validosPorArchivo.get(archivoNombre) || [];
    if (!grupoArchivo.cargaId) {
      const todayStr = new Date().toDateString();
      const existing = (apiDb.historialCargas || []).find(
        (c: any) =>
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
    const programaCarga = apiDb.programas.find((programa: any) => programa.id === item.programaId);
    const clave = claveAlumno(item);
    const alumnoYaExiste = Boolean(clave && existentes.some((existente: any) => claveAlumno(existente) === clave));
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
    (total: number, grupoArchivo: any) => total + (grupoArchivo.duplicadosConfirmacion || 0),
    0
  );

  validosPorArchivo.forEach((grupoArchivo, archivoNombre) => {
    if (!grupoArchivo.cargaId) return;
    const registrosArchivo = registrosPorArchivo.get(archivoNombre) || grupoArchivo;
    const importadosArchivo = (grupoArchivo.registrosHistorial || []).length;

    const todayStr = new Date().toDateString();
    const existingIndex = (apiDb.historialCargas || []).findIndex(
      (c: any) =>
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
        errores: (ec.resumen?.errores || 0) + registrosArchivo.filter((item: any) => item.estado === "Error").length,
        duplicados: (ec.resumen?.duplicados || 0) + registrosArchivo.filter((item: any) => item.estado === "Duplicado").length,
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
          errores: registrosArchivo.filter((item: any) => item.estado === "Error").length,
          duplicados: registrosArchivo.filter((item: any) => item.estado === "Duplicado").length,
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

export async function eliminarCargaAlumnosMock(cargaId: string) {
  await delay(400);
  await syncApiDb();
  apiDb.historialCargas = Array.isArray(apiDb.historialCargas) ? apiDb.historialCargas : [];
  const carga = apiDb.historialCargas.find((item: any) => item.id === cargaId);
  if (!carga) throw new Error("No se encontró la carga seleccionada.");

  const registros = Array.isArray(carga.registros) ? carga.registros : [];
  const tieneInscripcion = registros.some((registro: any) =>
    apiDb.inscripciones.some((inscripcion: any) =>
      inscripcion.programaId === registro.programaId &&
      inscripcion.dniEstudiante === registro.dni &&
      inscripcion.estadoInscripcion !== "Anulada"
    )
  );
  if (tieneInscripcion) {
    throw new Error("No se puede borrar esta carga porque uno o más alumnos ya tienen inscripción activa.");
  }

  let eliminados = 0;
  const programasAfectados = new Set(registros.map((registro: any) => registro.programaId).filter(Boolean));
  programasAfectados.forEach((programaId: any) => {
    const actuales = apiDb.invitadosPorPrograma[programaId] || [];
    const filtrados = actuales.filter((invitado: any) => invitado.cargaId !== cargaId);
    eliminados += actuales.length - filtrados.length;
    apiDb.invitadosPorPrograma[programaId] = filtrados;
    sincronizarGradosProgramaConInvitados(programaId);
  });

  apiDb.historialCargas = apiDb.historialCargas.filter((item: any) => item.id !== cargaId);
  await saveApiDb();
  window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  return { cargaId, eliminados };
}
