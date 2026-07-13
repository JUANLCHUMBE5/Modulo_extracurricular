import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import {
  mapDbProgramToApi,
  normalizarPeriodoApi,
  sincronizarPlantillaProgramaApi,
  sincronizarGradosProgramaConInvitadosApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi
} from "../../../common/shared/mappers.js";
import { normalizarConfiguracionInstitucional } from "../helpers/institutional.helpers.js";
import { normalizeIncomingProgram } from "../helpers/program.helpers.js";
import { CoordinacionRepository } from "../repositories/coordinacion.repository.js";

const coordinacionRepository = new CoordinacionRepository();

export class CoordinacionProgramService {
  async getCategorias() {
    const db = await coordinacionRepository.getDb();
    return db.categorias || [];
  }

  async crearCategoria(nombre: string) {
    const db = await coordinacionRepository.getDb();
    db.categorias = db.categorias || [];
    if (!db.categorias.includes(nombre)) {
      db.categorias.push(nombre);
      await coordinacionRepository.saveDb(db);
    }
    return db.categorias;
  }

  async eliminarCategoria(nombre: string) {
    const db = await coordinacionRepository.getDb();
    db.categorias = (db.categorias || []).filter((c: string) => c !== nombre);
    await coordinacionRepository.saveDb(db);
    return db.categorias;
  }

  async getConfiguracionInstitucional() {
    const db = await coordinacionRepository.getDb();
    return normalizarConfiguracionInstitucional(db.configuracionInstitucional);
  }

