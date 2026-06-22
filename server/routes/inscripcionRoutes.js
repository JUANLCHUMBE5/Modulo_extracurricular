import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, saveDb } from "../localDb.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { registrarAuditoria } from "../audit.js";
import { limpiarDni as limpiarDniHelper, normalizarComparacion } from "../fileProcessing.js";
import {
  mapDbEnrollmentToApi,
  obtenerGradoCompletoApi,
  obtenerCamposProgramaInvitacionApi,
  obtenerPlantillaProgramaApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  tieneHorariosPorGrupoApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  programaListoParaPortalPadresApi,
  programaDisponibleParaGradoApi
} from "../apiMappers.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTRANJEROS_DB_PATH = path.resolve(__dirname, "../estudiantes_externos.json");

// Helper to clean DNI
function limpiarDni(val) {
  return limpiarDniHelper ? limpiarDniHelper(val) : String(val || "").replace(/\D/g, "");
}

async function readExternalStudents() {
  try {
    const data = await fs.readFile(EXTRANJEROS_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveExternalStudent(student) {
  try {
    const current = await readExternalStudents();
    current[student.dni] = {
      ...student,
      guardadoEn: new Date().toISOString()
    };
    await fs.writeFile(EXTRANJEROS_DB_PATH, JSON.stringify(current, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving external student:", error);
  }
}

// Legacy student list
router.get("/api/estudiantes", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(Object.values(db.estudiantes || {}));
  } catch {
    res.status(500).json({ message: "No se pudieron listar los estudiantes." });
  }
});

// Legacy student by DNI
router.get("/api/estudiantes/:dni", async (req, res) => {
  try {
    const db = await getDb();
    const dni = limpiarDni(req.params.dni);
    const estudiante = db.estudiantes?.[dni];
    if (!estudiante) return res.status(404).json({ message: "Estudiante no encontrado." });
    return res.json(estudiante);
  } catch {
    return res.status(500).json({ message: "No se pudo consultar el estudiante." });
  }
});

// Legacy enrollments listing
router.get("/api/inscripciones", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.inscripciones || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar las inscripciones." });
  }
});

// Legacy documents listing
router.get("/api/documentos", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.documentosGenerados || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los documentos." });
  }
});

// Legacy parent summary
router.get("/api/padres/:dni/resumen", async (req, res) => {
  try {
    const db = await getDb();
    const dni = limpiarDni(req.params.dni);
    const estudiante = db.estudiantes?.[dni];
    if (!estudiante) return res.status(404).json({ message: "Estudiante no encontrado." });

    const inscripciones = (db.inscripciones || []).filter((item) =>
      item.dniEstudiante === dni || item.codigoEstudiante === estudiante.codigoEstudiante
    );
    const pagos = (db.pagos || []).filter((item) =>
      item.dniEstudiante === dni || inscripciones.some((inscripcion) => inscripcion.id === item.inscripcionId)
    );
    const documentos = (db.documentosGenerados || []).filter((item) =>
      item.dniEstudiante === dni || normalizarComparacion(item.alumno) === normalizarComparacion(estudiante.nombres)
    );
    const invitaciones = [];
    const programs = db.programas || [];
    for (const prog of programs) {
      const invitados = db.invitadosPorPrograma[prog.id] || [];
      const inv = invitados.find(item => String(item.dni).replace(/\D/g, "") === String(dni).replace(/\D/g, ""));
      if (inv) {
        invitaciones.push({
          programaId: prog.id,
          programa: prog,
          invitado: inv
        });
      }
    }

    return res.json({ estudiante, invitaciones, inscripciones, pagos, documentos });
  } catch {
    return res.status(500).json({ message: "No se pudo consultar el resumen del padre." });
  }
});

