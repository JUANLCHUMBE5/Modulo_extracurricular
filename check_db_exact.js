import { getDb } from './server/localDb.js';
import { normalizarTextoApi } from './server/apiMappers.js';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

async function run() {
  const db = await getDb();
  const programaId = 'PROG-006';
  const todosInvitados = db.invitadosPorPrograma?.[programaId] || [];

  console.log("=== DB INFO ===");
  console.log("db.inscripciones count:", db.inscripciones?.length);
  console.log("db.invitadosPorPrograma[PROG-006]:", db.invitadosPorPrograma?.[programaId]);

  const inscripcionesActivas = (db.inscripciones || [])
    .filter((ins) => ins.programaId === programaId && ins.estadoInscripcion !== "Anulada");

  console.log("inscripcionesActivas count:", inscripcionesActivas.length);
  console.log("inscripcionesActivas:", JSON.stringify(inscripcionesActivas, null, 2));

  const dnisMatriculados = new Set(
    inscripcionesActivas
      .map((ins) => String(ins.dniEstudiante || "").replace(/\D/g, ""))
      .filter(Boolean)
  );
  const codigosMatriculados = new Set(
    inscripcionesActivas
      .map((ins) => String(ins.codigoEstudiante || "").trim().toUpperCase())
      .filter(Boolean)
  );
  const nombresMatriculados = new Set(
    inscripcionesActivas
      .map((ins) => normalizarTextoApi(ins.nombresEstudiante))
      .filter(Boolean)
  );

  console.log("dnisMatriculados:", Array.from(dnisMatriculados));
  console.log("codigosMatriculados:", Array.from(codigosMatriculados));

  const filtered = todosInvitados.filter((invitado) => {
    const dniInvitado = String(invitado.dni || "").replace(/\D/g, "");
    const codigoInvitado = String(invitado.codigoEstudiante || "").trim().toUpperCase();
    const nombreInvitado = normalizarTextoApi(invitado.nombres);

    // Coincidencia directa por DNI
    if (dniInvitado && dnisMatriculados.has(dniInvitado)) {
      console.log(`Matched direct DNI: ${dniInvitado}`);
      return false;
    }
    // Coincidencia directa por código
    if (codigoInvitado && codigosMatriculados.has(codigoInvitado)) {
      console.log(`Matched direct Code: ${codigoInvitado}`);
      return false;
    }

    // Buscar el código del invitado en la base de estudiantes (DNI → codigoEstudiante)
    if (dniInvitado) {
      const estudianteBase = db.estudiantes?.[dniInvitado];
      if (estudianteBase) {
        const codigoDesdeBase = String(estudianteBase.codigoEstudiante || "").trim().toUpperCase();
        if (codigoDesdeBase && codigosMatriculados.has(codigoDesdeBase)) {
          console.log(`Matched cross Code: ${codigoDesdeBase}`);
          return false;
        }
      }
    }

    // Buscar por código cruzado (codigoInvitado -> DNI)
    if (codigoInvitado) {
      const estudianteBase = Object.values(db.estudiantes || {}).find(
        (e) => String(e.codigoEstudiante || "").trim().toUpperCase() === codigoInvitado
      );
      if (estudianteBase && estudianteBase.dni) {
        const dniDesdeBase = String(estudianteBase.dni).replace(/\D/g, "");
        if (dniDesdeBase && dnisMatriculados.has(dniDesdeBase)) {
          console.log(`Matched cross DNI: ${dniDesdeBase}`);
          return false;
        }
      }
    }

    // Coincidencia por nombre normalizado como último recurso
    if (nombreInvitado && nombresMatriculados.has(nombreInvitado)) {
      console.log(`Matched name: ${nombreInvitado}`);
      return false;
    }

    return true;
  });

  console.log("Filtered:", filtered);
}

run();
