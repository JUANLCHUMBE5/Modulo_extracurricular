import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../../database/dbLocal.js";
import { limpiarDni as limpiarDniHelper } from "../../services/file.service.js";
import { normalizarPeriodoApi, normalizarTextoApi } from "../../shared/mappers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTRANJEROS_DB_PATH = path.resolve(__dirname, "../../../estudiantes_externos.json");

function limpiarDni(val: any): string {
  return limpiarDniHelper ? limpiarDniHelper(val) : String(val || "").replace(/\D/g, "");
}

async function readExternalStudents(): Promise<Record<string, any>> {
  try {
    const data = await fs.readFile(EXTRANJEROS_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export class EstudianteService {
  /**
   * Obtiene y pagina la lista de estudiantes internos del sistema.
   */
  async getEstudiantes(page: number | null, limit: number) {
    const db = await getDb();
    const list = Object.values(db.estudiantes || {});
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

  /**
   * Obtiene la ficha de un estudiante específico a partir de su DNI.
   */
  async getEstudianteByDni(dniRaw: string) {
    const db = await getDb();
    const dni = limpiarDni(dniRaw);
    const estudiante = db.estudiantes?.[dni];
    if (!estudiante) {
      throw new Error("Estudiante no encontrado.");
    }
    return estudiante;
  }

  /**
   * Retorna la información completa de matrícula, pagos, invitaciones y documentos de un alumno (interno o externo) para Secretaría.
   */
  async getEstudianteSecretaria(dni: string, periodo: string) {
    const db = await getDb();
    const period = normalizarPeriodoApi(periodo);

    let student = db.estudiantes?.[dni] as any;
    let esExterno = false;
    if (!student) {
      const extStudents = await readExternalStudents();
      if (extStudents[dni]) {
        student = extStudents[dni];
        esExterno = true;
      }
    }
    let invitacion: any = null;

    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    for (const prog of programs) {
      const invitados = db.invitadosPorPrograma[prog.id] || [];
      const inv = invitados.find(item => item.dni === dni);
      if (inv) {
        invitacion = {
          programaId: prog.id,
          programa: prog,
          invitado: inv
        };
        break;
      }
    }

    const inscripciones = (db.inscripciones || []).filter(
      (item) => String(item.dniEstudiante) === String(dni) &&
        (db.programas || []).some(
          (p) => String(p.id) === String(item.programaId) && normalizarPeriodoApi(p.periodo) === period
        )
    );

    const pagos = (db.pagos || []).filter(
      (pago) => String(pago.dniEstudiante) === String(dni) &&
        (db.programas || []).some(
          (p) => String(p.id) === String(pago.programaId) && normalizarPeriodoApi(p.periodo) === period
        )
    );

    const invitaciones = invitacion ? [invitacion] : [];
    const documentos = (db.documentosGenerados || []).filter(
      (doc) => String(doc.dniEstudiante) === String(dni) &&
        (db.programas || []).some(
          (p) => String(p.id) === String(doc.programaId) && normalizarPeriodoApi(p.periodo) === period
        )
    );

    const isInternal = !!db.estudiantes?.[dni];
    const rawStudent = student || (invitacion ? {
      dni,
      nombres: invitacion.invitado.nombres,
      grado: invitacion.invitado.grado,
      seccion: invitacion.invitado.seccion,
      tipoAlumno: "Alumno externo",
      estadoMatricula: "Activo"
    } : null);

    if (!rawStudent) {
      throw new Error("Estudiante no encontrado en la base general ni en programas.");
    }

    const estudiante = {
      ...rawStudent,
      tipoAlumno: isInternal ? (rawStudent.tipoAlumno || "Alumno interno") : "Alumno externo",
      esExterno
    };

    return { estudiante, invitaciones, inscripciones, pagos, documentos };
  }

  /**
   * Busca estudiantes por su nombre y periodo lectivo para Secretaría, retornando su ficha de detalle correspondiente.
   */
  async searchEstudiantesSecretaria(nombre: string, periodo: string) {
    const db = await getDb();
    const cleanSearch = normalizarTextoApi(nombre);
    const period = normalizarPeriodoApi(periodo);

    const matchingDnis = new Set<string>();

    Object.values(db.estudiantes || {}).forEach((student: any) => {
      const fullname = normalizarTextoApi(student.nombres);
      if (fullname.includes(cleanSearch)) {
        matchingDnis.add(student.dni);
      }
    });

    const programs = (db.programas || []).filter(p => normalizarPeriodoApi(p.periodo) === period);
    programs.forEach((prog) => {
      const invitados = db.invitadosPorPrograma[prog.id] || [];
      invitados.forEach((inv) => {
        const fullname = normalizarTextoApi(inv.nombres);
        if (fullname.includes(cleanSearch)) {
          matchingDnis.add(inv.dni);
        }
      });
    });

    const results = [];
    for (const dni of matchingDnis) {
      try {
        const detail = await this.getEstudianteSecretaria(dni, period);
        results.push(detail);
      } catch {}
    }

    return results;
  }
}
