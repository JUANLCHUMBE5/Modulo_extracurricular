import { getDb } from '../server/localDb.js';

async function run() {
  const db = await getDb();
  console.log("DB keys:", Object.keys(db));
  console.log("Programas count:", db.programas?.length);
  console.log("Inscripciones count:", db.inscripciones?.length);
  console.log("Inscripciones:", db.inscripciones);
  console.log("Pagos count:", db.pagos?.length);
}
run();
