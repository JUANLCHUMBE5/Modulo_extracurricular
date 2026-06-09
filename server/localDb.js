import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initialData } from "../src/services/localDbClient.js";
import {
  getOfficialDb,
  isOfficialApiEnabled,
  resetOfficialDb,
  saveOfficialDb,
} from "./officialApiDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");
let writeQueue = Promise.resolve();
let mutationQueue = Promise.resolve();
let cachedDb = null;
let cachedDbMtimeMs = 0;

export async function getDb() {
  if (isOfficialApiEnabled()) {
    return getOfficialDb();
  }

  return readLocalDb();
}

export async function saveDb(data) {
  if (isOfficialApiEnabled()) {
    return saveOfficialDb(data);
  }

  let currentDb = null;
  try {
    currentDb = await readLocalDb();
  } catch {
    // Ignore if file doesn't exist.
  }

  const db = mergeWithDefaults(data || {}, clone(initialData));

  if (currentDb && Array.isArray(currentDb.usuarios)) {
    const passwordMap = new Map();
    currentDb.usuarios.forEach(u => {
      if (u.usuario && u.contrasena) {
        passwordMap.set(String(u.usuario).toLowerCase(), u.contrasena);
      }
    });

    if (Array.isArray(db.usuarios)) {
      db.usuarios.forEach(u => {
        const key = String(u.usuario || "").toLowerCase();
        if (key && !u.contrasena && passwordMap.has(key)) {
          u.contrasena = passwordMap.get(key);
        }
      });
    }
  }

  await queueDbWrite(db);
  return db;
}

export async function updateDb(mutator) {
  if (isOfficialApiEnabled()) {
    const db = await getOfficialDb();
    const updated = await mutator(db);
    return saveOfficialDb(updated || db);
  }

  return queueDbMutation(async () => {
    const current = mergeWithDefaults(await readLocalDb(), clone(initialData));
    const updated = await mutator(current);
    if (updated && Array.isArray(updated.usuarios)) {
      const passwordMap = new Map();
      current.usuarios.forEach(u => {
        if (u.usuario && u.contrasena) {
          passwordMap.set(String(u.usuario).toLowerCase(), u.contrasena);
        }
      });
      updated.usuarios.forEach(u => {
        const key = String(u.usuario || "").toLowerCase();
        if (key && !u.contrasena && passwordMap.has(key)) {
          u.contrasena = passwordMap.get(key);
        }
      });
    }
    return saveDb(updated || current);
  });
}

export async function resetDb() {
  if (isOfficialApiEnabled()) {
    return resetOfficialDb();
  }

  return saveDb(clone(initialData));
}

export function getDbSource() {
  if (isOfficialApiEnabled()) return "official-api";
  return "local-json";
}

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await saveDb(clone(initialData));
  }
}

async function readLocalDb() {
  await ensureDb();

  const stats = await fs.stat(DB_PATH);
  if (cachedDb && cachedDbMtimeMs === stats.mtimeMs) {
    return cachedDb;
  }

  const raw = await fs.readFile(DB_PATH, "utf8");
  cachedDb = parseDb(raw);
  cachedDbMtimeMs = stats.mtimeMs;
  return cachedDb;
}

function mergeWithDefaults(stored, defaults) {
  return {
    ...defaults,
    ...stored,
    categorias: stored.categorias || defaults.categorias,
    estudiantes: stored.estudiantes || defaults.estudiantes,
    programas: stored.programas || defaults.programas,
    invitadosPorPrograma: {
      ...defaults.invitadosPorPrograma,
      ...(stored.invitadosPorPrograma || {}),
    },
    inscripciones: stored.inscripciones || defaults.inscripciones,
    documentosGenerados: stored.documentosGenerados || defaults.documentosGenerados,
    pagos: stored.pagos || defaults.pagos,
    asistencias: stored.asistencias || defaults.asistencias,
    historialCargas: stored.historialCargas || defaults.historialCargas,
    plantillasPorPrograma: {
      ...(defaults.plantillasPorPrograma || {}),
      ...(stored.plantillasPorPrograma || {}),
    },
    usuarios: stored.usuarios || defaults.usuarios,
    auditLogs: stored.auditLogs || defaults.auditLogs || [],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function parseDb(raw) {
  const text = stripBom(raw);
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = /position (\d+)/.exec(error.message || "");
    if (!match) throw error;

    const repaired = text.slice(0, Number(match[1])).trimEnd();
    const parsed = JSON.parse(repaired);
    void queueDbWrite(parsed);
    return parsed;
  }
}

async function writeDbFile(db) {
  const tmpPath = `${DB_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, DB_PATH);
  const stats = await fs.stat(DB_PATH);
  cachedDb = db;
  cachedDbMtimeMs = stats.mtimeMs;
}

function queueDbWrite(db) {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => writeDbFile(db));
  return writeQueue;
}

function queueDbMutation(task) {
  mutationQueue = mutationQueue
    .catch(() => undefined)
    .then(task);
  return mutationQueue;
}
