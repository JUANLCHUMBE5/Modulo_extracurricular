import dotenv from 'dotenv';
dotenv.config();
import { getDb } from '../server/localDb.js';

async function main() {
  const db = await getDb();
  console.log('Total inscriptions:', db.inscripciones.length);
  console.log('Inscriptions states:', db.inscripciones.map(ins => ({ id: ins.id, dni: ins.dniEstudiante, estadoPago: ins.estadoPago })));
}
main();
