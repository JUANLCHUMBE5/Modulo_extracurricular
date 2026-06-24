import express from "express";
import { randomUUID } from "crypto";
import { getDb, saveDb } from "../localDb.js";
import { requireRole } from "../middleware/auth.js";
import { registrarAuditoria } from "../audit.js";
import { limpiarDni } from "../fileProcessing.js";
import {
  mapDbProgramToApi,
  mapDbAsistenciaToApi,
  sincronizarPlantillaProgramaApi,
  sincronizarGradosProgramaConInvitadosApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  tieneHorariosPorGrupoApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  obtenerCamposProgramaInvitacionApi,
  obtenerPlantillaProgramaApi,
  gradoCorrespondeAlProgramaApi,
  agregarGradoProgramaDesdeAlumnoApi,
  programaListoParaPortalPadresApi,
  programaDisponibleParaGradoApi,
  obtenerGradoCompletoApi,
  mapDbEnrollmentToApi
} from "../apiMappers.js";

const router = express.Router();

const INSTITUTIONAL_ASSET_KEYS = [
  "logoInstitucion",
  "logoCambridge",
  "firmaCoordinacion",
  "firmaDireccion",
  "selloInstitucion",
];

function normalizarConfiguracionInstitucional(valor = {}) {
  const origen = valor && typeof valor === "object" ? valor : {};
  return INSTITUTIONAL_ASSET_KEYS.reduce((acc, key) => {
    const item = origen[key];
    acc[key] = item && typeof item === "object"
      ? {
          nombre: String(item.nombre || ""),
          tipo: String(item.tipo || ""),
          dataUrl: String(item.dataUrl || ""),
          actualizadoEn: String(item.actualizadoEn || ""),
        }
      : null;
    return acc;
  }, {});
}

function esProgramaCambridgeApi(programa = {}) {
  const texto = normalizarTextoApi([
    programa.nombre,
    programa.programa,
    programa.categoria,
    programa.tipoComunicado,
    programa.tipo_comunicado,
    programa.plantilla,
    ...(programa.plantillaVariables || []),
  ].filter(Boolean).join(" "));
  return texto.includes("cambridge") ||
    texto.includes("cambrigde") ||
    texto.includes("cabringde") ||
    texto.includes("camringde") ||
    texto.includes("certificacion cam") ||
    texto.includes("ingles") ||
    texto.includes("ingless") ||
    texto.includes("certificacion") ||
    texto.includes("preparacion") ||
    (programa.plantillaVariables || []).some((variable) =>
      ["anio_cert", "nivel_cambridge", "chk_a", "chk_b", "chk_c"].includes(variable)
    );
}

function claveAlumnoInvitadoApi(alumno = {}) {
  const dni = limpiarDni(alumno.dni);
  if (dni) return `dni:${dni}`;
  const codigo = normalizarTextoApi(alumno.codigoEstudiante || alumno.codigo_estudiante);
  if (codigo) return `codigo:${codigo}`;
  const nombre = normalizarTextoApi(
    alumno.nombres ||
    alumno.alumno ||
    `${alumno.nombre || ""} ${alumno.apellidos || ""}`.trim()
  );
  const grado = normalizarTextoApi(alumno.grado);
  return nombre ? `nombre:${nombre}:${grado}` : "";
}

// Legacy programs listing
router.get("/api/programas", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.programas || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los programas." });
  }
});

// Legacy categories listing
router.get("/api/categorias", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.categorias || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar las categorias." });
  }
});

