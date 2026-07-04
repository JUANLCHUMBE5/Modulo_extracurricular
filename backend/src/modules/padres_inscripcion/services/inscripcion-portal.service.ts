import { normalizarComparacion, limpiarDni as limpiarDniHelper } from "../../../infrastructure/files/file.service.js";
import {
  mapDbEnrollmentToApi,
  mapDbPaymentToApi
} from "../../../common/shared/mappers.js";
import {
  construirInvitacionesLegacy,
  construirInvitacionesPortal,
  mapEstudiantePortal
} from "../helpers/portal-mappers.helpers.js";
import { PadresInscripcionRepository } from "../repositories/padres_inscripcion.repository.js";

function limpiarDni(val: any): string {
  return limpiarDniHelper ? limpiarDniHelper(val) : String(val || "").replace(/\D/g, "");
}

const inscripcionRepository = new PadresInscripcionRepository();

export class InscripcionPortalService {
  async getResumenPadresLegacy(dniRaw: string) {
    const db = await inscripcionRepository.getDb();
    const dni = limpiarDni(dniRaw);
    const estudiante = db.estudiantes?.[dni];
    if (!estudiante) {
      throw new Error("Estudiante no encontrado.");
    }

    const inscripciones = (db.inscripciones || []).filter((item) =>
      item.dniEstudiante === dni || item.codigoEstudiante === estudiante.codigoEstudiante
    );
    const pagos = (db.pagos || []).filter((item) =>
      item.dniEstudiante === dni || inscripciones.some((inscripcion) => inscripcion.id === item.inscripcionId)
    );
    const documentos = (db.documentosGenerados || []).filter((item) =>
      item.dniEstudiante === dni || normalizarComparacion(item.alumno) === normalizarComparacion(estudiante.nombres)
    );
    const invitaciones = construirInvitacionesLegacy(db, dni);

    return { estudiante, invitaciones, inscripciones, pagos, documentos };
  }

  async getResumenPadres(dni: string) {
    const db = await inscripcionRepository.getDb();
    const student = db.estudiantes?.[dni] as any;
    if (!student) {
      throw new Error("Estudiante no encontrado.");
    }

    const activeProgramIds = new Set((db.programas || []).filter(p => p.estado !== "Archivado").map(p => p.id));
    const enrollments = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && item.estadoInscripcion !== "Anulada" && activeProgramIds.has(item.programaId));
    const payments = (db.pagos || []).filter(item => item.dniEstudiante === dni || enrollments.some(e => e.id === item.inscripcionId));
    const documents = (db.documentosGenerados || []).filter(item => item.dniEstudiante === dni || item.alumno === student.nombres);

    return {
      estudiante: mapEstudiantePortal(student),
      invitaciones: construirInvitacionesPortal(db, student, dni),
      inscripciones: enrollments.map((item) => mapDbEnrollmentToApi(item, db)),
      pagos: payments.map(mapDbPaymentToApi),
      documentos: documents
    };
  }

  async updateApoderado(dni: string, body: any) {
    const { apoderado, telefono, telefono_apoderado, correo, correo_apoderado } = body;
    const db = await inscripcionRepository.getDb();
    const student = db.estudiantes?.[dni] as any;
    if (!student) {
      throw new Error("Estudiante no encontrado.");
    }

    const finalTelefono = telefono || telefono_apoderado || "";
    const finalCorreo = correo || correo_apoderado || "";

    student.apoderado = apoderado || "";
    student.telefonoApoderado = finalTelefono;
    student.correoApoderado = finalCorreo;

    (db.inscripciones || []).forEach(item => {
      if (item.dniEstudiante === dni) {
        item.apoderado = apoderado || "";
        item.telefono = finalTelefono;
        item.correo = finalCorreo;
      }
    });

    await inscripcionRepository.saveDb(db);
    return mapEstudiantePortal(student);
  }
}
