import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import {
  mapDbAsistenciaToApi,
  normalizarTextoApi,
  obtenerGradoCompletoApi
} from "../../../common/shared/mappers.js";
import {
  resolverValidacion,
  resolverValidacionPorNombre,
  extraerIdentificadoresCodigo,
  ordenarPorFecha,
  normalizarTexto
} from "../helpers/coordinacion.helpers.js";
import { CoordinacionRepository } from "../repositories/coordinacion.repository.js";

const coordinacionRepository = new CoordinacionRepository();

export class CoordinacionAttendanceService {
  async getProgramaActividades(programaId: string) {
    const db = await coordinacionRepository.getDb();
    const filteredLogs = (db.auditLogs || []).filter((log: any) => {
      const details = log.details || {};
      return details.programaId === programaId || details.programa_id === programaId;
    });
    return ordenarPorFecha(filteredLogs);
  }

  async getProgramaListaAsistencia(programaId: string) {
    const db = await coordinacionRepository.getDb();
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
    const db = await coordinacionRepository.getDb();

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
    await coordinacionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || origen || "Auxiliar", "auxiliar", "ASISTENCIA_REGISTRAR", {
      alumno: nuevaAsistencia.nombresEstudiante,
      taller: nuevaAsistencia.programa,
      fecha: nuevaAsistencia.fechaRegistro,
      estado: nuevaAsistencia.estadoAcceso
    });

    return mapDbAsistenciaToApi(nuevaAsistencia);
  }

  async validarIngresoAuxiliar(busqueda: string, programaId: string) {
    const db = await coordinacionRepository.getDb();
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
    const db = await coordinacionRepository.getDb();
    const ids = extraerIdentificadoresCodigo(codigo);
    return resolverValidacion(db, ids);
  }
}

