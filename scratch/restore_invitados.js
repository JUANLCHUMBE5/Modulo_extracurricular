import dotenv from 'dotenv';
dotenv.config();
import { getDb, saveDb } from '../server/localDb.js';

async function restoreInvitados() {
  console.log('Fetching database...');
  const db = await getDb();
  
  db.invitadosPorPrograma = {};

  if (!db.historialCargas || db.historialCargas.length === 0) {
    console.error('No load history found in the database.');
    return;
  }

  console.log(`Found ${db.historialCargas.length} loads in history. Rebuilding guests list...`);

  let restoredCount = 0;

  for (const carga of db.historialCargas) {
    if (!carga.registros || !Array.isArray(carga.registros)) continue;

    for (const reg of carga.registros) {
      // Exclude Valentina Chavez Flores (33334444) since the user explicitly wanted her deleted
      if (reg.dni === '33334444') {
        console.log('Skipping deleted student DNI 33334444');
        continue;
      }

      const progId = reg.programaId || 'PROG-002'; // Default to Club de Tareas if missing
      db.invitadosPorPrograma[progId] = db.invitadosPorPrograma[progId] || [];

      // Avoid duplicates
      const exists = db.invitadosPorPrograma[progId].some(inv => inv.dni === reg.dni);
      if (exists) continue;

      const nivel = reg.grado.includes('Primaria') ? 'Primaria' : reg.grado.includes('Secundaria') ? 'Secundaria' : 'Inicial';

      const invitado = {
        cargaId: carga.id,
        codigoEstudiante: reg.codigoEstudiante || '',
        dni: reg.dni,
        nombres: reg.nombres,
        grado: reg.grado,
        seccion: reg.seccion || '',
        nivelEducativo: reg.nivelEducativo || nivel,
        seleccion: reg.seleccion || '',
        nivelCambridge: reg.nivelCambridge || '',
        periodo: carga.periodo || 'escolar',
        telefonoApoderado: reg.telefono || '',
        correo: reg.correo || '',
        observacion: reg.observacion || '',
        archivoNombre: reg.archivoNombre || carga.archivoNombre || '',
        estado: 'Invitado'
      };

      db.invitadosPorPrograma[progId].push(invitado);
      restoredCount++;
      console.log(`Restored guest: ${invitado.nombres} (DNI ${invitado.dni}) to program ${progId}`);
    }
  }

  // Also clean up any leftover INS-TEST-99 that was created during the test crash
  const initialInsCount = db.inscripciones.length;
  db.inscripciones = db.inscripciones.filter(i => i.id !== 'INS-TEST-99');
  db.pagos = db.pagos.filter(p => p.inscripcionId !== 'INS-TEST-99');
  console.log(`Cleaned up test inscriptions: removed ${initialInsCount - db.inscripciones.length} rows.`);

  console.log(`Saving database with ${restoredCount} restored guests...`);
  await saveDb(db);
  console.log('Database successfully saved and restored!');
}

restoreInvitados().catch(console.error);