// Categorias CRUD
router.get("/api/v1/extracurricular/categorias", async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: db.categorias || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/extracurricular/categorias", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { nombre } = req.body;
    const db = await getDb();
    if (!db.categorias.includes(nombre)) {
      db.categorias.push(nombre);
      await saveDb(db);
    }
    res.json({ success: true, data: nombre });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/api/v1/extracurricular/categorias/:nombre", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { nombre } = req.params;
    const db = await getDb();
    db.categorias = (db.categorias || []).filter(c => String(c).toLowerCase() !== String(nombre).toLowerCase());
    await saveDb(db);
    res.json({ success: true, data: nombre });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/coordinacion/configuracion-institucional", requireRole(["coordinacion", "direccion"]), async (_req, res) => {
  try {
    const db = await getDb();
    res.json({
      success: true,
      data: normalizarConfiguracionInstitucional(db.configuracionInstitucional),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/api/v1/extracurricular/coordinacion/configuracion-institucional", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    db.configuracionInstitucional = normalizarConfiguracionInstitucional(req.body || {});
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinacion Academica", req.user?.role || "coordinacion", "CONFIG_INSTITUCIONAL_GUARDAR", {
      recursos: INSTITUTIONAL_ASSET_KEYS.filter((key) => db.configuracionInstitucional[key]?.dataUrl),
    });
    res.json({
      success: true,
      data: db.configuracionInstitucional,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Programas CRUD
router.get("/api/v1/extracurricular/programas", async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, data: (db.programas || []).map((programa) => mapDbProgramToApi(programa, db)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/programas/:id", async (req, res) => {
  try {
    const db = await getDb();
    const prog = (db.programas || []).find(p => p.id === req.params.id);
    if (!prog) return res.status(404).json({ success: false, message: "Programa no encontrado." });
    res.json({ success: true, data: mapDbProgramToApi(prog, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/extracurricular/programas", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const id = `PROG-${String(db.nextProgramaId || 1).padStart(3, "0")}`;
    db.nextProgramaId = (db.nextProgramaId || 1) + 1;

    const nuevo = {
      id,
      nombre: req.body.nombre_programa,
      categoria: req.body.categoria,
      fechaInicio: req.body.fecha_inicio,
      fechaFin: req.body.fecha_fin,
      horaInicio: req.body.hora_inicio,
      horaFin: req.body.hora_fin,
      costo: Number(req.body.monto || 0),
      cupos: Number(req.body.cupos || 0),
      cuposOcupados: 0,
      gradosAplicables: req.body.grados || [],
      responsable: req.body.responsable || "",
      periodo: req.body.periodo || "escolar",
      modalidadCobro: req.body.modalidad_cobro || "Mensual",
      duracionAvisoDias: req.body.duracion_aviso_dias || req.body.duracionAvisoDias || 7,
      horaLimiteAviso: req.body.hora_limite_aviso || req.body.horaLimiteAviso || "23:59",
      requiereUniforme: Boolean(req.body.requiere_uniforme),
      requiereIndumentaria: Boolean(req.body.requiere_indumentaria),
      anuncioImagen: req.body.anuncio_imagen || "",
      anuncioImagenNombre: req.body.anuncio_imagen_nombre || "",
      talleresDeportivos: req.body.talleres_deportivos || [],
      horariosPorGrupo: req.body.horarios_por_grupo || [],
      horario: req.body.horario || "Por definir",
      grupo: req.body.grupo || "Por definir",
      edadMinima: req.body.edad_minima || "",
      edadMaxima: req.body.edad_maxima || "",
      grupoEtario: req.body.grupo_etario || "",
      requisitos: req.body.requisitos || "",
      comunicado: req.body.comunicado || "",
      comunicadoCompleto: req.body.comunicado_completo || "",
      detalleCosto: req.body.detalle_costo || "",
      detalleAlmuerzo: req.body.detalle_almuerzo || "",
      concesionarios: req.body.concesionarios || "",
      invitacionMasiva: Boolean(req.body.invitacion_masiva),
      alcanceInvitacionMasiva: req.body.alcance_invitacion_masiva || "colegio",
      plantilla: req.body.plantilla || "",
      plantillaBase64: req.body.plantilla_base64 || "",
      plantillaVariables: req.body.plantilla_variables || [],
      plantillaValidada: Boolean(req.body.plantilla_validada || req.body.plantilla_base64),
      tipoComunicado: req.body.tipo_comunicado || "",
      tipoDocumento: req.body.tipo_documento || "",
      numeroDocumento: req.body.numero_documento || "",
      areaTematica: req.body.area_tematica || "",
      motivoJustificacion: req.body.motivo_justificacion || "",
      nombreCiclo: req.body.nombre_ciclo || "",
      duracion: req.body.duracion || "",
      tablaHorariosNivel: req.body.tabla_horarios_nivel || [],
      incluyeAlmuerzo: Boolean(req.body.incluye_almuerzo),
      horarioRecepcionAlmuerzo: req.body.horario_recepcion_almuerzo || "",
      nivelCambridge: req.body.nivel_cambridge || "",
      modalidadesCambridge: req.body.modalidades_cambridge || [],
      costoCiclo: req.body.costo_ciclo || "",
      montoPrimerPago: req.body.monto_primer_pago || "",
      estado: "Habilitado"
    };

    if (esProgramaCambridgeApi(nuevo)) {
      nuevo.gradosAplicables = [];
      nuevo.invitacionMasiva = false;
      nuevo.alcanceInvitacionMasiva = "";
    }

    sincronizarPlantillaProgramaApi(db, nuevo);
    db.programas.push(nuevo);
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_CREAR", {
      id,
      nombre: nuevo.nombre,
      costo: nuevo.costo,
      cupos: nuevo.cupos
    });
    res.json({ success: true, data: mapDbProgramToApi(nuevo, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/extracurricular/programas/documento", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const id = `PROG-${String(db.nextProgramaId || 1).padStart(3, "0")}`;
    db.nextProgramaId = (db.nextProgramaId || 1) + 1;

    const nuevo = {
      id,
      nombre: req.body.nombre_programa,
      categoria: req.body.categoria,
      fechaInicio: req.body.fecha_inicio || new Date().toISOString().slice(0, 10),
      fechaFin: req.body.fecha_fin || new Date().toISOString().slice(0, 10),
      costo: Number(req.body.monto || 0),
      cupos: Number(req.body.cupos || 0),
      cuposOcupados: 0,
      gradosAplicables: req.body.grados || [],
      periodo: req.body.periodo || "escolar",
      modalidadCobro: req.body.modalidad_cobro || "Mensual",
      duracionAvisoDias: req.body.duracion_aviso_dias || req.body.duracionAvisoDias || 7,
      horaLimiteAviso: req.body.hora_limite_aviso || req.body.horaLimiteAviso || "23:59",
      requiereUniforme: Boolean(req.body.requiere_uniforme),
      requiereIndumentaria: Boolean(req.body.requiere_indumentaria),
      horario: req.body.horario || "Por definir",
      grupo: req.body.grupo || "Por definir",
      edadMinima: req.body.edad_minima || "",
      edadMaxima: req.body.edad_maxima || "",
      grupoEtario: req.body.grupo_etario || "",
      plantilla: req.body.plantilla || "",
      plantillaBase64: req.body.plantilla_base64 || "",
      plantillaVariables: req.body.plantilla_variables || [],
      plantillaValidada: true,
      requisitos: req.body.requisitos || "",
      comunicado: req.body.comunicado || "",
      comunicadoCompleto: req.body.comunicado_completo || "",
      detalleCosto: req.body.detalle_costo || "",
      detalleAlmuerzo: req.body.detalle_almuerzo || "",
      concesionarios: req.body.concesionarios || "",
      creadoDesdeDocumento: true,
      estado: "Deshabilitado"
    };

    if (esProgramaCambridgeApi(nuevo)) {
      nuevo.gradosAplicables = [];
      nuevo.invitacionMasiva = false;
      nuevo.alcanceInvitacionMasiva = "";
    }

    sincronizarPlantillaProgramaApi(db, nuevo);
    db.programas.push(nuevo);
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Asistente", req.user?.role || "secretaria", "PROGRAMA_CREAR", {
      id,
      nombre: nuevo.nombre,
      creadoDesdeDocumento: true
    });
    res.json({ success: true, data: mapDbProgramToApi(nuevo, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/api/v1/extracurricular/programas/:id", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.programas || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Programa no encontrado." });

    let nuevoEstado = db.programas[idx].estado;
    if (nuevoEstado === "Finalizado") {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      const hoy = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
      if (req.body.fecha_fin >= hoy) {
        nuevoEstado = "Habilitado";
      }
    }

    const plantillaActual = obtenerPlantillaProgramaApi(db, db.programas[idx]);
    const updated = {
      ...db.programas[idx],
      nombre: req.body.nombre_programa,
      categoria: req.body.categoria,
      fechaInicio: req.body.fecha_inicio,
      fechaFin: req.body.fecha_fin,
      horaInicio: req.body.hora_inicio,
      horaFin: req.body.hora_fin,
      costo: Number(req.body.monto || 0),
      cupos: Number(req.body.cupos || 0),
      gradosAplicables: req.body.grados || [],
      responsable: req.body.responsable || "",
      periodo: req.body.periodo || "escolar",
      modalidadCobro: req.body.modalidad_cobro || "Mensual",
      duracionAvisoDias: req.body.duracion_aviso_dias || req.body.duracionAvisoDias || 7,
      horaLimiteAviso: req.body.hora_limite_aviso || req.body.horaLimiteAviso || "23:59",
      requiereUniforme: Boolean(req.body.requiere_uniforme),
      requiereIndumentaria: Boolean(req.body.requiere_indumentaria),
      anuncioImagen: req.body.anuncio_imagen || "",
      anuncioImagenNombre: req.body.anuncio_imagen_nombre || "",
      talleresDeportivos: req.body.talleres_deportivos || [],
      horariosPorGrupo: req.body.horarios_por_grupo || [],
      horario: req.body.horario ?? db.programas[idx].horario ?? "Por definir",
      grupo: req.body.grupo ?? db.programas[idx].grupo ?? "Por definir",
      edadMinima: req.body.edad_minima ?? db.programas[idx].edadMinima ?? "",
      edadMaxima: req.body.edad_maxima ?? db.programas[idx].edadMaxima ?? "",
      grupoEtario: req.body.grupo_etario ?? db.programas[idx].grupoEtario ?? "",
      requisitos: req.body.requisitos || "",
      comunicado: req.body.comunicado || "",
      comunicadoCompleto: req.body.comunicado_completo || "",
      detalleCosto: req.body.detalle_costo || "",
      detalleAlmuerzo: req.body.detalle_almuerzo || "",
      concesionarios: req.body.concesionarios || "",
      invitacionMasiva: Boolean(req.body.invitacion_masiva),
      alcanceInvitacionMasiva: req.body.alcance_invitacion_masiva || "colegio",
      plantilla: req.body.plantilla ?? plantillaActual.plantilla,
      plantillaBase64: req.body.plantilla_base64 ?? plantillaActual.plantillaBase64,
      plantillaVariables: req.body.plantilla_variables ?? plantillaActual.plantillaVariables,
      plantillaValidada: Boolean(req.body.plantilla_validada ?? plantillaActual.plantillaValidada),
      tipoComunicado: req.body.tipo_comunicado ?? db.programas[idx].tipoComunicado ?? "",
      tipoDocumento: req.body.tipo_documento ?? db.programas[idx].tipoDocumento ?? "",
      numeroDocumento: req.body.numero_documento ?? db.programas[idx].numeroDocumento ?? "",
      areaTematica: req.body.area_tematica ?? db.programas[idx].areaTematica ?? "",
      motivoJustificacion: req.body.motivo_justificacion ?? db.programas[idx].motivoJustificacion ?? "",
      nombreCiclo: req.body.nombre_ciclo ?? db.programas[idx].nombreCiclo ?? "",
      duracion: req.body.duracion ?? db.programas[idx].duracion ?? "",
      tablaHorariosNivel: req.body.tabla_horarios_nivel ?? db.programas[idx].tablaHorariosNivel ?? [],
      incluyeAlmuerzo: req.body.incluye_almuerzo !== undefined ? Boolean(req.body.incluye_almuerzo) : Boolean(db.programas[idx].incluyeAlmuerzo),
      horarioRecepcionAlmuerzo: req.body.horario_recepcion_almuerzo ?? db.programas[idx].horarioRecepcionAlmuerzo ?? "",
      nivelCambridge: req.body.nivel_cambridge ?? db.programas[idx].nivelCambridge ?? "",
      modalidadesCambridge: req.body.modalidades_cambridge ?? db.programas[idx].modalidadesCambridge ?? [],
      costoCiclo: req.body.costo_ciclo ?? db.programas[idx].costoCiclo ?? "",
      montoPrimerPago: req.body.monto_primer_pago ?? db.programas[idx].montoPrimerPago ?? "",
      estado: nuevoEstado
    };

    if (esProgramaCambridgeApi(updated)) {
      updated.gradosAplicables = [];
      updated.invitacionMasiva = false;
      updated.alcanceInvitacionMasiva = "";
    }

    const oldName = db.programas[idx].nombre;

    sincronizarPlantillaProgramaApi(db, updated);
    db.programas[idx] = updated;

    // Sync enrollments
    if (Array.isArray(db.inscripciones)) {
      db.inscripciones = db.inscripciones.map(item => {
        if (item.programaId === req.params.id) {
          const gradoEst = item.gradoEstudiante || item.grado || "";
          return {
            ...item,
            programa: updated.nombre,
            categoria: updated.categoria,
            periodo: updated.periodo || "escolar",
            horario: resolverHorarioPorGradoApi(updated, gradoEst) || (tieneHorariosPorGrupoApi(updated) ? "Horario no configurado para este grado" : updated.horario) || "",
            docente: resolverDocentePorGradoApi(updated, gradoEst),
            costo: updated.costo,
            modalidadCobro: updated.modalidadCobro || "Mensual",
            fechaInicio: updated.fechaInicio,
            fechaFin: updated.fechaFin,
            requisitos: updated.requisitos || "",
            comunicado: updated.comunicado || "",
            comunicadoCompleto: updated.comunicadoCompleto || "",
            detalleCosto: updated.detalleCosto || "",
            detalleAlmuerzo: updated.detalleAlmuerzo || "",
            concesionarios: updated.concesionarios || "",
            plantilla: updated.plantilla || "",
            plantillaBase64: updated.plantillaBase64 || "",
            plantillaVariables: updated.plantillaVariables || [],
            plantillaValidada: updated.plantillaValidada,
            tipoComunicado: updated.tipoComunicado,
            tipoDocumento: updated.tipoDocumento,
            numeroDocumento: updated.numeroDocumento,
            areaTematica: updated.areaTematica,
            motivoJustificacion: updated.motivoJustificacion,
            nombreCiclo: updated.nombreCiclo,
            duracion: updated.duracion,
            tablaHorariosNivel: updated.tablaHorariosNivel,
            incluyeAlmuerzo: updated.incluyeAlmuerzo,
            horarioRecepcionAlmuerzo: updated.horarioRecepcionAlmuerzo,
            nivelCambridge: updated.nivelCambridge,
            modalidadesCambridge: updated.modalidadesCambridge,
            costoCiclo: updated.costoCiclo,
            montoPrimerPago: updated.montoPrimerPago
          };
        }
        return item;
      });
    }

    // Sync payments
    if (Array.isArray(db.pagos)) {
      db.pagos = db.pagos.map(item => {
        const isLinkedToInscripcion = item.inscripcionId && (db.inscripciones || []).some(ins => ins.id === item.inscripcionId && ins.programaId === req.params.id);
        const isLinkedByProgramId = item.programaId === req.params.id;
        const isLinkedByProgramName = oldName && normalizarTextoApi(item.programa) === normalizarTextoApi(oldName);

        if (isLinkedToInscripcion || isLinkedByProgramId || isLinkedByProgramName) {
          return {
            ...item,
            programaId: req.params.id,
            programa: updated.nombre,
            periodo: updated.periodo || "escolar"
          };
        }
        return item;
      });
    }

    // Sync attendances
    if (Array.isArray(db.asistencias)) {
      db.asistencias = db.asistencias.map(item => {
        const isLinkedByProgramId = item.programaId === req.params.id;
        const isLinkedByProgramName = oldName && normalizarTextoApi(item.programa) === normalizarTextoApi(oldName);

        if (isLinkedByProgramId || isLinkedByProgramName) {
          const gradoEst = item.gradoEstudiante || item.grado || "";
          return {
            ...item,
            programaId: req.params.id,
            programa: updated.nombre,
            horario: resolverHorarioPorGradoApi(updated, gradoEst) || (tieneHorariosPorGrupoApi(updated) ? "Horario no configurado para este grado" : updated.horario) || ""
          };
        }
        return item;
      });
    }

    // Sync documents
    if (Array.isArray(db.documentosGenerados)) {
      db.documentosGenerados = db.documentosGenerados.map(item => {
        const isLinkedByProgramId = item.programaId === req.params.id;
        const isLinkedByProgramName = oldName && normalizarTextoApi(item.programa) === normalizarTextoApi(oldName);

        if (isLinkedByProgramId || isLinkedByProgramName) {
          return {
            ...item,
            programaId: req.params.id,
            programa: updated.nombre
          };
        }
        return item;
      });
    }

    if (db.invitadosPorPrograma && db.invitadosPorPrograma[req.params.id]) {
      db.invitadosPorPrograma[req.params.id] = db.invitadosPorPrograma[req.params.id].map(invitado => ({
        ...invitado,
        periodo: normalizarPeriodoApi(updated.periodo)
      }));
    }

    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_EDITAR", {
      id: req.params.id,
      nombre: updated.nombre,
      costo: updated.costo,
      cupos: updated.cupos
    });
    res.json({ success: true, data: mapDbProgramToApi(updated, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/api/v1/extracurricular/programas/:id/estado", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const idx = (db.programas || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Programa no encontrado." });

    if (db.programas[idx].estado === "Finalizado" && req.body.estado === "Habilitado") {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      const hoy = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
      if (db.programas[idx].fechaFin < hoy) {
        return res.status(400).json({ success: false, message: "El programa ya finalizó por fecha de vigencia. Modifique la fecha fin para volver a usarlo." });
      }
    }

    const estadoAnterior = db.programas[idx].estado;
    db.programas[idx].estado = req.body.estado;
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_ESTADO", {
      id: req.params.id,
      nombre: db.programas[idx].nombre,
      estadoAnterior,
      estadoNuevo: req.body.estado
    });
    res.json({ success: true, data: mapDbProgramToApi(db.programas[idx], db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/api/v1/extracurricular/programas/:id", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const progId = req.params.id;
    const progAEliminar = (db.programas || []).find(p => p.id === progId);
    if (!progAEliminar) {
      return res.status(404).json({ success: false, message: "Programa no encontrado." });
    }

    progAEliminar.estado = "Archivado";
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "PROGRAMA_ELIMINAR", {
      id: progId,
      nombre: progAEliminar?.nombre || "",
      archivado: true
    });
    res.json({ success: true, data: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Invitaciones e Historial de Cargas
router.get("/api/v1/extracurricular/programas/:programaId/invitados", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const programaId = req.params.programaId;
    const todosInvitados = db.invitadosPorPrograma?.[programaId] || [];

    // Filtrar invitados que ya tienen una inscripción activa en este programa
    const inscripcionesActivas = (db.inscripciones || [])
      .filter((ins) => ins.programaId === programaId && ins.estadoInscripcion !== "Anulada");

    if (!inscripcionesActivas.length) {
      return res.json({ success: true, data: todosInvitados });
    }

    const dnisMatriculados = new Set(
      inscripcionesActivas
        .map((ins) => String(ins.dniEstudiante || "").replace(/\D/g, ""))
        .filter(Boolean)
    );
    const codigosMatriculados = new Set(
      inscripcionesActivas
        .map((ins) => String(ins.codigoEstudiante || "").trim().toUpperCase())
        .filter(Boolean)
    );
    const nombresMatriculados = new Set(
      inscripcionesActivas
        .map((ins) => normalizarTextoApi(ins.nombresEstudiante))
        .filter(Boolean)
    );

    const filtered = todosInvitados.filter((invitado) => {
      const dniInvitado = String(invitado.dni || "").replace(/\D/g, "");
      const codigoInvitado = String(invitado.codigoEstudiante || "").trim().toUpperCase();
      const nombreInvitado = normalizarTextoApi(invitado.nombres);

      if (dniInvitado && dnisMatriculados.has(dniInvitado)) return false;
      if (codigoInvitado && codigosMatriculados.has(codigoInvitado)) return false;

      if (dniInvitado) {
        const estudianteBase = db.estudiantes?.[dniInvitado];
        if (estudianteBase) {
          const codigoDesdeBase = String(estudianteBase.codigoEstudiante || "").trim().toUpperCase();
          if (codigoDesdeBase && codigosMatriculados.has(codigoDesdeBase)) return false;
        }
      }

      if (codigoInvitado) {
        const estudianteBase = Object.values(db.estudiantes || {}).find(
          (e) => String(e.codigoEstudiante || "").trim().toUpperCase() === codigoInvitado
        );
        if (estudianteBase && estudianteBase.dni) {
          const dniDesdeBase = String(estudianteBase.dni).replace(/\D/g, "");
          if (dniDesdeBase && dnisMatriculados.has(dniDesdeBase)) return false;
        }
      }

      if (nombreInvitado && nombresMatriculados.has(nombreInvitado)) return false;

      return true;
    });

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/programas/:programaId/matriculados", async (req, res) => {
  try {
    const db = await getDb();
    const list = (db.inscripciones || [])
      .filter(item => item.programaId === req.params.programaId && item.estadoInscripcion !== "Anulada");
    res.json({ success: true, data: list.map((item) => mapDbEnrollmentToApi(item, db)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/programas/:programaId/asistencias", async (req, res) => {
  try {
    const db = await getDb();
    const prog = db.programas.find(p => p.id === req.params.programaId);
    const nomProg = normalizarTextoApi(prog?.nombre);
    const list = (db.asistencias || [])
      .filter(item => {
        const coincideId = item.programaId && String(item.programaId) === String(req.params.programaId);
        const coincideNombre = nomProg && normalizarTextoApi(item.programa) === nomProg;
        return coincideId || coincideNombre;
      });
    res.json({ success: true, data: list.map(mapDbAsistenciaToApi) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/invitaciones/buscar", async (req, res) => {
  try {
    const { dni, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);

    let result = null;
    for (const prog of programs) {
      const invitados = db.invitadosPorPrograma[prog.id] || [];
      const inv = invitados.find(item => String(item.dni).replace(/\D/g, "") === String(dni).replace(/\D/g, ""));
      if (inv) {
        result = {
          programaId: prog.id,
          programa: mapDbProgramToApi(prog, db),
          invitado: inv
        };
        break;
      }
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/extracurricular/programas/:programaId/invitados", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { programaId } = req.params;
    const { lista } = req.body;
    const db = await getDb();
    const existentes = db.invitadosPorPrograma[programaId] || [];
    const dniExistentes = new Set(existentes.map(item => item.dni));
    const nuevos = (lista || []).filter(item => !dniExistentes.has(item.dni));
    const duplicados = (lista || []).length - nuevos.length;
    const prog = db.programas.find(p => p.id === programaId);

    db.invitadosPorPrograma[programaId] = [
      ...existentes,
      ...nuevos.map(item => ({
        ...item,
        periodo: item.periodo || normalizarPeriodoApi(prog?.periodo)
      }))
    ];
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "INVITACION_MASIVA", {
      programaId,
      programaNombre: prog?.nombre || "",
      cantidad: nuevos.length,
      duplicados
    });
    res.json({ success: true, data: { importados: nuevos.length, duplicados } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/extracurricular/coordinacion/cargas/confirmar", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const preview = req.body;
    const db = await getDb();
    const validos = (preview.registros || []).filter(item => item.estado === "Valido");
    const registrosPorArchivo = new Map();
    const validosPorArchivo = new Map();
    const programasTocados = new Set();
    const nuevasCargas = [];
    const fechaCarga = new Date().toISOString();
    db.invitadosPorPrograma = db.invitadosPorPrograma || {};

    (preview.registros || []).forEach(item => {
      const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
      if (!registrosPorArchivo.has(archivoNombre)) registrosPorArchivo.set(archivoNombre, []);
      registrosPorArchivo.get(archivoNombre).push(item);
    });

    validos.forEach(item => {
      const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
      if (!validosPorArchivo.has(archivoNombre)) validosPorArchivo.set(archivoNombre, []);
      validosPorArchivo.get(archivoNombre).push(item);
    });

    validos.forEach(item => {
      if (!item.programaId) return;
      const programaCarga = db.programas.find(p => p.id === item.programaId);
      if (!programaCarga) return;
      const student = db.estudiantes?.[item.dni];
      const nivelEstudiante = student?.nivel || student?.nivelEducativo || item.nivelEducativo || item.nivel;
      const gradoCompleto = obtenerGradoCompletoApi(item.grado, nivelEstudiante, student?.grado || item.grado);
      if (!esProgramaCambridgeApi(programaCarga) && !gradoCorrespondeAlProgramaApi(programaCarga, gradoCompleto)) {
        throw new Error(`El alumno ${item.alumno || `${item.nombres || ''} ${item.apellidos || ''}`.trim()} no esta dentro de su grado correspondiente para este taller.`);
      }
    });

    validos.forEach(item => {
      if (!item.programaId) return;
      const archivoNombre = item.archivoNombre || preview.archivoNombre || "Carga Excel";
      const grupoArchivo = validosPorArchivo.get(archivoNombre) || [];
      if (!grupoArchivo.cargaId) {
        const todayStr = new Date().toDateString();
        const existing = (db.historialCargas || []).find(
          c =>
            c.archivoNombre === "Registro individual" &&
            c.fecha &&
            new Date(c.fecha).toDateString() === todayStr
        );
        if (archivoNombre === "Registro individual" && existing) {
          grupoArchivo.cargaId = existing.id;
        } else {
          grupoArchivo.cargaId = `CARGA-${Date.now().toString().slice(-8)}-${randomUUID().slice(0, 4)}`;
        }
        grupoArchivo.registrosHistorial = [];
      }
      const cargaId = grupoArchivo.cargaId;
      const existentes = db.invitadosPorPrograma[item.programaId] || [];
      const programaCarga = db.programas.find(p => p.id === item.programaId);
      const student = db.estudiantes?.[item.dni];
      const nivelEstudiante = student?.nivel || student?.nivelEducativo || item.nivelEducativo || item.nivel;
      const gradoCompleto = obtenerGradoCompletoApi(item.grado, nivelEstudiante, student?.grado || item.grado);
      if (!esProgramaCambridgeApi(programaCarga) && !gradoCorrespondeAlProgramaApi(programaCarga, gradoCompleto)) {
        throw new Error("El alumno no esta dentro de su grado correspondiente para este taller.");
      }
      const claveAlumno = claveAlumnoInvitadoApi(item);
      const alumnoYaExiste = Boolean(claveAlumno && existentes.some(existente =>
        claveAlumnoInvitadoApi(existente) === claveAlumno
      ));
      if (alumnoYaExiste) {
        item.estado = "Duplicado";
        item.errores = [...(item.errores || []), "Alumno ya existe en este taller vigente."];
        grupoArchivo.duplicadosConfirmacion = (grupoArchivo.duplicadosConfirmacion || 0) + 1;
        return;
      }
      if (!esProgramaCambridgeApi(programaCarga)) {
        agregarGradoProgramaDesdeAlumnoApi(programaCarga, gradoCompleto);
        programasTocados.add(item.programaId);
      }
      const invitado = {
        cargaId,
        codigoEstudiante: item.codigoEstudiante || "",
        dni: item.dni,
        nombres: `${item.nombres || ""} ${item.apellidos || ""}`.trim(),
        grado: gradoCompleto,
        seccion: item.seccion,
        nivelEducativo: nivelEstudiante || item.nivelEducativo || "",
        seleccion: item.seleccion || "",
        nivelCambridge: item.nivelCambridge || "",
        periodo: normalizarPeriodoApi(preview.periodo),
        telefonoApoderado: item.telefono || "",
        correo: item.correo || "",
        observacion: item.observacion || "",
        archivoNombre,
        estado: item.estadoAlumno || "Invitado"
      };
      db.invitadosPorPrograma[item.programaId] = [
        ...existentes,
        invitado
      ];
      grupoArchivo.registrosHistorial.push({
        programaId: item.programaId,
        programaNombre: item.programaNombre || "",
        archivoNombre,
        dni: item.dni,
        codigoEstudiante: item.codigoEstudiante || "",
        nombres: invitado.nombres,
        grado: gradoCompleto,
        seccion: item.seccion
      });
    });

    programasTocados.forEach((programaId) => {
      sincronizarGradosProgramaConInvitadosApi(db, programaId);
    });

    const duplicadosConfirmacionTotal = Array.from(validosPorArchivo.values()).reduce(
      (total, grupoArchivo) => total + (grupoArchivo.duplicadosConfirmacion || 0),
      0
    );

    validosPorArchivo.forEach((grupoArchivo, archivoNombre) => {
      if (!grupoArchivo.cargaId) return;
      const registrosArchivo = registrosPorArchivo.get(archivoNombre) || grupoArchivo;
      const importadosArchivo = (grupoArchivo.registrosHistorial || []).length;

      const todayStr = new Date().toDateString();
      const existingIndex = (db.historialCargas || []).findIndex(
        c =>
          c.archivoNombre === "Registro individual" &&
          c.fecha &&
          new Date(c.fecha).toDateString() === todayStr
      );

      if (archivoNombre === "Registro individual" && existingIndex !== -1) {
        const ec = db.historialCargas[existingIndex];
        ec.registros = [...(ec.registros || []), ...(grupoArchivo.registrosHistorial || [])];
        ec.resumen = {
          importados: (ec.resumen?.importados || 0) + importadosArchivo,
          total: (ec.resumen?.total || 0) + registrosArchivo.length,
          errores: (ec.resumen?.errores || 0) + registrosArchivo.filter(item => item.estado === "Error").length,
          duplicados: (ec.resumen?.duplicados || 0) + registrosArchivo.filter(item => item.estado === "Duplicado").length
        };
      } else {
        if (importadosArchivo === 0) return;
        nuevasCargas.push({
          id: grupoArchivo.cargaId,
          fecha: fechaCarga,
          periodo: normalizarPeriodoApi(preview.periodo),
          archivoNombre,
          archivos: [archivoNombre],
          usuario: req.user?.username || "Coordinación Académica",
          resumen: {
            importados: importadosArchivo,
            total: registrosArchivo.length,
            errores: registrosArchivo.filter(item => item.estado === "Error").length,
            duplicados: registrosArchivo.filter(item => item.estado === "Duplicado").length
          },
          registros: grupoArchivo.registrosHistorial || []
        });
      }
    });

    db.historialCargas = Array.isArray(db.historialCargas) ? db.historialCargas : [];
    db.historialCargas = [...nuevasCargas, ...db.historialCargas];

    await saveDb(db);

    const primerArchivoNombre = validos[0] ? (validos[0].archivoNombre || preview.archivoNombre || "Carga Excel") : "";
    const returnedCargaId = primerArchivoNombre ? (validosPorArchivo.get(primerArchivoNombre)?.cargaId || "") : "";

    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "CARGAR_EXCEL", {
      cargaIds: nuevasCargas.map(carga => carga.id),
      cantidad: validos.length - duplicadosConfirmacionTotal,
      periodo: preview.periodo,
      total: preview.resumen?.total || validos.length,
      errores: preview.resumen?.errores || 0,
      duplicados: (preview.resumen?.duplicados || 0) + duplicadosConfirmacionTotal
    });
    res.json({
      success: true,
      data: {
        cargaId: returnedCargaId,
        cargaIds: nuevasCargas.map(carga => carga.id),
        cargas: nuevasCargas,
        importados: validos.length - duplicadosConfirmacionTotal,
        total: preview.resumen?.total || validos.length,
        errores: preview.resumen?.errores || 0,
        duplicados: (preview.resumen?.duplicados || 0) + duplicadosConfirmacionTotal
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/coordinacion/cargas", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const db = await getDb();
    const historial = Array.isArray(db.historialCargas) ? db.historialCargas : [];
    res.json({ success: true, data: historial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/api/v1/extracurricular/coordinacion/cargas/:cargaId", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { cargaId } = req.params;
    const db = await getDb();
    db.historialCargas = Array.isArray(db.historialCargas) ? db.historialCargas : [];
    db.invitadosPorPrograma = db.invitadosPorPrograma || {};
    const carga = db.historialCargas.find(item => item.id === cargaId);
    if (!carga) return res.status(404).json({ success: false, message: "No se encontro la carga seleccionada." });

    const registros = Array.isArray(carga.registros) ? carga.registros : [];
    const tieneInscripcion = registros.some(registro =>
      (db.inscripciones || []).some(inscripcion =>
        inscripcion.programaId === registro.programaId &&
        inscripcion.dniEstudiante === registro.dni &&
        inscripcion.estadoInscripcion !== "Anulada" &&
        inscripcion.estadoInscripcion !== "anulada"
      )
    );

    if (tieneInscripcion) {
      return res.status(409).json({
        success: false,
        message: "No se puede borrar esta carga porque uno o mas alumnos ya tienen inscripcion activa."
      });
    }

    let eliminados = 0;
    const programasAfectados = new Set(registros.map(registro => registro.programaId).filter(Boolean));
    programasAfectados.forEach(programaId => {
      const actuales = db.invitadosPorPrograma[programaId] || [];
      const filtrados = actuales.filter(invitado => invitado.cargaId !== cargaId);
      eliminados += actuales.length - filtrados.length;
      db.invitadosPorPrograma[programaId] = filtrados;
      sincronizarGradosProgramaConInvitadosApi(db, programaId);
    });

    db.historialCargas = db.historialCargas.filter(item => item.id !== cargaId);
    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Coordinación Académica", req.user?.role || "coordinacion", "CARGA_EXCEL_REVERTIR", {
      cargaId,
      eliminados,
      archivos: carga.archivos || []
    });
    res.json({ success: true, data: { cargaId, eliminados } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/programas/:programaId/actividad", requireRole(["coordinacion"]), async (req, res) => {
  try {
    const { programaId } = req.params;
    const db = await getDb();
    const alumnos = db.invitadosPorPrograma[programaId]?.length || 0;
    const inscripciones = (db.inscripciones || []).filter(item => item.programaId === programaId).length;
    const documentos = (db.documentosGenerados || []).filter(item => item.programaId === programaId).length;
    res.json({
      success: true,
      data: {
        alumnos,
        inscripciones,
        documentos,
        tieneActividad: (alumnos + inscripciones + documentos) > 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/api/v1/extracurricular/coordinacion/cargas/:cargaId/errores", requireRole(["coordinacion"]), async (req, res) => {
  res.json({ success: true, data: [] });
});

router.get("/api/v1/extracurricular/programas/:programaId/lista-asistencia", requireRole(["auxiliar", "coordinacion"]), async (req, res) => {
  try {
    const { programaId } = req.params;
    const db = await getDb();
    const invitados = db.invitadosPorPrograma[programaId] || [];
    const list = invitados.map(estudiante => ({
      ...estudiante,
      asistencia: Array.from({ length: 5 }, (_, index) => ({
        sesion: index + 1,
        fecha: `2026-04-${String(7 + index * 7).padStart(2, "0")}`,
        asistio: Math.random() > 0.3
      }))
    }));
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/api/v1/extracurricular/asistencia", requireRole(["auxiliar"]), async (req, res) => {
  try {
    const { inscripcion_id, pago_id, dni_estudiante, estado_acceso, observacion, origen } = req.body;
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
    await registrarAuditoria(req.user?.username || origen || "Auxiliar", req.user?.role || "auxiliar", "ASISTENCIA_REGISTRAR", {
      alumno: nuevaAsistencia.nombresEstudiante,
      taller: nuevaAsistencia.programa,
      fecha: nuevaAsistencia.fechaRegistro,
      estado: nuevaAsistencia.estadoAcceso
    });
    res.json({ success: true, data: mapDbAsistenciaToApi(nuevaAsistencia) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
