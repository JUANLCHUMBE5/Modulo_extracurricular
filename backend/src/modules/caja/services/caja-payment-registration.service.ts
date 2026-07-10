import { registrarAuditoria } from "../../../common/audit/audit.service.js";
import { mapDbPaymentToApi, parseMonto } from "../../../common/shared/mappers.js";
import {
  incrementarCorrelativo,
  normalizarCorrelativos
} from "../helpers/caja.helpers.js";
import { CajaRepository } from "../repositories/caja.repository.js";

const cajaRepository = new CajaRepository();

export class CajaPaymentRegistrationService {
  async registrarPago(operatorUsername: string, body: any) {
    const db = await cajaRepository.getDb();
    const inscripcion_id = body.inscripcion_id || body.inscripcionId || "";
    const rawMonto = body.monto !== undefined ? body.monto : (body.monto_pago !== undefined ? body.monto_pago : 0);
    const monto = parseMonto(rawMonto);
    const forma_pago = body.forma_pago || body.metodo_pago || body.formaPago || "Efectivo";
    const numero_operacion = body.numero_operacion || body.numeroOperacion || "";
    const telefono_operacion = body.telefono_operacion || body.telefonoOperacion || "";
    const fecha_pago = body.fecha_pago || body.fechaPago || body.fecha || new Date().toISOString();
    const usuario_registro = body.usuario_registro || body.origen_registro || operatorUsername || "Cajera";
    const dni_estudiante = body.dni_estudiante || body.dniEstudiante || "";
    const nombres_estudiante = body.nombres_estudiante || body.nombresEstudiante || "";
    const programa = body.programa || body.programaNombre || "";
    const periodo = body.periodo || "escolar";
    let assignedNroRecibo = "";

    const corr = normalizarCorrelativos(db);
    assignedNroRecibo = corr.reciboActual || "REC-0501";
    corr.reciboActual = incrementarCorrelativo(assignedNroRecibo);

    const pagoId = `PAG-${String(Date.now()).slice(-6)}`;
    const inscrip = (db.inscripciones || []).find(item => item.id === inscripcion_id);

    const nuevoPago = {
      id: pagoId,
      inscripcionId: inscripcion_id || "",
      dniEstudiante: dni_estudiante || (inscrip ? inscrip.dniEstudiante : ""),
      nombresEstudiante: nombres_estudiante || (inscrip ? inscrip.nombresEstudiante : ""),
      programa: programa || (inscrip ? inscrip.programa : ""),
      programaId: (inscrip ? inscrip.programaId : ""),
      periodo: periodo || (inscrip ? inscrip.periodo : "escolar"),
      monto: parseMonto(
        monto ||
        (inscrip
          ? (inscrip.costo !== undefined
              ? inscrip.costo
              : (inscrip.descuentoAprobado
                  ? Math.max(0, Number(inscrip.costoOriginal ?? (db.programas.find((p: any) => p.id === inscrip.programaId)?.costo ?? 0)) - Number(inscrip.descuentoMonto || 0))
                  : Number(inscrip.costoOriginal ?? (db.programas.find((p: any) => p.id === inscrip.programaId)?.costo ?? 0))
                )
            )
          : 0) ||
        0
      ),
      formaPago: forma_pago || "Efectivo",
      numeroOperacion: numero_operacion || "",
      telefonoOperacion: telefono_operacion || "",
      nroRecibo: assignedNroRecibo,
      capturaPagoBase64: "",
      estado: "validado",
      fecha: fecha_pago || new Date().toISOString(),
      fechaPago: fecha_pago || new Date().toISOString(),
      origenRegistro: "Caja",
      validadoPor: usuario_registro || "Cajera",
      validadoEn: new Date().toISOString()
    };

    db.pagos = db.pagos || [];
    db.pagos.push(nuevoPago);

    if (inscrip) {
      inscrip.estadoPago = "validado";
      inscrip.estadoInscripcion = "confirmada";
      inscrip.pagoId = pagoId;
      inscrip.fechaPago = nuevoPago.fechaPago;
    }

    if (db.estudiantes?.[dni_estudiante]) {
      (db.estudiantes[dni_estudiante] as any).estadoInscripcion = "confirmada";
    }

    await cajaRepository.saveDb(db);

    await registrarAuditoria(usuario_registro || "Cajera", "caja", "PAGO_REGISTRAR", {
      pagoId,
      inscripcionId: inscripcion_id,
      monto: nuevoPago.monto
    });

    return mapDbPaymentToApi(nuevoPago);
  }

