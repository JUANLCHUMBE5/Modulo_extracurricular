import { initialData } from "./seeds/initialData.js";
import { createSyncEvent, emitSyncEvent } from "../../common/shared/syncBus.js";
import { loadDatabaseFromFiles, saveDatabaseToFiles } from "./store.js";
import { loadDatabaseFromPg, saveDatabaseToPg, isPgEnabled } from "../postgres/pgStore.js";
import { LocalDatabase } from "../types.js";

let mutationQueue: Promise<any> = Promise.resolve();
let dbCache: LocalDatabase | null = null;
const MAX_SYNC_EVENTS = 100;

function stringifyComparable(value: any): string {
  return JSON.stringify(value ?? null);
}

function detectSyncChanges(newDb: any = {}, oldDb: any = {}): string[] {
  const checks: [string, any, any][] = [
    ["usuarios", newDb.usuarios, oldDb.usuarios],
    ["estudiantes", newDb.estudiantes, oldDb.estudiantes],
    ["programas", newDb.programas, oldDb.programas],
    ["inscripciones", newDb.inscripciones, oldDb.inscripciones],
    ["pagos", newDb.pagos, oldDb.pagos],
    ["asistencias", newDb.asistencias, oldDb.asistencias],
    ["invitados", newDb.invitadosPorPrograma, oldDb.invitadosPorPrograma],
    ["correlativos", newDb.correlativos, oldDb.correlativos],
    ["categorias", newDb.categorias, oldDb.categorias],
    ["configuracionInstitucional", newDb.configuracionInstitucional, oldDb.configuracionInstitucional],
  ];

  return checks
    .filter(([, nextValue, prevValue]) => stringifyComparable(nextValue) !== stringifyComparable(prevValue))
    .map(([name]) => name);
}

function clone(value: any): any {
  return JSON.parse(JSON.stringify(value));
}

function ecualizarCuposEnMemoria(db: LocalDatabase) {
  if (!Array.isArray(db.programas) || !Array.isArray(db.inscripciones)) return;
  
  const counts: Record<string, number> = {};
  db.inscripciones.forEach((ins: any) => {
    if (ins && ins.programaId) {
      const estado = String(ins.estadoPago || "").toLowerCase();
      if (estado !== "anulado" && estado !== "rechazado") {
        counts[ins.programaId] = (counts[ins.programaId] || 0) + 1;
      }
    }
  });

  db.programas.forEach((prog: any) => {
    if (prog && prog.id) {
      prog.cuposOcupados = counts[prog.id] || 0;
    }
  });
}

function mergeWithDefaults(stored: any, defaults: any): LocalDatabase {
  let correlativosObj = stored.correlativos || defaults.correlativos || { recibo: "", egreso: "" };
  const storedCats = stored.categorias || [];
  const configRow = storedCats.find((c: any) => String(c).startsWith("CONFIG_CORRELATIVOS:"));
  if (configRow) {
    try {
      correlativosObj = JSON.parse(configRow.slice("CONFIG_CORRELATIVOS:".length));
    } catch {}
  }

  const db: LocalDatabase = {
    ...defaults,
    ...stored,
    correlativos: correlativosObj,
    configuracionInstitucional: stored.configuracionInstitucional || defaults.configuracionInstitucional || {},
    categorias: (stored.categorias || defaults.categorias || [])
      .filter((c: any) => !String(c).startsWith("CONFIG_CORRELATIVOS:"))
      .filter((c: any) => {
        const normal = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normal !== "ingles";
      }),
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
    syncEvents: Array.isArray(stored.syncEvents) ? stored.syncEvents.slice(-MAX_SYNC_EVENTS) : [],
    plantillasPorPrograma: {
      ...(defaults.plantillasPorPrograma || {}),
      ...(stored.plantillasPorPrograma || {}),
    },
    usuarios: stored.usuarios || defaults.usuarios,
    auditLogs: stored.auditLogs || defaults.auditLogs || [],
  };

  ecualizarCuposEnMemoria(db);

  return db;
}

// ==========================================
// FUNCIONES EXPORTADAS (INTERCEPTADAS)
// ==========================================

export async function getDb(): Promise<LocalDatabase> {
  if (dbCache) {
    return dbCache;
  }
  let db: LocalDatabase;
  if (isPgEnabled()) {
    const fileDb = await loadDatabaseFromFiles(initialData);
    db = await loadDatabaseFromPg(fileDb);
  } else {
    db = await loadDatabaseFromFiles(initialData);
  }
  dbCache = mergeWithDefaults(db, clone(initialData));
  return dbCache;
}

export async function saveDb(data: any): Promise<LocalDatabase> {
  let currentDb: LocalDatabase | null = null;
  try {
    currentDb = await getDb();
  } catch {
    // Ignore if source doesn't exist.
  }

  const db = mergeWithDefaults(data || {}, clone(initialData));

  // Preserve bcrypt passwords if not modified/provided in the update
  if (currentDb && Array.isArray(currentDb.usuarios)) {
    const passwordMap = new Map<string, string>();
    currentDb.usuarios.forEach((u: any) => {
      if (u.usuario && u.contrasena) {
        passwordMap.set(String(u.usuario).toLowerCase(), u.contrasena);
      }
    });

    if (Array.isArray(db.usuarios)) {
      db.usuarios.forEach((u: any) => {
        const key = String(u.usuario || "").toLowerCase();
        if (key && !u.contrasena && passwordMap.has(key)) {
          u.contrasena = passwordMap.get(key)!;
        }
      });
    }
  }

  const changes = currentDb ? detectSyncChanges(db, currentDb) : [];
  const syncEvent = createSyncEvent(changes);
  if (syncEvent) {
    db.syncEvents = [
      ...(Array.isArray(db.syncEvents) ? db.syncEvents : []),
      syncEvent,
    ].slice(-MAX_SYNC_EVENTS);
  }

  if (isPgEnabled()) {
    await saveDatabaseToPg(db, changes);
  } else {
    await saveDatabaseToFiles(db);
  }

  dbCache = db;
  emitSyncEvent(syncEvent);
  return db;
}

export async function updateDb(mutator: (db: LocalDatabase) => any): Promise<LocalDatabase> {
  return queueDbMutation(async () => {
    const current = await getDb();
    const updated = await mutator(current);
    
    // Preserve bcrypt passwords
    if (updated && Array.isArray(updated.usuarios)) {
      const passwordMap = new Map<string, string>();
      current.usuarios.forEach((u: any) => {
        if (u.usuario && u.contrasena) {
          passwordMap.set(String(u.usuario).toLowerCase(), u.contrasena);
        }
      });
      updated.usuarios.forEach((u: any) => {
        const key = String(u.usuario || "").toLowerCase();
        if (key && !u.contrasena && passwordMap.has(key)) {
          u.contrasena = passwordMap.get(key)!;
        }
      });
    }
    
    return saveDb(updated || current);
  });
}

export async function resetDb(): Promise<LocalDatabase> {
  dbCache = null;
  return saveDb(clone(initialData));
}

export function getDbSource(): string {
  if (isPgEnabled()) return "postgresql";
  return "local-json";
}

function queueDbMutation(task: () => Promise<any>): Promise<any> {
  mutationQueue = mutationQueue
    .catch(() => undefined)
    .then(task);
  return mutationQueue;
}
