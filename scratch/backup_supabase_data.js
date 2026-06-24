import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_PATH = path.join(__dirname, 'supabase_backup.json');

// Old Supabase credentials
const OLD_URL = "https://viempuopsjtgfnsspjxv.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZW1wdW9wc2p0Z2Zuc3Nwanh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzI0NTIsImV4cCI6MjA5Njg0ODQ1Mn0.snyLhxlXA8MC-GIF2C3QkoyUQY0_9Ok7IIXd_p85JgA";

const supabase = createClient(OLD_URL, OLD_KEY);

const TABLES = [
  "usuarios",
  "estudiantes",
  "programas",
  "inscripciones",
  "pagos",
  "asistencias",
  "invitados_programa",
  "audit_logs",
  "categorias",
  "historial_cargas",
  "configuracion",
  "programas_configuraciones",
  "programas_horarios",
  "programas_servicios",
  "programas_documentos",
  "programas_anuncios",
  "estudiantes_externos"
];

async function backup() {
  console.log("🚀 Iniciando respaldo de datos de Supabase...");
  const backupData = {};

  for (const table of TABLES) {
    console.log(`⏳ Obteniendo datos de la tabla: ${table}...`);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        // If table doesn't exist or has error, log it but continue
        console.warn(`⚠️ Advertencia al obtener ${table}: ${error.message}`);
        backupData[table] = [];
      } else {
        backupData[table] = data || [];
        console.log(`✅ Tabla ${table}: ${backupData[table].length} registros descargados.`);
      }
    } catch (e) {
      console.error(`❌ Error en tabla ${table}:`, e.message);
      backupData[table] = [];
    }
  }

  await fs.writeFile(BACKUP_PATH, JSON.stringify(backupData, null, 2), "utf8");
  console.log(`\n🎉 Respaldo completado con éxito. Archivo guardado en: ${BACKUP_PATH}`);
}

backup();
