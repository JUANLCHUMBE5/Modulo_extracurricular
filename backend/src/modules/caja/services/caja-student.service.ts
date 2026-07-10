import {
  normalizarPeriodoApi,
  normalizarTextoApi
} from "../../../common/shared/mappers.js";
import { CajaRepository } from "../repositories/caja.repository.js";

const cajaRepository = new CajaRepository();

export class CajaStudentService {
  async getEstudianteCaja(dni: string, periodo: string) {
    const db = await cajaRepository.getDb();
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
        pago.programaId === item.programaId
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
        dni: student.dni,
        nombres: student.nombres,
        apellidos: student.apellidos || "",
        codigoEstudiante: student.codigoEstudiante || "",
        grado: student.grado,
        seccion: student.seccion,
        nivel: student.nivel,
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
        dni: student.dni,
        nombres: student.nombres,
        apellidos: student.apellidos || "",
        codigoEstudiante: student.codigoEstudiante || "",
        grado: student.grado,
        seccion: student.seccion,
        nivel: student.nivel,
        tipoAlumno: student.tipoAlumno || "Alumno interno",
        sinInscripcionCaja: true,
        requiereDerivacionCaja: inscripciones.length > 0
      };
    }
  }

  async buscarEstudiantesQuery(q: string) {
    if (!q) return [];
    const db = await cajaRepository.getDb();
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
}


