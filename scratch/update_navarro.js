import { updateDb } from '../server/localDb.js';

async function run() {
  console.log("Iniciando actualización del alumno Alessia Navarro Ruiz...");
  await updateDb(db => {
    if (db.estudiantes && db.estudiantes['99990000']) {
      db.estudiantes['99990000'].grado = '2 Secundaria';
      db.estudiantes['99990000'].nivel = 'Secundaria';
      console.log('Datos actualizados del estudiante en memoria:', db.estudiantes['99990000']);
    } else {
      console.log('Estudiante no encontrado en la base de datos.');
    }
    return db;
  });
  console.log("¡Actualización completada en la base de datos (Supabase)!");
}

run().catch(console.error);
