import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_PATH = path.join(__dirname, 'supabase_backup.json');

// New Supabase credentials
const NEW_URL = "https://wgimhsphifnayijqwxxf.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnaW1oc3BoaWZuYXlpanF3eHhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjI0NzQ0MCwiZXhwIjoyMDk3ODIzNDQwfQ.8F_GbjFb-h06OHu0JtlatTEIJGeGyJKMQ9qkQ_Jii08";

const supabase = createClient(NEW_URL, NEW_KEY);

const INSERT_ORDER = [
  "usuarios",
  "estudiantes",
  "estudiantes_externos",
  "programas",
  "programas_configuraciones",
  "programas_horarios",
  "programas_servicios",
  "programas_documentos",
  "programas_anuncios",
  "invitados_programa",
  "inscripciones",
  "pagos",
  "asistencias",
  "historial_cargas",
  "configuracion",
  "categorias",
  "audit_logs"
];

const NUMERIC_COLUMNS = new Set([
  "costo", "cupos", "cuposOcupados", "duracionAvisoDias", "edadMinima", 
  "edadMaxima", "duracionTaller", "duracion", "costoCiclo", "montoPrimerPago", 
  "anuncioImagenTamano", "costoOriginal", "descuentoValor", "descuentoMonto", "monto"
]);

const BOOLEAN_COLUMNS = new Set([
  "invitacionMasiva", "creadoDesdeDocumento", "requiereUniforme", 
  "requiereIndumentaria", "incluyeAlmuerzo", "cicloI", "cicloII", 
  "plantillaValidada", "derivadoCaja", "descuentoAprobado"
]);

function normalizeRecord(record) {
  const clean = { ...record };
  for (const key of Object.keys(clean)) {
    const val = clean[key];
    if (NUMERIC_COLUMNS.has(key)) {
      if (val === "" || val === undefined || val === null) {
        clean[key] = null;
      } else {
        const num = Number(val);
        clean[key] = isNaN(num) ? null : num;
      }
    } else if (BOOLEAN_COLUMNS.has(key)) {
      if (val === "" || val === undefined || val === null) {
        clean[key] = null;
      } else if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'si' || lower === 'yes') {
          clean[key] = true;
        } else if (lower === 'false' || lower === '0' || lower === 'no') {
          clean[key] = false;
        } else {
          clean[key] = null;
        }
      }
    }
  }
  return clean;
}

async function migrate() {
  console.log("🚀 Iniciando migración de datos hacia el nuevo Supabase...");
  
  let backupData;
  try {
    const raw = await fs.readFile(BACKUP_PATH, 'utf8');
    backupData = JSON.parse(raw);
  } catch (err) {
    console.error("❌ No se pudo leer el archivo de respaldo 'supabase_backup.json'. Por favor ejecuta primero el script de respaldo.", err.message);
    return;
  }

  for (const table of INSERT_ORDER) {
    const records = backupData[table] || [];
    if (records.length === 0) {
      console.log(`ℹ️ Tabla ${table}: No hay registros para migrar.`);
      continue;
    }

    console.log(`⏳ Migrando ${records.length} registros a la tabla '${table}'...`);

    const cleanedRecords = records.map(normalizeRecord);

    // We use chunking to prevent hitting Supabase request payload size limits
    const CHUNK_SIZE = 50;
    for (let i = 0; i < cleanedRecords.length; i += CHUNK_SIZE) {
      const chunk = cleanedRecords.slice(i, i + CHUNK_SIZE);
      
      const { error } = await supabase.from(table).upsert(chunk);
      if (error) {
        console.error(`❌ Error insertando lote en tabla '${table}':`, error.message);
        console.error("Detalles del error:", error);
        return;
      }
    }

    console.log(`✅ Tabla ${table}: Todos los registros migrados con éxito.`);
  }

  console.log("\n🎉 ¡PROCESO DE MIGRACIÓN COMPLETADO CON ÉXITO! 🎉");
}

migrate();
