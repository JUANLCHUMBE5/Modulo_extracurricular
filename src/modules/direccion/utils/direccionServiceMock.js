import { apiDb, syncApiDb, saveApiDb } from "../../../services/dbApi";
import { normalizarFecha, formatearFechaPeru } from "../../../services/dateService";
import { adaptarInscripcion } from "../../../services/adapters";

const esperar = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Métodos de Ayuda de Normalización y Conteo ---
function filtrarPorPeriodo(items, periodo) {
  if (periodo === "todos") return [...items];
  return [...items].filter((item) => normalizarPeriodo(item.periodo || "escolar") === periodo);
}

function normalizarPeriodo(periodo) {
  const texto = String(periodo || "").toLowerCase();
  if (texto.includes("verano")) return "verano";
  if (texto.includes("todos") || texto.includes("ambos")) return "todos";
  return "escolar";
}

function normalizarEstadoPago(estado) {
  const texto = String(estado || "").toLowerCase();
  if (texto.includes("pag") || texto === "completado") return "Pagado";
  if (texto.includes("anul") || texto === "cancelado") return "Anulado";
  return "Pendiente";
}

function contarPor(items, resolver) {
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
}

function normalizarTexto(valor) {
  return String(valor || "").trim().toLowerCase();
}

function abreviar(valor) {
  const texto = String(valor || "Sin nombre").trim();
  return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
}

function crearFilaInscripcion(item) {
  return {
    id: item.id || "",
    dni: item.dniEstudiante || "",
    estudiante: item.nombresEstudiante || "",
    grado: item.gradoEstudiante || item.grado || "",
    seccion: item.seccionEstudiante || item.seccion || "",
    programa: item.programa || "",
    estadoInscripcion: item.estadoInscripcion || "",
    estadoPago: normalizarEstadoPago(item.estadoPago),
    costo: Number(item.costo || 0),
    costoOriginal: Number(item.costoOriginal ?? item.costo ?? 0),
    origen: item.origenRegistro || "",
    fechaRegistro: item.fechaRegistro || "",
    apoderado: item.apoderado || "",
    telefono: item.telefono || "",
    descuentoAprobado: !!item.descuentoAprobado,
    descuentoTipo: item.descuentoTipo || "",
    descuentoValor: Number(item.descuentoValor || 0),
    descuentoMonto: Number(item.descuentoMonto || 0),
    descuentoJustificacion: item.descuentoJustificacion || "",
  };
}

function crearFilaPago(item) {
  return {
    id: item.id || "",
    dni: item.dniEstudiante || item.estudianteDni || "",
    estudiante: item.nombresEstudiante || item.estudianteNombre || "",
    programa: item.programa || item.programaNombre || "",
    monto: Number(item.monto || 0),
    estado: normalizarEstadoPago(item.estado),
    medio: item.formaPago || item.medioPago || "",
    fecha: item.fechaPago || item.fecha || "",
    nroRecibo: item.nroRecibo || "",
    observaciones: item.observaciones || "",
  };
}

// --- Métodos Mock Principales ---

