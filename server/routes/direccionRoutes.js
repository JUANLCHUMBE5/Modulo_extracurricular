import express from "express";
import { getDb, saveDb } from "../localDb.js";
import { requireRole } from "../middleware/auth.js";
import { registrarAuditoria } from "../audit.js";
import {
  mapDbEnrollmentToApi,
  mapDbPaymentToApi,
  mapDbProgramToApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi
} from "../apiMappers.js";

const router = express.Router();

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

// --- REPORTE CONSOLIDADO ---
router.get("/reportes/resumen", requireRole(["direccion"]), async (req, res) => {
  try {
    const { periodo, anio } = req.query;
    const db = await getDb();

    const period = normalizarPeriodoApi(periodo || "todos");
    const year = anio || "todos";

    const filtrarPorPeriodo = (items) => {
      if (period === "todos") return [...items];
      return [...items].filter((item) => normalizarPeriodoApi(item.periodo || "escolar") === period);
    };

    const normalizarEstadoPago = (estado) => {
      const texto = normalizarTextoApi(estado);
      if (texto.includes("pag") || texto === "completado" || texto === "validado") return "Pagado";
      if (texto.includes("anul") || texto === "cancelado") return "Anulado";
      return "Pendiente";
    };

    const contarPor = (items, resolver) => {
      const conteo = new Map();
      items.forEach((item) => {
        const key = resolver(item) || "Sin dato";
        conteo.set(key, (conteo.get(key) || 0) + 1);
      });
      const colores = ["teal.6", "orange.6", "blue.6", "grape.6", "yellow.6", "red.6"];
      return [...conteo.entries()].map(([name, value], index) => ({
        name,
        value,
        color: colores[index % colores.length],
      }));
    };

    const abreviar = (valor) => {
      const texto = String(valor || "Sin nombre").trim();
      return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
    };

    const crearFilaInscripcion = (item) => {
      return {
        id: item.id || "",
        dni: item.dniEstudiante || "",
        estudiante: item.nombresEstudiante || "",
        grado: item.gradoEstudiante || item.grado || "",
        seccion: item.seccion || "",
        programa: item.programa || "",
        programaId: item.programaId || "",
        estadoInscripcion: item.estadoInscripcion || "",
        estadoPago: normalizarEstadoPago(item.estadoPago),
        costo: Number(item.costo || 0),
        origen: item.origenRegistro || "",
        fechaRegistro: item.fechaRegistro || "",
        apoderado: item.apoderado || "",
        telefono: item.telefono || "",
        costoOriginal: item.costoOriginal !== undefined ? Number(item.costoOriginal) : Number(item.costo || 0),
        descuentoAprobado: item.descuentoAprobado || false,
        descuentoTipo: item.descuentoTipo || "",
        descuentoValor: Number(item.descuentoValor || 0),
        descuentoMonto: Number(item.descuentoMonto || 0),
      };
    };

    const crearFilaPago = (item) => {
      return {
        id: item.id || "",
        dni: item.dniEstudiante || item.estudianteDni || "",
        estudiante: item.nombresEstudiante || item.estudianteNombre || "",
        programa: item.programa || item.programaNombre || "",
        monto: Number(item.monto || 0),
        estado: normalizarEstadoPago(item.estado),
        medio: item.formaPago || item.medioPago || "",
        fecha: item.fechaPago || item.fecha || "",
        nroRecibo: item.nroRecibo || item.nro_recibo || "",
        observaciones: item.observaciones || "",
      };
    };

    let programas = filtrarPorPeriodo(db.programas || []);
    let inscripciones = filtrarPorPeriodo(db.inscripciones || [])
      .filter((item) => item.estadoInscripcion !== "Anulada" && item.estadoInscripcion !== "anulada");
    let pagos = filtrarPorPeriodo(db.pagos || []);

    if (year !== "todos") {
      programas = programas.filter(p => {
        const date = p.fechaInicio || p.fechaFin;
        if (!date) return false;
        return String(date).slice(0, 4) === String(year);
      });
      const programaIdsInYear = new Set(programas.map(p => p.id));
      inscripciones = inscripciones.filter(ins => programaIdsInYear.has(ins.programaId));
      pagos = pagos.filter(p => programaIdsInYear.has(p.programaId));
    }

    const inscripcionesMapeadas = inscripciones.map(crearFilaInscripcion);
    const pagosMapeados = pagos.map(crearFilaPago);
    const programasMapeados = programas.map(mapDbProgramToApi);

    const totalRecaudado = pagos
      .filter((p) => ["completado", "validado", "pagado"].includes(normalizarTextoApi(p.estado)))
      .reduce((sum, p) => sum + Number(p.monto || 0), 0);

    const totalBecas = inscripciones
      .filter((ins) => ins.descuentoAprobado)
      .reduce((sum, ins) => sum + Number(ins.descuentoMonto || 0), 0);

    const totalEsperado = inscripciones.reduce((sum, ins) => sum + Number(ins.costo || 0), 0);
    const totalPorCobrar = Math.max(0, totalEsperado - totalRecaudado);

    const totalTalleres = programas.length;
    const totalMatriculados = inscripciones.length;

    const matriculasPorGrado = contarPor(inscripciones, (item) => item.gradoEstudiante || item.grado);
    const matriculasPorTaller = contarPor(inscripciones, (item) => abreviar(item.programa));
    const estadoPagos = contarPor(inscripciones, (item) => normalizarEstadoPago(item.estadoPago));

    res.json({
      success: true,
      data: {
        totalRecaudado,
        totalBecas,
        totalPorCobrar,
        totalTalleres,
        totalMatriculados,
        graficos: {
          matriculasPorGrado,
          matriculasPorTaller,
          estadoPagos,
        },
        reportes: {
          inscripciones: inscripcionesMapeadas,
          pagos: pagosMapeados,
          programas: programasMapeados,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- ENDPOINTS PARA DESCUENTOS Y BECAS ---
router.get("/direccion/descuentos/buscar", requireRole(["direccion"]), async (req, res) => {
  try {
    const { q } = req.query;
    const db = await getDb();
    const term = String(q || "").toLowerCase().trim();
    if (!term) return res.json({ success: true, data: [] });

    const realEnrollments = (db.inscripciones || []).filter(ins => {
      if (ins.estadoInscripcion === "Anulada" || ins.estadoInscripcion === "anulada") return false;
      const dniCoincide = String(ins.dni || ins.dniEstudiante || "").includes(term);
      const nombreCoincide = String(ins.estudiante || ins.nombresEstudiante || "").toLowerCase().includes(term);
      return dniCoincide || nombreCoincide;
    });

    const mappedReal = realEnrollments.map(item => mapDbEnrollmentToApi(item, db));

    const virtualEnrollments = [];
    const programas = db.programas || [];
    programas.forEach(programa => {
      const invitados = db.invitadosPorPrograma?.[programa.id] || [];
      invitados.forEach(invitado => {
        const dni = String(invitado.dni || "").replace(/\D/g, "");
        const name = String(invitado.nombres || "").toLowerCase();
        const matchesDni = dni.includes(term);
        const matchesName = name.includes(term);

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
              origen_inscripcion: "Invitación",
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
              telefono_apoderado: student.telefonoApoderado || student.telefono || "",
              correo_apoderado: student.correoApoderado || student.correo || "",
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

    res.json({
      success: true,
      data: [
        ...mappedReal,
        ...virtualEnrollments
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/direccion/descuentos/aplicar", requireRole(["direccion"]), async (req, res) => {
  try {
    const { inscripcionId, tipo, valor, justificacion } = req.body;
    if (!inscripcionId) return res.status(400).json({ success: false, message: "Falta id de inscripcion" });
    if (!justificacion?.trim()) return res.status(400).json({ success: false, message: "Falta justificacion" });

    const db = await getDb();
    let ins = null;
    let index = -1;
    if (String(inscripcionId).startsWith("INV-")) {
      const parts = String(inscripcionId).split("-");
      const dni = parts[parts.length - 1];
      const progId = parts.slice(1, parts.length - 1).join("-");

      const prog = (db.programas || []).find(p => p.id === progId);
      if (!prog) return res.status(404).json({ success: false, message: "Taller no encontrado para la invitación" });

      const invitados = db.invitadosPorPrograma?.[progId] || [];
      const invitado = invitados.find(i => i.dni === dni);
      if (!invitado) return res.status(404).json({ success: false, message: "Invitación de estudiante no encontrada" });

      const student = db.estudiantes?.[dni] || {};
      const gradoEstudiante = invitado.grado || student.grado || "";
      const horarioResuelto = resolverHorarioPorGradoApi(prog, gradoEstudiante) || prog.horario || "";
      const docenteResuelto = resolverDocentePorGradoApi(prog, gradoEstudiante) || prog.responsable || prog.docente || "No definido";

      const newInscripcion = {
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
        costo: prog.costo || 0,
        modalidadCobro: prog.modalidadCobro || "Unico",
        fechaInicio: prog.fechaInicio || "",
        fechaFin: prog.fechaFin || "",
        estadoInscripcion: "pendiente_pago",
        estadoPago: "pendiente",
        derivadoCaja: true,
        fechaRegistro: new Date().toISOString(),
        apoderado: student.apoderado || "",
        telefono: student.telefonoApoderado || student.telefono || "",
        correo: student.correoApoderado || student.correo || "",
        origenRegistro: "Dirección / Descuento"
      };

      db.inscripciones = db.inscripciones || [];
      db.inscripciones.push(newInscripcion);
      index = db.inscripciones.length - 1;
      ins = db.inscripciones[index];
    } else {
      index = (db.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
      if (index === -1) return res.status(404).json({ success: false, message: "Inscripción no encontrada" });
      ins = db.inscripciones[index];
    }

    const payments = db.pagos || [];
    const pagoAsociado = payments.find(pay => pay.inscripcionId === ins.id) || payments.find(pay => pay.dniEstudiante === ins.dniEstudiante && (pay.programaId === ins.programaId || normalizarTextoApi(pay.programa) === normalizarTextoApi(ins.programa)));
    if (pagoAsociado) {
      const estPago = normalizarTextoApi(pagoAsociado.estado);
      if (["completado", "validado", "pagado"].includes(estPago)) {
        return res.status(400).json({ success: false, message: "No se puede aplicar descuento a una inscripción que ya ha sido pagada." });
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
      descuentoAprobadoPor: "Dirección",
      descuentoFechaAprobacion: new Date().toISOString(),
    };

    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Direccion", req.user?.role || "direccion", "DESCUENTO_APLICAR", {
      inscripcionId,
      tipo,
      valor,
      nuevoCosto
    });

    res.json({
      success: true,
      data: mapDbEnrollmentToApi(db.inscripciones[index], db)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/direccion/descuentos/remover/:inscripcionId", requireRole(["direccion"]), async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const db = await getDb();
    const index = (db.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
    if (index === -1) return res.status(404).json({ success: false, message: "Inscripción no encontrada" });

    const ins = db.inscripciones[index];
    const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);

    db.inscripciones[index] = {
      ...ins,
      costo: costoOriginal,
      costoOriginal: undefined,
      descuentoMonto: undefined,
      descuentoTipo: undefined,
      descuentoValor: undefined,
      descuentoJustificacion: undefined,
      descuentoAprobado: false,
      descuentoAprobadoPor: undefined,
      descuentoFechaAprobacion: undefined,
    };

    await saveDb(db);

    await registrarAuditoria(req.user?.username || "Direccion", req.user?.role || "direccion", "DESCUENTO_REMOVER", {
      inscripcionId
    });

    res.json({
      success: true,
      data: mapDbEnrollmentToApi(db.inscripciones[index], db)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- CORRELATIVOS ---
router.get("/direccion/correlativos", requireRole(["direccion", "caja"]), async (req, res) => {
  try {
    const db = await getDb();
    const corr = db.correlativos || { recibo: "", egreso: "" };
    if (corr.reciboVirtual === undefined) {
      corr.reciboVirtual = "V-0001";
    }

    const existingNros = (db.pagos || []).map(p => p.nroRecibo || p.nro_recibo || "").filter(Boolean);
    const reciboSiguiente = calcularSiguienteRecibo(corr.recibo, existingNros);
    const reciboVirtualSiguiente = calcularSiguienteRecibo(corr.reciboVirtual, existingNros);

    res.json({
      success: true,
      data: {
        ...corr,
        reciboSiguiente,
        reciboVirtualSiguiente
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/direccion/correlativos", requireRole(["direccion"]), async (req, res) => {
  try {
    const { recibo, reciboVirtual, egreso } = req.body;
    const db = await getDb();
    db.correlativos = {
      recibo: String(recibo || "").trim(),
      reciboVirtual: String(reciboVirtual || "").trim(),
      egreso: String(egreso || "").trim()
    };
    await saveDb(db);
    res.json({ success: true, message: "Correlativos actualizados correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
