import { getDb, saveDb } from "../../database/dbLocal.js";
import { registrarAuditoria } from "../../services/audit.service.js";
import { enviarCorreoGenerico, generarCorreoInvitacion } from "../../services/mail.service.js";
import { limpiarDni } from "../../services/file.service.js";
import {
  mapDbProgramToApi,
  mapDbAsistenciaToApi,
  sincronizarPlantillaProgramaApi,
  sincronizarGradosProgramaConInvitadosApi,
  resolverHorarioPorGradoApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  obtenerGradoCompletoApi,
  mapDbEnrollmentToApi
} from "../../shared/mappers.js";
import {
  normalizarConfiguracionInstitucional,
  normalizeIncomingProgram,
  resolverValidacion,
  resolverValidacionPorNombre,
  extraerIdentificadoresCodigo,
  ordenarPorFecha,
  normalizarTexto
} from "./coordinacion.helpers.js";

export class CoordinacionService {
  async getCategorias() {
    const db = await getDb();
    return db.categorias || [];
  }

  async crearCategoria(nombre: string) {
    const db = await getDb();
    db.categorias = db.categorias || [];
    if (!db.categorias.includes(nombre)) {
      db.categorias.push(nombre);
      await saveDb(db);
    }
    return db.categorias;
  }

  async eliminarCategoria(nombre: string) {
    const db = await getDb();
    db.categorias = (db.categorias || []).filter((c: string) => c !== nombre);
    await saveDb(db);
    return db.categorias;
  }

  async getConfiguracionInstitucional() {
    const db = await getDb();
    return normalizarConfiguracionInstitucional(db.configuracionInstitucional);
  }

