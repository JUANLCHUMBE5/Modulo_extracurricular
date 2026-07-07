import { apiDb as apiDbRaw } from "../../../services/dbApi";
const apiDb = apiDbRaw as any;
import { fechaActualIso } from "../../../services/dateService";
import {
  normalizarPeriodo,
  normalizarTexto,
  normalizarEstadoPago,
} from "../cajaServiceUtils";

export function calcularSiguienteRecibo(startValue: any, existingNros: any[]) {
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

export function enriquecerPagoConProgramaCaja(pago: any = {}, programasVigentes: any = null) {
  const inscripcion = (apiDb.inscripciones || []).find((item: any) =>
    (pago.inscripcionId && item.id === pago.inscripcionId) ||
    (
      item.dniEstudiante === (pago.dniEstudiante || pago.estudianteDni) &&
      (
        (pago.programaId && item.programaId === pago.programaId) ||
        normalizarTexto(item.programa) === normalizarTexto(pago.programa || pago.programaNombre)
      )
    )
  );
  const programa = resolverProgramaVigenteCaja(
    {
      programaId: pago.programaId || inscripcion?.programaId,
      programa: pago.programa || pago.programaNombre || inscripcion?.programa,
      periodo: pago.periodo,
    },
    programasVigentes
  );

  return {
    ...pago,
    programaId: pago.programaId || inscripcion?.programaId || programa?.id || "",
    programa: pago.programa || pago.programaNombre || inscripcion?.programa || programa?.nombre || "",
    programaNombre: pago.programaNombre || pago.programa || inscripcion?.programa || programa?.nombre || "",
    programaFechaInicio: programa?.fechaInicio || inscripcion?.fechaInicio || "",
    programaFechaFin: programa?.fechaFin || inscripcion?.fechaFin || "",
    estadoPrograma: programa?.estado || "",
    nombresEstudiante: pago.nombresEstudiante || inscripcion?.nombresEstudiante || "",
  };
}

export function resolverProgramaVigenteCaja(registro: any = {}, programasVigentes: any) {
  const catalogo = programasVigentes || obtenerProgramasVigentesCaja(normalizarPeriodo(registro.periodo));
  const porId = catalogo.porId || new Map();
  const porNombre = catalogo.porNombre || new Map();
  const id = registro.programaId || registro.programaAsignado || "";
  const nombre = registro.programa || registro.programaNombre || "";

  return porId.get(id) || porNombre.get(normalizarTexto(nombre)) || null;
}

export function coincideProgramaFiltroCaja(registro: any = {}, programaId = "todos", programasVigentes: any) {
  if (!programaId || programaId === "todos") return true;
  const programa = resolverProgramaVigenteCaja(registro, programasVigentes);
  return programa?.id === programaId;
}

export function obtenerInscripcionesCaja(periodoNormalizado: string) {
  return [...(apiDb.inscripciones || [])]
    .filter((inscripcion: any) =>
      normalizarPeriodo(inscripcion.periodo || periodoNormalizado) === periodoNormalizado &&
      inscripcion.estadoInscripcion !== "Anulada"
    );
}

export function crearFilaPago(pago: any, programasVigentes: any = null) {
  if (pago.formaPago === "Egreso") {
    return {
      id: pago.id,
      pagoId: pago.id,
      inscripcionId: "",
      dniEstudiante: pago.dniEstudiante || "",
      estudiante: pago.nombresEstudiante || "Egreso de Caja",
      programaId: "",
      programa: "Egreso / Gasto",
      periodo: normalizarPeriodo(pago.periodo),
      monto: Number(pago.monto || 0),
      estadoPago: "pagado",
      estadoInscripcion: "",
      formaPago: "Egreso",
      numeroOperacion: pago.numeroOperacion || "",
      telefonoOperacion: "",
      origen: "Cajera",
      fuente: "pago",
      fecha: pago.fechaPago || pago.fecha || "",
      fechaRegistro: "",
      fechaPago: pago.fechaPago || pago.fecha || "",
      apoderado: "",
      telefono: "",
      nroRecibo: pago.nroRecibo || pago.nro_recibo || "",
      grado: "",
      seccion: "",
      descuentoAprobado: false,
      descuentoTipo: "",
      descuentoMonto: 0,
      observaciones: pago.observaciones || "",
    };
  }

  const program = resolverProgramaVigenteCaja(pago, programasVigentes || obtenerProgramasVigentesCaja(normalizarPeriodo(pago.periodo)));
  if (!program) return null;

  const inscripcion = (apiDb.inscripciones || []).find((ins: any) => ins.id === pago.inscripcionId) || null;
  const estudiante = apiDb.estudiantes?.[pago.dniEstudiante || pago.estudianteDni] || null;
  const esWebReserva = inscripcion ? (inscripcion.derivadoCaja || inscripcion.estadoCaja === "reservado_caja" || String(inscripcion.estadoInscripcion).toLowerCase().includes("reserva")) : false;

  const formaPago = esWebReserva
    ? `Reserva / Web / ${pago.formaPago || pago.medioPago || "Efectivo"}`
    : (pago.formaPago || pago.medioPago || "Sin medio");

  return {
    id: pago.id,
    pagoId: pago.id,
    inscripcionId: pago.inscripcionId || "",
    dniEstudiante: pago.dniEstudiante || pago.estudianteDni || "",
    estudiante: estudiante ? `${estudiante.nombres || ""} ${estudiante.apellidos || ""}`.trim() : pago.nombresEstudiante || pago.estudianteNombre || "Sin nombre",
    programaId: program.id,
    programa: program.nombre || pago.programa || pago.programaNombre || "",
    periodo: normalizarPeriodo(pago.periodo),
    monto: Number(pago.monto || 0),
    estadoPago: normalizarEstadoPago(pago.estado),
    estadoInscripcion: "",
    formaPago,
    numeroOperacion: pago.numeroOperacion || pago.referenciaPago || "",
    telefonoOperacion: pago.telefonoOperacion || "",
    origen: esWebReserva ? "Portal padres" : "Cajera",
    fuente: "pago",
    fecha: pago.fechaPago || pago.fecha || "",
    fechaRegistro: "",
    fechaPago: pago.fechaPago || pago.fecha || "",
    apoderado: pago.apoderado || "",
    telefono: pago.telefono || "",
    nroRecibo: pago.nroRecibo || pago.nro_recibo || "",
    grado: inscripcion ? (inscripcion.gradoEstudiante || inscripcion.grado || (estudiante ? estudiante.grado : "")) : (estudiante ? estudiante.grado : ""),
    seccion: inscripcion ? (inscripcion.seccion || inscripcion.seccionEstudiante || (estudiante ? estudiante.seccion : "")) : (estudiante ? estudiante.seccion : ""),
    descuentoAprobado: inscripcion ? (inscripcion.descuentoAprobado || false) : false,
    descuentoTipo: inscripcion ? (inscripcion.descuentoTipo || "") : "",
    descuentoMonto: inscripcion ? (inscripcion.descuentoMonto || 0) : 0,
    costoOriginal: inscripcion ? (inscripcion.costoOriginal ?? program.costo ?? 0) : (program.costo ?? 0),
    descuentoJustificacion: inscripcion ? (inscripcion.descuentoJustificacion || "") : "",
    observaciones: pago.observaciones || pago.observacion || (inscripcion ? inscripcion.pagoObservacionCaja : "") || "",
  };
}

export function encontrarPagoInscripcion(inscripcion: any, pagos: any[]) {
  return pagos.find((pago) => pago.inscripcionId && pago.inscripcionId === inscripcion.id)
    || pagos.find((pago) =>
      (pago.dniEstudiante || pago.estudianteDni) === inscripcion.dniEstudiante &&
      (pago.programaId === inscripcion.programaId ||
        normalizarTexto(pago.programa || pago.programaNombre) === normalizarTexto(inscripcion.programa))
    )
    || null;
}

export function encontrarPagoActivoDuplicado(datosPago: any = {}) {
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const inscripcionId = datosPago.inscripcionId || "";
  const dniEstudiante = datosPago.dniEstudiante || datosPago.estudianteDni || "";
  const programaId = datosPago.programaId || "";
  const programaNombre = normalizarTexto(datosPago.programa || datosPago.programaNombre);

  return pagos.find((pago: any) => {
    const estado = normalizarEstadoPago(pago.estado || pago.estadoPago || pago.estadoVerificacion);
    if (["observado", "anulado"].includes(estado)) return false;
    if (inscripcionId && pago.inscripcionId === inscripcionId) return true;

    const mismoDni = (pago.dniEstudiante || pago.estudianteDni) === dniEstudiante;
    if (!mismoDni) return false;
    if (programaId && pago.programaId === programaId) return true;
    return programaNombre && normalizarTexto(pago.programa || pago.programaNombre) === programaNombre;
  }) || null;
}

export function sincronizarPagoConInscripcion(pago: any) {
  if (!Array.isArray(apiDb.inscripciones)) return;

  const index = apiDb.inscripciones.findIndex((inscripcion: any) =>
    (pago.inscripcionId && inscripcion.id === pago.inscripcionId) ||
    (
      inscripcion.dniEstudiante === (pago.dniEstudiante || pago.estudianteDni) &&
      (
        inscripcion.programaId === pago.programaId ||
        normalizarTexto(inscripcion.programa) === normalizarTexto(pago.programa || pago.programaNombre)
      )
    )
  );

  if (index === -1) return;

  const estadoPago = pago.estado === "completado"
    ? "Pagado"
    : pago.estado === "cancelado"
    ? "Anulado"
    : "Pendiente";

  apiDb.inscripciones[index] = {
    ...apiDb.inscripciones[index],
    estadoPago,
    estadoInscripcion: estadoPago === "Pagado" ? "Pago validado" : apiDb.inscripciones[index].estadoInscripcion,
    pagoId: pago.id,
    fechaPago: pago.fechaPago || pago.fecha,
  };
}

export function incrementarCorrelativo(valor: any) {
  if (!valor) return "";
  const match = String(valor).match(/^(.*?)(\d+)$/);
  if (!match) return valor;
  const prefix = match[1];
  const numStr = match[2];
  const nextNum = Number(numStr) + 1;
  const paddedNum = String(nextNum).padStart(numStr.length, "0");
  return prefix + paddedNum;
}

export function generarPagoId() {
  const pagos = Array.isArray(apiDb.pagos) ? apiDb.pagos : [];
  const usados = new Set(pagos.map((pago: any) => String(pago.id || "")));
  let id = `PAG-${Date.now().toString().slice(-8)}`;
  while (usados.has(id)) {
    id = `PAG-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90) + 10}`;
  }
  return id;
}

export function crearEstudianteDesdeInscripcion(inscripcion: any) {
  if (!inscripcion) return null;

  return {
    dni: inscripcion.dniEstudiante || "",
    codigoEstudiante: inscripcion.codigoEstudiante || "",
    nombres: inscripcion.nombresEstudiante || "",
    apellidos: "",
    grado: inscripcion.gradoEstudiante || inscripcion.grado || "",
    seccion: inscripcion.seccionEstudiante || inscripcion.seccion || "",
    tipoAlumno: inscripcion.tipoAlumno || "",
    apoderado: inscripcion.apoderado || "",
    telefonoApoderado: inscripcion.telefono || "",
    correoApoderado: inscripcion.correo || "",
    estadoInscripcion: inscripcion.estadoInscripcion || "Pendiente de pago",
  };
}

export function obtenerProgramasVigentesCaja(periodoNormalizado = "escolar") {
  const porId = new Map();
  const porNombre = new Map();
  const items: any[] = [];

  [...(Array.isArray(apiDb.programas) ? apiDb.programas : [])]
    .filter((programa: any) => normalizarPeriodo(programa.periodo || periodoNormalizado) === periodoNormalizado)
    .filter((programa: any) => !["eliminado"].includes(normalizarTexto(programa.estado)))
    .forEach((programa: any) => {
      if (!programa?.id) return;

      const nombreKey = normalizarTexto(programa.nombre);
      if (nombreKey && porNombre.has(nombreKey)) return;

      const item = {
        ...programa,
        nombre: programa.nombre || "Sin programa",
      };
      items.push(item);
      porId.set(item.id, item);
      if (nombreKey) porNombre.set(nombreKey, item);
    });

  return { items, porId, porNombre };
}
