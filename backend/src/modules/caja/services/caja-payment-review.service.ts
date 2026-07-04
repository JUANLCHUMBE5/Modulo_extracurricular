import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import { mapDbPaymentToApi } from "../../../common/shared/mappers.js";
import {
  incrementarCorrelativo,
  normalizarCorrelativos,
  enviarCorreoConfirmacionConAdjuntos
} from "../helpers/caja.helpers.js";
import { CajaRepository } from "../repositories/caja.repository.js";

const cajaRepository = new CajaRepository();

export class CajaPaymentReviewService {
  async validarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await cajaRepository.getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    if (!db.pagos[idx].nroRecibo) {
      const corr = normalizarCorrelativos(db);
      const assigned = corr.reciboActual || "REC-0501";
      db.pagos[idx].nroRecibo = assigned;
      corr.reciboActual = incrementarCorrelativo(assigned);
    }

    db.pagos[idx].estado = "validado";
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "validado";
      inscrip.estadoInscripcion = "Pago exitoso";
      inscrip.fechaPago = db.pagos[idx].validadoEn;
      inscrip.pagoObservacionCaja = observaciones || "";
      inscrip.derivadoCaja = true;
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "Pago exitoso";
    }

    await cajaRepository.saveDb(db);

    // Orquesta la generaciÃ³n y el envÃ­o de los archivos de confirmaciÃ³n por correo en segundo plano
    enviarCorreoConfirmacionConAdjuntos(inscrip, db, db.pagos[idx].monto, db.pagos[idx].nroRecibo)
      .catch(err => console.error("[MAIL ERROR] Error al enviar confirmaciÃ³n de pago:", err.message));

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_VALIDAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }

  async observarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await cajaRepository.getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    db.pagos[idx].estado = "observado";
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "observada";
      inscrip.pagoObservacionCaja = observaciones || "";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "observada";
    }

    await cajaRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_OBSERVAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }

  async rechazarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await cajaRepository.getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    db.pagos[idx].estado = "anulado";
    db.pagos[idx].observaciones = observaciones || "Pago rechazado por Cajera.";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "pendiente_pago";
      inscrip.pagoObservacionCaja = observaciones || "Pago rechazado por Cajera.";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "pendiente_pago";
    }

    await cajaRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_RECHAZAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }

  async anularPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await cajaRepository.getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    db.pagos[idx].estado = "anulado";
    db.pagos[idx].observaciones = observaciones || "Pago anulado por Cajera.";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "pendiente_pago";
      inscrip.pagoObservacionCaja = observaciones || "Pago anulado por Cajera.";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "pendiente_pago";
    }

    await cajaRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_ANULAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }
}

