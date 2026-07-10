import { localDbApi } from "./apiClient";

export const apiDb: any = {};

export async function syncApiDb() {
  try {
    const db = await localDbApi.getDatabase();
    replaceApiDb(db);
  } catch (error) {
    console.error("Error syncing database from API:", error);
    throw error;
  }
  return apiDb;
}

export async function saveApiDb() {
  try {
    const db = await localDbApi.saveDatabase(prepareDbForStorage(apiDb));
    replaceApiDb(db);
  } catch (error) {
    console.error("Error saving database to API:", error);
    throw error;
  }
  dispatchApiDbUpdated();
  return apiDb;
}

export async function resetApiDb() {
  try {
    const db = await localDbApi.resetDatabase();
    replaceApiDb(db);
  } catch (error) {
    console.error("Error resetting database on API:", error);
    throw error;
  }
  dispatchApiDbUpdated();
  return apiDb;
}

export function nextApiId(key: string) {
  const value = Number(apiDb[key] || 1);
  apiDb[key] = value + 1;
  return value;
}

function replaceApiDb(db: any) {
  const hydratedDb = hydrateDbTemplates(db || {});
  Object.keys(apiDb).forEach((key) => {
    delete apiDb[key];
  });
  Object.assign(apiDb, hydratedDb);
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

function hydrateDbTemplates(db: any) {
  const templates = db.plantillasPorPrograma || {};
  const programas = Array.isArray(db.programas)
    ? db.programas.map((programa: any) => {
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

function prepareDbForStorage(db: any) {
  const stored = JSON.parse(JSON.stringify(db || {}));
  const templates = { ...(stored.plantillasPorPrograma || {}) };

  stored.programas = Array.isArray(stored.programas)
    ? stored.programas.map((programa: any) => {
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
    ? stored.inscripciones.map((inscripcion: any) => {
        const cleaned = { ...inscripcion };
        delete cleaned.plantillaBase64;
        return cleaned;
      })
    : stored.inscripciones;

  stored.plantillasPorPrograma = templates;
  return stored;
}
