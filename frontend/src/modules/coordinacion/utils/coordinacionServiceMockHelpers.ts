import { apiDb as apiDbRaw, saveApiDb, syncApiDb } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;
import {
  fechaActualInput,
  fechaActualIso,
  normalizarFecha,
} from "../../../services/dateService";
import { normalizarPeriodo, claveAlumno } from "../services/coordinacionServiceUtils";
import { debeArchivarPorFecha, limpiarTexto } from "../services/coordinacionServiceUtils";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizarTextoSimple = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function normalizarPeriodosGuardados() {
  let cambio = false;
  apiDb.programas.forEach((programa: any) => {
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

export function finalizarProgramasVencidos() {
  const hoy = normalizarFecha(fechaActualInput());
  if (!hoy) return;

  let cambio = false;
  apiDb.programas.forEach((programa: any) => {
    if (!debeArchivarPorFecha(programa, hoy)) return;
    programa.finalizadoAutomaticamenteEn = programa.finalizadoAutomaticamenteEn || fechaActualIso();
    programa.archivadoAutomaticamenteEn = programa.archivadoAutomaticamenteEn || fechaActualIso();
    programa.estado = "Archivado";
    cambio = true;
  });

  if (cambio) {
    saveApiDb();
    window.dispatchEvent(new CustomEvent("mock-db-updated", { detail: { modulo: "coordinacion" } }));
  }
}

export function normalizarAlumnoCarga(estudiante: any = {}) {
  const nombres = limpiarTexto(estudiante.nombres);
  const apellidos = limpiarTexto(estudiante.apellidos);
  const nombreCompleto = [nombres, apellidos].filter(Boolean).join(" ").trim() || nombres;

  return {
    dni: limpiarTexto(estudiante.dni).replace(/\D/g, ""),
    nombre: nombreCompleto,
    grado: limpiarTexto(estudiante.grado || estudiante.gradoNombre || estudiante.grado_nombre),
  };
}

export async function listarInvitadosMock(programaId: string) {
  await delay(400);
  await syncApiDb();
  const todosInvitados = [...(apiDb.invitadosPorPrograma[programaId] || [])];

  const inscripcionesActivas = (apiDb.inscripciones || [])
    .filter((ins: any) => ins.programaId === programaId && ins.estadoInscripcion !== "Anulada");

  if (!inscripcionesActivas.length) return todosInvitados;

  const dnisMatriculados = new Set(
    inscripcionesActivas
      .map((ins: any) => String(ins.dniEstudiante || "").replace(/\D/g, ""))
      .filter(Boolean)
  );
  const codigosMatriculados = new Set(
    inscripcionesActivas
      .map((ins: any) => String(ins.codigoEstudiante || "").trim().toUpperCase())
      .filter(Boolean)
  );
  const nombresMatriculados = new Set(
    inscripcionesActivas
      .map((ins: any) => normalizarTextoSimple(ins.nombresEstudiante))
      .filter(Boolean)
  );

  return todosInvitados.filter((invitado: any) => {
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
      const estudianteBase: any = Object.values(apiDb.estudiantes || {}).find(
        (e: any) => String(e.codigoEstudiante || "").trim().toUpperCase() === codigoInvitado
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

export async function listarMatriculadosMock(programaId: string) {
  await delay(400);
  await syncApiDb();
  return (apiDb.inscripciones || [])
    .filter((item: any) => item.programaId === programaId && item.estadoInscripcion !== "Anulada")
    .map((item: any) => {
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
