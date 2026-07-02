import { normalizarTextoApi } from "../../shared/mappers.js";
import {
  enviarCorreoGenerico,
  generarCorreoConfirmacionPago,
  resolverPlantillaTexto,
  generarComunicadoPdf,
  generarWordResuelto
} from "../../services/mail.service.js";
import { convertirWordAPdf } from "../../services/file.service.js";

/**
 * Incrementa el valor de un código numérico secuencial (ej: 'REC-0501' a 'REC-0502').
 */
export function incrementarCorrelativo(valor: string): string {
  if (!valor) return "";
  const match = String(valor).match(/^(.*?)(\d+)$/);
  if (!match) return valor;
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = Number(numStr) + 1;
  const paddedNum = String(nextNum).padStart(numStr.length, "0");
  return prefix + paddedNum;
}

/**
 * Calcula el siguiente número de recibo disponible evitando colisionar con números existentes.
 */
export function calcularSiguienteRecibo(startValue: string, existingNros: string[]): string {
  if (!startValue) return "";
  const match = String(startValue).match(/^(.*?)(\d+)$/);
  if (!match) return startValue;
  const prefix = match[1];
  const startNumStr = match[2];
  const S = Number(startNumStr);
  const padLength = startNumStr.length;

  let maxM = 0;
  let foundAny = false;

  for (const nro of existingNros) {
    if (!nro) continue;
    const nroStr = String(nro).trim();
    if (nroStr.startsWith(prefix)) {
      const numPart = nroStr.slice(prefix.length);
      if (/^\d+$/.test(numPart)) {
        const val = Number(numPart);
        if (!foundAny || val > maxM) {
          maxM = val;
          foundAny = true;
        }
      }
    }
  }

  let nextVal;
  if (!foundAny || maxM < S) {
    nextVal = S;
  } else {
    nextVal = maxM + 1;
  }

  return prefix + String(nextVal).padStart(padLength, "0");
}

/**
 * Inicializa y normaliza los correlativos de recibos físicos, virtuales y egresos en la base de datos.
 */
export function normalizarCorrelativos(db: any): any {
  if (!db.correlativos) {
    db.correlativos = {};
  }
  const c = db.correlativos;
  
  if (c.recibo !== undefined && c.reciboInicio === undefined) {
    c.reciboInicio = c.recibo;
    const existingNros = (db.pagos || []).map((p: any) => p.nroRecibo || p.nro_recibo || "").filter(Boolean);
    c.reciboActual = calcularSiguienteRecibo(c.recibo, existingNros);
    delete c.recibo;
  }
  if (c.reciboVirtual !== undefined && c.reciboVirtualInicio === undefined) {
    c.reciboVirtualInicio = c.reciboVirtual;
    const existingNros = (db.pagos || []).map((p: any) => p.nroRecibo || p.nro_recibo || "").filter(Boolean);
    c.reciboVirtualActual = calcularSiguienteRecibo(c.reciboVirtual, existingNros);
    delete c.reciboVirtual;
  }
  if (c.egreso !== undefined && c.egresoInicio === undefined) {
    c.egresoInicio = c.egreso;
    c.egresoActual = c.egreso;
    delete c.egreso;
  }

  if (c.reciboInicio === undefined) c.reciboInicio = "REC-0500";
  if (c.reciboActual === undefined) c.reciboActual = "REC-0501";
  if (c.reciboVirtualInicio === undefined) c.reciboVirtualInicio = "V-1000";
  if (c.reciboVirtualActual === undefined) c.reciboVirtualActual = "V-1001";
  if (c.egresoInicio === undefined) c.egresoInicio = "EGR-0200";
  if (c.egresoActual === undefined) c.egresoActual = "EGR-0201";

  return c;
}

/**
 * Normaliza y deduce el estado de pago de una transacción para el reporte consolidado de caja.
 */
export function normalizarEstadoPagoReporteCaja(pago: any = null, inscripcion: any = null): string {
  if (pago) {
    const estadoPago = normalizarTextoApi(pago.estado);
    if (["completado", "pagado", "validado"].includes(estadoPago)) return "pagado";
    if (["por verificar", "verificando", "verificacion"].includes(estadoPago)) return "verificando";
    if (["observado", "rechazado", "no coincide"].includes(estadoPago)) return "observado";
    if (["anulado", "cancelado"].includes(estadoPago)) return "anulado";

    const origen = normalizarTextoApi(pago.origenRegistro);
    const tieneComprobante = Boolean(
      pago.numeroOperacion ||
      pago.telefonoOperacion ||
      pago.capturaPagoBase64 ||
      pago.capturaPagoNombre
    );
    if (origen.includes("portal") && tieneComprobante) return "verificando";
  }

  const estadoInscripcion = normalizarTextoApi(inscripcion?.estadoPago);
  if (["pagado", "completado", "validado"].includes(estadoInscripcion)) return "pagado";
  return "pendiente";
}