// Secretaria: Estudiante por DNI
router.get("/api/v1/extracurricular/secretaria/estudiantes/:dni", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    let student = db.estudiantes?.[dni];
    let esExterno = false;
    if (!student) {
      const extStudents = await readExternalStudents();
      if (extStudents[dni]) {
        student = extStudents[dni];
        esExterno = true;
      }
    }
    let invitacion = null;

    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    for (const prog of programs) {
      const invitados = db.invitadosPorPrograma[prog.id] || [];
      const inv = invitados.find(item => item.dni === dni);
      if (inv) {
        invitacion = {
          programaId: prog.id,
          programa: prog,
          invitado: inv
        };
        break;
      }
    }

    if (!student && invitacion) {
      student = {
        dni: invitacion.invitado.dni,
        codigoEstudiante: invitacion.invitado.codigoEstudiante || "",
        nombres: invitacion.invitado.nombres.split(" ").slice(0, -2).join(" ") || invitacion.invitado.nombres,
        apellidos: invitacion.invitado.nombres.split(" ").slice(-2).join(" ") || "",
        grado: invitacion.invitado.grado,
        seccion: invitacion.invitado.seccion,
        nivel: invitacion.invitado.nivelEducativo || "",
        fechaNacimiento: "2010-01-01",
        tipoAlumno: "Alumno invitado",
        estadoMatricula: "Activo",
        apoderado: "",
        telefonoApoderado: invitacion.invitado.telefonoApoderado || "",
        correoApoderado: invitacion.invitado.correo || "",
        tieneInvitacion: true,
        programaAsignado: invitacion.programaId,
        programaNombre: invitacion.programa.nombre,
        programaCosto: invitacion.programa.costo,
        seleccion: invitacion.invitado.seleccion || "",
        nivelCambridge: invitacion.invitado.nivelCambridge || ""
      };
    }

    if (student) {
      const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
      const inscrip = inscripciones[0];
      const programaInvitado = invitacion ? invitacion.programa : null;
      const plantillaInvitada = programaInvitado ? obtenerPlantillaProgramaApi(db, programaInvitado) : {};
      const cuposDisponiblesInvitado = programaInvitado
        ? Math.max(0, Number(programaInvitado.cupos || 0) - Number(programaInvitado.cuposOcupados || 0))
        : 0;
      const invitadoExcel = invitacion?.invitado || {};

      const resStudent = {
        id: student.dni,
        estudiante_id: student.dni,
        dni_estudiante: student.dni,
        codigo_estudiante: invitadoExcel.codigoEstudiante || student.codigoEstudiante || "",
        nombres: invitadoExcel.nombres || student.nombres,
        apellidos: invitadoExcel.nombres ? "" : (student.apellidos || ""),
        fecha_nacimiento: student.fechaNacimiento,
        grado_nombre: invitadoExcel.grado || student.grado,
        seccion: invitadoExcel.seccion || student.seccion,
        nivel_nombre: invitadoExcel.nivelEducativo || student.nivel || "",
        tipo_alumno: student.tipoAlumno || "Alumno externo",
        estado_matricula: student.estadoMatricula || "Activo",
        apoderado: student.apoderado || (invitacion ? (invitacion.invitado.apoderado || "") : ""),
        telefono_apoderado: student.telefonoApoderado || (invitacion ? (invitacion.invitado.telefonoApoderado || "") : ""),
        correo_apoderado: student.correoApoderado || (invitacion ? (invitacion.invitado.correo || "") : ""),
        tieneInvitacion: Boolean(invitacion),
        programaAsignado: invitacion ? invitacion.programaId : "",
        programaNombre: invitacion ? invitacion.programa.nombre : "",
        programaCosto: invitacion ? invitacion.programa.costo : "",
        programaPeriodo: programaInvitado?.periodo || "",
        programaGrupo: programaInvitado?.grupo || "",
        programaGrupoEtario: programaInvitado?.grupoEtario || programaInvitado?.grupo || "",
        programaHorario: programaInvitado?.horario || "",
        programaDisponible: Boolean(invitacion),
        programaHorarioConfigurado: true,
        programaDocente: programaInvitado?.responsable || programaInvitado?.docente || "No definido",
        programaCupos: programaInvitado ? `${cuposDisponiblesInvitado} cupos disponibles` : "",
        programaCuposDisponibles: cuposDisponiblesInvitado,
        programaModalidadCobro: programaInvitado?.modalidadCobro || "",
        programaRequisitos: programaInvitado?.requisitos || "",
        programaComunicadoCompleto: programaInvitado?.comunicadoCompleto || "",
        programaFechaInicio: programaInvitado?.fechaInicio || "",
        programaFechaFin: programaInvitado?.fechaFin || "",
        programaDuracionTaller: programaInvitado?.duracionTaller || "",
        programaDuracionAvisoDias: programaInvitado?.duracionAvisoDias || "",
        plantilla: plantillaInvitada.plantilla || "",
        plantillaBase64: plantillaInvitada.plantillaBase64 || "",
        plantillaVariables: plantillaInvitada.plantillaVariables || [],
        plantillaValidada: Boolean(plantillaInvitada.plantillaValidada),
        requiereUniforme: Boolean(programaInvitado?.requiereUniforme),
        requiereIndumentaria: Boolean(programaInvitado?.requiereIndumentaria),
        seleccion: invitadoExcel.seleccion || student.seleccion || "",
        nivelCambridge: invitadoExcel.nivelCambridge || student.nivelCambridge || "",
        estadoInscripcion: inscrip ? inscrip.estadoInscripcion : "No inscrito",
        estadoPago: inscrip ? (inscrip.estadoPago || "Pendiente") : "Pendiente",
        origenRegistro: inscrip ? (inscrip.origenRegistro || "Presencial") : "Base general de estudiantes",
        periodo: period === "verano" ? "Ciclo verano" : "Año escolar",
        esExterno: esExterno || student.tipoAlumno === "Alumno externo" || student.esExterno || false
      };

      res.json({ success: true, data: resStudent });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Secretaria: Buscar estudiantes por nombre
router.get("/api/v1/extracurricular/secretaria/estudiantes", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const { nombre, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const searchVal = normalizarTextoApi(nombre);

    if (searchVal.length < 3) return res.json({ success: true, data: [] });

    const results = [];
    const seenDnis = new Set();

    Object.values(db.estudiantes || {}).forEach(student => {
      const searchKey = normalizarTextoApi(`${student.nombres} ${student.codigoEstudiante || ""}`);
      if (searchKey.includes(searchVal)) {
        seenDnis.add(student.dni);

        let invitacion = null;
        const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
        for (const prog of programs) {
          const invitados = db.invitadosPorPrograma[prog.id] || [];
          const inv = invitados.find(item => item.dni === student.dni);
          if (inv) {
            invitacion = {
              programaId: prog.id,
              programa: prog,
              invitado: inv
            };
            break;
          }
        }

        const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === student.dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
        const inscrip = inscripciones[0];
        const invitadoExcel = invitacion?.invitado || {};
        const camposProgramaInvitacion = obtenerCamposProgramaInvitacionApi(db, invitacion ? invitacion.programa : null, invitadoExcel.grado || student.grado);

        results.push({
          id: student.dni,
          estudiante_id: student.dni,
          dni_estudiante: student.dni,
          codigo_estudiante: invitadoExcel.codigoEstudiante || student.codigoEstudiante || "",
          nombres: invitadoExcel.nombres || student.nombres,
          apellidos: invitadoExcel.nombres ? "" : (student.apellidos || ""),
          fecha_nacimiento: student.fechaNacimiento,
          grado_nombre: invitadoExcel.grado || student.grado,
          seccion: invitadoExcel.seccion || student.seccion,
          nivel_nombre: invitadoExcel.nivelEducativo || student.nivel || "",
          tipo_alumno: student.tipoAlumno || "Alumno interno",
          estado_matricula: student.estadoMatricula || "Activo",
          apoderado: student.apoderado || (invitacion ? (invitacion.invitado.apoderado || "") : ""),
          telefono_apoderado: student.telefonoApoderado || (invitacion ? (invitacion.invitado.telefonoApoderado || "") : ""),
          correo_apoderado: student.correoApoderado || (invitacion ? (invitacion.invitado.correo || "") : ""),
          tieneInvitacion: Boolean(invitacion),
          programaAsignado: invitacion ? invitacion.programaId : "",
          programaNombre: invitacion ? invitacion.programa.nombre : "",
          ...camposProgramaInvitacion,
          seleccion: invitadoExcel.seleccion || student.seleccion || "",
          nivelCambridge: invitadoExcel.nivelCambridge || student.nivelCambridge || "",
          estadoInscripcion: inscrip ? inscrip.estadoInscripcion : "No inscrito",
          estadoPago: inscrip ? (inscrip.estadoPago || "Pendiente") : "Pendiente",
          origenRegistro: inscrip ? (inscrip.origenRegistro || "Presencial") : "Base general de estudiantes",
          periodo: period === "verano" ? "Ciclo verano" : "Año escolar"
        });
      }
    });

    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    programs.forEach(prog => {
      (db.invitadosPorPrograma[prog.id] || []).forEach(invitado => {
        if (seenDnis.has(invitado.dni)) return;

        const searchKey = normalizarTextoApi(`${invitado.nombres} ${invitado.codigoEstudiante || ""}`);
        if (searchKey.includes(searchVal)) {
          seenDnis.add(invitado.dni);
          results.push({
            id: invitado.dni,
            estudiante_id: invitado.dni,
            dni_estudiante: invitado.dni,
            codigo_estudiante: invitado.codigoEstudiante || "",
            nombres: invitado.nombres,
            apellidos: "",
            fecha_nacimiento: "2010-01-01",
            grado_nombre: invitado.grado,
            seccion: invitado.seccion,
            nivel_nombre: invitado.nivelEducativo || "",
            tipo_alumno: "Alumno invitado",
            estado_matricula: "Activo",
            apoderado: "",
            telefono_apoderado: invitado.telefonoApoderado || "",
            correo_apoderado: invitado.correo || "",
            tieneInvitacion: true,
            programaAsignado: prog.id,
            programaNombre: prog.nombre,
            ...obtenerCamposProgramaInvitacionApi(db, prog, invitado.grado),
            seleccion: invitado.seleccion || "",
            nivelCambridge: invitado.nivelCambridge || "",
            estadoInscripcion: "Invitado",
            estadoPago: "Pendiente",
            origenRegistro: "Excel carga Coordinación Académica",
            periodo: period === "verano" ? "Ciclo verano" : "Año escolar"
          });
        }
      });
    });

    const extStudents = await readExternalStudents();
    Object.values(extStudents).forEach(student => {
      if (seenDnis.has(student.dni)) return;
      const searchKey = normalizarTextoApi(`${student.nombres} ${student.codigoEstudiante || ""}`);
      if (searchKey.includes(searchVal)) {
        seenDnis.add(student.dni);
        const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === student.dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
        const inscrip = inscripciones[0];
        results.push({
          id: student.dni,
          estudiante_id: student.dni,
          dni_estudiante: student.dni,
          codigo_estudiante: student.codigoEstudiante || `EXT-${student.dni}`,
          nombres: student.nombres,
          apellidos: student.apellidos || "",
          fecha_nacimiento: student.fechaNacimiento || "2010-01-01",
          grado_nombre: student.grado,
          seccion: student.seccion || "",
          nivel_nombre: student.nivel || "",
          tipo_alumno: student.tipoAlumno || "Alumno externo",
          estado_matricula: student.estadoMatricula || "Activo",
          apoderado: student.apoderado || "",
          telefono_apoderado: student.telefonoApoderado || "",
          correo_apoderado: student.correoApoderado || "",
          tieneInvitacion: false,
          programaAsignado: "",
          programaNombre: "",
          seleccion: student.seleccion || "",
          nivelCambridge: student.nivelCambridge || "",
          estadoInscripcion: inscrip ? inscrip.estadoInscripcion : "No inscrito",
          estadoPago: inscrip ? (inscrip.estadoPago || "Pendiente") : "Pendiente",
          origenRegistro: inscrip ? (inscrip.origenRegistro || "Presencial") : "Base general de estudiantes",
          periodo: period === "verano" ? "Ciclo verano" : "Año escolar",
          esExterno: true
        });
      }
    });

    res.json({ success: true, data: results.slice(0, 10) });
  } catch (error) {
    console.error("STUDENT SEARCH ERROR STACK:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Registrar Inscripcion
router.post("/api/v1/extracurricular/inscripciones", requireRole(["secretaria", "coordinacion", "padres"]), async (req, res) => {
  try {
    const db = await getDb();
    const enrollmentId = `INS-${String(Date.now()).slice(-6)}`;
    const { estudiante_id, programa_id, origen_inscripcion, seccion, grado, apoderado, telefono_apoderado, correo_apoderado, talla_uniforme, talla_polo, talla_short, seleccion, nivel_cambridge } = req.body;

    if (req.user.role === "padres" && String(req.user.username) !== String(estudiante_id)) {
      return res.status(403).json({ success: false, message: "No está autorizado para inscribir a este estudiante." });
    }

    const prog = db.programas.find(p => p.id === programa_id);
    if (!prog) return res.status(400).json({ success: false, message: "El programa no existe." });

    const progEstado = String(prog.estado || "Habilitado").toLowerCase();
    if (progEstado !== "habilitado" && progEstado !== "publicado") {
      return res.status(400).json({ success: false, message: "No se puede registrar inscripción en un programa no habilitado." });
    }

    const cuposMax = Number(prog.cupos || 0);
    const cuposOcupados = Number(prog.cuposOcupados || 0);
    if (cuposOcupados >= cuposMax) {
      return res.status(400).json({ success: false, message: "No hay cupos disponibles para este programa." });
    }

    const esDuplicado = (db.inscripciones || []).some(
      item => item.dniEstudiante === estudiante_id &&
      item.programaId === programa_id &&
      item.estadoInscripcion !== "Anulada" &&
      item.estadoInscripcion !== "anulada"
    );
    if (esDuplicado) {
      return res.status(409).json({ success: false, message: "El estudiante ya cuenta con una inscripción activa en este programa." });
    }

    const invitadosPrograma = db.invitadosPorPrograma?.[programa_id] || [];
    const invitacionRegistro = invitadosPrograma.find(
      inv => String(inv.dni).replace(/\D/g, "") === String(estudiante_id).replace(/\D/g, "")
    );
    if (req.user.role === "padres" && !prog.invitacionMasiva) {
      if (!invitacionRegistro) {
        return res.status(400).json({ success: false, message: "El estudiante no se encuentra en la lista de invitados para este programa." });
      }
    }

    let student = db.estudiantes?.[estudiante_id];
    let esExternoRestaurado = false;
    if (!student) {
      const extStudents = await readExternalStudents();
      if (extStudents[estudiante_id]) {
        student = extStudents[estudiante_id];
        db.estudiantes = db.estudiantes || {};
        db.estudiantes[estudiante_id] = student;
        esExternoRestaurado = true;
      }
    }

    const studentForRes = student || {
      dni: estudiante_id,
      nombres: "Estudiante",
      apellidos: "",
      grado: grado || "",
      seccion: seccion || ""
    };
    const codigoRegistro = invitacionRegistro?.codigoEstudiante || studentForRes.codigoEstudiante || "";
    const nombresRegistro = invitacionRegistro?.nombres || `${studentForRes.nombres || ""} ${studentForRes.apellidos || ""}`.trim();
    const gradoInvitacion = invitacionRegistro
      ? obtenerGradoCompletoApi(invitacionRegistro.grado, invitacionRegistro.nivelEducativo || invitacionRegistro.nivel, studentForRes.grado)
      : "";
    const gradoRegistro = obtenerGradoCompletoApi(grado || gradoInvitacion || studentForRes.grado, studentForRes.nivel || studentForRes.nivelEducativo);
    const seccionRegistro = seccion || "";
    const plantillaPrograma = obtenerPlantillaProgramaApi(db, prog);

    const newEnrollment = {
      id: enrollmentId,
      dniEstudiante: estudiante_id,
      codigoEstudiante: codigoRegistro,
      nombresEstudiante: nombresRegistro,
      gradoEstudiante: gradoRegistro,
      seccion: seccionRegistro,
      programaId: programa_id,
      programa: prog.nombre,
      categoria: prog.categoria,
      periodo: prog.periodo || "escolar",
      horario: resolverHorarioPorGradoApi(prog, gradoRegistro) || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario) || "",
      docente: resolverDocentePorGradoApi(prog, gradoRegistro),
      costo: prog.costo,
      modalidadCobro: prog.modalidadCobro || "Mensual",
      fechaInicio: prog.fechaInicio,
      fechaFin: prog.fechaFin,
      requisitos: prog.requisitos || "",
      comunicado: prog.comunicado || "",
      comunicadoCompleto: prog.comunicadoCompleto || "",
      detalleCosto: prog.detalleCosto || "",
      detalleAlmuerzo: prog.detalleAlmuerzo || "",
      concesionarios: prog.concesionarios || "",
      plantilla: plantillaPrograma.plantilla,
      plantillaBase64: plantillaPrograma.plantillaBase64,
      plantillaVariables: plantillaPrograma.plantillaVariables,
      plantillaValidada: plantillaPrograma.plantillaValidada,
      apoderado: apoderado || studentForRes.apoderado || "",
      telefono: telefono_apoderado || studentForRes.telefonoApoderado || "",
      correo: correo_apoderado || studentForRes.correoApoderado || "",
      tallaUniforme: talla_uniforme || "",
      tallaPolo: talla_polo || "",
      tallaShort: talla_short || "",
      seleccion: seleccion || invitacionRegistro?.seleccion || "",
      nivelCambridge: nivel_cambridge || invitacionRegistro?.nivelCambridge || "",
      estadoInscripcion: "pendiente_pago",
      estadoPago: "pendiente",
      origenRegistro: origen_inscripcion || "Portal padres",
      fechaRegistro: new Date().toISOString(),
      tipoComunicado: prog.tipoComunicado || "Otro genérico",
      tipoDocumento: prog.tipoDocumento || "Comunicado",
      numeroDocumento: prog.numeroDocumento || "",
      areaTematica: prog.areaTematica || "No aplica",
      motivoJustificacion: prog.motivoJustificacion || "",
      nombreCiclo: prog.nombreCiclo || "Ciclo I",
      duracion: prog.duracion || "",
      tablaHorariosNivel: prog.tablaHorariosNivel || [],
      incluyeAlmuerzo: Boolean(prog.incluyeAlmuerzo),
      horarioRecepcionAlmuerzo: prog.horarioRecepcionAlmuerzo || "",
      modalidadesCambridge: prog.modalidadesCambridge || [],
      costoCiclo: prog.costoCiclo || "",
      montoPrimerPago: prog.montoPrimerPago || ""
    };

    prog.cuposOcupados = (prog.cuposOcupados || 0) + 1;

    db.inscripciones = db.inscripciones || [];
    db.inscripciones.push(newEnrollment);

    const esExternoRequest = Boolean(req.body.es_externo || req.body.esExterno);
    if (!student && esExternoRequest) {
      const nuevoEstudiante = {
        dni: estudiante_id,
        codigoEstudiante: `EXT-${estudiante_id}`,
        nombres: req.body.nombres_estudiante || nombresRegistro,
        grado: gradoRegistro,
        seccion: "",
        nivel: "",
        sexo: req.body.sexo_estudiante || "M",
        fechaNacimiento: "2010-01-01",
        tipoAlumno: "Alumno externo",
        estadoMatricula: "Activo",
        apoderado: apoderado || "",
        telefonoApoderado: telefono_apoderado || "",
        correoApoderado: correo_apoderado || "",
        estadoInscripcion: "pendiente_pago",
        estadoCaja: "Pendiente"
      };
      db.estudiantes = db.estudiantes || {};
      db.estudiantes[estudiante_id] = nuevoEstudiante;

      await saveExternalStudent(nuevoEstudiante);
    } else if (db.estudiantes?.[estudiante_id]) {
      db.estudiantes[estudiante_id].apoderado = apoderado || db.estudiantes[estudiante_id].apoderado || "";
      db.estudiantes[estudiante_id].telefonoApoderado = telefono_apoderado || db.estudiantes[estudiante_id].telefonoApoderado || "";
      db.estudiantes[estudiante_id].estadoInscripcion = "pendiente_pago";

      const extStudents = await readExternalStudents();
      if (extStudents[estudiante_id] || esExternoRestaurado) {
        const extData = extStudents[estudiante_id] || db.estudiantes[estudiante_id];
        extData.apoderado = db.estudiantes[estudiante_id].apoderado;
        extData.telefonoApoderado = db.estudiantes[estudiante_id].telefonoApoderado;
        await saveExternalStudent(extData);
      }
    }

    await saveDb(db);

    await registrarAuditoria(req.user.username, req.user.role, "INSCRIPCION_CREAR", {
      inscripcionId: enrollmentId,
      estudianteId: estudiante_id,
      programaId: programa_id
    });

    res.json({ success: true, data: mapDbEnrollmentToApi(newEnrollment, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Registrar Documento Ficha/Folleto
router.post("/api/v1/extracurricular/inscripciones/:id/documento", requireRole(["secretaria", "coordinacion"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario, tipo_documento, plantilla } = req.body;
    const db = await getDb();

    const inscrip = (db.inscripciones || []).find(item => item.id === id);
    if (!inscrip) return res.status(404).json({ success: false, message: "Inscripción no encontrada." });

    const docId = `DOC-${String(db.nextDocumentoId || 1).padStart(3, "0")}`;
    db.nextDocumentoId = (db.nextDocumentoId || 1) + 1;

    const docObj = {
      id: docId,
      alumno: inscrip.nombresEstudiante,
      dniEstudiante: inscrip.dniEstudiante,
      programa: inscrip.programa,
      programaId: inscrip.programaId,
      fecha: new Date().toISOString(),
      usuario: usuario || "Asistente",
      tipoDocumento: tipo_documento || "Comunicado personalizado",
      plantilla: plantilla || ""
    };

    db.documentosGenerados = db.documentosGenerados || [];
    db.documentosGenerados.unshift(docObj);

    inscrip.documentoGenerado = true;
    inscrip.ultimoDocumentoGeneradoId = docId;
    inscrip.ultimoDocumentoGeneradoEn = docObj.fecha;

    await saveDb(db);
    res.json({ success: true, data: docObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Derivar Inscripcion a Caja
router.put("/api/v1/extracurricular/inscripciones/:inscripcionId/derivar-caja", requireRole(["secretaria"]), async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const db = await getDb();
    const idx = (db.inscripciones || []).findIndex(item => item.id === inscripcionId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Inscripción no encontrada." });

    const updated = {
      ...db.inscripciones[idx],
      ...req.body,
      derivadoCaja: true,
      estadoCaja: "derivado_caja",
      estadoInscripcion: db.inscripciones[idx].estadoPago === "validado" ? "confirmada" : "pendiente_pago",
      fechaDerivacionCaja: new Date().toISOString()
    };

    db.inscripciones[idx] = updated;

    const student = db.estudiantes?.[updated.dniEstudiante];
    if (student) {
      student.estadoInscripcion = updated.estadoInscripcion;
      student.estadoCaja = updated.estadoCaja;
    }

    await saveDb(db);
    await registrarAuditoria(req.user?.username || "Asistente", req.user?.role || "secretaria", "INSCRIPCION_ESTADO", {
      inscripcionId,
      alumno: updated.nombresEstudiante,
      taller: updated.programa,
      estadoAnterior: db.inscripciones[idx].estadoInscripcion,
      estadoNuevo: updated.estadoInscripcion
    });
    res.json({ success: true, data: mapDbEnrollmentToApi(updated, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reservar en Caja (Padres)
router.put("/api/v1/extracurricular/inscripciones/:inscripcionId/reservar-caja", requireRole(["padres"]), async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const dni = String(req.body.dni_estudiante || req.user?.username || "").replace(/\D/g, "");
    const db = await getDb();
    const idx = (db.inscripciones || []).findIndex(item =>
      item.id === inscripcionId &&
      item.dniEstudiante === dni &&
      item.estadoInscripcion !== "Anulada"
    );
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "No se encontro la inscripcion para reservar el pago en Caja." });
    }

    const estadoAnterior = db.inscripciones[idx].estadoInscripcion;
    const updated = {
      ...db.inscripciones[idx],
      derivadoCaja: true,
      estadoCaja: "reservado_caja",
      estadoPago: "pendiente",
      estadoInscripcion: "Reserva pendiente",
      fechaReservaCaja: new Date().toISOString(),
      observacionCaja: "Reserva generada desde portal de padres para pago presencial en Caja."
    };

    db.inscripciones[idx] = updated;

    const student = db.estudiantes?.[updated.dniEstudiante];
    if (student) {
      student.estadoInscripcion = "Reserva pendiente";
      student.estadoCaja = "reservado_caja";
    }

    await saveDb(db);
    await registrarAuditoria(req.user?.username || dni || "padre", req.user?.role || "padres", "RESERVA_CAJA_PADRES", {
      inscripcionId,
      alumno: updated.nombresEstudiante,
      taller: updated.programa,
      estadoAnterior,
      estadoNuevo: updated.estadoInscripcion
    });

    res.json({ success: true, data: mapDbEnrollmentToApi(updated, db) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Secretaria: Buscar inscripcion activa (para Yape u otros flujos)
router.get("/api/v1/extracurricular/secretaria/inscripciones/buscar", requireRole(["secretaria"]), async (req, res) => {
  try {
    const { dni, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const isPaid = (item) => ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(est => String(item.estadoPago || "").toLowerCase().includes(est) || String(item.estadoInscripcion || "").toLowerCase().includes(est));
    const active = list.find(item => !isPaid(item)) || list[0] || null;
    res.json({ success: true, data: active ? mapDbEnrollmentToApi(active, db) : null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Secretaria: Listar inscripciones de un alumno
router.get("/api/v1/extracurricular/secretaria/inscripciones", requireRole(["secretaria"]), async (req, res) => {
  try {
    const { dni, periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    res.json({ success: true, data: list.map((item) => mapDbEnrollmentToApi(item, db)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Padres: Obtener resumen completo del estudiante (inscripciones, invitaciones, pagos, documentos)
router.get("/api/v1/extracurricular/padres/resumen/:dni", requireRole(["padres", "secretaria"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const db = await getDb();
    const student = db.estudiantes?.[dni];
    if (!student) return res.status(404).json({ success: false, message: "Estudiante no encontrado." });

    const studentData = {
      id: student.dni,
      dni_estudiante: student.dni,
      codigo_estudiante: student.codigoEstudiante,
      nombres: student.nombres,
      apellidos: student.apellidos || "",
      fecha_nacimiento: student.fechaNacimiento,
      grado_nombre: student.grado,
      seccion: student.seccion,
      nivel_nombre: student.nivel || "",
      tipo_alumno: student.tipoAlumno || "Alumno interno",
      estado_matricula: student.estadoMatricula || "Activo",
      apoderado: student.apoderado || "",
      telefono_apoderado: student.telefonoApoderado || "",
      correo_apoderado: student.correoApoderado || ""
    };

    const activeProgramIds = new Set((db.programas || []).filter(p => p.estado !== "Archivado").map(p => p.id));
    const enrollments = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && item.estadoInscripcion !== "Anulada" && activeProgramIds.has(item.programaId));
    const payments = (db.pagos || []).filter(item => item.dniEstudiante === dni || enrollments.some(e => e.id === item.inscripcionId));
    const documents = (db.documentosGenerados || []).filter(item => item.dniEstudiante === dni || item.alumno === student.nombres);

    const invitations = [];
    const programs = db.programas || [];
    for (const prog of programs) {
      const estadoProg = prog.estado || "Habilitado";
      if (estadoProg !== "Habilitado" || !programaListoParaPortalPadresApi(prog)) continue;

      if (prog.invitacionMasiva && programaDisponibleParaGradoApi(prog, student?.grado)) {
        invitations.push({
          id: `${prog.id}-masiva-${dni}`,
          nombre: prog.nombre,
          codigo_estudiante: student?.codigoEstudiante || "",
          dni: student?.dni || "",
          nombres: student?.nombres || "",
          grado: student?.grado || "",
          seccion: student?.seccion || "",
          nivel_educativo: student?.nivel || "",
          seleccion: student?.seleccion || "",
          nivel_cambridge: student?.nivelCambridge || "",
          periodo: prog.periodo,
          programa_id: prog.id,
          programa: prog.nombre,
          categoria: prog.categoria || "",
          costo: prog.costo,
          horario: resolverHorarioPorGradoApi(prog, student?.grado) || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario) || "",
          responsable: resolverDocentePorGradoApi(prog, student?.grado),
          modalidad_cobro: prog.modalidadCobro || "",
          requisitos: prog.requisitos || "",
          comunicado: prog.comunicado || "",
          comunicado_completo: prog.comunicadoCompleto || "",
          detalle_costo: prog.detalleCosto || "",
          detalle_almuerzo: prog.detalleAlmuerzo || "",
          concesionarios: prog.concesionarios || "",
          anuncio_imagen: prog.anuncioImagen || "",
          anuncio_imagen_nombre: prog.anuncioImagenNombre || "",
          grados: prog.gradosAplicables || [],
          horarios_por_grupo: prog.horariosPorGrupo || [],
          fecha_inicio: prog.fechaInicio || "",
          fecha_fin: prog.fechaFin || "",
          estado_programa: prog.estado || "",
          requiere_uniforme: Boolean(prog.requiereUniforme),
          requiere_indumentaria: Boolean(prog.requiereIndumentaria),
          invitacion_masiva: true,
        });
      } else {
        const invitados = db.invitadosPorPrograma[prog.id] || [];
        const inv = invitados.find(item => item.dni === dni);
        if (inv) {
          const gradoCompletoInvitado = obtenerGradoCompletoApi(inv.grado, inv.nivelEducativo || inv.nivel, student?.grado);
          invitations.push({
            id: prog.id,
            nombre: prog.nombre,
            codigo_estudiante: inv.codigoEstudiante || "",
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado,
            seccion: inv.seccion,
            nivel_educativo: inv.nivelEducativo || "",
            seleccion: inv.seleccion || "",
            nivel_cambridge: inv.nivelCambridge || "",
            periodo: inv.periodo || prog.periodo,
            programa_id: prog.id,
            programa: prog.nombre,
            categoria: prog.categoria || "",
            costo: prog.costo,
            horario: resolverHorarioPorGradoApi(prog, gradoCompletoInvitado) || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario) || "",
            responsable: resolverDocentePorGradoApi(prog, gradoCompletoInvitado),
            modalidad_cobro: prog.modalidadCobro || "",
            requisitos: prog.requisitos || "",
            comunicado: prog.comunicado || "",
            comunicado_completo: prog.comunicadoCompleto || "",
            detalle_costo: prog.detalleCosto || "",
            detalle_almuerzo: prog.detalleAlmuerzo || "",
            concesionarios: prog.concesionarios || "",
            anuncio_imagen: prog.anuncioImagen || "",
            anuncio_imagen_nombre: prog.anuncioImagenNombre || "",
            grados: prog.gradosAplicables || [],
            horarios_por_grupo: prog.horariosPorGrupo || [],
            fecha_inicio: prog.fechaInicio || "",
            fecha_fin: prog.fechaFin || "",
            estado_programa: prog.estado || "",
            requiere_uniforme: Boolean(prog.requiereUniforme),
            requiere_indumentaria: Boolean(prog.requiereIndumentaria),
            invitacion_masiva: Boolean(prog.invitacionMasiva),
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        estudiante: studentData,
        invitaciones: invitations,
        inscripciones: enrollments.map((item) => mapDbEnrollmentToApi(item, db)),
        pagos: payments.map(mapDbPaymentToApi),
        documentos: documents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Padres: Editar apoderado
router.put("/api/v1/extracurricular/padres/:dni/apoderado", requireRole(["padres", "secretaria"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const { apoderado, telefono, telefono_apoderado, correo, correo_apoderado } = req.body;
    const db = await getDb();
    const student = db.estudiantes?.[dni];
    if (!student) return res.status(404).json({ success: false, message: "Estudiante no encontrado." });

    const finalTelefono = telefono || telefono_apoderado || "";
    const finalCorreo = correo || correo_apoderado || "";

    student.apoderado = apoderado || "";
    student.telefonoApoderado = finalTelefono;
    student.correoApoderado = finalCorreo;

    (db.inscripciones || []).forEach(item => {
      if (item.dniEstudiante === dni) {
        item.apoderado = apoderado || "";
        item.telefono = finalTelefono;
        item.correo = finalCorreo;
      }
    });

    await saveDb(db);
    res.json({
      success: true,
      data: {
        id: student.dni,
        dni_estudiante: student.dni,
        codigo_estudiante: student.codigoEstudiante,
        nombres: student.nombres,
        apellidos: student.apellidos || "",
        fecha_nacimiento: student.fechaNacimiento,
        grado_nombre: student.grado,
        seccion: student.seccion,
        nivel_nombre: student.nivel || "",
        tipo_alumno: student.tipoAlumno || "Alumno interno",
        estado_matricula: student.estadoMatricula || "Activo",
        apoderado: student.apoderado,
        telefono_apoderado: student.telefonoApoderado,
        correo_apoderado: student.correoApoderado
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
