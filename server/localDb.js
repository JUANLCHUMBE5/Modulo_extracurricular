import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initialData } from "../src/services/localDbClient.js";
import { supabase } from "./supabaseClient.js"; // IMPORTAMOS TU CLIENTE NUEVO
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

// ==========================================
// MIGRACIÓN A SUPABASE INTERCEPTOR LOGIC
// ==========================================

async function readFromSupabase() {
  try {
    // 1. Traemos todas las tablas en paralelo para máxima velocidad
    const [
      resUsuarios, resEstudiantes, resProgramas, resInscripciones, 
      resPagos, resAsistencias, resInvitados, resLogs, resPlantillas
    ] = await Promise.all([
      supabase.from("usuarios").select("*"),
      supabase.from("estudiantes").select("*"),
      supabase.from("programas").select("*"),
      supabase.from("inscripciones").select("*"),
      supabase.from("pagos").select("*"),
      supabase.from("asistencias").select("*"),
      supabase.from("invitados_programa").select("*"),
      supabase.from("audit_logs").select("*"),
      supabase.from("plantillas_programa").select("*")
    ]);

    // 2. Mapeo y transformación de formatos (De Filas SQL a Objetos Indexados JSON)
    const estudiantesObj = {};
    (resEstudiantes.data || []).forEach(e => {
      estudiantesObj[e.dni] = e;
    });

    const invitadosObj = {};
    (resInvitados.data || []).forEach(i => {
      if (!invitadosObj[i.programaId]) invitadosObj[i.programaId] = [];
      invitadosObj[i.programaId].push({
        dni: i.dni,
        nombres: i.nombres,
        grado: i.grado,
        seccion: i.seccion
      });
    });

    const plantillasObj = {};
    (resPlantillas.data || []).forEach(p => {
      plantillasObj[p.programaId] = {
        plantilla: p.plantilla,
        plantillaBase64: p.plantillaBase64,
        plantillaVariables: p.plantillaVariables,
        plantillaActualizadaEn: p.plantillaActualizadaEn
      };
    });

    // 3. Retornamos la estructura exacta simulando db.json
    return {
      usuarios: resUsuarios.data || [],
      estudiantes: estudiantesObj,
      programas: resProgramas.data || [],
      inscripciones: resInscripciones.data || [],
      pagos: resPagos.data || [],
      asistencias: resAsistencias.data || [],
      invitadosPorPrograma: invitadosObj,
      auditLogs: resLogs.data || [],
      plantillasPorPrograma: plantillasObj,
      categorias: [], 
      documentosGenerados: [],
      historialCargas: []
    };
  } catch (err) {
    console.error("❌ Error conectando a Supabase desde backend:", err);
    return clone(initialData);
  }
}

async function writeToSupabase(db) {
  try {
    // 1. Preparamos inserciones limpias limpiando objetos y transformándolos a listas SQL
    const usuarios = db.usuarios || [];
    const estudiantes = Object.values(db.estudiantes || {});
    const programas = db.programas || [];
    const inscripciones = db.inscripciones || [];
    const pagos = db.pagos || [];
    const asistencias = db.asistencias || [];
    const auditLogs = db.auditLogs || [];

    const invitados_programa = [];
    Object.entries(db.invitadosPorPrograma || {}).forEach(([progId, lista]) => {
      if (Array.isArray(lista)) {
        lista.forEach(inv => {
          invitados_programa.push({
            programaId: progId,
            dni: inv.dni,
            nombres: inv.nombres,
            grado: inv.grado,
            seccion: inv.seccion
          });
        });
      }
    });

    const plantillas_programa = Object.entries(db.plantillasPorPrograma || {}).map(([progId, data]) => {
      return {
        programaId: progId,
        plantilla: data.plantilla,
        plantillaBase64: data.plantillaBase64,
        plantillaVariables: data.plantillaVariables,
        plantillaActualizadaEn: data.plantillaActualizadaEn || new Date().toISOString()
      };
    });

    // 2. Subimos todo de golpe usando Upsert (Si existe actualiza, si no lo inserta)
    // Usamos .upsert() con claves primarias definidas en tu SQL
    await Promise.all([
      usuarios.length ? supabase.from("usuarios").upsert(usuarios) : Promise.resolve(),
      estudiantes.length ? supabase.from("estudiantes").upsert(estudiantes) : Promise.resolve(),
      programas.length ? supabase.from("programas").upsert(programas) : Promise.resolve(),
      inscripciones.length ? supabase.from("inscripciones").upsert(inscripciones) : Promise.resolve(),
      pagos.length ? supabase.from("pagos").upsert(pagos) : Promise.resolve(),
      asistencias.length ? supabase.from("asistencias").upsert(asistencias) : Promise.resolve(),
      invitados_programa.length ? supabase.from("invitados_programa").upsert(invitados_programa) : Promise.resolve(),
      auditLogs.length ? supabase.from("audit_logs").upsert(auditLogs) : Promise.resolve(),
      plantillas_programa.length ? supabase.from("plantillas_programa").upsert(plantillas_programa) : Promise.resolve()
    ]);
  } catch (err) {
    console.error("❌ Error al persistir en Supabase:", err);
  }
}

// ==========================================
// FUNCIONES EXPORTADAS (INTERCEPTADAS)
// ==========================================

export async function getDb() {
  if (isOfficialApiEnabled()) {
    return getOfficialDb();
  }

  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") {
    return readFromSupabase();
  }

  return readLocalDb();
}

export async function saveDb(data) {
  if (isOfficialApiEnabled()) {
    return saveOfficialDb(data);
  }

  let currentDb = null;
  try {
    currentDb = (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") 
      ? await readFromSupabase() 
      : await readLocalDb();
  } catch {
    // Ignore if source doesn't exist.
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

  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") {
    await writeToSupabase(db);
    cachedDb = db;
    return db;
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

  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") {
    return queueDbMutation(async () => {
      const current = mergeWithDefaults(await readFromSupabase(), clone(initialData));
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
  if (process.env.VITE_DATA_MODE === "supabase" || process.env.DATA_MODE === "supabase") return "supabase-cloud";
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