  async updateConfiguracionInstitucional(operatorUsername: string, data: any) {
    const db = await getDb();
    db.configuracionInstitucional = normalizarConfiguracionInstitucional(data);
    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "CONFIGURACION_EDITAR");
    return db.configuracionInstitucional;
  }

  async getProgramas(periodo: string) {
    const db = await getDb();
    const list = db.programas || [];
    if (periodo) {
      const period = normalizarPeriodoApi(periodo);
      return list.filter((p: any) => normalizarPeriodoApi(p.periodo) === period).map(mapDbProgramToApi);
    }
    return list.map(mapDbProgramToApi);
  }

  async getProgramaById(id: string) {
    const db = await getDb();
    const prog = (db.programas || []).find((p: any) => p.id === id);
    if (!prog) {
      throw new Error("Programa no encontrado.");
    }
    return mapDbProgramToApi(prog);
  }

  async crearPrograma(operatorUsername: string, body: any) {
    const db = await getDb();
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
      estado: normalizedBody.estado || "Borrador",
      periodo: normalizedBody.periodo || "escolar"
    };

    db.programas = db.programas || [];
    db.programas.push(nuevo);
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_CREAR", { programaId: pid, nombre: nuevo.nombre });

    return mapDbProgramToApi(nuevo);
  }

  async subirDocumentoPrograma(operatorUsername: string, body: any) {
    const { id, plantillaBase64, plantillaVariables, plantillaNombre, plantilla } = body;
    const db = await getDb();

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
        estado: "Borrador",
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
      await saveDb(db);

      await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_CREAR", { programaId: pid, nombre: nuevo.nombre });

      return mapDbProgramToApi(nuevo);
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

    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_PLANTILLA", { programaId: id });

    return mapDbProgramToApi(db.programas[idx]);
  }

  async updatePrograma(operatorUsername: string, id: string, body: any) {
    const db = await getDb();
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
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_EDITAR", { programaId: id });

    return mapDbProgramToApi(updated);
  }

  async updateProgramaEstado(operatorUsername: string, id: string, estado: string) {
    const db = await getDb();
    const idx = (db.programas || []).findIndex((p: any) => p.id === id);
    if (idx === -1) {
      throw new Error("Programa no encontrado.");
    }

    const anterior = db.programas[idx].estado;
    db.programas[idx].estado = estado;
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_ESTADO", {
      programaId: id,
      estadoAnterior: anterior,
      estadoNuevo: estado
    });

    return mapDbProgramToApi(db.programas[idx]);
  }

  async deletePrograma(operatorUsername: string, id: string) {
    const db = await getDb();
    db.programas = (db.programas || []).filter((p: any) => p.id !== id);
    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "PROGRAMA_ELIMINAR", { programaId: id });
    return true;
  }

  async getInvitados(programaId: string) {
    const db = await getDb();
    return db.invitadosPorPrograma?.[programaId] || [];
  }

  async getMatriculados(programaId: string) {
    const db = await getDb();
    const list = (db.inscripciones || [])
      .filter((item: any) => item.programaId === programaId && item.estadoInscripcion !== "Anulada")
      .map((item: any) => mapDbEnrollmentToApi(item, db));
    return list;
  }

  async getAsistencias(programaId: string) {
    const db = await getDb();
    const list = (db.asistencias || [])
      .filter((item: any) => item.programaId === programaId)
      .map(mapDbAsistenciaToApi);
    return list;
  }

  async buscarInvitaciones(q: string) {
    if (!q) return [];
    const db = await getDb();
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

    const db = await getDb();
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
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinacion", "coordinacion", "INVITACION_CREAR", { programaId, estudianteDni: dni });

    // Envío de correo electrónico si hay destinatario
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

    const db = await getDb();
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

    await saveDb(db);
    await registrarAuditoria(operatorUsername || "Coordinador", "coordinacion", "CARGA_EXCEL_CONFIRMAR", {
      cargaId: idCarga,
      importados,
      duplicados
    });

    return historialItem;
  }

  async getCargasHistory() {
    const db = await getDb();
    return db.historialCargas || [];
  }

  async deleteCargaHistory(operatorUsername: string, cargaId: string) {
    const db = await getDb();
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
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Coordinador", "coordinacion", "CARGA_EXCEL_REVERTIR", { cargaId });

    return true;
  }

  async getCargaErrors(cargaId: string) {
    return [];
  }

  async getProgramaActividades(programaId: string) {
    const db = await getDb();
    const filteredLogs = (db.auditLogs || []).filter((log: any) => {
      const details = log.details || {};
      return details.programaId === programaId || details.programa_id === programaId;
    });
    return ordenarPorFecha(filteredLogs);
  }

  async getProgramaListaAsistencia(programaId: string) {
    const db = await getDb();
    const enrollments = (db.inscripciones || []).filter((item: any) => item.programaId === programaId && item.estadoInscripcion !== "Anulada");
    const asistencias = db.asistencias || [];

    const pageList = enrollments.map((inscrip: any) => {
      const student = db.estudiantes?.[inscrip.dniEstudiante] || null;
      const filteredAst = asistencias.filter((a: any) =>
        a.dniEstudiante === inscrip.dniEstudiante && (a.programaId === programaId || normalizarTexto(a.programa) === normalizarTexto(inscrip.programa))
      );
      
      const lastAst = filteredAst.length ? ordenarPorFecha(filteredAst)[0] : null;

      return {
        inscripcionId: inscrip.id,
        dniEstudiante: inscrip.dniEstudiante,
        codigoEstudiante: inscrip.codigoEstudiante,
        nombresEstudiante: inscrip.nombresEstudiante,
        gradoEstudiante: inscrip.gradoEstudiante || (student ? obtenerGradoCompletoApi(student.grado, student.nivel) : ""),
        seccion: inscrip.seccion || "",
        estadoPago: inscrip.estadoPago || "Pendiente",
        asistenciasRegistradas: filteredAst.length,
        ultimoIngreso: lastAst ? lastAst.fechaRegistro : null
      };
    });

    return pageList;
  }

  async registrarAsistencia(operatorUsername: string, body: any) {
    const { inscripcion_id, pago_id, dni_estudiante, estado_acceso, observacion, origen } = body;
    const db = await getDb();

    const inscrip = (db.inscripciones || []).find(item => item.id === inscripcion_id);
    const student = db.estudiantes?.[dni_estudiante];
    const prog = inscrip ? db.programas.find(p => p.id === inscrip.programaId) : null;

    const astId = `AST-${String(Date.now()).slice(-6)}`;
    const nuevaAsistencia = {
      id: astId,
      inscripcionId: inscripcion_id,
      pagoId: pago_id,
      dniEstudiante: dni_estudiante,
      codigoEstudiante: student?.codigoEstudiante || "",
      nombresEstudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : "",
      programaId: inscrip?.programaId || "",
      programa: inscrip?.programa || prog?.nombre || "",
      horario: inscrip?.horario || "",
      estadoPago: inscrip?.estadoPago || "Pendiente",
      estadoAcceso: estado_acceso || "presente",
      observacion: observacion || "",
      origen: origen || "Auxiliar",
      fechaRegistro: new Date().toISOString()
    };

    db.asistencias = db.asistencias || [];
    db.asistencias.push(nuevaAsistencia);
    await saveDb(db);

    await registrarAuditoria(operatorUsername || origen || "Auxiliar", "auxiliar", "ASISTENCIA_REGISTRAR", {
      alumno: nuevaAsistencia.nombresEstudiante,
      taller: nuevaAsistencia.programa,
      fecha: nuevaAsistencia.fechaRegistro,
      estado: nuevaAsistencia.estadoAcceso
    });

    return mapDbAsistenciaToApi(nuevaAsistencia);
  }

  async validarIngresoAuxiliar(busqueda: string, programaId: string) {
    const db = await getDb();
    const query = String(busqueda || "").trim();

    if (/^\d+$/.test(query)) {
      const dniLimpio = String(query).replace(/\D/g, "").slice(0, 8);
      if (dniLimpio.length !== 8) {
        throw new Error("El DNI debe contener exactamente 8 numeros.");
      }
      return resolverValidacion(db, { dni: dniLimpio, codigoOriginal: dniLimpio, programaId });
    } else {
      return resolverValidacionPorNombre(db, query, programaId);
    }
  }

  async validarIngresoQrAuxiliar(codigo: string) {
    const db = await getDb();
    const ids = extraerIdentificadoresCodigo(codigo);
    return resolverValidacion(db, ids);
  }
}
