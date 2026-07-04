import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import { enviarCorreoGenerico, generarCorreoInvitacion } from "../../../infrastructure/mail/mail.service.js";
import { limpiarDni } from "../../../infrastructure/files/file.service.js";
import {
  mapDbAsistenciaToApi,
  mapDbEnrollmentToApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  resolverHorarioPorGradoApi
} from "../../../common/shared/mappers.js";
import { CoordinacionRepository } from "../repositories/coordinacion.repository.js";

const coordinacionRepository = new CoordinacionRepository();

export class CoordinacionInvitationService {
  async getInvitados(programaId: string) {
    const db = await coordinacionRepository.getDb();
    return db.invitadosPorPrograma?.[programaId] || [];
  }

  async getMatriculados(programaId: string) {
    const db = await coordinacionRepository.getDb();
    const list = (db.inscripciones || [])
      .filter((item: any) => item.programaId === programaId && item.estadoInscripcion !== "Anulada")
      .map((item: any) => mapDbEnrollmentToApi(item, db));
    return list;
  }

  async getAsistencias(programaId: string) {
    const db = await coordinacionRepository.getDb();
    const list = (db.asistencias || [])
      .filter((item: any) => item.programaId === programaId)
      .map(mapDbAsistenciaToApi);
    return list;
  }

  async buscarInvitaciones(q: string) {
    if (!q) return [];
    const db = await coordinacionRepository.getDb();
    const searchVal = normalizarTextoApi(q);
    const results: any[] = [];
    const programas = db.programas || [];

    programas.forEach((prog: any) => {
      const invitados = db.invitadosPorPrograma?.[prog.id] || [];
      const progCostoNum = typeof prog.costo === 'number' ? prog.costo : Number(prog.costo || 0);
      invitados.forEach((inv: any) => {
        const key = normalizarTextoApi(`${inv.nombres} ${inv.dni} ${inv.codigoEstudiante || ""}`);
        if (key.includes(searchVal)) {
          results.push({
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado || "",
            seccion: inv.seccion || "",
            programaNombre: prog.nombre,
            programaId: prog.id,
            costo: progCostoNum,
            horario: resolverHorarioPorGradoApi(prog, inv.grado) || prog.horario || ""
          });
        }
      });
    });
    return results;
  }

  async invitarEstudiante(operatorUsername: string, programaId: string, body: any) {
    const { dni, nombres, grado, seccion, email, telefono, seleccion, nivelCambridge } = body;
    if (!dni || !nombres) {
      throw new Error("DNI y nombres son obligatorios.");
    }

    const db = await coordinacionRepository.getDb();
    const prog = (db.programas || []).find((p: any) => p.id === programaId);
    if (!prog) {
      throw new Error("Programa no encontrado.");
    }

    db.invitadosPorPrograma = db.invitadosPorPrograma || {};
    db.invitadosPorPrograma[programaId] = db.invitadosPorPrograma[programaId] || [];

    const esDuplicado = db.invitadosPorPrograma[programaId].some((i: any) => i.dni === dni);
    if (esDuplicado) {
      throw new Error("El estudiante ya se encuentra invitado a este programa.");
    }

    const nuevoInvitado = {
      dni,
      nombres,
      grado: grado || "",
      seccion: seccion || "",
      correo: email || "",
      telefonoApoderado: telefono || "",
      seleccion: seleccion || "",
      nivelCambridge: nivelCambridge || "",
      createdAt: new Date().toISOString()
    };

    db.invitadosPorPrograma[programaId].push(nuevoInvitado);
    await coordinacionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "INVITACION_CREAR", { programaId, estudianteDni: dni });

    // EnvÃ­o de correo electrÃ³nico si hay destinatario
    if (email) {
      const { asunto, html } = generarCorreoInvitacion(nombres, prog.nombre, String(prog.costo || 0), resolverHorarioPorGradoApi(prog, grado) || prog.horario || "");
      enviarCorreoGenerico({
        para: email,
        asunto,
        html
      }).catch(err => console.error("[INVITATION MAIL ERROR]", err.message));
    }

