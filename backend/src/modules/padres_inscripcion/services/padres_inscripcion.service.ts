import { InscripcionPortalService } from "./inscripcion-portal.service.js";
import { InscripcionQueryService } from "./inscripcion-query.service.js";
import { InscripcionRegistrationService } from "./inscripcion-registration.service.js";
import { InscripcionWorkflowService } from "./inscripcion-workflow.service.js";

const inscripcionPortalService = new InscripcionPortalService();
const inscripcionQueryService = new InscripcionQueryService();
const inscripcionRegistrationService = new InscripcionRegistrationService();
const inscripcionWorkflowService = new InscripcionWorkflowService();

export class PadresInscripcionService {
  async getInscripcionesLegacy(page: number | null, limit: number) {
    return inscripcionQueryService.getInscripcionesLegacy(page, limit);
  }

  async getDocumentosLegacy() {
    return inscripcionQueryService.getDocumentosLegacy();
  }

  async getResumenPadresLegacy(dniRaw: string) {
    return inscripcionPortalService.getResumenPadresLegacy(dniRaw);
  }

  async crearInscripcion(operatorUsername: string, operatorRole: string, body: any) {
    return inscripcionRegistrationService.crearInscripcion(operatorUsername, operatorRole, body);
  }

  async registrarDocumento(id: string, body: any) {
    return inscripcionWorkflowService.registrarDocumento(id, body);
  }

  async derivarCaja(operatorUsername: string, operatorRole: string, inscripcionId: string, body: any) {
    return inscripcionWorkflowService.derivarCaja(operatorUsername, operatorRole, inscripcionId, body);
  }

  async reservarCaja(operatorUsername: string, operatorRole: string, inscripcionId: string, body: any) {
    return inscripcionWorkflowService.reservarCaja(operatorUsername, operatorRole, inscripcionId, body);
  }

  async buscarInscripcionesSecretaria(dni: string, periodo: string) {
    return inscripcionWorkflowService.buscarInscripcionesSecretaria(dni, periodo);
  }

  async listarInscripcionesSecretaria(dni: string, periodo: string) {
    return inscripcionWorkflowService.listarInscripcionesSecretaria(dni, periodo);
  }

  async getResumenPadres(dni: string) {
    return inscripcionPortalService.getResumenPadres(dni);
  }

  async updateApoderado(dni: string, body: any) {
    return inscripcionPortalService.updateApoderado(dni, body);
  }
}
