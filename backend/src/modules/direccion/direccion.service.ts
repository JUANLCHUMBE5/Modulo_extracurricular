import { getDb, saveDb } from "../../database/dbLocal.js";
import { registrarAuditoria } from "../../services/audit.service.js";
import {
  mapDbEnrollmentToApi,
  mapDbPaymentToApi,
  mapDbProgramToApi,
  mapDbAsistenciaToApi,
  normalizarPeriodoApi,
  normalizarTextoApi,
  resolverHorarioPorGradoApi,
  resolverDocentePorGradoApi,
  obtenerGradoCompletoApi
} from "../../shared/mappers.js";

function normalizarFechaFiltro(valor: any) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (local) return `${local[3]}-${local[2]}-${local[1]}`;
  const fecha = new Date(texto);
  if (!Number.isNaN(fecha.getTime())) return fecha.toISOString().slice(0, 10);
  return texto.slice(0, 10);
}

function normalizarEstadoPago(estado: any) {
  const texto = normalizarTextoApi(estado);
  if (texto.includes("pag") || texto === "completado" || texto === "validado") return "Pagado";
  if (texto.includes("anul") || texto === "cancelado") return "Anulado";
  return "Pendiente";
}

function contarPor(items: any[], resolver: (item: any) => any) {
  const conteo = new Map<any, number>();
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

function abreviar(valor: any) {
  const texto = String(valor || "Sin nombre").trim();
  return texto.length > 20 ? `${texto.slice(0, 19)}...` : texto;
}

function obtenerPrimerValor(item: any, claves: string[]) {
  return claves.map((clave) => item?.[clave]).find(Boolean) || "";
}

export class DireccionService {
  async getReportesResumen(query: any) {
    const { periodo, anio, fechaInicio, fechaFin, programa } = query;
    const db = await getDb();

    const period = (periodo === "todos" || !periodo) ? "todos" : normalizarPeriodoApi(periodo);
    const year = anio || "todos";

    const filtrarPorPeriodo = (items: any[]) => {
      if (period === "todos") return [...items];
      return [...items].filter((item) => normalizarPeriodoApi(item.periodo || "escolar") === period);
    };

    const fechaInicioFiltro = normalizarFechaFiltro(fechaInicio);
    const fechaFinFiltro = normalizarFechaFiltro(fechaFin);

    const fechaEnRango = (valor: any) => {
      const fecha = normalizarFechaFiltro(valor);
      if (!fecha) return false;
      if (fechaInicioFiltro && fecha < fechaInicioFiltro) return false;
      if (fechaFinFiltro && fecha > fechaFinFiltro) return false;
      return true;
    };

    const rangoProgramaCruza = (item: any) => {
      if (!fechaInicioFiltro && !fechaFinFiltro) return true;
      const inicio = normalizarFechaFiltro(obtenerPrimerValor(item, ["fechaInicio", "fecha_inicio"]));
      const fin = normalizarFechaFiltro(obtenerPrimerValor(item, ["fechaFin", "fecha_fin", "fechaInicio", "fecha_inicio"]));
      if (!inicio && !fin) return false;
      const desdeItem = inicio || fin;
      const hastaItem = fin || inicio;
      if (fechaInicioFiltro && hastaItem < fechaInicioFiltro) return false;
      if (fechaFinFiltro && desdeItem > fechaFinFiltro) return false;
      return true;
    };

    const coincideProgramaFiltro = (item: any = {}) => {
      if (!programa || programa === "todos") return true;
      const filtro = normalizarTextoApi(programa);
      return String(item.programaId || item.programa_id || item.id || "") === String(programa) ||
        normalizarTextoApi(item.programa || item.programaNombre || item.nombrePrograma || item.nombre_programa || item.nombre) === filtro;
    };

    const estudiantes = db.estudiantes || {};
    const crearFilaInscripcion = (item: any) => {
      const student = estudiantes[item.dniEstudiante] || {};
      return {
        id: item.id || "",
        dni: item.dniEstudiante || "",
        estudiante: item.nombresEstudiante || "",
        grado: item.gradoEstudiante || item.grado || "",
        seccion: item.seccion || "",
        programa: item.programa || "",
        programaId: item.programaId || item.programa_id || "",
        estadoInscripcion: item.estadoInscripcion || "",
        estadoPago: normalizarEstadoPago(item.estadoPago),
        costo: Number(item.costo || 0),
        origen: item.origenRegistro || "",
        fechaRegistro: item.fechaRegistro || "",
        apoderado: item.apoderado || student.apoderado || "",
        telefono: item.telefono || student.telefonoApoderado || (student as any).telefono || "",
        costoOriginal: item.costoOriginal !== undefined ? Number(item.costoOriginal) : Number(item.costo || 0),
        descuentoAprobado: item.descuentoAprobado || false,
        descuentoTipo: item.descuentoTipo || "",
        descuentoValor: Number(item.descuentoValor || 0),
        descuentoMonto: Number(item.descuentoMonto || 0),
      };
    };

    const crearFilaPago = (item: any) => {
      const inscripcion = (db.inscripciones || []).find((ins) =>
        (item.inscripcionId && ins.id === item.inscripcionId) ||
        (item.dniEstudiante && ins.dniEstudiante === item.dniEstudiante && normalizarTextoApi(ins.programa) === normalizarTextoApi(item.programa))
      ) || null;

      return {
        id: item.id || "",
        inscripcionId: item.inscripcionId || "",
        programaId: item.programaId || inscripcion?.programaId || "",
        dni: item.dniEstudiante || item.estudianteDni || "",
        estudiante: item.nombresEstudiante || item.estudianteNombre || "",
        programa: item.programa || item.programaNombre || "",
        monto: Number(item.monto || 0),
        estado: normalizarEstadoPago(item.estado),
        estadoVerificacion: item.estadoVerificacion || "",
        medio: item.formaPago || item.medioPago || "",
        fecha: item.fechaPago || item.fecha || "",
        nroRecibo: item.nroRecibo || item.nro_recibo || "",
        observaciones: item.observaciones || "",
        descuentoAprobado: Boolean(inscripcion?.descuentoAprobado),
        descuentoTipo: inscripcion?.descuentoTipo || "",
        descuentoValor: Number(inscripcion?.descuentoValor || 0),
        descuentoMonto: Number(inscripcion?.descuentoMonto || 0),
        descuentoJustificacion: inscripcion?.descuentoJustificacion || "",
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

    const opcionesProgramas = programas.map((p) => ({
      value: p.id || p.nombre,
      label: p.nombre || "Programa sin nombre",
    }));

    if (programa && programa !== "todos") {
      programas = programas.filter(coincideProgramaFiltro);
      inscripciones = inscripciones.filter(coincideProgramaFiltro);
      pagos = pagos.filter(coincideProgramaFiltro);
    }

    if (fechaInicio || fechaFin) {
      programas = programas.filter(rangoProgramaCruza);
      inscripciones = inscripciones.filter((item) =>
        fechaEnRango(obtenerPrimerValor(item, ["fechaRegistro", "fechaInscripcion", "fecha", "creadoEn", "creado_en"]))
      );
      pagos = pagos.filter((item) =>
        fechaEnRango(obtenerPrimerValor(item, ["fechaPago", "fecha_pago", "fecha", "creadoEn", "creado_en"]))
      );
    }

    const filasProgramas = programas.map((prog) => {
      const inscripcionesPrograma = inscripciones.filter((item) =>
        item.programaId === prog.id || normalizarTextoApi(item.programa) === normalizarTextoApi(prog.nombre)
      );
      const pagosPrograma = pagos.filter((item) =>
        item.programaId === prog.id || normalizarTextoApi(item.programa || item.programaNombre) === normalizarTextoApi(prog.nombre)
      );
      const inscritos = inscripcionesPrograma.length;
      const cupos = Number(prog.cupos || 0);
      const ocupados = Math.max(Number(prog.cuposOcupados || 0), inscritos);
      const proyectado = inscripcionesPrograma.reduce((sum, item) => sum + Number(item.costo ?? prog.costo ?? 0), 0);
      const recaudado = pagosPrograma
        .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
        .reduce((sum, item) => sum + Number(item.monto || 0), 0);

      const conBeca = inscripcionesPrograma.filter((item) => item.descuentoAprobado).length;
      const porCobrar = Math.max(0, proyectado - recaudado);

      return {
        id: prog.id,
        nombre: prog.nombre || "Programa sin nombre",
        periodo: normalizarPeriodoApi(prog.periodo || "escolar"),
        estado: prog.estado || "Sin estado",
        categoria: prog.categoria || "Sin categoria",
        responsable: prog.responsable || prog.docente || prog.tutora || "Sin responsable",
        cupos,
        ocupados,
        inscritos,
        conBeca,
        costo: Number(prog.costo || 0),
        proyectado,
        recaudado,
        porCobrar,
        avance: cupos > 0 ? Math.round((ocupados / cupos) * 100) : 0,
        gradosAplicables: prog.gradosAplicables || [],
      };
    }).sort((a, b) => b.inscritos - a.inscritos);

    const totalRecaudado = pagos
      .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const totalAnulado = pagos
      .filter((item) => normalizarEstadoPago(item.estado) === "Anulado")
      .reduce((sum, item) => sum + Number(item.monto || 0), 0);
    const totalProyectado = inscripciones.reduce((sum, item) => sum + Number(item.costo || 0), 0);
    const pendientesPago = inscripciones.filter((item) => normalizarEstadoPago(item.estadoPago) !== "Pagado");
    const familias = new Set(inscripciones.map((item) => item.telefono || item.apoderado || item.dniEstudiante).filter(Boolean));

    // --- Procesamiento de Asistencia ---
    let asistencias = db.asistencias || [];
    if (programa && programa !== "todos") {
      asistencias = asistencias.filter(coincideProgramaFiltro);
    }
    if (fechaInicio || fechaFin) {
      asistencias = asistencias.filter((item) =>
        fechaEnRango(obtenerPrimerValor(item, ["fechaRegistro", "fecha_registro", "fecha", "creadoEn", "creado_en"]))
      );
    }

    const obtenerFechaPeru = (fechaStr: any) => {
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

    const hoyStr = new Date().toLocaleDateString("sv-SE");

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
            const nombreCoincide = item.programa && prog.nombre && normalizarTextoApi(item.programa) === normalizarTextoApi(prog.nombre);
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

    const inscripcionesMapeadas = inscripciones.map(crearFilaInscripcion);
    const pagosMapeados = pagos.map(crearFilaPago);
    const programasMapeados = programas.map(mapDbProgramToApi);

    const programaIdsSet = new Set(programas.map(p => p.id));
    const asistenciasFiltradas = asistencias.filter(a => programaIdsSet.has(a.programaId || ""));
    const asistenciasMapeadas = asistenciasFiltradas.map(mapDbAsistenciaToApi);

    return {
      resumen: {
        programas: programas.length,
        programasHabilitados: programas.filter((item) => item.estado === "Habilitado").length,
        inscripciones: inscripciones.length,
        familias: familias.size,
        totalRecaudado,
        totalAnulado,
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
        programas: programasMapeados,
        inscripciones: inscripcionesMapeadas,
        pagos: pagosMapeados,
        asistencias: asistenciasMapeadas,
      },
      aniosDisponibles: Array.from(new Set(
        (db.programas || []).map(p => p.fechaInicio ? String(p.fechaInicio).slice(0, 4) : "").filter(Boolean)
      )).sort((a, b) => b.localeCompare(a)),
      categorias: Array.from(new Set(
        (db.programas || []).map(p => p.categoria).filter(Boolean)
      )),
      opcionesProgramas,
    };
  }

  async buscarDescuentos(q: string) {
    if (!q) return [];
    const db = await getDb();

    const realEnrollments = (db.inscripciones || []).filter(ins => {
      if (ins.estadoInscripcion === "Anulada" || ins.estadoInscripcion === "anulada") return false;
      const dniCoincide = String(ins.dni || ins.dniEstudiante || "").includes(q);
      const nombreCoincide = String(ins.estudiante || ins.nombresEstudiante || "").toLowerCase().includes(q);
      return dniCoincide || nombreCoincide;
    });

    const mappedReal = realEnrollments.map(item => mapDbEnrollmentToApi(item, db));

    const virtualEnrollments: any[] = [];
    const programas = db.programas || [];
    programas.forEach(programa => {
      const invitados = db.invitadosPorPrograma?.[programa.id] || [];
      invitados.forEach(invitado => {
        const dni = String(invitado.dni || "").replace(/\D/g, "");
        const name = String(invitado.nombres || "").toLowerCase();
        const matchesDni = dni.includes(q);
        const matchesName = name.includes(q);

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
              telefono_apoderado: student.telefonoApoderado || (student as any).telefono || "",
              correo_apoderado: student.correoApoderado || (student as any).correo || "",
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

    return [...mappedReal, ...virtualEnrollments];
  }

  async aplicarDescuento(operatorUsername: string, operatorRole: string, body: any) {
    const { inscripcionId, tipo, valor, justificacion } = body;
    if (!inscripcionId) {
      throw new Error("Falta id de inscripcion");
    }
    if (!justificacion?.trim()) {
      throw new Error("Falta justificacion");
    }

    const db = await getDb();
    let ins: any = null;
    let index = -1;

    if (String(inscripcionId).startsWith("INV-")) {
      const parts = String(inscripcionId).split("-");
      const dni = parts[parts.length - 1];
      const progId = parts.slice(1, parts.length - 1).join("-");

      const prog = (db.programas || []).find(p => p.id === progId);
      if (!prog) {
        throw new Error("Taller no encontrado para la invitación");
      }

      const invitados = db.invitadosPorPrograma?.[progId] || [];
      const invitado = invitados.find(i => i.dni === dni);
      if (!invitado) {
        throw new Error("Invitación de estudiante no encontrada");
      }

      const student = db.estudiantes?.[dni] || {};
      const gradoEstudiante = obtenerGradoCompletoApi(invitado.grado || student.grado || "", invitado.nivelEducativo || invitado.nivel || student.nivel || "");
      const horarioResuelto = resolverHorarioPorGradoApi(prog, gradoEstudiante) || prog.horario || "";
      const docenteResuelto = resolverDocentePorGradoApi(prog, gradoEstudiante) || prog.responsable || prog.docente || "No definido";

      const newInscripcion: any = {
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
        costo: Number(prog.costo || 0),
        modalidadCobro: prog.modalidadCobro || "Unico",
        fechaInicio: prog.fechaInicio || "",
        fechaFin: prog.fechaFin || "",
        estadoInscripcion: "pendiente_pago",
        estadoPago: "pendiente",
        derivadoCaja: true,
        fechaRegistro: new Date().toISOString(),
        apoderado: student.apoderado || "",
        telefono: student.telefonoApoderado || (student as any).telefono || "",
        correo: student.correoApoderado || (student as any).correo || "",
        origenRegistro: "Dirección / Descuento",
        pagoId: null,
        costoOriginal: Number(prog.costo || 0),
        descuentoAprobado: false,
      };

      db.inscripciones = db.inscripciones || [];
      db.inscripciones.push(newInscripcion);
      index = db.inscripciones.length - 1;
      ins = db.inscripciones[index];
    } else {
      index = (db.inscripciones || []).findIndex(item => item.id === inscripcionId);
      if (index === -1) {
        throw new Error("Inscripción no encontrada");
      }
      ins = db.inscripciones[index];
    }

    const payments = db.pagos || [];
    const pagoAsociado = payments.find(pay => pay.inscripcionId === ins.id) ||
      payments.find(pay => pay.dniEstudiante === ins.dniEstudiante && (pay.programaId === ins.programaId || normalizarTextoApi(pay.programa) === normalizarTextoApi(ins.programa)));

    if (pagoAsociado) {
      const estPago = normalizarTextoApi(pagoAsociado.estado);
      if (["completado", "validado", "pagado"].includes(estPago)) {
        throw new Error("No se puede aplicar descuento a una inscripción que ya ha sido pagada.");
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

    await registrarAuditoria(operatorUsername, operatorRole, "DESCUENTO_APLICAR", {
      inscripcionId,
      tipo,
      valor,
      nuevoCosto
    });

    return mapDbEnrollmentToApi(db.inscripciones[index], db);
  }

  async removerDescuento(operatorUsername: string, operatorRole: string, inscripcionId: string) {
    const db = await getDb();
    const index = (db.inscripciones || []).findIndex(ins => ins.id === inscripcionId);
    if (index === -1) {
      throw new Error("Inscripción no encontrada");
    }

    const ins = db.inscripciones[index];
    const costoOriginal = Number(ins.costoOriginal ?? ins.costo ?? 0);

    db.inscripciones[index] = {
      ...ins,
      costo: costoOriginal,
      costoOriginal: costoOriginal,
      descuentoMonto: undefined,
      descuentoTipo: undefined,
      descuentoValor: undefined,
      descuentoJustificacion: undefined,
      descuentoAprobado: false,
      descuentoAprobadoPor: undefined,
      descuentoFechaAprobacion: undefined,
    };

    await saveDb(db);

    await registrarAuditoria(operatorUsername, operatorRole, "DESCUENTO_REMOVER", {
      inscripcionId
    });

    return mapDbEnrollmentToApi(db.inscripciones[index], db);
  }

  async getCorrelativos() {
    const db = await getDb();
    const c = (db.correlativos || {}) as any;

    if (c.reciboInicio === undefined) c.reciboInicio = c.recibo || "REC-0500";
    if (c.reciboActual === undefined) c.reciboActual = c.recibo || "REC-0500";
    if (c.reciboActive === undefined) c.reciboActive = true;
    if (c.reciboVirtualInicio === undefined) c.reciboVirtualInicio = c.reciboVirtual || "V-1000";
    if (c.reciboVirtualActual === undefined) c.reciboVirtualActual = c.reciboVirtual || "V-1000";
    if (c.reciboVirtualActive === undefined) c.reciboVirtualActive = true;
    if (c.egresoInicio === undefined) c.egresoInicio = c.egreso || "EGR-0200";
    if (c.egresoActual === undefined) c.egresoActual = c.egreso || "EGR-0200";
    if (c.egresoActive === undefined) c.egresoActive = true;

    return {
      reciboInicio: c.reciboInicio,
      reciboActual: c.reciboActual,
      reciboActive: c.reciboActive !== false,
      reciboVirtualInicio: c.reciboVirtualInicio,
      reciboVirtualActual: c.reciboVirtualActual,
      reciboVirtualActive: c.reciboVirtualActive !== false,
      egresoInicio: c.egresoInicio,
      egresoActual: c.egresoActual,
      egresoActive: c.egresoActive !== false
    };
  }

  async updateCorrelativos(correlativos: any) {
    const db = await getDb();
    const actuales = (db.correlativos || {}) as any;

    if (actuales.reciboInicio === undefined) actuales.reciboInicio = actuales.recibo || "REC-0500";
    if (actuales.reciboActual === undefined) actuales.reciboActual = actuales.recibo || "REC-0500";
    if (actuales.reciboVirtualInicio === undefined) actuales.reciboVirtualInicio = actuales.reciboVirtual || "V-1000";
    if (actuales.reciboVirtualActual === undefined) actuales.reciboVirtualActual = actuales.reciboVirtual || "V-1000";
    if (actuales.egresoInicio === undefined) actuales.egresoInicio = actuales.egreso || "EGR-0200";
    if (actuales.egresoActual === undefined) actuales.egresoActual = actuales.egreso || "EGR-0200";

    const resolverValor = (nuevoValor: any, valorAnterior: any) => {
      if (nuevoValor === undefined) return valorAnterior || "";
      return String(nuevoValor).trim();
    };

    const reciboInicio = resolverValor(correlativos.reciboInicio, actuales.reciboInicio);
    const reciboActual = resolverValor(correlativos.reciboActual, actuales.reciboActual);
    const reciboVirtualInicio = resolverValor(correlativos.reciboVirtualInicio, actuales.reciboVirtualInicio);
    const reciboVirtualActual = resolverValor(correlativos.reciboVirtualActual, actuales.reciboVirtualActual);
    const egresoInicio = resolverValor(correlativos.egresoInicio, actuales.egresoInicio);
    const egresoActual = resolverValor(correlativos.egresoActual, actuales.egresoActual);

    db.correlativos = {
      reciboInicio,
      reciboActual,
      reciboActive: correlativos.reciboActive !== false,
      reciboVirtualInicio,
      reciboVirtualActual,
      reciboVirtualActive: correlativos.reciboVirtualActive !== false,
      egresoInicio,
      egresoActual,
      egresoActive: correlativos.egresoActive !== false
    };

    await saveDb(db);
    return true;
  }
}