/**
 * Evalúa si una transacción de pago coincide con una determinada inscripción del estudiante.
 */
export function pagoPerteneceAInscripcionReporte(pay: any = {}, item: any = {}): boolean {
  if (pay.inscripcionId && item.id) return pay.inscripcionId === item.id;
  if (pay.inscripcionId && item.inscripcionId) return pay.inscripcionId === item.inscripcionId;
  if (pay.dniEstudiante !== item.dniEstudiante) return false;
  if (pay.programaId && item.programaId) return pay.programaId === item.programaId;
  return normalizarTextoApi(pay.programa) === normalizarTextoApi(item.programa);
}

/**
 * Mapea y da formato a una transacción de pago para una fila del reporte de caja.
 */
export function mapPaymentToReportRow(p: any, prog: any, student: any, e: any, period: string): any {
  return {
    id: p.id,
    pagoId: p.id,
    inscripcionId: p.inscripcionId || "",
    dniEstudiante: p.dniEstudiante,
    estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : p.nombresEstudiante || "",
    programaId: prog ? prog.id : p.programaId || "",
    programa: prog ? prog.nombre : p.programa || "",
    periodo: period,
    monto: p.monto,
    estadoPago: normalizarEstadoPagoReporteCaja(p),
    estadoInscripcion: "",
    formaPago: p.formaPago,
    numeroOperacion: p.numeroOperacion || "",
    telefonoOperacion: p.telefonoOperacion || "",
    origen: p.origenRegistro || "Portal parents",
    fuente: "pago",
    fecha: p.fechaPago || p.fecha || "",
    fechaRegistro: p.fecha || "",
    fechaPago: p.fechaPago || "",
    apoderado: student ? student.apoderado : "",
    telefono: student ? student.telefonoApoderado : "",
    nroRecibo: p.nroRecibo || p.nro_recibo || "",
    grado: e ? (e.gradoEstudiante || e.grado || (student ? student.grado : "")) : (student ? student.grado : ""),
    seccion: e ? (e.seccionEstudiante || e.seccion || (student ? student.seccion : "")) : (student ? student.seccion : ""),
    descuentoAprobado: e ? (e.descuentoAprobado || false) : false,
    descuentoTipo: e ? (e.descuentoTipo || "") : "",
    descuentoMonto: e ? (e.descuentoMonto || 0) : 0,
    costoOriginal: e ? (e.costoOriginal ?? prog?.costo ?? 0) : (prog?.costo ?? 0),
    descuentoJustificacion: e ? (e.descuentoJustificacion || "") : "",
    observaciones: p.observaciones || p.observacion || p.pagoObservacionCaja || ""
  };
}

/**
 * Mapea y da formato a una inscripción para una fila del reporte de caja.
 */
export function mapEnrollmentToReportRow(e: any, p: any, prog: any, student: any, period: string): any {
  const baseCosto = e.costoOriginal !== undefined && e.costoOriginal !== null
    ? Number(e.costoOriginal)
    : (prog ? Number(prog.costo || 0) : 0);
  const finalCosto = e.descuentoAprobado
    ? Math.max(0, baseCosto - Number(e.descuentoMonto || 0))
    : baseCosto;
  const monto = p ? p.monto : finalCosto;
  const statePay = normalizarEstadoPagoReporteCaja(p, e);

  return {
    id: e.id,
    inscripcionId: e.id,
    dniEstudiante: e.dniEstudiante,
    estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : e.nombresEstudiante || "",
    programaId: prog ? prog.id : e.programaId || "",
    programa: prog ? prog.nombre : e.programa || "",
    periodo: period,
    monto,
    estadoPago: statePay,
    estadoInscripcion: e.estadoInscripcion || "",
    formaPago: p ? p.formaPago : "Sin pago",
    numeroOperacion: p ? p.numeroOperacion : "",
    telefonoOperacion: p ? p.telefonoOperacion : "",
    origen: p ? p.origenRegistro : e.origenRegistro || "Presencial",
    fuente: "inscripcion",
    pagoId: p ? p.id : "",
    fecha: p ? (p.fechaPago || p.fecha) : e.fechaRegistro || "",
    fechaRegistro: e.fechaRegistro || "",
    fechaPago: p ? (p.fechaPago || p.fecha) : "",
    apoderado: e.apoderado || "",
    telefono: e.telefono || "",
    puedePagarCaja: true,
    nroRecibo: p ? (p.nroRecibo || p.nro_recibo || "") : "",
    grado: e.gradoEstudiante || e.grado || (student ? student.grado : ""),
    seccion: e.seccionEstudiante || e.seccion || (student ? student.seccion : ""),
    descuentoAprobado: e.descuentoAprobado || false,
    descuentoTipo: e.descuentoTipo || "",
    descuentoMonto: e.descuentoMonto || 0,
    costoOriginal: e.costoOriginal ?? (prog ? prog.costo : 0),
    descuentoJustificacion: e.descuentoJustificacion || "",
    observaciones: p ? (p.observaciones || p.observacion || p.pagoObservacionCaja || "") : (e.pagoObservacionCaja || "")
  };
}