    return nuevoInvitado;
  }

  async confirmarCargaExcel(operatorUsername: string, body: any) {
    const { periodo, programaId, registros } = body;
    if (!Array.isArray(registros) || registros.length === 0) {
      throw new Error("No hay registros para importar.");
    }

    const db = await coordinacionRepository.getDb();
    const period = normalizarPeriodoApi(periodo);
    const idCarga = (db.nextCargaId || 1);
    db.nextCargaId = idCarga + 1;

    let importados = 0;
    let duplicados = 0;

    db.invitadosPorPrograma = db.invitadosPorPrograma || {};

    const registrosHistorial: any[] = [];

    registros.forEach((reg: any) => {
      const pId = reg.programaId || programaId;
      if (!pId) return;

      db.invitadosPorPrograma[pId] = db.invitadosPorPrograma[pId] || [];

      const existe = db.invitadosPorPrograma[pId].some((i: any) => String(i.dni).replace(/\D/g, "") === String(reg.dni).replace(/\D/g, ""));
      if (existe) {
        duplicados++;
        return;
      }

      const nuevo = {
        dni: reg.dni,
        codigoEstudiante: reg.codigo_estudiante || "",
        nombres: `${reg.nombres} ${reg.apellidos || ""}`.trim(),
        grado: reg.grado || "",
        seccion: reg.seccion || "",
        correo: reg.correo_apoderado || reg.correo || "",
        telefonoApoderado: reg.telefono_apoderado || reg.telefono || "",
        seleccion: reg.seleccion || "",
        nivelCambridge: reg.nivel_cambridge || "",
        nivelEducativo: reg.nivel_educativo || reg.nivel || "",
        cargaId: idCarga
      };

      db.invitadosPorPrograma[pId].push(nuevo);
      importados++;

      registrosHistorial.push({
        dni: reg.dni,
        nombres: nuevo.nombres,
        programaId: pId
      });
    });

    const historialItem = {
      id: String(idCarga),
      fecha: new Date().toISOString(),
      periodo: period,
      usuario: operatorUsername || "Coordinador",
      resumen: {
        importados,
        duplicados,
        total: registros.length
      },
      registros: registrosHistorial
    };

    db.historialCargas = db.historialCargas || [];
    db.historialCargas.unshift(historialItem);

    await coordinacionRepository.saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinador", "coordinacion", "CARGA_EXCEL_CONFIRMAR", {
      cargaId: idCarga,
      importados,
      duplicados
    });

    return historialItem;
  }

  async getCargasHistory() {
    const db = await coordinacionRepository.getDb();
    return db.historialCargas || [];
  }

  async deleteCargaHistory(operatorUsername: string, cargaId: string) {
    const db = await coordinacionRepository.getDb();
    const idx = (db.historialCargas || []).findIndex((h: any) => String(h.id) === String(cargaId));
    if (idx === -1) {
      throw new Error("Carga no encontrada.");
    }

    const item = db.historialCargas[idx];
    const registrosCarga = item.registros || [];

    registrosCarga.forEach((reg: any) => {
      if (reg.programaId && db.invitadosPorPrograma?.[reg.programaId]) {
        db.invitadosPorPrograma[reg.programaId] = db.invitadosPorPrograma[reg.programaId].filter((i: any) =>
          !(i.dni === reg.dni && String(i.cargaId) === String(cargaId))
        );
      }
    });

    db.historialCargas = db.historialCargas.filter((h: any) => String(h.id) !== String(cargaId));
    await coordinacionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinador", "coordinacion", "CARGA_EXCEL_REVERTIR", { cargaId });

    return true;
  }

  async getCargaErrors(cargaId: string) {
    return [];
  }
}

