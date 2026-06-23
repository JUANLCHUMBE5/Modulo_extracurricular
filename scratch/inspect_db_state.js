import dotenv from 'dotenv';
dotenv.config();
import { getDb } from '../server/localDb.js';

async function main() {
  const db = await getDb();
  console.log('--- CURRENT CORRELATIVOS ---');
  console.log(JSON.stringify(db.correlativos, null, 2));
  console.log('----------------------------');
}
main();