  async updatePago(pagoId: string, body: any) {
    const db = await cajaRepository.getDb();
    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    const updated = {
      ...db.pagos[idx],
      monto: Number(body.monto || db.pagos[idx].monto),
      formaPago: body.formaPago || db.pagos[idx].formaPago,
      numeroOperacion: body.numeroOperacion || db.pagos[idx].numeroOperacion,
      telefonoOperacion: body.telefonoOperacion || db.pagos[idx].telefonoOperacion,
      fechaPago: body.fechaPago || db.pagos[idx].fechaPago,
      nroRecibo: body.nroRecibo !== undefined ? body.nroRecibo : (body.nro_recibo !== undefined ? body.nro_recibo : db.pagos[idx].nroRecibo)
    };
    db.pagos[idx] = updated;

    const inscrip = (db.inscripciones || []).find(item => item.id === updated.inscripcionId);
    if (inscrip) {
      inscrip.fechaPago = updated.fechaPago;
    }

    await cajaRepository.saveDb(db);
    return mapDbPaymentToApi(updated);
  }

  async registrarComprobante(body: any, file: Express.Multer.File | undefined) {
    const db = await cajaRepository.getDb();
    let base64Image = "";
    if (file) {
      base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    }
    if (!base64Image) {
      base64Image = body.comprobante_base64 || "";
    }

    const inscrip = (db.inscripciones || []).find(item => item.id === body.inscripcion_id);
    if (!inscrip) {
      throw new Error("No se encontro la inscripcion para registrar el pago.");
    }

    const pagoId = `PAG-${String(Date.now()).slice(-6)}`;
    const nuevoPago = {
      id: pagoId,
      inscripcionId: body.inscripcion_id || "",
      dniEstudiante: body.dni_estudiante || inscrip.dniEstudiante || "",
      nombresEstudiante: inscrip.nombresEstudiante || "",
      programaId: inscrip.programaId || "",
      programa: body.nombre_programa || inscrip.programa || "",
      periodo: body.periodo || inscrip.periodo || "escolar",
      monto: parseMonto(
        body.monto_pago ||
        (inscrip.costo !== undefined
          ? inscrip.costo
          : (inscrip.descuentoAprobado
              ? Math.max(0, Number(inscrip.costoOriginal ?? (db.programas.find((p: any) => p.id === inscrip.programaId)?.costo ?? 0)) - Number(inscrip.descuentoMonto || 0))
              : Number(inscrip.costoOriginal ?? (db.programas.find((p: any) => p.id === inscrip.programaId)?.costo ?? 0))
            )
        ) ||
        0
      ),
      formaPago: body.metodo_pago || "Yape",
      numeroOperacion: body.numero_operacion || body.referencia || "",
      telefonoOperacion: body.telefono_operacion || body.telefono || "",
      capturaPagoNombre: body.comprobante_nombre || "",
      capturaPagoBase64: base64Image,
      estado: "verificando",
      estadoVerificacion: "pendiente",
      fecha: new Date().toISOString(),
      fechaPago: new Date().toISOString(),
      origenRegistro: "Portal padres"
    };

    db.pagos = db.pagos || [];
    db.pagos.push(nuevoPago);

    inscrip.estadoPago = "pendiente";
    inscrip.estadoInscripcion = "Pago en proceso";
    inscrip.pagoId = pagoId;
    inscrip.pagoReferencia = nuevoPago.numeroOperacion;
    inscrip.pagoTelefono = nuevoPago.telefonoOperacion;
    inscrip.pagoCapturaNombre = nuevoPago.capturaPagoNombre;

    await cajaRepository.saveDb(db);

    await registrarAuditoria("padre", "padres", "PAGO_COMPROBANTE_SUBIR", {
      pagoId,
      inscripcionId: body.inscripcion_id,
      monto: nuevoPago.monto
    });

    return mapDbPaymentToApi(nuevoPago);
  }
}

