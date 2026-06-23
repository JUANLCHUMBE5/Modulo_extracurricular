import { getDb } from '../server/localDb.js';

async function inspect() {
  const db = await getDb();
  console.log('Payments list:', db.pagos.map(p => ({
    id: p.id,
    dniEstudiante: p.dniEstudiante,
    monto: p.monto,
    estado: p.estado,
    periodo: p.periodo,
    origen: p.origenRegistro
  })));
}

inspect();
