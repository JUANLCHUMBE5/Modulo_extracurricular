import { DireccionCorrelativosService } from "./direccion-correlativos.service.js";
import { DireccionDescuentosService } from "./direccion-descuentos.service.js";
import { DireccionReportService } from "./direccion-report.service.js";

const direccionCorrelativosService = new DireccionCorrelativosService();
const direccionDescuentosService = new DireccionDescuentosService();
const direccionReportService = new DireccionReportService();

export class DireccionService {
  async getReportesResumen(query: any) {
    return direccionReportService.getReportesResumen(query);
  }

  async buscarDescuentos(q: string) {
    return direccionDescuentosService.buscarDescuentos(q);
  }

  async aplicarDescuento(operatorUsername: string, operatorRole: string, body: any) {
    return direccionDescuentosService.aplicarDescuento(operatorUsername, operatorRole, body);
  }

  async removerDescuento(operatorUsername: string, operatorRole: string, inscripcionId: string) {
    return direccionDescuentosService.removerDescuento(operatorUsername, operatorRole, inscripcionId);
  }

  async getCorrelativos() {
    return direccionCorrelativosService.getCorrelativos();
  }

  async updateCorrelativos(correlativos: any) {
    return direccionCorrelativosService.updateCorrelativos(correlativos);
  }
}
