import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import {
  mapDbEnrollmentToApi,
  normalizarTextoApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  obtenerGradoCompletoApi
} from "../../../common/shared/mappers.js";
import { DireccionRepository } from "../repositories/direccion.repository.js";

const direccionRepository = new DireccionRepository();

export class DireccionDescuentosService {
  async buscarDescuentos(q: string) {
    if (!q) return [];
    const db = await direccionRepository.getDb();
    const query = normalizarTextoApi(q);

    const realEnrollments = (db.inscripciones || []).filter(ins => {
      if (ins.estadoInscripcion === "Anulada" || ins.estadoInscripcion === "anulada") return false;
      const dniCoincide = String(ins.dni || ins.dniEstudiante || "").includes(query);
      const nombreCoincide = String(ins.estudiante || ins.nombresEstudiante || "").toLowerCase().includes(query);
      return dniCoincide || nombreCoincide;
    });

    const mappedReal = realEnrollments.map(item => mapDbEnrollmentToApi(item, db));

    const virtualEnrollments: any[] = [];
    const programas = db.programas || [];
    programas.forEach(programa => {
      const invitados = db.invitadosPorPrograma?.[programa.id] || [];
      invitados.forEach(invitado => {
        const dni = String(invitado.dni || "").replace(/\D/g, "");
        const name = String(invitado.nombres || "").toLowerCase();
        const matchesDni = dni.includes(query);
        const matchesName = name.includes(query);

        if (matchesDni || matchesName) {
          const existeReal = (db.inscripciones || []).some(ins =>
            ins.dniEstudiante === invitado.dni &&
            ins.programaId === programa.id &&
            ins.estadoInscripcion !== "Anulada" &&
            ins.estadoInscripcion !== "anulada"
          );

          if (!existeReal) {
            const student = db.estudiantes?.[invitado.dni] || {};
            virtualEnrollments.push({
              id: `INV-${programa.id}-${invitado.dni}`,
              inscripcion_id: `INV-${programa.id}-${invitado.dni}`,
              estudiante_id: invitado.dni,
              programa_id: programa.id,
              creado_en: new Date().toISOString(),
              origen_inscripcion: "InvitaciÃ³n",
              estado_inscripcion: "Pendiente de pago",
              dni_estudiante: invitado.dni,
              codigo_estudiante: student.codigoEstudiante || invitado.codigoEstudiante || "",
              nombres_estudiante: invitado.nombres,
              grado_estudiante: invitado.grado || "",
              seccion: invitado.seccion || "",
              nombre_programa: programa.nombre,
              categoria: programa.categoria || "",
              horario: programa.horario || "",
              docente: programa.responsable || programa.docente || "No definido",
              monto: programa.costo || 0,
              costoOriginal: programa.costo || 0,
              apoderado: student.apoderado || "",
              telefono_apoderado: student.telefonoApoderado || (student as any).telefono || "",
              correo_apoderado: student.correoApoderado || (student as any).correo || "",
              estado_pago: "pendiente",
              pago_id: "",
              derivado_caja: false,
              estado_caja: "",
              descuentoAprobado: false,
              esVirtual: true
            });
          }
        }
      });
    });

    return [...mappedReal, ...virtualEnrollments];
  }

