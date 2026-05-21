import "./loadEnv.js";
import { createClient } from "@supabase/supabase-js";
import { initialData } from "../src/services/localDbClient.js";
import {
  getSupabaseTablesDb,
  isSupabaseTablesEnabled,
  resetSupabaseTablesDb,
  saveSupabaseTablesDb,
} from "./supabaseTableDb.js";

const DEFAULT_ROW_ID = "modulo-extracurricular";
const DEFAULT_TABLE = "modulo_pilot_database";

let cachedClient = null;

export function isSupabasePilotEnabled() {
  return String(process.env.DATA_MODE || "").toLowerCase() === "pilot" ||
    String(process.env.SUPABASE_PILOT_ENABLED || "").toLowerCase() === "true";
}

export async function getSupabaseDb() {
  const { client, table, rowId } = getSupabaseConfig();
  if (isSupabaseTablesEnabled()) return getSupabaseTablesDb(client);

  const { data, error } = await client
    .from(table)
    .select("data")
    .eq("id", rowId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer Supabase: ${error.message}`);
  if (!data?.data) return saveSupabaseDb(clone(initialData));

  return mergeWithDefaults(data.data, clone(initialData));
}

export async function saveSupabaseDb(data) {
  const { client, table, rowId } = getSupabaseConfig();
  if (isSupabaseTablesEnabled()) return saveSupabaseTablesDb(client, data);

  const db = mergeWithDefaults(data || {}, clone(initialData));
  const { error } = await client
    .from(table)
    .upsert({
      id: rowId,
      data: db,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) throw new Error(`No se pudo guardar Supabase: ${error.message}`);
  return db;
}

export async function resetSupabaseDb() {
  if (isSupabaseTablesEnabled()) {
    const { client } = getSupabaseConfig();
    return resetSupabaseTablesDb(client);
  }

  return saveSupabaseDb(clone(initialData));
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY para el piloto de Supabase.");
  }

  if (!cachedClient) {
    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return {
    client: cachedClient,
    table: process.env.SUPABASE_PILOT_TABLE || DEFAULT_TABLE,
    rowId: process.env.SUPABASE_PILOT_ROW_ID || DEFAULT_ROW_ID,
  };
}

function mergeWithDefaults(stored, defaults) {
  return {
    ...defaults,
    ...stored,
    categorias: stored.categorias || defaults.categorias,
    estudiantes: { ...defaults.estudiantes, ...(stored.estudiantes || {}) },
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
    usuarios: stored.usuarios || defaults.usuarios,
    plantillasPorPrograma: {
      ...(defaults.plantillasPorPrograma || {}),
      ...(stored.plantillasPorPrograma || {}),
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
