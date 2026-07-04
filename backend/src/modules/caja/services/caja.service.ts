import { CajaCorrelativoService } from "./caja-correlativo.service.js";
import { CajaPaymentService } from "./caja-payment.service.js";
import { CajaReportService } from "./caja-report.service.js";
import { CajaStudentService } from "./caja-student.service.js";

const cajaCorrelativoService = new CajaCorrelativoService();
const cajaPaymentService = new CajaPaymentService();
const cajaReportService = new CajaReportService();
const cajaStudentService = new CajaStudentService();

export class CajaService {
  /**
   * Obtiene la lista de pagos de forma paginada para soporte y compatibilidad legacy.
   */
  async getPagosLegacy(page: number | null, limit: number) {
    return cajaPaymentService.getPagosLegacy(page, limit);
  }

  /**
   * Obtiene la lista de pagos filtrada opcionalmente por periodo y DNI de estudiante.
   */
  async getPagos(periodo: string, estudianteDni: string, page: number | null, limit: number) {
    return cajaPaymentService.getPagos(periodo, estudianteDni, page, limit);
  }

  /**
   * Registra una transacciÃ³n de pago de forma presencial y la confirma inmediatamente.
   */
  async registrarPago(operatorUsername: string, body: any) {
    return cajaPaymentService.registrarPago(operatorUsername, body);
  }

  /**
   * Actualiza los datos principales de una transacciÃ³n de pago existente.
   */
  async updatePago(pagoId: string, body: any) {
    return cajaPaymentService.updatePago(pagoId, body);
  }

  /**
   * Obtiene un resumen financiero con ingresos, egresos y saldos pendientes para un periodo.
   */
  async getCajaResumen(periodo: string) {
    return cajaReportService.getCajaResumen(periodo);
  }

  /**
   * Registra una transacciÃ³n de egreso o gasto asignando un correlativo de egreso.
   */
  async registrarEgreso(operatorUsername: string, operatorRole: string, body: any) {
    return cajaCorrelativoService.registrarEgreso(operatorUsername, operatorRole, body);
  }

  /**
   * Obtiene la informaciÃ³n financiera y de matrÃ­cula de un estudiante especÃ­fico en Caja.
   */
  async getEstudianteCaja(dni: string, periodo: string) {
    return cajaStudentService.getEstudianteCaja(dni, periodo);
  }

  /**
   * Obtiene la bandeja de pagos por verificar provenientes del portal de padres.
   */
  async getBandejaPagosWeb(periodo: string) {
    return cajaPaymentService.getBandejaPagosWeb(periodo);
  }

  /**
   * Aprueba y valida un pago web subido por un padre, asignando un correlativo y enviando correo.
   */
  async validarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentService.validarPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  /**
   * Observa un pago indicando que tiene incongruencias y requiere correcciÃ³n.
   */
  async observarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentService.observarPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  /**
   * Rechaza un pago invÃ¡lido (comprobante falso o incorrecto) volviendo el estado a pendiente.
   */
  async rechazarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentService.rechazarPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  /**
   * Anula un pago registrado por error.
   */
  async anularPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    return cajaPaymentService.anularPago(operatorUsername, operatorRole, pagoId, observaciones);
  }

  /**
   * Genera la lista para el reporte detallado de caja segÃºn filtros de fecha, programa, medio y tipo.
   */
  async getCajaReporte(query: any) {
    return cajaReportService.getCajaReporte(query);
  }

  /**
   * Obtiene la informaciÃ³n detallada de una transacciÃ³n de pago por su ID.
   */
  async getPagoById(pagoId: string) {
    return cajaPaymentService.getPagoById(pagoId);
  }

  /**
   * Registra y sube el comprobante de pago proveniente del portal de padres (modo pendiente de verificaciÃ³n).
   */
  async registrarComprobante(body: any, file: Express.Multer.File | undefined) {
    return cajaPaymentService.registrarComprobante(body, file);
  }

  /**
   * Busca estudiantes de forma rÃ¡pida por coincidencia de nombre o DNI.
   */
  async buscarEstudiantesQuery(q: string) {
    return cajaStudentService.buscarEstudiantesQuery(q);
  }

  /**
   * Anula un nÃºmero correlativo fÃ­sico o virtual que fue malogrado o cancelado antes de ser emitido.
   */
  async cancelarCorrelativo(operatorUsername: string, operatorRole: string, body: any) {
    return cajaCorrelativoService.cancelarCorrelativo(operatorUsername, operatorRole, body);
  }
}



