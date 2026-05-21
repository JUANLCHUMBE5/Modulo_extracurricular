import { createClient } from "@supabase/supabase-js";
import { initialData } from "../src/services/localDbClient.js";
import {
  getSupabaseTablesDb,
  isSupabaseTablesEnabled,
  resetSupabaseTablesDb,
  saveSupabaseTablesDb,
} from "../server/supabaseTableDb.js";

const DEFAULT_ROW_ID = "modulo-extracurricular";
const DEFAULT_TABLE = "modulo_pilot_database";
const DEFAULT_OFFICIAL_DB_PATH = "/api/modulo-extracurricular";

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json(await getDb());
      return;
    }

    if (req.method === "PUT") {
      res.status(200).json(await saveDb(req.body));
      return;
    }

    res.status(405).json({ message: "Metodo no permitido." });
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo conectar con Supabase.",
    });
  }
}

export async function getDb() {
  return isOfficialApiMode() ? getOfficialDb() : getSupabaseDb();
}

export async function saveDb(data) {
  return isOfficialApiMode() ? saveOfficialDb(data) : saveSupabaseDb(data);
}

export async function resetDb() {
  return isOfficialApiMode() ? resetOfficialDb() : resetSupabaseDb();
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

export function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json");
}

function isOfficialApiMode() {
  return String(process.env.DATA_MODE || "").toLowerCase() === "production";
}

async function getOfficialDb() {
  const data = unwrapOfficialData(await officialRequest(getOfficialPath(), { method: "GET" }));
  return mergeWithDefaults(data || {}, clone(initialData));
}

async function saveOfficialDb(data) {
  const db = mergeWithDefaults(data || {}, clone(initialData));
  const saved = await officialRequest(getOfficialPath(), {
    method: "PUT",
    body: db,
  });

  return mergeWithDefaults(unwrapOfficialData(saved) || db, clone(initialData));
}

async function resetOfficialDb() {
  const resetPath = process.env.OFFICIAL_API_RESET_PATH;

  if (!resetPath) {
    throw new Error("La API oficial no tiene ruta de reinicio configurada.");
  }

  const data = unwrapOfficialData(await officialRequest(resetPath, { method: "POST" }));
  return mergeWithDefaults(data || {}, clone(initialData));
}

async function officialRequest(path, options = {}) {
  const baseUrl = String(process.env.OFFICIAL_API_BASE_URL || "").replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error("Falta OFFICIAL_API_BASE_URL para el modo production.");
  }

  const response = await fetch(`${baseUrl}${normalizePath(path)}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...getOfficialAuthHeaders(),
    },
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(data?.message || `La API oficial respondio con estado ${response.status}.`);
  }

  return data;
}

function getOfficialAuthHeaders() {
  const headers = {};
  const token = process.env.OFFICIAL_API_TOKEN;
  const apiKey = process.env.OFFICIAL_API_KEY;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  return headers;
}

function getOfficialPath() {
  return process.env.OFFICIAL_API_DB_PATH || DEFAULT_OFFICIAL_DB_PATH;
}

function normalizePath(path) {
  return String(path || DEFAULT_OFFICIAL_DB_PATH).startsWith("/") ? path : `/${path}`;
}

function unwrapOfficialData(payload) {
  if (payload && typeof payload === "object" && payload.data && !payload.programas && !payload.estudiantes) {
    return payload.data;
  }

  return payload;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en Vercel.");
  }

  return {
    client: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
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
