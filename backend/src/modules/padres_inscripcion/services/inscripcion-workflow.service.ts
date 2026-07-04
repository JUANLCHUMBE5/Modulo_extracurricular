import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import {
  mapDbEnrollmentToApi,
  normalizarPeriodoApi
} from "../../../common/shared/mappers.js";
import { PadresInscripcionRepository } from "../repositories/padres_inscripcion.repository.js";

const inscripcionRepository = new PadresInscripcionRepository();

export class InscripcionWorkflowService {
  async registrarDocumento(id: string, body: any) {
    const { usuario, tipo_documento, plantilla } = body;
    const db = await inscripcionRepository.getDb();

    const inscrip = (db.inscripciones || []).find(item => item.id === id);
    if (!inscrip) {
      throw new Error("InscripciÃ³n no encontrada.");
    }

    const docId = `DOC-${String(db.nextDocumentoId || 1).padStart(3, "0")}`;
    db.nextDocumentoId = (db.nextDocumentoId || 1) + 1;

    const docObj = {
      id: docId,
      alumno: inscrip.nombresEstudiante,
      dniEstudiante: inscrip.dniEstudiante,
      programa: inscrip.programa,
      programaId: inscrip.programaId,
      fecha: new Date().toISOString(),
      usuario: usuario || "Asistente",
      tipoDocumento: tipo_documento || "Comunicado personalizado",
      plantilla: plantilla || ""
    };

    db.documentosGenerados = db.documentosGenerados || [];
    db.documentosGenerados.unshift(docObj);

    inscrip.documentoGenerado = true;
    inscrip.ultimoDocumentoGeneradoId = docId;
    inscrip.ultimoDocumentoGeneradoEn = docObj.fecha;

    await inscripcionRepository.saveDb(db);
    return docObj;
  }

  async derivarCaja(operatorUsername: string, operatorRole: string, inscripcionId: string, body: any) {
    const db = await inscripcionRepository.getDb();
    const idx = (db.inscripciones || []).findIndex(item => item.id === inscripcionId);
    if (idx === -1) {
      throw new Error("InscripciÃ³n no encontrada.");
    }

    const updated: any = {
      ...db.inscripciones[idx],
      ...body,
      derivadoCaja: true,
      estadoCaja: "derivado_caja",
      estadoInscripcion: db.inscripciones[idx].estadoPago === "validado" ? "confirmada" : "pendiente_pago",
      fechaDerivacionCaja: new Date().toISOString()
    };

    db.inscripciones[idx] = updated;

    const student = db.estudiantes?.[updated.dniEstudiante] as any;
    if (student) {
      student.estadoInscripcion = updated.estadoInscripcion;
      student.estadoCaja = updated.estadoCaja;
    }

    await inscripcionRepository.saveDb(db);
    await registrarAuditoria(operatorUsername, operatorRole, "INSCRIPCION_ESTADO", {
      inscripcionId,
      alumno: updated.nombresEstudiante,
      taller: updated.programa,
      estadoAnterior: db.inscripciones[idx].estadoInscripcion,
      estadoNuevo: updated.estadoInscripcion
    });

    return mapDbEnrollmentToApi(updated, db);
  }

  async reservarCaja(operatorUsername: string, operatorRole: string, inscripcionId: string, body: any) {
    const dni = String(body.dni_estudiante || operatorUsername || "").replace(/\D/g, "");
    const db = await inscripcionRepository.getDb();
    const idx = (db.inscripciones || []).findIndex(item =>
      item.id === inscripcionId &&
      item.dniEstudiante === dni &&
      item.estadoInscripcion !== "Anulada"
    );
    if (idx === -1) {
      throw new Error("No se encontro la inscripcion para reservar el pago en Caja.");
    }

    const estadoAnterior = db.inscripciones[idx].estadoInscripcion;
    const updated: any = {
      ...db.inscripciones[idx],
      derivadoCaja: true,
      estadoCaja: "reservado_caja",
      estadoPago: "pendiente",
      estadoInscripcion: "Reserva pendiente",
      fechaReservaCaja: new Date().toISOString(),
      observacionCaja: "Reserva generada desde portal de padres para pago presencial en Caja."
    };

    db.inscripciones[idx] = updated;

    const student = db.estudiantes?.[updated.dniEstudiante] as any;
    if (student) {
      student.estadoInscripcion = "Reserva pendiente";
      student.estadoCaja = "reservado_caja";
    }

    await inscripcionRepository.saveDb(db);
    await registrarAuditoria(operatorUsername, operatorRole, "RESERVA_CAJA_PADRES", {
      inscripcionId,
      alumno: updated.nombresEstudiante,
      taller: updated.programa,
      estadoAnterior,
      estadoNuevo: updated.estadoInscripcion
    });

    return mapDbEnrollmentToApi(updated, db);
  }

  async buscarInscripcionesSecretaria(dni: string, periodo: string) {
    const db = await inscripcionRepository.getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const isPaid = (item: any) => ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(est => String(item.estadoPago || "").toLowerCase().includes(est) || String(item.estadoInscripcion || "").toLowerCase().includes(est));
    const active = list.find(item => !isPaid(item)) || list[0] || null;
    return active ? mapDbEnrollmentToApi(active, db) : null;
  }

  async listarInscripcionesSecretaria(dni: string, periodo: string) {
    const db = await inscripcionRepository.getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    return list.map((item) => mapDbEnrollmentToApi(item, db));
  }
}

