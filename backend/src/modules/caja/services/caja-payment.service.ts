import { CajaPaymentQueryService } from "./caja-payment-query.service.js";
import { CajaPaymentRegistrationService } from "./caja-payment-registration.service.js";
import { CajaPaymentReviewService } from "./caja-payment-review.service.js";

const cajaPaymentQueryService = new CajaPaymentQueryService();
const cajaPaymentRegistrationService = new CajaPaymentRegistrationService();
const cajaPaymentReviewService = new CajaPaymentReviewService();

export class CajaPaymentService {
  async getPagosLegacy(page: number | null, limit: number) {
    return cajaPaymentQueryService.getPagosLegacy(page, limit);
  }

  async getPagos(periodo: string, estudianteDni: string, page: number | null, limit: number) {
    return cajaPaymentQueryService.getPagos(periodo, estudianteDni, page, limit);
  }

  async registrarPago(operatorUsername: string, body: any) {
    return cajaPaymentRegistrationService.registrarPago(operatorUsername, body);
  }

  async updatePago(pagoId: string, body: any) {
    return cajaPaymentRegistrationService.updatePago(pagoId, body);
  }

  async getBandejaPagosWeb(periodo: string) {
    return cajaPaymentQueryService.getBandejaPagosWeb(periodo);
  }

  async validarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentReviewService.validarPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  async observarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentReviewService.observarPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  async rechazarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentReviewService.rechazarPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  async anularPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentReviewService.anularPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  async getPagoById(pagoId: string) {
    return cajaPaymentQueryService.getPagoById(pagoId);
  }

  async registrarComprobante(body: any, file: Express.Multer.File | undefined) {
    return cajaPaymentRegistrationService.registrarComprobante(body, file);
  }
}
