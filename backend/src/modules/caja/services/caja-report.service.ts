import { normalizarPeriodoApi, normalizarTextoApi } from "../../../common/shared/mappers.js";
import {
  mapEnrollmentToReportRow,
  mapPaymentToReportRow,
  pagoPerteneceAInscripcionReporte
} from "../helpers/caja.helpers.js";
import { CajaRepository } from "../repositories/caja.repository.js";

const cajaRepository = new CajaRepository();

export class CajaReportService {
  /**
   * Obtiene un resumen financiero con ingresos, egresos y saldos pendientes para un periodo.
   */
  async getCajaResumen(periodo: string) {
    const db = await cajaRepository.getDb();
    const period = normalizarPeriodoApi(periodo);

    const pagosCompletados = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && ["completado", "validado"].includes(p.estado));
    const pagosIngresos = pagosCompletados.filter(p => p.formaPago !== "Egreso");
    const pagosEgresos = pagosCompletados.filter(p => p.formaPago === "Egreso");

    const totalIngreso = pagosIngresos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalEgreso = pagosEgresos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalCobrado = totalIngreso - totalEgreso;

    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const paidInscripIds = new Set(pagosIngresos.map(p => p.inscripcionId));
    const pendingInscrip = enrollments.filter(e => !paidInscripIds.has(e.id));
    const totalPendiente = pendingInscrip.reduce((sum, e) => sum + Number(e.costo || 0), 0);

    return {
      totalCobrado,
      totalIngreso,
      totalEgreso,
      totalPendiente,
      transacciones: pagosIngresos.length
    };
  }

  /**
   * Genera la lista para el reporte detallado de caja segun filtros de fecha, programa, medio y tipo.
   */
  async getCajaReporte(query: any) {
    const { periodo, tipoReporte, desde, hasta, programa, medioPago, estadoPago } = query;
    const db = await cajaRepository.getDb();
    const period = normalizarPeriodoApi(periodo);

    const payments = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");

    let reportList: any[] = [];

    if (tipoReporte === "pagos_registrados" || tipoReporte === "pagos_realizados") {
      reportList = payments.map(p => {
        const prog = db.programas.find((progItem: any) => progItem.id === p.programaId || normalizarTextoApi(progItem.nombre) === normalizarTextoApi(p.programa));
        const student = p.dniEstudiante ? (db.estudiantes?.[p.dniEstudiante] as any) : null;
        const e = (db.inscripciones || []).find(item => item.id === p.inscripcionId || (p.dniEstudiante && item.dniEstudiante === p.dniEstudiante && item.programaId === p.programaId));
        return mapPaymentToReportRow(p, prog, student, e, period);
      });
    } else {
      reportList = enrollments.map(e => {
        let p = e.pagoId ? payments.find(pay => pay.id === e.pagoId) : null;
        if (!p) {
          p = payments.find(pay => pagoPerteneceAInscripcionReporte(pay, e) && pay.estado !== "anulado");
        }
        if (!p) {
          p = payments.find(pay => pagoPerteneceAInscripcionReporte(pay, e));
        }
        const prog = db.programas.find((progItem: any) => progItem.id === e.programaId);
        const student = db.estudiantes?.[e.dniEstudiante] as any;
        return mapEnrollmentToReportRow(e, p, prog, student, period);
      });
    }

    const finalReport = reportList.filter(row => {
      if (programa && programa !== "todos" && row.programaId !== programa) return false;
      if (medioPago && medioPago !== "todos" && row.formaPago !== medioPago) return false;
      if (estadoPago && estadoPago !== "todos" && row.estadoPago !== estadoPago) return false;

      const rowDate = String(row.fecha).slice(0, 10);
      if (desde && rowDate < desde) return false;
      if (hasta && rowDate > hasta) return false;

      const isWeb = String(row.origen).toLowerCase().includes("portal padres") || String(row.origen).toLowerCase().includes("web");
      if (tipoReporte === "registro_secretaria" && isWeb) return false;
      if (tipoReporte === "registro_web" && !isWeb) return false;
      if ((tipoReporte === "por_cobrar" || tipoReporte === "pagos_pendientes") && row.estadoPago !== "pendiente") return false;
      if (tipoReporte === "pagos_realizados" && row.estadoPago !== "pagado") return false;
      if (tipoReporte === "becas_descuentos") {
        const esBecaODescuento = row.descuentoAprobado || ["beca", "descuento"].includes(String(row.formaPago).toLowerCase());
        if (!esBecaODescuento) return false;
      }

      return true;
    });

    return finalReport;
  }
}
