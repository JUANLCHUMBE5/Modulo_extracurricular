import { DireccionRepository } from "../repositories/direccion.repository.js";
import {
  mapDbProgramToApi,
  mapDbAsistenciaToApi,
  normalizarPeriodoApi,
  normalizarTextoApi
} from "../../../common/shared/mappers.js";
import {
  crearAsistenciaPorPrograma,
  crearFilaInscripcionReporte,
  crearFilaPagoReporte,
  crearFilaProgramaResumen,
  crearUltimosIngresos,
  obtenerFechaPeru
} from "../helpers/report-builders.helpers.js";
import {
  abreviar,
  contarPor,
  normalizarEstadoPago,
  normalizarFechaFiltro,
  obtenerPrimerValor
} from "../helpers/report.helpers.js";

const direccionRepository = new DireccionRepository();

export class DireccionReportService {
  async getReportesResumen(query: any) {
    const { periodo, anio, fechaInicio, fechaFin, programa } = query;
    const db = await direccionRepository.getDb();

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

    let programas = filtrarPorPeriodo(db.programas || []).filter(p => p.estado !== "Archivado");
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

    const filasProgramas = programas
      .map((prog) => crearFilaProgramaResumen(prog, inscripciones, pagos))
      .sort((a, b) => b.inscritos - a.inscritos);

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

    const hoyStr = new Date().toLocaleDateString("sv-SE");

    const asistenciasHoy = asistencias.filter(item => {
      if (!item.fechaRegistro) return false;
      return obtenerFechaPeru(item.fechaRegistro) === hoyStr;
    });

    const asistidosHoyUnicos = new Set(
      asistenciasHoy.map(item => item.dniEstudiante || item.codigoEstudiante || item.nombresEstudiante).filter(Boolean)
    ).size;

    const asistenciaPorPrograma = crearAsistenciaPorPrograma(filasProgramas, asistenciasHoy);
    const ultimosIngresos = crearUltimosIngresos(asistencias);

    const inscripcionesMapeadas = inscripciones.map((item) => crearFilaInscripcionReporte(item, db.estudiantes || {}));
    const pagosMapeados = pagos.map((item) => crearFilaPagoReporte(item, db.inscripciones || []));
    const programasMapeados = programas.map((p: any) => mapDbProgramToApi(p, db));

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
}

