import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, saveDb } from "../../database/dbLocal.js";
import { registrarAuditoria } from "../../services/audit.service.js";
import { limpiarDni as limpiarDniHelper, normalizarComparacion } from "../../services/file.service.js";
import {
  mapDbEnrollmentToApi,
  mapDbPaymentToApi,
  obtenerGradoCompletoApi,
  obtenerCamposProgramaInvitacionApi,
  obtenerPlantillaProgramaApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  tieneHorariosPorGrupoApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  programaListoParaPortalPadresApi,
  programaDisponibleParaGradoApi,
  esProgramaCambridgeApi
} from "../../shared/mappers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTRANJEROS_DB_PATH = path.resolve(__dirname, "../../../estudiantes_externos.json");

function limpiarDni(val: any): string {
  return limpiarDniHelper ? limpiarDniHelper(val) : String(val || "").replace(/\D/g, "");
}

async function readExternalStudents(): Promise<Record<string, any>> {
  try {
    const data = await fs.readFile(EXTRANJEROS_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveExternalStudent(student: any): Promise<void> {
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

export class InscripcionService {

  async getInscripcionesLegacy(page: number | null, limit: number) {
    const db = await getDb();
    const list = db.inscripciones || [];
    if (page !== null && !isNaN(page)) {
      const startIndex = (page - 1) * limit;
      const paginated = list.slice(startIndex, startIndex + limit);
      return {
        data: paginated,
        pagination: {
          total: list.length,
          page,
          limit,
          totalPages: Math.ceil(list.length / limit)
        }
      };
    }
    return list;
  }

  async getDocumentosLegacy() {
    const db = await getDb();
    return db.documentosGenerados || [];
  }

  async getResumenPadresLegacy(dniRaw: string) {
    const db = await getDb();
    const dni = limpiarDni(dniRaw);
    const estudiante = db.estudiantes?.[dni];
    if (!estudiante) {
      throw new Error("Estudiante no encontrado.");
    }

    const inscripciones = (db.inscripciones || []).filter((item) =>
      item.dniEstudiante === dni || item.codigoEstudiante === estudiante.codigoEstudiante
    );
    const pagos = (db.pagos || []).filter((item) =>
      item.dniEstudiante === dni || inscripciones.some((inscripcion) => inscripcion.id === item.inscripcionId)
    );
    const documentos = (db.documentosGenerados || []).filter((item) =>
      item.dniEstudiante === dni || normalizarComparacion(item.alumno) === normalizarComparacion(estudiante.nombres)
    );
    const invitaciones: any[] = [];
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

    return { estudiante, invitaciones, inscripciones, pagos, documentos };
  }



  async crearInscripcion(operatorUsername: string, operatorRole: string, body: any) {
    const db = await getDb();
    const enrollmentId = `INS-${String(Date.now()).slice(-6)}`;
    const { estudiante_id, programa_id, origen_inscripcion, seccion, grado, apoderado, telefono_apoderado, correo_apoderado, talla_uniforme, talla_polo, talla_short, seleccion, nivel_cambridge } = body;

    if (operatorRole === "padres" && String(operatorUsername) !== String(estudiante_id)) {
      throw new Error("No está autorizado para inscribir a este estudiante.");
    }

    const prog = db.programas.find(p => p.id === programa_id);
    if (!prog) {
      throw new Error("El programa no existe.");
    }

    const progEstado = String(prog.estado || "Habilitado").toLowerCase();
    if (progEstado !== "habilitado" && progEstado !== "publicado") {
      throw new Error("No se puede registrar inscripción en un programa no habilitado.");
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
      throw new Error("El estudiante ya cuenta con una inscripción activa en este programa.");
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

      await saveExternalStudent(nuevoEstudiante);
    } else if (db.estudiantes?.[estudiante_id]) {
      const std = db.estudiantes[estudiante_id] as any;
      std.apoderado = apoderado || std.apoderado || "";
      std.telefonoApoderado = telefono_apoderado || std.telefonoApoderado || "";
      std.estadoInscripcion = "pendiente_pago";

      const extStudents = await readExternalStudents();
      if (extStudents[estudiante_id] || esExternoRestaurado) {
        const extData = extStudents[estudiante_id] || db.estudiantes[estudiante_id];
        extData.apoderado = db.estudiantes[estudiante_id].apoderado;
        extData.telefonoApoderado = db.estudiantes[estudiante_id].telefonoApoderado;
        await saveExternalStudent(extData);
      }
    }

    await saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "INSCRIPCION_CREAR", {
      inscripcionId: enrollmentId,
      estudianteId: estudiante_id,
      programaId: programa_id
    });

    return mapDbEnrollmentToApi(newEnrollment, db);
  }

  async registrarDocumento(id: string, body: any) {
    const { usuario, tipo_documento, plantilla } = body;
    const db = await getDb();

    const inscrip = (db.inscripciones || []).find(item => item.id === id);
    if (!inscrip) {
      throw new Error("Inscripción no encontrada.");
    }

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
    return docObj;
  }

  async derivarCaja(operatorUsername: string, operatorRole: string, inscripcionId: string, body: any) {
    const db = await getDb();
    const idx = (db.inscripciones || []).findIndex(item => item.id === inscripcionId);
    if (idx === -1) {
      throw new Error("Inscripción no encontrada.");
    }

    const updated: any = {
      ...db.inscripciones[idx],
      ...body,
      derivadoCaja: true,
      estadoCaja: "derivado_caja",
      estadoInscripcion: db.inscripciones[idx].estadoPago === "validado" ? "confirmada" : "pendiente_pago",
      fechaDerivacionCaja: new Date().toISOString()
    };

    db.inscripciones[idx] = updated;

    const student = db.estudiantes?.[updated.dniEstudiante] as any;
    if (student) {
      student.estadoInscripcion = updated.estadoInscripcion;
      student.estadoCaja = updated.estadoCaja;
    }

    await saveDb(db);
    await registrarAuditoria(operatorUsername, operatorRole, "INSCRIPCION_ESTADO", {
      inscripcionId,
      alumno: updated.nombresEstudiante,
      taller: updated.programa,
      estadoAnterior: db.inscripciones[idx].estadoInscripcion,
      estadoNuevo: updated.estadoInscripcion
    });

    return mapDbEnrollmentToApi(updated, db);
  }

  async reservarCaja(operatorUsername: string, operatorRole: string, inscripcionId: string, body: any) {
    const dni = String(body.dni_estudiante || operatorUsername || "").replace(/\D/g, "");
    const db = await getDb();
    const idx = (db.inscripciones || []).findIndex(item =>
      item.id === inscripcionId &&
      item.dniEstudiante === dni &&
      item.estadoInscripcion !== "Anulada"
    );
    if (idx === -1) {
      throw new Error("No se encontro la inscripcion para reservar el pago en Caja.");
    }

    const estadoAnterior = db.inscripciones[idx].estadoInscripcion;
    const updated: any = {
      ...db.inscripciones[idx],
      derivadoCaja: true,
      estadoCaja: "reservado_caja",
      estadoPago: "pendiente",
      estadoInscripcion: "Reserva pendiente",
      fechaReservaCaja: new Date().toISOString(),
      observacionCaja: "Reserva generada desde portal de padres para pago presencial en Caja."
    };

    db.inscripciones[idx] = updated;

    const student = db.estudiantes?.[updated.dniEstudiante] as any;
    if (student) {
      student.estadoInscripcion = "Reserva pendiente";
      student.estadoCaja = "reservado_caja";
    }

    await saveDb(db);
    await registrarAuditoria(operatorUsername, operatorRole, "RESERVA_CAJA_PADRES", {
      inscripcionId,
      alumno: updated.nombresEstudiante,
      taller: updated.programa,
      estadoAnterior,
      estadoNuevo: updated.estadoInscripcion
    });

    return mapDbEnrollmentToApi(updated, db);
  }

  async buscarInscripcionesSecretaria(dni: string, periodo: string) {
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const isPaid = (item: any) => ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"].some(est => String(item.estadoPago || "").toLowerCase().includes(est) || String(item.estadoInscripcion || "").toLowerCase().includes(est));
    const active = list.find(item => !isPaid(item)) || list[0] || null;
    return active ? mapDbEnrollmentToApi(active, db) : null;
  }

  async listarInscripcionesSecretaria(dni: string, periodo: string) {
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    const list = (db.inscripciones || [])
      .filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    return list.map((item) => mapDbEnrollmentToApi(item, db));
  }

  async getResumenPadres(dni: string) {
    const db = await getDb();
    const student = db.estudiantes?.[dni] as any;
    if (!student) {
      throw new Error("Estudiante no encontrado.");
    }

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

    const invitations: any[] = [];
    const programs = db.programas || [];
    for (const prog of programs) {
      const estadoProg = prog.estado || "Habilitado";
      if (estadoProg !== "Habilitado" || !programaListoParaPortalPadresApi(prog)) continue;

      const gradoCompleto = obtenerGradoCompletoApi(student?.grado, student?.nivel);
      const plantilla = obtenerPlantillaProgramaApi(db, prog);
      if (prog.invitacionMasiva && programaDisponibleParaGradoApi(prog, gradoCompleto)) {
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
          horario: resolverHorarioPorGradoApi(prog, gradoCompleto) || (tieneHorariosPorGrupoApi(prog) ? "Horario no configurado para este grado" : prog.horario) || "",
          responsable: resolverDocentePorGradoApi(prog, gradoCompleto),
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
          
          // Campos de plantilla y documento Word
          plantilla: plantilla.plantilla,
          plantilla_base64: plantilla.plantillaBase64,
          plantilla_variables: plantilla.plantillaVariables,
          plantilla_validada: plantilla.plantillaValidada,
          creado_desde_documento: Boolean(prog.creadoDesdeDocumento),
          tipo_comunicado: prog.tipoComunicado || "",
          tipo_documento: prog.tipoDocumento || "",
          numero_documento: prog.numeroDocumento || "",
          area_tematica: prog.areaTematica || "",
          motivo_justificacion: prog.motivoJustificacion || prog.comunicado || "",
          nombre_ciclo: prog.nombreCiclo || "",
          duracion: prog.duracion || prog.duracionTaller || "",
          tabla_horarios_nivel: prog.tablaHorariosNivel || [],
          incluye_almuerzo: Boolean(prog.incluyeAlmuerzo),
          horario_recepcion_almuerzo: prog.horarioRecepcionAlmuerzo || "",
          modalidades_cambridge: prog.modalidadesCambridge || [],
          costo_ciclo: prog.costoCiclo || (prog.costo ? String(prog.costo) : ""),
          monto_primer_pago: prog.montoPrimerPago || "",
          dias: Array.isArray(prog.dias) ? prog.dias : []
        });
      } else {
        const invitados = db.invitadosPorPrograma[prog.id] || [];
        const inv = invitados.find(item => String(item.dni || "").replace(/\D/g, "") === String(dni || "").replace(/\D/g, ""));
        if (inv) {
          const gradoCompletoInvitado = obtenerGradoCompletoApi(inv.grado, inv.nivelEducativo || inv.nivel || student?.nivel || student?.nivel_nombre || "", student?.grado);
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
  
            // Campos de plantilla y documento Word
            plantilla: plantilla.plantilla,
            plantilla_base64: plantilla.plantillaBase64,
            plantilla_variables: plantilla.plantillaVariables,
            plantilla_validada: plantilla.plantillaValidada,
            creado_desde_documento: Boolean(prog.creadoDesdeDocumento),
            tipo_comunicado: prog.tipoComunicado || "",
            tipo_documento: prog.tipoDocumento || "",
            numero_documento: prog.numeroDocumento || "",
            area_tematica: prog.areaTematica || "",
            motivo_justificacion: prog.motivoJustificacion || prog.comunicado || "",
            nombre_ciclo: prog.nombreCiclo || "",
            duracion: prog.duracion || prog.duracionTaller || "",
            tabla_horarios_nivel: prog.tablaHorariosNivel || [],
            incluye_almuerzo: Boolean(prog.incluyeAlmuerzo),
            horario_recepcion_almuerzo: prog.horarioRecepcionAlmuerzo || "",
            modalidades_cambridge: prog.modalidadesCambridge || [],
            costo_ciclo: prog.costoCiclo || (prog.costo ? String(prog.costo) : ""),
            monto_primer_pago: prog.montoPrimerPago || "",
            dias: Array.isArray(prog.dias) ? prog.dias : []
          });
        }
      }
    }

    return {
      estudiante: studentData,
      invitaciones: invitations,
      inscripciones: enrollments.map((item) => mapDbEnrollmentToApi(item, db)),
      pagos: payments.map(mapDbPaymentToApi),
      documentos: documents
    };
  }

  async updateApoderado(dni: string, body: any) {
    const { apoderado, telefono, telefono_apoderado, correo, correo_apoderado } = body;
    const db = await getDb();
    const student = db.estudiantes?.[dni] as any;
    if (!student) {
      throw new Error("Estudiante no encontrado.");
    }

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
    return {
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
    };
  }
}
