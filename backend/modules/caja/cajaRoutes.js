import express from "express";
import multer from "multer";
import { getDb, saveDb } from "../../dbLocal.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { registrarAuditoria } from "../../audit.js";
import { MAX_FILE_SIZE } from "../../fileService.js";
import {
  mapDbPaymentToApi,
  mapDbEnrollmentToApi,
  normalizarPeriodoApi,
  normalizarTextoApi
} from "../../mappers.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fieldSize: 5 * 1024 * 1024 },
});

// Helper functions for payments and reports
function incrementarCorrelativo(valor) {
  if (!valor) return "";
  const match = String(valor).match(/^(.*?)(\d+)$/);
  if (!match) return valor;
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = Number(numStr) + 1;
  const paddedNum = String(nextNum).padStart(numStr.length, "0");
  return prefix + paddedNum;
}

function calcularSiguienteRecibo(startValue, existingNros) {
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

function normalizarCorrelativos(db) {
  if (!db.correlativos) {
    db.correlativos = {};
  }
  const c = db.correlativos;
  
  // Legacy migration
  if (c.recibo !== undefined && c.reciboInicio === undefined) {
    c.reciboInicio = c.recibo;
    const existingNros = (db.pagos || []).map(p => p.nroRecibo || p.nro_recibo || "").filter(Boolean);
    c.reciboActual = calcularSiguienteRecibo(c.recibo, existingNros);
    delete c.recibo;
  }
  if (c.reciboVirtual !== undefined && c.reciboVirtualInicio === undefined) {
    c.reciboVirtualInicio = c.reciboVirtual;
    const existingNros = (db.pagos || []).map(p => p.nroRecibo || p.nro_recibo || "").filter(Boolean);
    c.reciboVirtualActual = calcularSiguienteRecibo(c.reciboVirtual, existingNros);
    delete c.reciboVirtual;
  }
  if (c.egreso !== undefined && c.egresoInicio === undefined) {
    c.egresoInicio = c.egreso;
    c.egresoActual = c.egreso;
    delete c.egreso;
  }

  // Ensure fields are defined with defaults
  if (c.reciboInicio === undefined) c.reciboInicio = "REC-0500";
  if (c.reciboActual === undefined) c.reciboActual = "REC-0501";
  if (c.reciboVirtualInicio === undefined) c.reciboVirtualInicio = "V-1000";
  if (c.reciboVirtualActual === undefined) c.reciboVirtualActual = "V-1001";
  if (c.egresoInicio === undefined) c.egresoInicio = "EGR-0200";
  if (c.egresoActual === undefined) c.egresoActual = "EGR-0201";

  return c;
}

function normalizarEstadoPagoReporteCaja(pago = null, inscripcion = null) {
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

function pagoPerteneceAInscripcionReporte(pay = {}, item = {}) {
  if (pay.inscripcionId && item.id) return pay.inscripcionId === item.id;
  if (pay.inscripcionId && item.inscripcionId) return pay.inscripcionId === item.inscripcionId;
  if (pay.dniEstudiante !== item.dniEstudiante) return false;
  if (pay.programaId && item.programaId) return pay.programaId === item.programaId;
  return normalizarTextoApi(pay.programa) === normalizarTextoApi(item.programa);
}

// Legacy payments listing
router.get("/api/pagos", async (_req, res) => {
  try {
    const db = await getDb();
    res.json(db.pagos || []);
  } catch {
    res.status(500).json({ message: "No se pudieron listar los pagos." });
  }
});

// Caja: List payments by period
router.get("/api/v1/extracurricular/pagos", requireRole(["caja"]), async (req, res) => {
  try {
    const { periodo, estudianteDni } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);
    let filtered = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    if (estudianteDni) {
      filtered = filtered.filter(p => p.dniEstudiante === estudianteDni || p.estudianteDni === estudianteDni);
    }
    res.json({ success: true, data: filtered.map(mapDbPaymentToApi) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Register new payment
router.post("/api/v1/extracurricular/pagos", requireRole(["caja"]), async (req, res) => {
  try {
    const db = await getDb();
    const body = req.body;

    const inscripcion_id = body.inscripcion_id || body.inscripcionId || "";
    const monto = body.monto !== undefined ? body.monto : (body.monto_pago !== undefined ? body.monto_pago : 0);
    const forma_pago = body.forma_pago || body.metodo_pago || body.formaPago || "Efectivo";
    const numero_operacion = body.numero_operacion || body.numeroOperacion || "";
    const telefono_operacion = body.telefono_operacion || body.telefonoOperacion || "";
    const fecha_pago = body.fecha_pago || body.fechaPago || body.fecha || new Date().toISOString();
    const usuario_registro = body.usuario_registro || body.origen_registro || "Cajera";
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
                  ? Math.max(0, Number(inscrip.costoOriginal ?? (db.programas.find(p => p.id === inscrip.programaId)?.costo ?? 0)) - Number(inscrip.descuentoMonto || 0))
                  : Number(inscrip.costoOriginal ?? (db.programas.find(p => p.id === inscrip.programaId)?.costo ?? 0))
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
      db.estudiantes[dni_estudiante].estadoInscripcion = "confirmada";
    }

    await saveDb(db);

    await registrarAuditoria(usuario_registro || "Cajera", "caja", "PAGO_REGISTRAR", {
      pagoId,
      inscripcionId: inscripcion_id,
      monto: nuevoPago.monto
    });

    res.json({ success: true, data: mapDbPaymentToApi(nuevoPago) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja/Padres: Edit payment
router.put("/api/v1/extracurricular/pagos/:pagoId", requireRole(["caja", "padres"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const db = await getDb();
    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });

    const updated = {
      ...db.pagos[idx],
      monto: Number(req.body.monto || db.pagos[idx].monto),
      formaPago: req.body.formaPago || db.pagos[idx].formaPago,
      numeroOperacion: req.body.numeroOperacion || db.pagos[idx].numeroOperacion,
      telefonoOperacion: req.body.telefonoOperacion || db.pagos[idx].telefonoOperacion,
      fechaPago: req.body.fechaPago || db.pagos[idx].fechaPago,
      nroRecibo: req.body.nroRecibo !== undefined ? req.body.nroRecibo : (req.body.nro_recibo !== undefined ? req.body.nro_recibo : db.pagos[idx].nroRecibo)
    };
    db.pagos[idx] = updated;

    const inscrip = (db.inscripciones || []).find(item => item.id === updated.inscripcionId);
    if (inscrip) {
      inscrip.fechaPago = updated.fechaPago;
    }

    await saveDb(db);
    res.json({ success: true, data: mapDbPaymentToApi(updated) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: General financial summary
router.get("/api/v1/extracurricular/caja/resumen", requireRole(["caja"]), async (req, res) => {
  try {
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    const pagosCompletados = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && ["completado", "validado"].includes(p.estado));
    const pagosIngresos = pagosCompletados.filter(p => p.formaPago !== "Egreso");
    const pagosEgresos = pagosCompletados.filter(p => p.formaPago === "Egreso");

    const totalIngreso = pagosIngresos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalEgreso = pagosEgresos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const totalCobrado = totalIngreso - totalEgreso; // Net balance

    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const paidInscripIds = new Set(pagosIngresos.map(p => p.inscripcionId));
    const pendingInscrip = enrollments.filter(e => !paidInscripIds.has(e.id));
    const totalPendiente = pendingInscrip.reduce((sum, e) => sum + Number(e.costo || 0), 0);

    res.json({
      success: true,
      data: {
        totalCobrado,
        totalIngreso,
        totalEgreso,
        totalPendiente,
        transacciones: pagosIngresos.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Register new expense/egreso
router.post("/api/v1/extracurricular/caja/egresos", requireRole(["caja"]), async (req, res) => {
  try {
    const db = await getDb();
    const body = req.body;

    const corr = normalizarCorrelativos(db);
    if (corr.egresoActive === false) {
      return res.status(400).json({ success: false, message: "La serie de recibo de egreso está inactiva en el sistema." });
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
      nroRecibo: assignedNroRecibo,
      periodo: body.periodo || db.configuracion_actual?.periodo || "escolar",
      fecha: body.fecha || new Date().toISOString(),
      fechaPago: body.fecha || new Date().toISOString(),
      estado: "completado",
      origenRegistro: "Caja",
      observaciones: body.concepto || "Egreso registrado"
    };

    db.pagos.push(nuevoEgreso);
    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "EGRESO_REGISTRAR", {
      pagoId: nuevoEgreso.id,
      monto: nuevoEgreso.monto,
      beneficiario: nuevoEgreso.nombresEstudiante
    });

    res.json({ success: true, data: nuevoEgreso });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Retrieve active student inscription for payment processing
router.get("/api/v1/extracurricular/caja/estudiantes/:dni", requireRole(["caja"]), async (req, res) => {
  try {
    const { dni } = req.params;
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    const student = db.estudiantes?.[dni];
    if (!student) return res.json({ success: true, data: null });

    const inscripciones = (db.inscripciones || []).filter(item => item.dniEstudiante === dni && normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");
    const pagosEstudiante = (db.pagos || []).filter(pago => pago.dniEstudiante === dni || pago.estudianteDni === dni);
    const estadosCerrados = ["pagado", "completado", "validado", "pago validado", "pago exitoso", "exitoso"];
    const esEstadoCerrado = (...valores) => {
      const texto = valores.map(valor => normalizarTextoApi(valor)).join(" ");
      return estadosCerrados.some(est => texto.includes(est));
    };
    const buscarPagoAsociado = (item) => pagosEstudiante.find(pago =>
      (item.id && pago.inscripcionId === item.id) ||
      (
        (pago.dniEstudiante || pago.estudianteDni) === item.dniEstudiante &&
        (
          (item.programaId && pago.programaId === item.programaId) ||
          normalizarTextoApi(pago.programa || pago.programaNombre) === normalizarTextoApi(item.programa)
        )
      )
    );
    const isPaid = (item) => {
      const pagoAsociado = buscarPagoAsociado(item);
      return esEstadoCerrado(item.estadoPago, item.estadoInscripcion, pagoAsociado?.estado, pagoAsociado?.estadoPago, pagoAsociado?.estadoVerificacion);
    };
    const enriquecerInscripcion = (item) => {
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
    const activeInscrip = derivadasPendientes[0] || derivadas[0] || null;

    if (activeInscrip) {
      res.json({
        success: true,
        data: {
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
          inscripcionesCaja: derivadasPendientes,
          sinInscripcionCaja: derivadasPendientes.length === 0,
          requiereDerivacionCaja: false
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          nombres: student.nombres,
          apellidos: student.apellidos || "",
          codigoEstudiante: student.codigoEstudiante || "",
          grado: student.grado,
          seccion: student.seccion,
          tipoAlumno: student.tipoAlumno || "Alumno interno",
          sinInscripcionCaja: true,
          requiereDerivacionCaja: inscripciones.length > 0
        }
      });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Web payments queue (Yape/Transfers pending validation)
router.get("/api/v1/extracurricular/caja/bandeja-pagos-web", requireRole(["caja"]), async (req, res) => {
  try {
    const { periodo } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    const list = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period && (p.estado === "Por Verificar" || p.estado === "pendiente"));

    const dataList = list.map(p => {
      const student = db.estudiantes?.[p.dniEstudiante];
      return {
        ...mapDbPaymentToApi(p),
        estudiante: student ? `${student.nombres} ${student.apellidos || ""}`.trim() : p.nombresEstudiante || "",
        dniEstudiante: p.dniEstudiante,
        programa: p.programa
      };
    });

    res.json({ success: true, data: dataList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Validate / Approve web payment
router.put("/api/v1/extracurricular/pagos/:pagoId/validar", requireRole(["caja"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const { observaciones } = req.body;
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });

    if (!db.pagos[idx].nroRecibo) {
      const corr = normalizarCorrelativos(db);
      const assigned = corr.reciboActual || "REC-0501";
      db.pagos[idx].nroRecibo = assigned;
      corr.reciboActual = incrementarCorrelativo(assigned);
    }

    db.pagos[idx].estado = "validado";
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = req.user?.username || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "validado";
      inscrip.estadoInscripcion = "Pago exitoso";
      inscrip.fechaPago = db.pagos[idx].validadoEn;
      inscrip.pagoObservacionCaja = observaciones || "";
      // Al aprobar un pago web, marcar como derivadoCaja para que figure como ingreso en el reporte de Caja
      inscrip.derivadoCaja = true;
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      db.estudiantes[inscrip.dniEstudiante].estadoInscripcion = "Pago exitoso";
    }

    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "PAGO_VALIDAR", {
      pagoId,
      observaciones
    });

    res.json({ success: true, data: mapDbPaymentToApi(db.pagos[idx]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Observe web payment
router.put("/api/v1/extracurricular/pagos/:pagoId/observar", requireRole(["caja"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const { observaciones } = req.body;
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });

    db.pagos[idx].estado = "observado";
    db.pagos[idx].observaciones = observaciones || "";
    db.pagos[idx].validadoPor = req.user?.username || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "observada";
      inscrip.pagoObservacionCaja = observaciones || "";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      db.estudiantes[inscrip.dniEstudiante].estadoInscripcion = "observada";
    }

    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "PAGO_OBSERVAR", {
      pagoId,
      observaciones
    });

    res.json({ success: true, data: mapDbPaymentToApi(db.pagos[idx]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Reject payment
router.put("/api/v1/extracurricular/pagos/:pagoId/rechazar", requireRole(["caja"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const { observaciones } = req.body;
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });

    db.pagos[idx].estado = "anulado";
    db.pagos[idx].observaciones = observaciones || "Pago rechazado por Cajera.";
    db.pagos[idx].validadoPor = req.user?.username || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "pendiente_pago";
      inscrip.pagoObservacionCaja = observaciones || "Pago rechazado por Cajera.";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      db.estudiantes[inscrip.dniEstudiante].estadoInscripcion = "pendiente_pago";
    }

    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "PAGO_RECHAZAR", {
      pagoId,
      observaciones
    });

    res.json({ success: true, data: mapDbPaymentToApi(db.pagos[idx]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja/Direccion: Annul payment with justification/reason
router.put("/api/v1/extracurricular/pagos/:pagoId/anular", requireRole(["caja", "direccion"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const { observaciones } = req.body;
    const db = await getDb();

    const idx = (db.pagos || []).findIndex(p => p.id === pagoId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Pago no encontrado." });

    db.pagos[idx].estado = "anulado";
    db.pagos[idx].observaciones = observaciones || "Pago anulado por Cajera.";
    db.pagos[idx].validadoPor = req.user?.username || "Cajera";
    db.pagos[idx].validadoEn = new Date().toISOString();

    const inscrip = (db.inscripciones || []).find(item => item.id === db.pagos[idx].inscripcionId);
    if (inscrip) {
      inscrip.estadoPago = "pendiente";
      inscrip.estadoInscripcion = "pendiente_pago";
      inscrip.pagoObservacionCaja = observaciones || "Pago anulado por Cajera.";
    }

    if (inscrip && db.estudiantes?.[inscrip.dniEstudiante]) {
      db.estudiantes[inscrip.dniEstudiante].estadoInscripcion = "pendiente_pago";
    }

    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "PAGO_ANULAR", {
      pagoId,
      observaciones
    });

    res.json({ success: true, data: mapDbPaymentToApi(db.pagos[idx]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja/Direccion: Consolidated payment and enrollment report
router.get("/api/v1/extracurricular/caja/reporte", requireRole(["caja", "direccion"]), async (req, res) => {
  try {
    const { periodo, tipoReporte, desde, hasta, programa, medioPago, estadoPago } = req.query;
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    const payments = (db.pagos || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    const enrollments = (db.inscripciones || []).filter(item => normalizarPeriodoApi(item.periodo) === period && item.estadoInscripcion !== "Anulada");

    let reportList = [];

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
        const prog = db.programas.find(progItem => progItem.id === p.programaId || normalizarTextoApi(progItem.nombre) === normalizarTextoApi(p.programa));
        const student = db.estudiantes?.[p.dniEstudiante];
        const e = (db.inscripciones || []).find(item => item.id === p.inscripcionId || (item.dniEstudiante === p.dniEstudiante && item.programaId === p.programaId));
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
          descuentoJustificacion: e ? (e.descuentoJustificacion || "") : "",
          observaciones: p.observaciones || p.observacion || p.pagoObservacionCaja || ""
        };
      });
    } else {
      reportList = enrollments.map(e => {
        const p = payments.find(pay => pagoPerteneceAInscripcionReporte(pay, e));
        const prog = db.programas.find(progItem => progItem.id === e.programaId);
        const student = db.estudiantes?.[e.dniEstudiante];

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
      if (tipoReporte === "becas_descuentos") {
        const esBecaODescuento = row.descuentoAprobado || ["beca", "descuento"].includes(String(row.formaPago).toLowerCase());
        if (!esBecaODescuento) return false;
      }

      return true;
    });

    res.json({ success: true, data: finalReport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja/Padres: Get payment details by ID
router.get("/api/v1/extracurricular/pagos/:pagoId", requireRole(["caja", "padres"]), async (req, res) => {
  try {
    const { pagoId } = req.params;
    const db = await getDb();
    const p = (db.pagos || []).find(pay => pay.id === pagoId);
    if (!p) return res.status(404).json({ success: false, message: "Pago no encontrado." });
    res.json({ success: true, data: mapDbPaymentToApi(p) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Padres: Upload payment slip
router.post("/api/v1/extracurricular/pagos/comprobante", requireRole(["padres"]), upload.single("archivo"), async (req, res) => {
  try {
    const db = await getDb();
    let base64Image = "";
    if (req.file) {
      base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    if (!base64Image) {
      base64Image = req.body.comprobante_base64 || "";
    }

    const inscrip = (db.inscripciones || []).find(item => item.id === req.body.inscripcion_id);
    if (!inscrip) {
      return res.status(404).json({ success: false, message: "No se encontro la inscripcion para registrar el pago." });
    }

    const pagoId = `PAG-${String(Date.now()).slice(-6)}`;
    const nuevoPago = {
      id: pagoId,
      inscripcionId: req.body.inscripcion_id || "",
      dniEstudiante: req.body.dni_estudiante || inscrip.dniEstudiante || "",
      nombresEstudiante: inscrip.nombresEstudiante || "",
      programaId: inscrip.programaId || "",
      programa: req.body.nombre_programa || inscrip.programa || "",
      periodo: req.body.periodo || inscrip.periodo || "escolar",
      monto: Number(
        req.body.monto_pago ||
        (inscrip.costo !== undefined
          ? inscrip.costo
          : (inscrip.descuentoAprobado
              ? Math.max(0, Number(inscrip.costoOriginal ?? (db.programas.find(p => p.id === inscrip.programaId)?.costo ?? 0)) - Number(inscrip.descuentoMonto || 0))
              : Number(inscrip.costoOriginal ?? (db.programas.find(p => p.id === inscrip.programaId)?.costo ?? 0))
            )
        ) ||
        0
      ),
      formaPago: req.body.metodo_pago || "Yape",
      numeroOperacion: req.body.numero_operacion || req.body.referencia || "",
      telefonoOperacion: req.body.telefono_operacion || req.body.telefono || "",
      capturaPagoNombre: req.body.comprobante_nombre || "",
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
      inscripcionId: req.body.inscripcion_id,
      monto: nuevoPago.monto
    });

    res.json({ success: true, data: mapDbPaymentToApi(nuevoPago) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Search students by DNI or Name
router.get("/api/v1/extracurricular/caja/estudiantes/buscar/query", requireRole(["caja"]), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const db = await getDb();
    const query = normalizarTextoApi(q);

    if (query.length < 3) return res.json({ success: true, data: [] });

    const results = [];
    const seenDnis = new Set();

    Object.values(db.estudiantes || {}).forEach(student => {
      const searchKey = normalizarTextoApi(`${student.nombres} ${student.dni}`);
      if (searchKey.includes(query)) {
        seenDnis.add(student.dni);
        results.push({
          dni: student.dni,
          nombres: student.nombres
        });
      }
    });

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Caja: Cancel and skip a correlativo (Receipt or Egreso)
router.post("/api/v1/extracurricular/caja/correlativos/cancelar", requireRole(["caja"]), async (req, res) => {
  try {
    const { tipo, motivo, dniEstudiante, nombresEstudiante, nroRecibo } = req.body;
    if (!tipo || !motivo) {
      return res.status(400).json({ success: false, message: "Tipo y motivo son obligatorios." });
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
        return res.status(400).json({ success: false, message: "Tipo de correlativo no válido." });
      }
    }

    if (!val) {
      return res.status(400).json({ success: false, message: "No se encontró un correlativo actual para este tipo." });
    }

    // Registrar en pagos para dejar constancia/auditoría del recibo anulado
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
      nroRecibo: val,
      estado: "anulado",
      fecha: new Date().toISOString(),
      fechaPago: new Date().toISOString(),
      origenRegistro: "Caja",
      validadoPor: req.user?.username || "Cajera",
      validadoEn: new Date().toISOString(),
      observaciones: `Correlativo cancelado/anulado por Cajera. Motivo: ${motivo}`
    };

    db.pagos = db.pagos || [];
    db.pagos.push(nuevoPagoAnulado);

    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Cajera", req.user?.role || "caja", "CORRELATIVO_CANCELAR", {
      tipo,
      comprobante: val,
      motivo,
      dniEstudiante: dniEstudiante || "ANULADO",
      nombresEstudiante: nombresEstudiante || ""
    });

    res.json({
      success: true,
      message: `Correlativo ${val} cancelado correctamente. El siguiente es ${tipo === "recibo" ? corr.reciboActual : (tipo === "reciboVirtual" ? corr.reciboVirtualActual : corr.egresoActual)}`,
      data: {
        comprobanteAnulado: val,
        siguienteComprobante: tipo === "recibo" ? corr.reciboActual : (tipo === "reciboVirtual" ? corr.reciboVirtualActual : corr.egresoActual)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
