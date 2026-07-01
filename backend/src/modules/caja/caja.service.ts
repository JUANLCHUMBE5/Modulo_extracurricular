import { getDb, saveDb } from "../../database/dbLocal.js";
import { registrarAuditoria } from "../../services/audit.service.js";
import {
  enviarCorreoGenerico,
  generarCorreoConfirmacionPago,
  resolverPlantillaTexto,
  generarComunicadoPdf,
  generarWordResuelto
} from "../../services/mail.service.js";
import { convertirWordAPdf } from "../../services/file.service.js";
import {
  mapDbPaymentToApi,
  normalizarPeriodoApi,
  normalizarTextoApi
} from "../../shared/mappers.js";

function incrementarCorrelativo(valor: string): string {
  if (!valor) return "";
  const match = String(valor).match(/^(.*?)(\d+)$/);
  if (!match) return valor;
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = Number(numStr) + 1;
  const paddedNum = String(nextNum).padStart(numStr.length, "0");
  return prefix + paddedNum;
}

function calcularSiguienteRecibo(startValue: string, existingNros: string[]): string {
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

function normalizarCorrelativos(db: any): any {
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

function normalizarEstadoPagoReporteCaja(pago: any = null, inscripcion: any = null): string {
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

function pagoPerteneceAInscripcionReporte(pay: any = {}, item: any = {}): boolean {
  if (pay.inscripcionId && item.id) return pay.inscripcionId === item.id;
  if (pay.inscripcionId && item.inscripcionId) return pay.inscripcionId === item.inscripcionId;
  if (pay.dniEstudiante !== item.dniEstudiante) return false;
  if (pay.programaId && item.programaId) return pay.programaId === item.programaId;
  return normalizarTextoApi(pay.programa) === normalizarTextoApi(item.programa);
}

export class CajaService {
  async getPagosLegacy(page: number | null, limit: number) {
    const db = await getDb();
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
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    let filtered = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    if (estudianteDni) {
      filtered = filtered.filter(p => p.dniEstudiante === estudianteDni || p.estudianteDni === estudianteDni);
    }
    const enriched = filtered.map(p => {
      const inscripcion = (db.inscripciones || []).find(item =>
        (p.inscripcionId && item.id === p.inscripcionId) ||
        (
          item.dniEstudiante === (p.dniEstudiante || p.estudianteDni) &&
          (
            (p.programaId && item.programaId === p.programaId) ||
            normalizarTextoApi(item.programa) === normalizarTextoApi(p.programa || p.programaNombre)
          )
        )
      );
      const programa = (db.programas || []).find(item =>
        item.id === (p.programaId || inscripcion?.programaId) ||
        normalizarTextoApi(item.nombre) === normalizarTextoApi(p.programa || p.programaNombre || inscripcion?.programa)
      );

      return {
        ...p,
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

  async registrarPago(operatorUsername: string, body: any) {
    const db = await getDb();
    const inscripcion_id = body.inscripcion_id || body.inscripcionId || "";
    const monto = body.monto !== undefined ? body.monto : (body.monto_pago !== undefined ? body.monto_pago : 0);
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
      monto: Number(
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

    await saveDb(db);

    await registrarAuditoria(usuario_registro || "Cajera", "caja", "PAGO_REGISTRAR", {
      pagoId,
      inscripcionId: inscripcion_id,
      monto: nuevoPago.monto
    });

    return mapDbPaymentToApi(nuevoPago);
  }

  async updatePago(pagoId: string, body: any) {
    const db = await getDb();
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

    await saveDb(db);
    return mapDbPaymentToApi(updated);
  }

  async getCajaResumen(periodo: string) {
    const db = await getDb();
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

  async registrarEgreso(operatorUsername: string, operatorRole: string, body: any) {
    const db = await getDb();
    const corr = normalizarCorrelativos(db);
    if (corr.egresoActive === false) {
      throw new Error("La serie de recibo de egreso está inactiva en el sistema.");
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
      monto: Number(body.monto || 0),
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
    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "EGRESO_REGISTRAR", {
      pagoId: nuevoEgreso.id,
      monto: nuevoEgreso.monto,
      beneficiario: nuevoEgreso.nombresEstudiante
    });

    return nuevoEgreso;
  }

  async getEstudianteCaja(dni: string, periodo: string) {
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    const student = db.estudiantes?.[dni] as any;
    if (!student) {
      return null;
    }

    const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const pagosEstudiante = (db.pagos || []).filter(pago => pago.dniEstudiante === dni || pago.estudianteDni === dni);
    const estadosCerrados = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"];
    const esEstadoCerrado = (...valores: any[]) => {
      const texto = valores.map(valor => normalizarTextoApi(valor)).join(" ");
      return estadosCerrados.some(est => texto.includes(est));
    };
    const buscarPagoAsociado = (item: any) => pagosEstudiante.find(pago =>
      (item.id && pago.inscripcionId === item.id) ||
      (
        (pago.dniEstudiante || pago.estudianteDni) === item.dniEstudiante &&
        (
          (item.programaId && pago.programaId === item.programaId) ||
          normalizarTextoApi(pago.programa || pago.programaNombre) === normalizarTextoApi(item.programa)
        )
      )
    );
    const isPaid = (item: any) => {
      const pagoAsociado = buscarPagoAsociado(item);
      return esEstadoCerrado(item.estadoPago, item.estadoInscripcion, pagoAsociado?.estado, pagoAsociado?.estadoPago, pagoAsociado?.estadoVerificacion);
    };
    const enriquecerInscripcion = (item: any) => {
      const prog = (db.programas || []).find(p => p.id === item.programaId);
      return {
        ...item,
        programa: item.programa || prog?.nombre || "Sin programa",
        costo: item.costo ?? prog?.costo ?? 0,
        costoOriginal: item.costoOriginal ?? prog?.costo ?? 0
      };
    };

    const derivadas = inscripciones.filter(item => item.derivadoCaja).map(enriquecerInscripcion);
    const derivadasPendientes = derivadas.filter(item => !isPaid(item));
    const noDerivadas = inscripciones.filter(item => !item.derivadoCaja).map(enriquecerInscripcion);
    const noDerivadaspendientes = noDerivadas.filter(item => !isPaid(item));
    const todasPendientes = [...derivadasPendientes, ...noDerivadaspendientes];
    const activeInscrip = todasPendientes[0] || derivadas[0] || null;

    if (activeInscrip) {
      return {
        nombres: student.nombres,
        apellidos: student.apellidos || "",
        codigoEstudiante: student.codigoEstudiante || "",
        grado: student.grado,
        seccion: student.seccion,
        tipoAlumno: student.tipoAlumno || "Alumno interno",
        programaAsignado: activeInscrip.programaId,
        programaNombre: activeInscrip.programa,
        programaCosto: activeInscrip.costo,
        periodo: activeInscrip.periodo,
        inscripcionCaja: activeInscrip,
        inscripcionesCaja: todasPendientes,
        sinInscripcionCaja: todasPendientes.length === 0,
        requiereDerivacionCaja: false
      };
    } else {
      return {
        nombres: student.nombres,
        apellidos: student.apellidos || "",
        codigoEstudiante: student.codigoEstudiante || "",
        grado: student.grado,
        seccion: student.seccion,
        tipoAlumno: student.tipoAlumno || "Alumno interno",
        sinInscripcionCaja: true,
        requiereDerivacionCaja: inscripciones.length > 0
      };
    }
  }

  async getBandejaPagosWeb(periodo: string) {
    const db = await getDb();
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

  async validarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    if (!db.pagos[idx].nroRecibo) {
      const corr = normalizarCorrelativos(db);
      const assigned = corr.reciboActual || "REC-0501";
      db.pagos[idx].nroRecibo = assigned;
      corr.reciboActual = incrementarCorrelativo(assigned);
    }

    db.pagos[idx].estado = "validado";
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "validado";
      inscrip.estadoInscripcion = "Pago exitoso";
      inscrip.fechaPago = db.pagos[idx].validadoEn;
      inscrip.pagoObservacionCaja = observaciones || "";
      inscrip.derivadoCaja = true;
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "Pago exitoso";
    }

    await saveDb(db);

    const deseaCorreo = inscrip && (inscrip.enviarPdfCorreo || String(inscrip.origenRegistro || "").includes("enviar_correo"));
    const apoderadoEmail = inscrip && (db.estudiantes?.[inscrip.dniEstudiante]?.correoApoderado || inscrip.correo || "");

    if (deseaCorreo && apoderadoEmail) {
      const studentName = inscrip.nombresEstudiante || (db.estudiantes?.[inscrip.dniEstudiante] ? `${(db.estudiantes[inscrip.dniEstudiante] as any).nombres} ${(db.estudiantes[inscrip.dniEstudiante] as any).apellidos || ""}`.trim() : "");
      const progName = inscrip.programa || "";
      const amount = db.pagos[idx].monto || "";
      const receiptNo = db.pagos[idx].nroRecibo || "";

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

      const { asunto, html } = generarCorreoConfirmacionPago(studentName, progName, amount, receiptNo);
      enviarCorreoGenerico({
        para: apoderadoEmail,
        asunto,
        html,
        adjuntos
      }).catch(err => console.error("[MAIL EXCEPTION] No se pudo enviar el correo de confirmación de pago:", err.message));
    }

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_VALIDAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }

  async observarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    db.pagos[idx].estado = "observado";
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "observada";
      inscrip.pagoObservacionCaja = observaciones || "";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "observada";
    }

    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_OBSERVAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }

  async rechazarPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    db.pagos[idx].estado = "anulado";
    db.pagos[idx].observaciones = observaciones || "Pago rechazado por Cajera.";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "pendiente_pago";
      inscrip.pagoObservacionCaja = observaciones || "Pago rechazado por Cajera.";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "pendiente_pago";
    }

    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_RECHAZAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }

  async anularPago(operatorUsername: string, operatorRole: string, pagoId: string, observaciones: string) {
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) {
      throw new Error("Pago no encontrado.");
    }

    db.pagos[idx].estado = "anulado";
    db.pagos[idx].observaciones = observaciones || "Pago anulado por Cajera.";
    db.pagos[idx].validadoPor = operatorUsername || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "pendiente_pago";
      inscrip.pagoObservacionCaja = observaciones || "Pago anulado por Cajera.";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      (db.estudiantes[inscrip.dniEstudiante] as any).estadoInscripcion = "pendiente_pago";
    }

    await saveDb(db);

    await registrarAuditoria(operatorUsername || "Cajera", operatorRole || "caja", "PAGO_ANULAR", {
      pagoId,
      observaciones
    });

    return mapDbPaymentToApi(db.pagos[idx]);
  }

  async getCajaReporte(query: any) {
    const { periodo, tipoReporte, desde, hasta, programa, medioPago, estadoPago } = query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    const payments = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");

    let reportList: any[] = [];

    if (tipoReporte === "pagos_registrados" || tipoReporte === "pagos_realizados") {
      reportList = payments.map(p => {
        if (p.formaPago === "Egreso") {
          return {
            id: p.id,
            pagoId: p.id,
            inscripcionId: "",
            dniEstudiante: p.dniEstudiante || "",
            estudiante: p.nombresEstudiante || "Egreso de Caja",
            programaId: "",
            programa: "Egreso / Gasto",
            periodo: period,
            monto: p.monto,
            estadoPago: "pagado",
            estadoInscripcion: "",
            formaPago: "Egreso",
            numeroOperacion: p.numeroOperacion || "",
            telefonoOperacion: "",
            origen: "Cajera",
            fuente: "pago",
            fecha: p.fechaPago || p.fecha || "",
            fechaRegistro: p.fecha || "",
            fechaPago: p.fechaPago || "",
            apoderado: "",
            telefono: "",
            nroRecibo: p.nroRecibo || p.nro_recibo || "",
            grado: "",
            seccion: "",
            descuentoAprobado: false,
            descuentoTipo: "",
            descuentoMonto: 0,
            descuentoJustificacion: "",
            observaciones: p.observaciones || ""
          };
        }
        const prog = db.programas.find((progItem: any) => progItem.id === p.programaId || normalizarTextoApi(progItem.nombre) === normalizarTextoApi(p.programa));
        const student = p.dniEstudiante ? (db.estudiantes?.[p.dniEstudiante] as any) : null;
        const e = (db.inscripciones || []).find(item => item.id === p.inscripcionId || (p.dniEstudiante && item.dniEstudiante === p.dniEstudiante && item.programaId === p.programaId));
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

  async getPagoById(pagoId: string) {
    const db = await getDb();
    const p = (db.pagos || []).find(pay => pay.id === pagoId);
    if (!p) {
      throw new Error("Pago no encontrado.");
    }
    return mapDbPaymentToApi(p);
  }

  async registrarComprobante(body: any, file: Express.Multer.File | undefined) {
    const db = await getDb();
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
      monto: Number(
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

    await saveDb(db);

    await registrarAuditoria("padre", "padres", "PAGO_COMPROBANTE_SUBIR", {
      pagoId,
      inscripcionId: body.inscripcion_id,
      monto: nuevoPago.monto
    });

    return mapDbPaymentToApi(nuevoPago);
  }

  async buscarEstudiantesQuery(q: string) {
    if (!q) return [];
    const db = await getDb();
    const query = normalizarTextoApi(q);

    if (query.length < 3) {
      return [];
    }

    const results: any[] = [];
    const seenDnis = new Set<string>();

    Object.values(db.estudiantes || {}).forEach((student: any) => {
      const searchKey = normalizarTextoApi(`${student.nombres} ${student.dni}`);
      if (searchKey.includes(query)) {
        seenDnis.add(student.dni);
        results.push({
          dni: student.dni,
          nombres: student.nombres
        });
      }
    });

    return results;
  }

  async cancelarCorrelativo(operatorUsername: string, operatorRole: string, body: any) {
    const { tipo, motivo, dniEstudiante, nombresEstudiante, nroRecibo } = body;
    if (!tipo || !motivo) {
      throw new Error("Tipo y motivo son obligatorios.");
    }

    const db = await getDb();
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
        throw new Error("Tipo de correlativo no válido.");
      }
    }

    if (!val) {
      throw new Error("No se encontró un correlativo actual para este tipo.");
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

    await saveDb(db);

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
