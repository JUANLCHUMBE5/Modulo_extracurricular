import { localDbApi } from "./apiClient";
import { mockDb, resetMockDb, saveMockDb, syncMockDbFromStorage } from "./localDbClient";

export const apiDb = {};

export async function syncApiDb() {
  try {
    const db = await localDbApi.getDatabase();
    replaceApiDb(db);
  } catch (error) {
    if (requiresApiDataMode()) {
      throw error;
    }

    const db = await syncMockDbFromStorage();
    replaceApiDb(db);
  }
  return apiDb;
}

export async function saveApiDb() {
  try {
    const db = await localDbApi.saveDatabase(prepareDbForStorage(apiDb));
    replaceApiDb(db);
  } catch (error) {
    if (requiresApiDataMode()) {
      throw error;
    }

    replaceMockDb(apiDb);
    await saveMockDb();
    replaceApiDb(mockDb);
  }
  dispatchApiDbUpdated();
  return apiDb;
}

export async function resetApiDb() {
  try {
    const db = await localDbApi.resetDatabase();
    replaceApiDb(db);
  } catch (error) {
    if (requiresApiDataMode()) {
      throw error;
    }

    await resetMockDb();
    replaceApiDb(mockDb);
  }
  dispatchApiDbUpdated();
  return apiDb;
}

export function nextApiId(key) {
  const value = Number(apiDb[key] || 1);
  apiDb[key] = value + 1;
  return value;
}

function replaceApiDb(db) {
  const hydratedDb = hydrateDbTemplates(db || {});
  Object.keys(apiDb).forEach((key) => {
    delete apiDb[key];
  });
  Object.assign(apiDb, hydratedDb);
}

function replaceMockDb(db) {
  Object.keys(mockDb).forEach((key) => {
    delete mockDb[key];
  });
  Object.assign(mockDb, db || {});
}

export function dispatchApiDbUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("api-db-updated"));
  try {
    window.localStorage.setItem("san_rafael_db_updated_at", String(Date.now()));
  } catch {
    // Si el navegador bloquea localStorage, el evento de la pestaña actual sigue funcionando.
  }
}

function hydrateDbTemplates(db) {
  const templates = db.plantillasPorPrograma || {};
  const programas = Array.isArray(db.programas)
    ? db.programas.map((programa) => {
        const plantilla = templates[programa.id];
        
        // Si la plantilla está marcada explícitamente como vacía, limpiamos campos
        if (programa.plantilla === "") {
          return {
            ...programa,
            plantillaBase64: "",
            plantillaVariables: [],
            plantillaActualizadaEn: "",
          };
        }

        if (!plantilla) return programa;

        return {
          ...programa,
          plantilla: programa.plantilla || plantilla.plantilla || "",
          plantillaBase64: programa.plantillaBase64 || plantilla.plantillaBase64 || "",
          plantillaVariables: programa.plantillaVariables || plantilla.plantillaVariables || [],
          plantillaActualizadaEn: programa.plantillaActualizadaEn || plantilla.plantillaActualizadaEn || "",
        };
      })
    : db.programas;

  return {
    ...db,
    programas,
  };
}

function prepareDbForStorage(db) {
  const stored = JSON.parse(JSON.stringify(db || {}));
  const templates = { ...(stored.plantillasPorPrograma || {}) };

  stored.programas = Array.isArray(stored.programas)
    ? stored.programas.map((programa) => {
        if (!programa.plantilla) {
          delete templates[programa.id];
        } else if (programa.id && programa.plantillaBase64) {
          templates[programa.id] = {
            plantilla: programa.plantilla || "",
            plantillaBase64: programa.plantillaBase64,
            plantillaVariables: programa.plantillaVariables || [],
            plantillaActualizadaEn: programa.plantillaActualizadaEn || "",
          };
        }

        return {
          ...programa,
          plantillaBase64: "",
        };
      })
    : stored.programas;

  stored.inscripciones = Array.isArray(stored.inscripciones)
    ? stored.inscripciones.map((inscripcion) => {
        const cleaned = { ...inscripcion };
        delete cleaned.plantillaBase64;
        return cleaned;
      })
    : stored.inscripciones;

  stored.plantillasPorPrograma = templates;
  return stored;
}

function requiresApiDataMode() {
  return import.meta.env?.PROD || String(import.meta.env?.VITE_DATA_MODE || "").toLowerCase() === "production";
}
