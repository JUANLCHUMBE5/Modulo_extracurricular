import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import { parseMonto } from "../../../common/shared/mappers.js";
import {
  incrementarCorrelativo,
  normalizarCorrelativos
} from "../helpers/caja.helpers.js";
import { CajaRepository } from "../repositories/caja.repository.js";

const cajaRepository = new CajaRepository();

export class CajaCorrelativoService {
  /**
   * Registra una transaccion de egreso o gasto asignando un correlativo de egreso.
   */
  async registrarEgreso(operatorUsername: string, operatorRole: string, body: any) {
    const db = await cajaRepository.getDb();
    const corr = normalizarCorrelativos(db);
    if (corr.egresoActive === false) {
      throw new Error("La serie de recibo de egreso esta inactiva en el sistema.");
    }

    const assignedNroRecibo = corr.egresoActual || "EGR-0201";
    corr.egresoActual = incrementarCorrelativo(assignedNroRecibo);

    const nuevoEgreso = {
      id: `PAG-EGR-${String(Date.now()).slice(-6)}`,
      inscripcionId: null,
      dniEstudiante: body.dni || "",
      nombresEstudiante: body.beneficiario || "Egreso de Caja",
      programa: "",
      programaId: "",
      monto: parseMonto(body.monto),
      formaPago: "Egreso",
      numeroOperacion: "",
      telefonoOperacion: "",
      nroRecibo: assignedNroRecibo,
      periodo: body.periodo || (db as any).configuracion_actual?.periodo || "escolar",
      fecha: body.fecha || new Date().toISOString(),
      fechaPago: body.fecha || new Date().toISOString(),
      estado: "completado",
      origenRegistro: "Caja",
      observaciones: body.concepto || "Egreso registrado"
    };

    db.pagos.push(nuevoEgreso as any);
    await cajaRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "EGRESO_REGISTRAR", {
      pagoId: nuevoEgreso.id,
      monto: nuevoEgreso.monto,
      beneficiario: nuevoEgreso.nombresEstudiante
    });

    return nuevoEgreso;
  }

  /**
   * Anula un numero correlativo fisico o virtual que fue malogrado o cancelado antes de ser emitido.
   */
  async cancelarCorrelativo(operatorUsername: string, operatorRole: string, body: any) {
    const { tipo, motivo, dniEstudiante, nombresEstudiante, nroRecibo } = body;
    if (!tipo || !motivo) {
      throw new Error("Tipo y motivo son obligatorios.");
    }

    const db = await cajaRepository.getDb();
    const corr = normalizarCorrelativos(db);
    let val = "";

    if (nroRecibo) {
      val = String(nroRecibo).trim();
      if (tipo === "recibo" && val === corr.reciboActual) {
        corr.reciboActual = incrementarCorrelativo(val);
      } else if (tipo === "reciboVirtual" && val === corr.reciboVirtualActual) {
        corr.reciboVirtualActual = incrementarCorrelativo(val);
      } else if (tipo === "egreso" && val === corr.egresoActual) {
        corr.egresoActual = incrementarCorrelativo(val);
      }
    } else {
      if (tipo === "recibo") {
        val = corr.reciboActual;
        corr.reciboActual = incrementarCorrelativo(val);
      } else if (tipo === "reciboVirtual") {
        val = corr.reciboVirtualActual;
        corr.reciboVirtualActual = incrementarCorrelativo(val);
      } else if (tipo === "egreso") {
        val = corr.egresoActual;
        corr.egresoActual = incrementarCorrelativo(val);
      } else {
        throw new Error("Tipo de correlativo no valido.");
      }
    }

    if (!val) {
      throw new Error("No se encontro un correlativo actual para este tipo.");
    }

    const nuevoPagoAnulado = {
      id: `PAG-CANC-${String(Date.now()).slice(-6)}`,
      inscripcionId: null,
      dniEstudiante: dniEstudiante || "ANULADO",
      nombresEstudiante: nombresEstudiante || (tipo === "egreso" ? `EGRESO ANULADO: ${val}` : `RECIBO ANULADO: ${val}`),
      programa: "",
      programaId: "",
      periodo: "escolar",
      monto: 0,
      formaPago: tipo === "reciboVirtual" ? "Yape" : "Efectivo",
      numeroOperacion: "",
      telefonoOperacion: "",
      nroRecibo: val,
      estado: "anulado",
      fecha: new Date().toISOString(),
      fechaPago: new Date().toISOString(),
      origenRegistro: "Caja",
      validadoPor: operatorUsername || "Cajera",
      validadoEn: new Date().toISOString(),
      observaciones: `Correlativo cancelado/anulado por Cajera. Motivo: ${motivo}`
    };

    db.pagos = db.pagos || [];
    db.pagos.push(nuevoPagoAnulado as any);

    await cajaRepository.saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "CORRELATIVO_CANCELAR", {
      tipo,
      comprobante: val,
      motivo,
      dniEstudiante: dniEstudiante || "ANULADO",
      nombresEstudiante: nombresEstudiante || ""
    });

    const siguiente = tipo === "recibo" ? corr.reciboActual : (tipo === "reciboVirtual" ? corr.reciboVirtualActual : corr.egresoActual);

    return {
      comprobanteAnulado: val,
      siguienteComprobante: siguiente
    };
  }
}
