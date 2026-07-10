import {
  mapDbPaymentToApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  parseMonto
} from "../../../common/shared/mappers.js";
import { CajaRepository } from "../repositories/caja.repository.js";

const cajaRepository = new CajaRepository();

export class CajaPaymentQueryService {
  async getPagosLegacy(page: number | null, limit: number) {
    const db = await cajaRepository.getDb();
    const list = db.pagos || [];
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

  async getPagos(periodo: string, estudianteDni: string, page: number | null, limit: number) {
    const db = await cajaRepository.getDb();
    const period = normalizarPeriodoApi(periodo);
    let filtered = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    if (estudianteDni) {
      filtered = filtered.filter(p => p.dniEstudiante === estudianteDni || p.estudianteDni === estudianteDni);
    }
    const enriched = filtered.map(p => {
      const inscripcion = (db.inscripciones || []).find(item =>
        (p.inscripcionId && item.id === p.inscripcionId) ||
        (item.dniEstudiante === (p.dniEstudiante || p.estudianteDni) && item.programaId === p.programaId)
      );
      const programa = (db.programas || []).find(item =>
        item.id === (p.programaId || inscripcion?.programaId)
      );

      return {
        ...p,
        monto: parseMonto(p.monto),
        programaId: p.programaId || inscripcion?.programaId || programa?.id || "",
        programa: p.programa || p.programaNombre || inscripcion?.programa || programa?.nombre || "",
        programaFechaInicio: programa?.fechaInicio || inscripcion?.fechaInicio || "",
        programaFechaFin: programa?.fechaFin || inscripcion?.fechaFin || "",
        estadoPrograma: programa?.estado || "",
        nombresEstudiante: p.nombresEstudiante || inscripcion?.nombresEstudiante || "",
      };
    });

    if (page !== null && !isNaN(page)) {
      const startIndex = (page - 1) * limit;
      const paginated = enriched.slice(startIndex, startIndex + limit);
      return {
        data: paginated.map(mapDbPaymentToApi),
        pagination: {
          total: enriched.length,
          page,
          limit,
          totalPages: Math.ceil(enriched.length / limit)
        }
      };
    }
    return enriched.map(mapDbPaymentToApi);
  }

  async getBandejaPagosWeb(periodo: string) {
    const db = await cajaRepository.getDb();
    const period = normalizarPeriodoApi(periodo);

    const list = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && (p.estado === "Por Verificar" || p.estado === "pendiente"));

    return list.map(p => {
      const student = p.dniEstudiante ? (db.estudiantes?.[p.dniEstudiante] as any) : null;
      return {
        ...mapDbPaymentToApi(p),
        estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : p.nombresEstudiante || "",
        dniEstudiante: p.dniEstudiante || "",
        programa: p.programa || ""
      };
    });
  }

  async getPagoById(pagoId: string) {
    const db = await cajaRepository.getDb();
    const p = (db.pagos || []).find(pay => pay.id === pagoId);
    if (!p) {
      throw new Error("Pago no encontrado.");
    }
    return mapDbPaymentToApi(p);
  }
}

