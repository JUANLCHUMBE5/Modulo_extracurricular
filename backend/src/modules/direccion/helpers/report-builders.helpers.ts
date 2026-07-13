import { normalizarPeriodoApi, normalizarTextoApi, parseMonto } from "../../../common/shared/mappers.js";
import { abreviar, normalizarEstadoPago } from "./report.helpers.js";

export function crearFilaInscripcionReporte(item: any, estudiantes: any = {}) {
  const student = estudiantes[item.dniEstudiante] || {};
  return {
    id: item.id || "",
    dni: item.dniEstudiante || "",
    estudiante: item.nombresEstudiante || "",
    grado: item.gradoEstudiante || item.grado || "",
    seccion: item.seccion || "",
    programa: item.programa || "",
    programaId: item.programaId || item.programa_id || "",
    docente: item.docente || item.profesor || "",
    estadoInscripcion: item.estadoInscripcion || "",
    estadoPago: normalizarEstadoPago(item.estadoPago),
    costo: parseMonto(item.costo || 0),
    origen: item.origenRegistro || "",
    fechaRegistro: item.fechaRegistro || "",
    apoderado: item.apoderado || student.apoderado || "",
    telefono: item.telefono || student.telefonoApoderado || (student as any).telefono || "",
    costoOriginal: parseMonto(item.costoOriginal !== undefined ? item.costoOriginal : (item.costo || 0)),
    descuentoAprobado: item.descuentoAprobado || false,
    descuentoTipo: item.descuentoTipo || "",
    descuentoValor: parseMonto(item.descuentoValor || 0),
    descuentoMonto: parseMonto(item.descuentoMonto || 0),
  };
}

export function crearFilaPagoReporte(item: any, inscripciones: any[] = []) {
  const inscripcion = inscripciones.find((ins) =>
    (item.inscripcionId && ins.id === item.inscripcionId) ||
    (item.dniEstudiante && ins.dniEstudiante === item.dniEstudiante && ins.programaId === item.programaId)
  ) || null;

  return {
    id: item.id || "",
    inscripcionId: item.inscripcionId || "",
    programaId: item.programaId || inscripcion?.programaId || "",
    dni: item.dniEstudiante || item.estudianteDni || "",
    estudiante: item.nombresEstudiante || item.estudianteNombre || "",
    programa: item.programa || item.programaNombre || "",
    monto: parseMonto(item.monto || 0),
    estado: normalizarEstadoPago(item.estado),
    estadoVerificacion: item.estadoVerificacion || "",
    medio: item.formaPago || item.medioPago || "",
    fecha: item.fechaPago || item.fecha || "",
    nroRecibo: item.nroRecibo || item.nro_recibo || "",
    observaciones: item.observaciones || "",
    descuentoAprobado: Boolean(inscripcion?.descuentoAprobado),
    descuentoTipo: inscripcion?.descuentoTipo || "",
    descuentoValor: parseMonto(inscripcion?.descuentoValor || 0),
    descuentoMonto: parseMonto(inscripcion?.descuentoMonto || 0),
    descuentoJustificacion: inscripcion?.descuentoJustificacion || "",
  };
}

export function crearFilaProgramaResumen(prog: any, inscripciones: any[] = [], pagos: any[] = []) {
  const inscripcionesPrograma = inscripciones.filter((item) =>
    item.programaId === prog.id
  );
  const pagosPrograma = pagos.filter((item) =>
    item.programaId === prog.id
  );
  const inscritos = inscripcionesPrograma.length;
  const cupos = Number(prog.cupos || 0);
  const ocupados = Math.max(Number(prog.cuposOcupados || 0), inscritos);
  const proyectado = parseMonto(inscripcionesPrograma.reduce((sum, item) => sum + parseMonto(item.costo ?? prog.costo ?? 0), 0));
  const recaudado = parseMonto(pagosPrograma
    .filter((item) => normalizarEstadoPago(item.estado) === "Pagado")
    .reduce((sum, item) => sum + parseMonto(item.monto || 0), 0));

  const conBeca = inscripcionesPrograma.filter((item) => item.descuentoAprobado).length;
  const porCobrar = parseMonto(Math.max(0, proyectado - recaudado));

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
    costo: parseMonto(prog.costo || 0),
    proyectado,
    recaudado,
    porCobrar,
    avance: cupos > 0 ? Math.round((ocupados / cupos) * 100) : 0,
    gradosAplicables: prog.gradosAplicables || [],
  };
}

export function obtenerFechaPeru(fechaStr: any) {
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
}

export function crearAsistenciaPorPrograma(filasProgramas: any[] = [], asistenciasHoy: any[] = []) {
  return filasProgramas.slice(0, 8).map((prog) => {
    const asistidosHoy = new Set(
      asistenciasHoy
        .filter(item => item.programaId && prog.id && String(item.programaId) === String(prog.id))
        .map(item => item.dniEstudiante || item.codigoEstudiante || item.nombresEstudiante).filter(Boolean)
    ).size;

    return {
      programa: abreviar(prog.nombre),
      matriculados: prog.inscritos,
      asistidos: asistidosHoy,
    };
  });
}

export function crearUltimosIngresos(asistencias: any[] = []) {
  return [...asistencias]
    .sort((a, b) => new Date(b.fechaRegistro || 0).getTime() - new Date(a.fechaRegistro || 0).getTime())
    .slice(0, 15)
    .map(item => {
      let horaFormateada = "-";
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
}
