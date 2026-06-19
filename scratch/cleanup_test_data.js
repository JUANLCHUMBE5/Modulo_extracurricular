import { updateDb } from "../server/localDb.js";

// Set env variables
process.env.DATA_MODE = "supabase";
process.env.VITE_DATA_MODE = "supabase";

const dnis = ["11112223", "88889999", "77778888", "11112222", "44445556", "99990000"];

async function run() {
  console.log("=== INICIANDO LIMPIEZA DE DATOS DE PRUEBA EN SUPABASE Y CACHE ===");
  console.log("Estudiantes a limpiar (DNI):", dnis);

  await updateDb(async (db) => {
    // 1. Calcular el número de inscripciones eliminadas por programa para ajustar los cupos ocupados
    const inscripcionesAEliminar = (db.inscripciones || []).filter(ins => dnis.includes(ins.dniEstudiante));
    console.log(`Inscripciones encontradas para eliminar: ${inscripcionesAEliminar.length}`);

    const programaDeltas = {};
    inscripcionesAEliminar.forEach(ins => {
      if (ins.programaId) {
        programaDeltas[ins.programaId] = (programaDeltas[ins.programaId] || 0) + 1;
      }
    });

    // 2. Ajustar cupos de los programas
    db.programas = (db.programas || []).map(p => {
      const delta = programaDeltas[p.id] || 0;
      if (delta > 0) {
        const antiguo = p.cuposOcupados || 0;
        p.cuposOcupados = Math.max(0, antiguo - delta);
        console.log(`Programa ${p.id} (${p.nombre}): cuposOcupados ajustados de ${antiguo} a ${p.cuposOcupados}`);
      }
      return p;
    });

    // 3. Filtrar y eliminar inscripciones, pagos, asistencias y documentos generados
    const pagosIniciales = db.pagos?.length || 0;
    db.pagos = (db.pagos || []).filter(pag => !dnis.includes(pag.dniEstudiante));
    console.log(`Pagos eliminados: ${pagosIniciales - db.pagos.length}`);

    const inscripcionesIniciales = db.inscripciones?.length || 0;
    db.inscripciones = (db.inscripciones || []).filter(ins => !dnis.includes(ins.dniEstudiante));

    const asistenciasIniciales = db.asistencias?.length || 0;
    db.asistencias = (db.asistencias || []).filter(ast => !dnis.includes(ast.dniEstudiante));
    console.log(`Asistencias eliminadas: ${asistenciasIniciales - db.asistencias.length}`);

    const docsIniciales = db.documentosGenerados?.length || 0;
    db.documentosGenerados = (db.documentosGenerados || []).filter(doc => {
      const isTargetDni = dnis.includes(doc.dniEstudiante);
      const student = db.estudiantes?.[doc.dniEstudiante];
      const isTargetName = student && doc.alumno === student.nombres;
      return !(isTargetDni || isTargetName);
    });
    console.log(`Documentos generados eliminados: ${docsIniciales - db.documentosGenerados.length}`);

    // 4. Restaurar/Resetear los estados en la tabla estudiantes sin borrar al estudiante
    dnis.forEach(dni => {
      const student = db.estudiantes?.[dni];
      if (student) {
        console.log(`Reseteando estado para el estudiante: ${student.nombres} (${dni})`);
        student.estadoInscripcion = null;
        student.estadoCaja = null;
      } else {
        console.log(`⚠️ Estudiante con DNI ${dni} no encontrado en la base de datos local/Supabase para resetear.`);
      }
    });

    // Retornamos la base de datos mutada para que localDb la guarde
    return db;
  });

  console.log("=== LIMPIEZA DE DATOS DE PRUEBA COMPLETADA CON ÉXITO ===");
}

run().catch(console.error);
