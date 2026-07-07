import { apiDb as apiDbRaw, saveApiDb, syncApiDb } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;
import { fechaActualIso } from "../../../services/dateService";
import { normalizarPeriodo } from "../cajaServiceUtils";
import { incrementarCorrelativo } from "./cajaServiceMockHelpers";

const esperar = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function cancelarCorrelativoCajaMock(tipo: string, motivo: string, dniEstudiante = "", nombresEstudiante = "", nroRecibo = "") {
  await esperar(300);
  await syncApiDb();

  if (!apiDb.correlativos) apiDb.correlativos = {};
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  let val = "";
  if (nroRecibo) {
    val = String(nroRecibo).trim();
    if (tipo === "recibo" && val === apiDb.correlativos.reciboActual) {
      apiDb.correlativos.reciboActual = incrementarCorrelativo(val);
    } else if (tipo === "reciboVirtual" && val === apiDb.correlativos.reciboVirtualActual) {
      apiDb.correlativos.reciboVirtualActual = incrementarCorrelativo(val);
    } else if (tipo === "egreso" && val === apiDb.correlativos.egresoActual) {
      apiDb.correlativos.egresoActual = incrementarCorrelativo(val);
    }
  } else {
    if (tipo === "recibo") {
      val = apiDb.correlativos.reciboActual || "REC-0001";
      apiDb.correlativos.reciboActual = incrementarCorrelativo(val);
    } else if (tipo === "reciboVirtual") {
      val = apiDb.correlativos.reciboVirtualActual || "V-0001";
      apiDb.correlativos.reciboVirtualActual = incrementarCorrelativo(val);
    } else if (tipo === "egreso") {
      val = apiDb.correlativos.egresoActual || "EGR-0001";
      apiDb.correlativos.egresoActual = incrementarCorrelativo(val);
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
    nroRecibo: val,
    estado: "anulado",
    fecha: fechaActualIso(),
    fechaPago: fechaActualIso(),
    origenRegistro: "Caja",
    observaciones: `Correlativo cancelado/anulado por Cajera. Motivo: ${motivo}`,
    createdAt: fechaActualIso(),
  };

  apiDb.pagos.push(nuevoPagoAnulado);
  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));

  return nuevoPagoAnulado;
}

export async function registrarEgresoMock(datosEgreso: any) {
  await esperar(400);
  await syncApiDb();

  if (!apiDb.correlativos) apiDb.correlativos = {};
  if (!Array.isArray(apiDb.pagos)) apiDb.pagos = [];

  const nroRecibo = apiDb.correlativos.egresoActual || apiDb.correlativos.egreso || "EGR-0001";
  apiDb.correlativos.egresoActual = incrementarCorrelativo(nroRecibo);

  const nuevoEgreso = {
    id: `PAG-EGR-${String(Date.now()).slice(-6)}`,
    inscripcionId: null,
    dniEstudiante: datosEgreso.dni || "",
    nombresEstudiante: datosEgreso.beneficiario || "Egreso de Caja",
    programa: "",
    programaId: "",
    monto: Number(datosEgreso.monto || 0),
    formaPago: "Egreso",
    nroRecibo: nroRecibo,
    periodo: normalizarPeriodo(datosEgreso.periodo || "escolar"),
    fecha: datosEgreso.fecha || fechaActualIso(),
    fechaPago: datosEgreso.fecha || fechaActualIso(),
    estado: "completado",
    origenRegistro: "Caja",
    observaciones: datosEgreso.concepto || "Egreso registrado",
    createdAt: fechaActualIso()
  };

  apiDb.pagos.push(nuevoEgreso);
  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));

  return nuevoEgreso;
}
