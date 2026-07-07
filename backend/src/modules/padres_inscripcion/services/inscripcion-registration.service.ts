import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import {
  mapDbEnrollmentToApi,
  obtenerGradoCompletoApi,
  obtenerPlantillaProgramaApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  tieneHorariosPorGrupoApi,
  esProgramaCambridgeApi
} from "../../../common/shared/mappers.js";
import { PadresInscripcionRepository } from "../repositories/padres_inscripcion.repository.js";

const inscripcionRepository = new PadresInscripcionRepository();

export class InscripcionRegistrationService {
  async crearInscripcion(operatorUsername: string, operatorRole: string, body: any) {
    const db = await inscripcionRepository.getDb();
    const enrollmentId = `INS-${String(Date.now()).slice(-6)}`;
    const { estudiante_id, programa_id, origen_inscripcion, seccion, grado, apoderado, telefono_apoderado, correo_apoderado, talla_uniforme, talla_polo, talla_short, seleccion, nivel_cambridge } = body;

    if (operatorRole === "padres" && String(operatorUsername) !== String(estudiante_id)) {
      throw new Error("No estÃ¡ autorizado para inscribir a este estudiante.");
    }

    const prog = db.programas.find(p => p.id === programa_id);
    if (!prog) {
      throw new Error("El programa no existe.");
    }

    const progEstado = String(prog.estado || "Habilitado").toLowerCase();
    if (progEstado !== "habilitado" && progEstado !== "publicado") {
      throw new Error("No se puede registrar inscripciÃ³n en un programa no habilitado.");
    }

    const cuposMax = Number(prog.cupos || 0);
    const cuposOcupados = Number(prog.cuposOcupados || 0);
    if (cuposOcupados >= cuposMax) {
      throw new Error("No hay cupos disponibles para este programa.");
    }

    const esDuplicado = (db.inscripciones || []).some(
      item => item.dniEstudiante === estudiante_id &&
      item.programaId === programa_id &&
      item.estadoInscripcion !== "Anulada" &&
      item.estadoInscripcion !== "anulada"
    );
    if (esDuplicado) {
      throw new Error("El estudiante ya cuenta con una inscripciÃ³n activa en este programa.");
    }

    if (operatorRole === "padres") {
      let isWindowOpen = true;
      if (prog.usarFechaLimiteInscripcion === true || String(prog.usarFechaLimiteInscripcion) === "true") {
        const limiteDia = prog.fechaLimiteInscripcion;
        if (limiteDia) {
          const partes = String(limiteDia).split("-").map(Number);
          if (partes.length === 3) {
            const limite = new Date(partes[0], partes[1] - 1, partes[2]);
            const horaStr = String(prog.horaLimiteInscripcion || "23:59").trim();
            const horaRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
            let horas = 23;
            let minutos = 59;
            if (horaRegex.test(horaStr)) {
              const [h, m] = horaStr.split(":");
              horas = parseInt(h, 10);
              minutos = parseInt(m, 10);
            }
            limite.setHours(horas, minutos, 59, 999);
            if (Date.now() > limite.getTime()) {
              isWindowOpen = false;
            }
          }
        }
      } else if (prog.fechaInicio) {
        const partes = String(prog.fechaInicio).split("-").map(Number);
        if (partes.length === 3) {
          const inicio = new Date(partes[0], partes[1] - 1, partes[2]);
          const diasAviso = Math.min(7, Math.max(1, Math.trunc(Number(prog.duracionAvisoDias)) || 2));
          const limite = new Date(inicio);
          limite.setDate(inicio.getDate() + diasAviso - 1);
          
          const horaStr = String(prog.horaLimiteAviso || "23:59").trim();
          const horaRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
          let horas = 23;
          let minutos = 59;
          if (horaRegex.test(horaStr)) {
            const [h, m] = horaStr.split(":");
            horas = parseInt(h, 10);
            minutos = parseInt(m, 10);
          }
          limite.setHours(horas, minutos, 59, 999);
          if (Date.now() > limite.getTime()) {
            isWindowOpen = false;
          }
        }
      }

      if (!isWindowOpen) {
        throw new Error("El plazo de inscripción web cerró. Derive al apoderado a Cajera para evaluar el registro.");
      }
    }

    const invitadosPrograma = db.invitadosPorPrograma?.[programa_id] || [];
    const invitacionRegistro = invitadosPrograma.find(
      inv => String(inv.dni).replace(/\D/g, "") === String(estudiante_id).replace(/\D/g, "")
    );
    if (operatorRole === "padres" && (esProgramaCambridgeApi(prog) || !prog.invitacionMasiva)) {
      if (!invitacionRegistro) {
        throw new Error("El estudiante no se encuentra en la lista de invitados para este programa.");
      }
    }

    let student = db.estudiantes?.[estudiante_id] as any;
    let esExternoRestaurado = false;
    if (!student) {
      const extStudents = await inscripcionRepository.readExternalStudents();
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
      ? obtenerGradoCompletoApi(invitacionRegistro.grado, invitacionRegistro.nivelEducativo || invitacionRegistro.nivel || studentForRes.nivel || studentForRes.nivel_nombre || studentForRes.nivelEducativo || "", studentForRes.grado)
      : "";
    const gradoRegistro = obtenerGradoCompletoApi(grado || gradoInvitacion || studentForRes.grado, studentForRes.nivel || studentForRes.nivel_nombre || studentForRes.nivelEducativo || "");
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
      tipoComunicado: prog.tipoComunicado || "Otro genÃ©rico",
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
      montoPrimerPago: prog.montoPrimerPago || "",
      pagoId: null,
      costoOriginal: Number(prog.costo || 0),
      descuentoAprobado: false,
    };

    prog.cuposOcupados = (prog.cuposOcupados || 0) + 1;

    db.inscripciones = db.inscripciones || [];
    db.inscripciones.push(newEnrollment);

    const esExternoRequest = Boolean(body.es_externo || body.esExterno);
    if (!student && esExternoRequest) {
      const nuevoEstudiante = {
        dni: estudiante_id,
        codigoEstudiante: `EXT-${estudiante_id}`,
        nombres: body.nombres_estudiante || nombresRegistro,
        grado: gradoRegistro,
        seccion: "",
        nivel: "",
        sexo: body.sexo_estudiante || "M",
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

      await inscripcionRepository.saveExternalStudent(nuevoEstudiante);
    } else if (db.estudiantes?.[estudiante_id]) {
      const std = db.estudiantes[estudiante_id] as any;
      std.apoderado = apoderado || std.apoderado || "";
      std.telefonoApoderado = telefono_apoderado || std.telefonoApoderado || "";
      std.estadoInscripcion = "pendiente_pago";

      const extStudents = await inscripcionRepository.readExternalStudents();
      if (extStudents[estudiante_id] || esExternoRestaurado) {
        const extData = extStudents[estudiante_id] || db.estudiantes[estudiante_id];
        extData.apoderado = db.estudiantes[estudiante_id].apoderado;
        extData.telefonoApoderado = db.estudiantes[estudiante_id].telefonoApoderado;
        await inscripcionRepository.saveExternalStudent(extData);
      }
    }

    await inscripcionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "INSCRIPCION_CREAR", {
      inscripcionId: enrollmentId,
      estudianteId: estudiante_id,
      programaId: programa_id
    });

    return mapDbEnrollmentToApi(newEnrollment, db);
  }
}