/**
 * Genera el documento de matrícula (Word/PDF) y envía el correo electrónico de confirmación al apoderado.
 */
export async function enviarCorreoConfirmacionConAdjuntos(inscrip: any, db: any, pagoMonto: any, nroRecibo: string): Promise<void> {
  const deseaCorreo = inscrip && (inscrip.enviarPdfCorreo || String(inscrip.origenRegistro || "").includes("enviar_correo"));
  const apoderadoEmail = inscrip && (db.estudiantes?.[inscrip.dniEstudiante]?.correoApoderado || inscrip.correo || "");

  if (!deseaCorreo || !apoderadoEmail) return;

  const studentName = inscrip.nombresEstudiante || (db.estudiantes?.[inscrip.dniEstudiante] ? `${(db.estudiantes[inscrip.dniEstudiante] as any).nombres} ${(db.estudiantes[inscrip.dniEstudiante] as any).apellidos || ""}`.trim() : "");
  const progName = inscrip.programa || "";
  const amount = pagoMonto || "";

  const adjuntos: any[] = [];
  const programaObj = (db.programas?.find((p: any) => p.id === inscrip.programaId) || {}) as any;
  const plantillaBase64 = programaObj.plantillaBase64 || inscrip.plantillaBase64;

  if (plantillaBase64) {
    try {
      const estudianteObj = db.estudiantes?.[inscrip.dniEstudiante] || {};
      const wordBuffer = generarWordResuelto(plantillaBase64, estudianteObj, inscrip, programaObj);
      
      if (wordBuffer) {
        adjuntos.push({
          filename: `Ficha_Matricula_${inscrip.id}.docx`,
          content: wordBuffer
        });
        
        try {
          const pdfBuffer = await convertirWordAPdf(wordBuffer);
          if (pdfBuffer) {
            adjuntos.push({
              filename: `Ficha_Inscripcion_${inscrip.id}.pdf`,
              content: pdfBuffer
            });
          }
        } catch (errorWordPdf: any) {
          console.error("[WORD TO PDF ERROR] No se pudo convertir el Word resuelto a PDF, intentando generar PDF desde texto plano:", errorWordPdf.message);
          
          const textoPlantilla = programaObj.comunicadoCompleto || programaObj.comunicado || "";
          if (textoPlantilla) {
            try {
              const textoResuelto = resolverPlantillaTexto(textoPlantilla, estudianteObj, inscrip, programaObj);
              const pdfBuffer = generarComunicadoPdf(textoResuelto, progName);
              adjuntos.push({
                filename: `Ficha_Inscripcion_${inscrip.id}.pdf`,
                content: pdfBuffer
              });
            } catch (errorTextPdf: any) {
              console.error("[TEXT TO PDF ERROR] Fallo al generar PDF desde texto plano:", errorTextPdf.message);
            }
          }
        }
      }
    } catch (errorWord: any) {
      console.error("[WORD GENERATION ERROR] Error al generar el Word resuelto, enviando Word original:", errorWord.message);
      adjuntos.push({
        filename: `Ficha_Matricula_${inscrip.id}.docx`,
        content: Buffer.from(plantillaBase64, "base64")
      });
    }
  }

  const { asunto, html } = generarCorreoConfirmacionPago(studentName, progName, amount, nroRecibo);
  await enviarCorreoGenerico({
    para: apoderadoEmail,
    asunto,
    html,
    adjuntos
  }).catch(err => console.error("[MAIL EXCEPTION] No se pudo enviar el correo de confirmación de pago:", err.message));
}
