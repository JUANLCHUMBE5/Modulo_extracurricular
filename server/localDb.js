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

export async function getDb() {
  if (isOfficialApiEnabled()) {
    return getOfficialDb();
  }

  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return parseDb(raw);
}

export async function saveDb(data) {
  if (isOfficialApiEnabled()) {
    return saveOfficialDb(data);
  }

  const db = mergeWithDefaults(data || {}, clone(initialData));
  await writeDbFile(db);
  return db;
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
    void writeDbFile(parsed);
    return parsed;
  }
}

async function writeDbFile(db) {
  const tmpPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, DB_PATH);
}