export async function obtenerPanelDireccionMock(filtros = {}) {
  await esperar();
  await syncApiDb();

  const periodo = normalizarPeriodo(filtros.periodo || "todos");
  const anio = filtros.anio || "todos";

  let programas = filtrarPorPeriodo(apiDb.programas || [], periodo);
  let inscripciones = filtrarPorPeriodo(apiDb.inscripciones || [], periodo)
    .filter((item) => item.estadoInscripcion !== "Anulada");
  let pagos = filtrarPorPeriodo(apiDb.pagos || [], periodo);

  if (anio !== "todos") {
    programas = programas.filter(p => {
      const date = p.fechaInicio || p.fechaFin;
      if (!date) return false;
      return String(date).slice(0, 4) === String(anio);
    });
    const programaIdsInYear = new Set(programas.map(p => p.id));
    inscripciones = inscripciones.filter(ins => programaIdsInYear.has(ins.programaId));
    pagos = pagos.filter(p => programaIdsInYear.has(p.programaId));
  }

  const filasProgramas = programas.map((programa) => {
    const inscripcionesPrograma = inscripciones.filter((item) =>
      item.programaId === programa.id || normalizarTexto(item.programa) === normalizarTexto(programa.nombre)
    );
    const pagosPrograma = pagos.filter((item) =>
      item.programaId === programa.id || normalizarTexto(item.programa || item.programaNombre) === normalizarTexto(programa.nombre)
    );
    const inscritos = inscripcionesPrograma.length;
    const cupos = Number(programa.cupos || programa.cuposDisponibles || 0);
    const ocupados = Math.max(Number(programa.cuposOcupados || 0), inscritos);
    const proyectado = inscripcionesPrograma.reduce((sum, item) => sum + Number(item.costo ?? programa.costo ?? 0), 0);
    const recaudado = pagosPrograma
      .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);

    const conBeca = inscripcionesPrograma.filter((item) => item.descuentoAprobado).length;
    const porCobrar = Math.max(0, proyectado - recaudado);

    return {
      id: programa.id,
      nombre: programa.nombre || "Programa sin nombre",
      periodo: normalizarPeriodo(programa.periodo || "escolar"),
      estado: programa.estado || "Sin estado",
      categoria: programa.categoria || "Sin categoria",
      responsable: programa.responsable || programa.docente || programa.tutora || "Sin responsable",
      cupos,
      ocupados,
      inscritos,
      conBeca,
      costo: Number(programa.costo || 0),
      proyectado,
      recaudado,
      porCobrar,
      avance: cupos > 0 ? Math.round((ocupados / cupos) * 100) : 0,
      gradosAplicables: programa.gradosAplicables || [],
    };
  }).sort((a, b) => b.inscritos - a.inscritos);

  const totalRecaudado = pagos
    .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
    .reduce((sum, item) => sum + Number(item.monto || 0), 0);
  const totalProyectado = inscripciones.reduce((sum, item) => sum + Number(item.costo || 0), 0);
  const pendientesPago = inscripciones.filter((item) => normalizarEstadoPago(item.estadoPago) !== "Pagado");
  const familias = new Set(inscripciones.map((item) => item.telefono || item.apoderado || item.dniEstudiante).filter(Boolean));

  // --- Procesamiento de Asistencia ---
  const asistencias = apiDb.asistencias || [];

  const obtenerFechaPeru = (fechaStr) => {
    if (!fechaStr) return "";
    const str = String(fechaStr);
    if (str.includes("T") || str.length > 10) {
      try {
        const d = new Date(str);
        const dPeru = new Date(d.getTime() - 5 * 60 * 60 * 1000);
        return dPeru.toISOString().slice(0, 10);
      } catch {
        return str.slice(0, 10);
      }
    }
    return str.slice(0, 10);
  };

  const hoyStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD local

  const asistenciasHoy = asistencias.filter(item => {
    if (!item.fechaRegistro) return false;
    return obtenerFechaPeru(item.fechaRegistro) === hoyStr;
  });

  const asistidosHoyUnicos = new Set(
    asistenciasHoy.map(item => item.dniEstudiante || item.codigoEstudiante || item.nombresEstudiante).filter(Boolean)
  ).size;

  const asistenciaPorPrograma = filasProgramas.slice(0, 8).map((prog) => {
    const asistidosHoy = new Set(
      asistenciasHoy
        .filter(item => {
          const idCoincide = item.programaId && prog.id && String(item.programaId) === String(prog.id);
          const nombreCoincide = item.programa && prog.nombre && normalizarTexto(item.programa) === normalizarTexto(prog.nombre);
          return idCoincide || nombreCoincide;
        })
        .map(item => item.dniEstudiante || item.codigoEstudiante || item.nombresEstudiante).filter(Boolean)
    ).size;

    return {
      programa: abreviar(prog.nombre),
      matriculados: prog.inscritos,
      asistidos: asistidosHoy,
    };
  });

  const ultimosIngresos = [...asistencias]
    .sort((a, b) => new Date(b.fechaRegistro || 0).getTime() - new Date(a.fechaRegistro || 0).getTime())
    .slice(0, 15)
    .map(item => {
      let horaFormateada = "—";
      if (item.fechaRegistro) {
        try {
          const date = new Date(item.fechaRegistro);
          horaFormateada = date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: true });
        } catch {
          horaFormateada = String(item.fechaRegistro).slice(11, 16);
        }
      }
      return {
        id: item.id || "",
        hora: horaFormateada,
        estudiante: item.nombresEstudiante || "Estudiante",
        dni: item.dniEstudiante || "",
        programa: item.programa || "Sin programa",
        estadoPago: item.estadoPago || "Pendiente",
        estadoAcceso: item.estadoAcceso || "no_registrado",
        observacion: item.observacion || "",
      };
    });

  return {
    resumen: {
      programas: programas.length,
      programasHabilitados: programas.filter((item) => item.estado === "Habilitado").length,
      inscripciones: inscripciones.length,
      familias: familias.size,
      totalRecaudado,
      totalProyectado,
      totalPendiente: pendientesPago.reduce((sum, item) => sum + Number(item.costo || 0), 0),
      cupos: filasProgramas.reduce((sum, item) => sum + Number(item.cupos || 0), 0),
      ocupados: filasProgramas.reduce((sum, item) => sum + Number(item.ocupados || 0), 0),
      asistidosHoy: asistidosHoyUnicos,
    },
    filasProgramas,
    ultimosIngresos,
    graficos: {
      inscripcionesPorPrograma: filasProgramas.slice(0, 8).map((item) => ({
        programa: abreviar(item.nombre),
        inscripciones: item.inscritos,
      })),
      ingresosPorPrograma: filasProgramas.slice(0, 8).map((item) => ({
        programa: abreviar(item.nombre),
        proyectado: item.proyectado,
        recaudado: item.recaudado,
      })),
      estadoPago: contarPor(inscripciones, (item) => normalizarEstadoPago(item.estadoPago)),
      origen: contarPor(inscripciones, (item) => item.origenRegistro || "Sin origen"),
      asistenciaPorPrograma,
    },
    reportes: {
      programas: filasProgramas,
      inscripciones: inscripciones.map(crearFilaInscripcion),
      pagos: pagos.map(crearFilaPago),
    },
    aniosDisponibles: Array.from(new Set(
      (apiDb.programas || []).map(p => p.fechaInicio ? String(p.fechaInicio).slice(0, 4) : "").filter(Boolean)
    )).sort((a, b) => b.localeCompare(a)),
    categorias: Array.from(new Set(
      (apiDb.programas || []).map(p => p.categoria).filter(Boolean)
    ))
  };
}