  async aplicarDescuento(operatorUsername: string, operatorRole: string, body: any) {
    const { inscripcionId, tipo, valor, justificacion } = body;
    if (!inscripcionId) {
      throw new Error("Falta id de inscripcion");
    }
    if (!justificacion?.trim()) {
      throw new Error("Falta justificacion");
    }

    const db = await direccionRepository.getDb();
    let ins: any = null;
    let index = -1;

    if (String(inscripcionId).startsWith("INV-")) {
      const parts = String(inscripcionId).split("-");
      const dni = parts[parts.length - 1];
      const progId = parts.slice(1, parts.length - 1).join("-");

      const prog = (db.programas || []).find(p => p.id === progId);
      if (!prog) {
        throw new Error("Taller no encontrado para la invitaciÃ³n");
      }

      const invitados = db.invitadosPorPrograma?.[progId] || [];
      const invitado = invitados.find(i => i.dni === dni);
      if (!invitado) {
        throw new Error("InvitaciÃ³n de estudiante no encontrada");
      }

      const student = db.estudiantes?.[dni] || {};
      const gradoEstudiante = obtenerGradoCompletoApi(invitado.grado || student.grado || "", invitado.nivelEducativo || invitado.nivel || student.nivel || "");
      const horarioResuelto = resolverHorarioPorGradoApi(prog, gradoEstudiante) || prog.horario || "";
      const docenteResuelto = resolverDocentePorGradoApi(prog, gradoEstudiante) || prog.responsable || prog.docente || "No definido";

      const newInscripcion: any = {
        id: "INS-" + Date.now(),
        dniEstudiante: dni,
        codigoEstudiante: student.codigoEstudiante || invitado.codigoEstudiante || "",
        nombresEstudiante: invitado.nombres,
        gradoEstudiante: gradoEstudiante,
        seccion: invitado.seccion || student.seccion || "",
        programaId: progId,
        programa: prog.nombre,
        categoria: prog.categoria || "",
        periodo: prog.periodo || "escolar",
        horario: horarioResuelto,
        docente: docenteResuelto,
        costo: Number(prog.costo || 0),
        modalidadCobro: prog.modalidadCobro || "Unico",
        fechaInicio: prog.fechaInicio || "",
        fechaFin: prog.fechaFin || "",
        estadoInscripcion: "pendiente_pago",
        estadoPago: "pendiente",
        derivadoCaja: true,
        fechaRegistro: new Date().toISOString(),
        apoderado: student.apoderado || "",
        telefono: student.telefonoApoderado || (student as any).telefono || "",
        correo: student.correoApoderado || (student as any).correo || "",
        origenRegistro: "DirecciÃ³n / Descuento",
        pagoId: null,
        costoOriginal: Number(prog.costo || 0),
        descuentoAprobado: false,
      };

      db.inscripciones = db.inscripciones || [];
      db.inscripciones.push(newInscripcion);
      index = db.inscripciones.length - 1;
      ins = db.inscripciones[index];
    } else {
      index = (db.inscripciones || []).findIndex(item => item.id === inscripcionId);
      if (index === -1) {
        throw new Error("InscripciÃ³n no encontrada");
      }
      ins = db.inscripciones[index];
    }

    const payments = db.pagos || [];
    const pagoAsociado = payments.find(pay => pay.inscripcionId === ins.id) ||
      payments.find(pay => pay.dniEstudiante === ins.dniEstudiante && (pay.programaId === ins.programaId || normalizarTextoApi(pay.programa) === normalizarTextoApi(ins.programa)));

    if (pagoAsociado) {
      const estPago = normalizarTextoApi(pagoAsociado.estado);
      if (["completado", "validado", "pagado"].includes(estPago)) {
        throw new Error("No se puede aplicar descuento a una inscripciÃ³n que ya ha sido pagada.");
      }
    }

    const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);
    let descuentoMonto = 0;
    let nuevoCosto = costoOriginal;

    if (tipo === "beca") {
      descuentoMonto = costoOriginal;
      nuevoCosto = 0;
    } else if (tipo === "porcentaje") {
      const pct = Number(valor || 0);
      descuentoMonto = Math.round((costoOriginal * pct) / 100);
      nuevoCosto = Math.max(0, costoOriginal - descuentoMonto);
    } else if (tipo === "monto") {
      descuentoMonto = Number(valor || 0);
      nuevoCosto = Math.max(0, costoOriginal - descuentoMonto);
    }

    db.inscripciones[index] = {
      ...ins,
      costo: nuevoCosto,
      costoOriginal,
      descuentoMonto,
      descuentoTipo: tipo,
      descuentoValor: Number(valor || 0),
      descuentoJustificacion: justificacion.trim(),
      descuentoAprobado: true,
      descuentoAprobadoPor: "DirecciÃ³n",
      descuentoFechaAprobacion: new Date().toISOString(),
    };

    await direccionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "DESCUENTO_APLICAR", {
      inscripcionId,
      tipo,
      valor,
      nuevoCosto
    });

    return mapDbEnrollmentToApi(db.inscripciones[index], db);
  }

  async removerDescuento(operatorUsername: string, operatorRole: string, inscripcionId: string) {
    const db = await direccionRepository.getDb();
    const index = (db.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
    if (index === -1) {
      throw new Error("InscripciÃ³n no encontrada");
    }

    const ins = db.inscripciones[index];
    const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);

    db.inscripciones[index] = {
      ...ins,
      costo: costoOriginal,
      costoOriginal: costoOriginal,
      descuentoMonto: undefined,
      descuentoTipo: undefined,
      descuentoValor: undefined,
      descuentoJustificacion: undefined,
      descuentoAprobado: false,
      descuentoAprobadoPor: undefined,
      descuentoFechaAprobacion: undefined,
    };

    await direccionRepository.saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "DESCUENTO_REMOVER", {
      inscripcionId
    });

    return mapDbEnrollmentToApi(db.inscripciones[index], db);
  }
}