  async updateConfiguracionInstitucional(operatorUsername: string, data: any) {
    const db = await coordinacionRepository.getDb();
    db.configuracionInstitucional = normalizarConfiguracionInstitucional(data);
    await coordinacionRepository.saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "CONFIGURACION_EDITAR");
    return db.configuracionInstitucional;
  }

  async getProgramas(periodo: string) {
    const db = await coordinacionRepository.getDb();
    const list = db.programas || [];
    if (periodo) {
      const period = normalizarPeriodoApi(periodo);
      return list.filter((p: any) => normalizarPeriodoApi(p.periodo) === period).map((p: any) => mapDbProgramToApi(p, db));
    }
    return list.map((p: any) => mapDbProgramToApi(p, db));
  }

  async getProgramaById(id: string) {
    const db = await coordinacionRepository.getDb();
    const prog = (db.programas || []).find((p: any) => p.id === id);
    if (!prog) {
      throw new Error("Programa no encontrado.");
    }
    return mapDbProgramToApi(prog, db);
  }

  async crearPrograma(operatorUsername: string, body: any) {
    const db = await coordinacionRepository.getDb();
    const pid = `PRG-${String(db.nextProgramaId || 100).padStart(3, "0")}`;
    db.nextProgramaId = (db.nextProgramaId || 100) + 1;

    const normalizedBody = normalizeIncomingProgram(body);

    const nuevo = {
      id: pid,
      ...normalizedBody,
      costo: Number(normalizedBody.costo || 0),
      cupos: Number(normalizedBody.cupos || 0),
      cuposOcupados: 0,
      gradosAplicables: normalizedBody.gradosAplicables || [],
      horariosPorGrupo: normalizedBody.horariosPorGrupo || [],
      tablaHorariosNivel: normalizedBody.tablaHorariosNivel || [],
      estado: normalizedBody.estado || "Habilitado",
      periodo: normalizedBody.periodo || "escolar"
    };

    db.programas = db.programas || [];
    db.programas.push(nuevo);
    await coordinacionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_CREAR", { programaId: pid, nombre: nuevo.nombre });

    return mapDbProgramToApi(nuevo, db);
  }

  async subirDocumentoPrograma(operatorUsername: string, body: any) {
    const id = body.id;
    const plantillaBase64 = body.plantillaBase64 || body.plantilla_base64 || "";
    const plantillaVariables = body.plantillaVariables || body.plantilla_variables || [];
    const plantillaNombre = body.plantillaNombre || body.plantilla || "";
    const plantilla = body.plantilla || "";
    const db = await coordinacionRepository.getDb();

    if (!id) {
      // Crear nuevo programa desde documento
      const pid = `PRG-${String(db.nextProgramaId || 100).padStart(3, "0")}`;
      db.nextProgramaId = (db.nextProgramaId || 100) + 1;

      const nuevo = {
        id: pid,
        nombre: body.nombre_programa || body.nombre || "Taller desde Documento",
        categoria: body.categoria || "General",
        fechaInicio: body.fecha_inicio || new Date().toISOString().split("T")[0],
        fechaFin: body.fecha_fin || new Date().toISOString().split("T")[0],
        costo: Number(body.monto || body.costo || 0),
        cupos: Number(body.cupos || 0),
        cuposOcupados: 0,
        gradosAplicables: body.grados || [],
        horariosPorGrupo: [],
        tablaHorariosNivel: [],
        estado: "Habilitado",
        periodo: body.periodo || "escolar",
        modalidadCobro: body.modalidad_cobro || "Mensual",
        requiereUniforme: Boolean(body.requiere_uniforme),
        horario: body.horario || "Por definir",
        grupo: body.grupo || "Por definir",
        dias: body.dias || [],
        plantilla: plantillaNombre || plantilla || "",
        plantillaBase64: plantillaBase64 || "",
        plantillaVariables: plantillaVariables || [],
        plantillaValidada: true,
        creadoDesdeDocumento: true,
        comunicado: body.comunicado || "",
        comunicadoCompleto: body.comunicado_completo || "",
        requisitos: body.requisitos || "",
        detalleCosto: body.detalle_costo || "",
        detalleAlmuerzo: body.detalle_almuerzo || "",
        concesionarios: body.concesionarios || "",
        tipoComunicado: body.tipo_comunicado || body.tipoComunicado || "",
        tipoDocumento: body.tipo_documento || body.tipoDocumento || "",
        numeroDocumento: body.numero_documento || body.numeroDocumento || "",
        areaTematica: body.area_tematica || body.areaTematica || ""
      };

      db.programas = db.programas || [];
      db.programas.push(nuevo);
      await coordinacionRepository.saveDb(db);

      await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_CREAR", { programaId: pid, nombre: nuevo.nombre });

      return mapDbProgramToApi(nuevo, db);
    }

    const idx = (db.programas || []).findIndex((p: any) => p.id === id);
    if (idx === -1) {
      throw new Error("Programa no encontrado.");
    }

    db.programas[idx].plantillaBase64 = plantillaBase64;
    db.programas[idx].plantillaVariables = plantillaVariables || [];
    db.programas[idx].plantilla = plantillaNombre || plantilla || db.programas[idx].plantilla || "";
    db.programas[idx].plantillaNombre = plantillaNombre || plantilla || "";
    db.programas[idx].plantillaValidada = true;
    db.programas[idx].creadoDesdeDocumento = true;

    await coordinacionRepository.saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_PLANTILLA", { programaId: id });

    return mapDbProgramToApi(db.programas[idx], db);
  }

  async updatePrograma(operatorUsername: string, id: string, body: any) {
    const db = await coordinacionRepository.getDb();
    const idx = (db.programas || []).findIndex((p: any) => p.id === id);
    if (idx === -1) {
      throw new Error("Programa no encontrado.");
    }

    const anterior = db.programas[idx];
    const normalizedBody = normalizeIncomingProgram(body);
    const updated = {
      ...anterior,
      ...normalizedBody,
      costo: Number(normalizedBody.costo !== undefined ? normalizedBody.costo : (anterior.costo || 0)),
      cupos: Number(normalizedBody.cupos !== undefined ? normalizedBody.cupos : (anterior.cupos || 0)),
      gradosAplicables: normalizedBody.gradosAplicables || anterior.gradosAplicables || [],
      horariosPorGrupo: normalizedBody.horariosPorGrupo || anterior.horariosPorGrupo || [],
      tablaHorariosNivel: normalizedBody.tablaHorariosNivel || anterior.tablaHorariosNivel || [],
      tipoComunicado: normalizedBody.tipoComunicado !== undefined ? normalizedBody.tipoComunicado : anterior.tipoComunicado,
      tipoDocumento: normalizedBody.tipoDocumento !== undefined ? normalizedBody.tipoDocumento : anterior.tipoDocumento,
      numeroDocumento: normalizedBody.numeroDocumento !== undefined ? normalizedBody.numeroDocumento : anterior.numeroDocumento,
      areaTematica: normalizedBody.areaTematica !== undefined ? normalizedBody.areaTematica : anterior.areaTematica
    };

    db.programas[idx] = updated;

    // Sincronizar automaticamente matriculas existentes de este programa
    if (Array.isArray(db.inscripciones)) {
      db.inscripciones.forEach((ins: any) => {
        if (ins.programaId === id) {
          ins.fechaInicio = updated.fechaInicio || updated.fecha_inicio || ins.fechaInicio || "";
          ins.fechaFin = updated.fechaFin || updated.fecha_fin || ins.fechaFin || "";
          ins.programa = updated.nombre || ins.programa || "";
          
          const newHorario = resolverHorarioPorGradoApi(updated, ins.gradoEstudiante || ins.grado || "") || updated.horario || "";
          if (newHorario) {
            ins.horario = newHorario;
          }
          
          const newDocente = resolverDocentePorGradoApi(updated, ins.gradoEstudiante || ins.grado || "");
          if (newDocente) {
            ins.docente = newDocente;
          }

        }
      });
    }

    await coordinacionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_EDITAR", { programaId: id });

    return mapDbProgramToApi(updated, db);
  }

  async updateProgramaEstado(operatorUsername: string, id: string, estado: string) {
    const db = await coordinacionRepository.getDb();
    const idx = (db.programas || []).findIndex((p: any) => p.id === id);
    if (idx === -1) {
      throw new Error("Programa no encontrado.");
    }

    const anterior = db.programas[idx].estado;
    db.programas[idx].estado = estado;
    await coordinacionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_ESTADO", {
      programaId: id,
      estadoAnterior: anterior,
      estadoNuevo: estado
    });

    return mapDbProgramToApi(db.programas[idx], db);
  }

  async deletePrograma(operatorUsername: string, id: string) {
    const db = await coordinacionRepository.getDb();
    db.programas = (db.programas || []).filter((p: any) => p.id !== id);
    await coordinacionRepository.saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_ELIMINAR", { programaId: id });
    return true;
  }
}