export async function buscarInscripcionesParaDescuentoMock(busqueda) {
  await esperar(200);
  await syncApiDb();
  const term = String(busqueda || "").toLowerCase().trim();
  if (!term) return [];

  const realEnrollments = (apiDb.inscripciones || []).filter(ins => {
    if (ins.estadoInscripcion === "Anulada" || ins.estadoInscripcion === "anulada") return false;
    const dniCoincide = String(ins.dni || ins.dniEstudiante || "").includes(term);
    const nombreCoincide = String(ins.estudiante || ins.nombresEstudiante || "").toLowerCase().includes(term);
    return dniCoincide || nombreCoincide;
  });

  const virtualEnrollments = [];
  const programas = apiDb.programas || [];
  programas.forEach(programa => {
    const invitados = apiDb.invitadosPorPrograma?.[programa.id] || [];
    invitados.forEach(invitado => {
      const dni = String(invitado.dni || "").replace(/\D/g, "");
      const name = String(invitado.nombres || "").toLowerCase();
      const matchesDni = dni.includes(term);
      const matchesName = name.includes(term);

      if (matchesDni || matchesName) {
        const existeReal = (apiDb.inscripciones || []).some(ins =>
          ins.dniEstudiante === invitado.dni &&
          ins.programaId === programa.id &&
          ins.estadoInscripcion !== "Anulada" &&
          ins.estadoInscripcion !== "anulada"
        );

        if (!existeReal) {
          const student = apiDb.estudiantes?.[invitado.dni] || {};
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

  return [
    ...realEnrollments.map(adaptarInscripcion),
    ...virtualEnrollments.map(adaptarInscripcion)
  ];
}

export async function aplicarDescuentoInscripcionMock(inscripcionId, datosDescuento) {
  await esperar(300);
  await syncApiDb();

  let ins = null;
  let index = -1;

  if (String(inscripcionId).startsWith("INV-")) {
    const parts = String(inscripcionId).split("-");
    const dni = parts[parts.length - 1];
    const progId = parts.slice(1, parts.length - 1).join("-");

    const prog = (apiDb.programas || []).find(p => p.id === progId);
    if (!prog) throw new Error("Taller no encontrado para la invitación");

    const invitados = apiDb.invitadosPorPrograma?.[progId] || [];
    const invitado = invitados.find(i => i.dni === dni);
    if (!invitado) throw new Error("Invitación de estudiante no encontrada");

    const student = apiDb.estudiantes?.[dni] || {};

    const newInscripcion = {
      id: "INS-" + Date.now(),
      dniEstudiante: dni,
      codigoEstudiante: student.codigoEstudiante || invitado.codigoEstudiante || "",
      nombresEstudiante: invitado.nombres,
      gradoEstudiante: invitado.grado || student.grado || "",
      seccion: invitado.seccion || student.seccion || "",
      programaId: progId,
      programa: prog.nombre,
      categoria: prog.categoria || "",
      costo: prog.costo || 0,
      estadoInscripcion: "pendiente_pago", // Pre-inscrito
      estadoPago: "pendiente",
      derivadoCaja: true, // Manda a caja
      fechaRegistro: new Date().toISOString(),
      apoderado: student.apoderado || "",
      telefono: student.telefonoApoderado || student.telefono || "",
      correo: student.correoApoderado || student.correo || "",
      origenRegistro: "Dirección / Descuento"
    };

    apiDb.inscripciones = apiDb.inscripciones || [];
    apiDb.inscripciones.push(newInscripcion);
    index = apiDb.inscripciones.length - 1;
    ins = apiDb.inscripciones[index];
  } else {
    index = (apiDb.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
    if (index === -1) throw new Error("Inscripción no encontrada");
    ins = apiDb.inscripciones[index];
  }

  // Validar si ya está pagado
  const payments = apiDb.pagos || [];
  const pagoAsociado = payments.find(pay => pay.inscripcionId === ins.id) || payments.find(pay => pay.dniEstudiante === ins.dniEstudiante && (pay.programaId === ins.programaId || String(pay.programa || "").toLowerCase() === String(ins.programa || "").toLowerCase()));
  if (pagoAsociado && ["completado", "validado", "pagado"].includes(String(pagoAsociado.estado).toLowerCase())) {
    throw new Error("No se puede aplicar descuento a una inscripción que ya ha sido pagada.");
  }

  const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);
  let descuentoMonto = 0;
  let nuevoCosto = costoOriginal;

  if (datosDescuento.tipo === "beca") {
    descuentoMonto = costoOriginal;
    nuevoCosto = 0;
  } else if (datosDescuento.tipo === "porcentaje") {
    const pct = Number(datosDescuento.valor || 0);
    descuentoMonto = Math.round((costoOriginal * pct) / 100);
    nuevoCosto = Math.max(0, costoOriginal - descuentoMonto);
  } else if (datosDescuento.tipo === "monto") {
    descuentoMonto = Number(datosDescuento.valor || 0);
    nuevoCosto = Math.max(0, costoOriginal - descuentoMonto);
  }

  apiDb.inscripciones[index] = {
    ...ins,
    costo: nuevoCosto,
    costoOriginal,
    descuentoMonto,
    descuentoTipo: datosDescuento.tipo,
    descuentoValor: Number(datosDescuento.valor || 0),
    descuentoJustificacion: datosDescuento.justificacion || "",
    descuentoAprobado: true,
    descuentoAprobadoPor: "Dirección",
    descuentoFechaAprobacion: new Date().toISOString(),
    derivadoCaja: true
  };

  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));
  return adaptarInscripcion(apiDb.inscripciones[index]);
}

export async function removerDescuentoInscripcionMock(inscripcionId) {
  await esperar(200);
  await syncApiDb();
  const index = (apiDb.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
  if (index === -1) throw new Error("Inscripción no encontrada");

  const ins = apiDb.inscripciones[index];
  const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);

  apiDb.inscripciones[index] = {
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

  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));
  return adaptarInscripcion(apiDb.inscripciones[index]);
}

export async function obtenerCorrelativosMock() {
  await syncApiDb();
  return apiDb.correlativos || { recibo: "", egreso: "" };
}

export async function guardarCorrelativosMock({ recibo, egreso }) {
  await syncApiDb();
  apiDb.correlativos = {
    recibo: String(recibo || "").trim(),
    egreso: String(egreso || "").trim()
  };
  await saveApiDb();
  window.dispatchEvent(new Event("mock-db-updated"));
  return apiDb.correlativos;
}
