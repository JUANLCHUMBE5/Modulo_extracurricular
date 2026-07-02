import { Request, Response } from "express";
import { CoordinacionService } from "./coordinacion.service.js";
import { AuthenticatedRequest } from "../../middlewares/auth.js";
import { getDb } from "../../database/dbLocal.js";

const service = new CoordinacionService();

export class CoordinacionController {
  async getCategorias(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getCategorias();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async crearCategoria(req: Request, res: Response): Promise<void> {
    try {
      const { nombre } = req.body;
      const data = await service.crearCategoria(nombre);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async eliminarCategoria(req: Request, res: Response): Promise<void> {
    try {
      const { nombre } = req.params;
      const data = await service.eliminarCategoria(nombre as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getConfiguracionInstitucional(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getConfiguracionInstitucional();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateConfiguracionInstitucional(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.updateConfiguracionInstitucional(req.user?.username || "", req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProgramas(req: Request, res: Response): Promise<void> {
    try {
      const { periodo } = req.query as any;
      const data = await service.getProgramas(periodo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProgramaById(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getProgramaById(req.params.id as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async crearPrograma(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.crearPrograma(req.user?.username || "", req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async subirDocumentoPrograma(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.subirDocumentoPrograma(req.user?.username || "", req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updatePrograma(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.updatePrograma(req.user?.username || "", req.params.id as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateProgramaEstado(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.updateProgramaEstado(req.user?.username || "", req.params.id as string, req.body.estado);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deletePrograma(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await service.deletePrograma(req.user?.username || "", req.params.id as string);
      res.json({ success: true, data: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getInvitados(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getInvitados(req.params.programaId as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMatriculados(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getMatriculados(req.params.programaId as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAsistencias(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getAsistencias(req.params.programaId as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async buscarInvitaciones(req: Request, res: Response): Promise<void> {
    try {
      const q = String(req.query.q || "");
      const data = await service.buscarInvitaciones(q);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async invitarEstudiante(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.invitarEstudiante(req.user?.username || "", req.params.programaId as string, req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async previsualizarCargaExcel(req: Request, res: Response): Promise<void> {
    try {
      const { parseJsonArray, parseJsonObject, normalizarPeriodo } = await import("../../services/file.service.js");
      const { generarPreviewCargaExcel } = await import("../../services/excel.service.js");
      const db = await getDb();

      const periodo = normalizarPeriodo(req.body.periodo);
      const archivo = req.file;
      const frontendProgramas = parseJsonArray(req.body.programas);
      const dbProgramasMap = new Map((db.programas || []).map(p => [p.id, p]));
      const programas = frontendProgramas.map((fp: any) => {
        const dbProg = dbProgramasMap.get(fp.id);
        return {
          ...fp,
          gradosAplicables: fp.gradosAplicables || dbProg?.gradosAplicables || [],
          horariosPorGrupo: fp.horariosPorGrupo || dbProg?.horariosPorGrupo || []
        };
      });

      const existentes = parseJsonObject(req.body.existentes);
      const estudiantes = parseJsonObject(req.body.estudiantes);
      const programaId = req.body.programaId || req.body.programa_id || "";

      const preview = await generarPreviewCargaExcel({
        periodo,
        archivo,
        programas: programas.length ? programas : (db.programas || []),
        existentes: existentes && Object.keys(existentes).length ? existentes : (db.invitadosPorPrograma || {}),
        estudiantes: estudiantes && Object.keys(estudiantes).length ? estudiantes : (db.estudiantes || {}),
        programaId,
      });

      res.json(preview);
    } catch (error: any) {
      res.status(400).json({
        message: error.publicMessage || error.message || "No se pudo validar el archivo Excel.",
      });
    }
  }

  async confirmarCargaExcel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.confirmarCargaExcel(req.user?.username || "", req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCargasHistory(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getCargasHistory();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteCargaHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await service.deleteCargaHistory(req.user?.username || "", req.params.cargaId as string);
      res.json({ success: true, data: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getCargaErrors(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getCargaErrors(req.params.cargaId as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProgramaActividades(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getProgramaActividades(req.params.programaId as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProgramaListaAsistencia(req: Request, res: Response): Promise<void> {
    try {
      const data = await service.getProgramaListaAsistencia(req.params.programaId as string);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async registrarAsistencia(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await service.registrarAsistencia(req.user?.username || "", req.body);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async validarIngresoAuxiliar(req: Request, res: Response): Promise<void> {
    try {
      const busqueda = String(req.query.busqueda || "");
      const programa_id = String(req.query.programa_id || "");
      const data = await service.validarIngresoAuxiliar(busqueda, programa_id);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async validarIngresoQrAuxiliar(req: Request, res: Response): Promise<void> {
    try {
      const codigo = String(req.query.codigo || "");
      const data = await service.validarIngresoQrAuxiliar(codigo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

