import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { LocalDatabase } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../../data");
const OLD_DB_PATH = path.resolve(DATA_DIR, "db.json");

// Mapa de colas para evitar conflictos de escritura concurrente por archivo
const writeQueues = new Map<string, Promise<any>>();

async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(filePath, "utf8");
    const cleanText = raw.replace(/^\uFEFF/, "");
    return JSON.parse(cleanText) as T;
  } catch {
    await writeJsonFile(filename, defaultValue);
    return defaultValue;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  let queue = writeQueues.get(filename) || Promise.resolve();

  const writeOperation = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf8");
    await fs.rename(tmpPath, filePath);
  };

  queue = queue.catch(() => undefined).then(writeOperation);
  writeQueues.set(filename, queue);
  return queue;
}

export async function loadDatabaseFromFiles(defaults: LocalDatabase): Promise<LocalDatabase> {
  // Verifica si existe la base de datos db.json antigua para hacer la migración una sola vez
  try {
    const stats = await fs.stat(OLD_DB_PATH);
    if (stats.isFile()) {
      console.log("📦 Base de datos legacy detectada. Migrando a archivos modulares...");
      const raw = await fs.readFile(OLD_DB_PATH, "utf8");
      const oldDb = JSON.parse(raw.replace(/^\uFEFF/, ""));
      
      // Guarda todas las entidades de forma individual
      await writeJsonFile("usuarios.json", oldDb.usuarios || defaults.usuarios);
      await writeJsonFile("estudiantes.json", oldDb.estudiantes || defaults.estudiantes);
      await writeJsonFile("programas.json", oldDb.programas || defaults.programas);
      await writeJsonFile("inscripciones.json", oldDb.inscripciones || defaults.inscripciones);
      await writeJsonFile("pagos.json", oldDb.pagos || defaults.pagos);
      await writeJsonFile("asistencias.json", oldDb.asistencias || defaults.asistencias);
      await writeJsonFile("invitados.json", oldDb.invitadosPorPrograma || defaults.invitadosPorPrograma);
      await writeJsonFile("auditLogs.json", oldDb.auditLogs || defaults.auditLogs);
      await writeJsonFile("historialCargas.json", oldDb.historialCargas || defaults.historialCargas);
      
      const configData = {
        categorias: oldDb.categorias || defaults.categorias,
        configuracionInstitucional: oldDb.configuracionInstitucional || defaults.configuracionInstitucional,
        correlativos: oldDb.correlativos || defaults.correlativos,
        syncEvents: oldDb.syncEvents || defaults.syncEvents,
        nextProgramaId: oldDb.nextProgramaId || defaults.nextProgramaId,
        nextCargaId: oldDb.nextCargaId || defaults.nextCargaId,
        nextDocumentoId: oldDb.nextDocumentoId || defaults.nextDocumentoId,
      };
      await writeJsonFile("config.json", configData);

      // Renombra db.json a db.json.bak para respaldo seguro
      await fs.rename(OLD_DB_PATH, `${OLD_DB_PATH}.bak`);
      console.log("✅ Migración local completada. db.json respaldado a db.json.bak");
    }
  } catch (err: any) {
    console.error("❌ ERROR DURANTE LA MIGRACIÓN:", err.message, err.stack);
  }

  // Carga los datos de los archivos modulares
  const [
    usuarios,
    estudiantes,
    programas,
    inscripciones,
    pagos,
    asistencias,
    invitados,
    auditLogs,
    historialCargas
  ] = await Promise.all([
    readJsonFile("usuarios.json", defaults.usuarios),
    readJsonFile("estudiantes.json", defaults.estudiantes),
    readJsonFile("programas.json", defaults.programas),
    readJsonFile("inscripciones.json", defaults.inscripciones),
    readJsonFile("pagos.json", defaults.pagos),
    readJsonFile("asistencias.json", defaults.asistencias),
    readJsonFile("invitados.json", defaults.invitadosPorPrograma),
    readJsonFile("auditLogs.json", defaults.auditLogs),
    readJsonFile("historialCargas.json", defaults.historialCargas)
  ]);
  
  const defaultConfigConfig = {
    categorias: defaults.categorias,
    configuracionInstitucional: defaults.configuracionInstitucional,
    correlativos: defaults.correlativos,
    syncEvents: defaults.syncEvents,
    nextProgramaId: defaults.nextProgramaId,
    nextCargaId: defaults.nextCargaId,
    nextDocumentoId: defaults.nextDocumentoId,
  };
  const config = await readJsonFile("config.json", defaultConfigConfig);

  return {
    usuarios,
    estudiantes,
    programas,
    invitadosPorPrograma: invitados,
    inscripciones,
    documentosGenerados: [],
    pagos,
    asistencias,
    historialCargas,
    auditLogs,
    categorias: config.categorias || defaults.categorias,
    configuracionInstitucional: config.configuracionInstitucional || defaults.configuracionInstitucional,
    correlativos: config.correlativos || defaults.correlativos,
    syncEvents: config.syncEvents || defaults.syncEvents,
    nextProgramaId: config.nextProgramaId || defaults.nextProgramaId,
    nextCargaId: config.nextCargaId || defaults.nextCargaId,
    nextDocumentoId: config.nextDocumentoId || defaults.nextDocumentoId,
  };
}

export async function saveDatabaseToFiles(db: LocalDatabase): Promise<void> {
  await Promise.all([
    writeJsonFile("usuarios.json", db.usuarios),
    writeJsonFile("estudiantes.json", db.estudiantes),
    writeJsonFile("programas.json", db.programas),
    writeJsonFile("inscripciones.json", db.inscripciones),
    writeJsonFile("pagos.json", db.pagos),
    writeJsonFile("asistencias.json", db.asistencias),
    writeJsonFile("invitados.json", db.invitadosPorPrograma),
    writeJsonFile("auditLogs.json", db.auditLogs),
    writeJsonFile("historialCargas.json", db.historialCargas),
    writeJsonFile("config.json", {
      categorias: db.categorias,
      configuracionInstitucional: db.configuracionInstitucional,
      correlativos: db.correlativos,
      syncEvents: db.syncEvents,
      nextProgramaId: db.nextProgramaId,
      nextCargaId: db.nextCargaId,
      nextDocumentoId: db.nextDocumentoId,
    }),
  ]);
}
