import { CoordinacionAttendanceService } from "./coordinacion-attendance.service.js";
import { CoordinacionInvitationService } from "./coordinacion-invitation.service.js";
import { CoordinacionProgramService } from "./coordinacion-program.service.js";

const coordinacionAttendanceService = new CoordinacionAttendanceService();
const coordinacionInvitationService = new CoordinacionInvitationService();
const coordinacionProgramService = new CoordinacionProgramService();

export class CoordinacionService {
  async getCategorias() {
    return coordinacionProgramService.getCategorias();
  }

  async crearCategoria(nombre: string) {
    return coordinacionProgramService.crearCategoria(nombre);
  }

  async eliminarCategoria(nombre: string) {
    return coordinacionProgramService.eliminarCategoria(nombre);
  }

  async getConfiguracionInstitucional() {
    return coordinacionProgramService.getConfiguracionInstitucional();
  }

  async updateConfiguracionInstitucional(operatorUsername: string, data: any) {
    return coordinacionProgramService.updateConfiguracionInstitucional(operatorUsername, data);
  }

  async getProgramas(periodo: string) {
    return coordinacionProgramService.getProgramas(periodo);
  }

  async getProgramaById(id: string) {
    return coordinacionProgramService.getProgramaById(id);
  }

  async crearPrograma(operatorUsername: string, body: any) {
    return coordinacionProgramService.crearPrograma(operatorUsername, body);
  }

  async subirDocumentoPrograma(operatorUsername: string, body: any) {
    return coordinacionProgramService.subirDocumentoPrograma(operatorUsername, body);
  }

  async updatePrograma(operatorUsername: string, id: string, body: any) {
    return coordinacionProgramService.updatePrograma(operatorUsername, id, body);
  }

  async updateProgramaEstado(operatorUsername: string, id: string, estado: string) {
    return coordinacionProgramService.updateProgramaEstado(operatorUsername, id, estado);
  }

  async deletePrograma(operatorUsername: string, id: string) {
    return coordinacionProgramService.deletePrograma(operatorUsername, id);
  }

  async getInvitados(programaId: string) {
    return coordinacionInvitationService.getInvitados(programaId);
  }

  async getMatriculados(programaId: string) {
    return coordinacionInvitationService.getMatriculados(programaId);
  }

  async getAsistencias(programaId: string) {
    return coordinacionInvitationService.getAsistencias(programaId);
  }

  async buscarInvitaciones(q: string) {
    return coordinacionInvitationService.buscarInvitaciones(q);
  }

  async invitarEstudiante(operatorUsername: string, programaId: string, body: any) {
    return coordinacionInvitationService.invitarEstudiante(operatorUsername, programaId, body);
  }

  async confirmarCargaExcel(operatorUsername: string, body: any) {
    return coordinacionInvitationService.confirmarCargaExcel(operatorUsername, body);
  }

  async getCargasHistory() {
    return coordinacionInvitationService.getCargasHistory();
  }

  async deleteCargaHistory(operatorUsername: string, cargaId: string) {
    return coordinacionInvitationService.deleteCargaHistory(operatorUsername, cargaId);
  }

  async getCargaErrors(cargaId: string) {
    return coordinacionInvitationService.getCargaErrors(cargaId);
  }

  async getProgramaActividades(programaId: string) {
    return coordinacionAttendanceService.getProgramaActividades(programaId);
  }

  async getProgramaListaAsistencia(programaId: string) {
    return coordinacionAttendanceService.getProgramaListaAsistencia(programaId);
  }

  async registrarAsistencia(operatorUsername: string, body: any) {
    return coordinacionAttendanceService.registrarAsistencia(operatorUsername, body);
  }

  async validarIngresoAuxiliar(busqueda: string, programaId: string) {
    return coordinacionAttendanceService.validarIngresoAuxiliar(busqueda, programaId);
  }

  async validarIngresoQrAuxiliar(codigo: string) {
    return coordinacionAttendanceService.validarIngresoQrAuxiliar(codigo);
  }
}
