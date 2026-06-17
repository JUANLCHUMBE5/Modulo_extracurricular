import "./loadEnv.js";
import { initialData } from "../src/services/localDbClient.js";

const DEFAULT_DB_PATH = "/api/modulo-extracurricular";

export function isOfficialApiEnabled() {
  return String(process.env.DATA_MODE || "").toLowerCase() === "production";
}

export async function getOfficialDb() {
  const data = unwrapOfficialData(await officialRequest(getOfficialPath(), { method: "GET" }));
  return mergeWithDefaults(data || {}, clone(initialData));
}

export async function saveOfficialDb(data) {
  const db = mergeWithDefaults(data || {}, clone(initialData));
  const saved = await officialRequest(getOfficialPath(), {
    method: "PUT",
    body: db,
  });

  return mergeWithDefaults(unwrapOfficialData(saved) || db, clone(initialData));
}

export async function resetOfficialDb() {
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
      ...getAuthHeaders(),
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

function getAuthHeaders() {
  const headers = {};
  const token = process.env.OFFICIAL_API_TOKEN;
  const apiKey = process.env.OFFICIAL_API_KEY;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  return headers;
}

function getOfficialPath() {
  return process.env.OFFICIAL_API_DB_PATH || DEFAULT_DB_PATH;
}

function normalizePath(path) {
  return String(path || DEFAULT_DB_PATH).startsWith("/") ? path : `/${path}`;
}

function unwrapOfficialData(payload) {
  if (payload && typeof payload === "object" && payload.data && !payload.programas && !payload.estudiantes) {
    return payload.data;
  }

  return payload;
}

function mergeWithDefaults(stored, defaults) {
  return {
    ...defaults,
    ...stored,
    categorias: (stored.categorias || defaults.categorias || []).filter(c => {
      const normal = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normal !== "ingles";
    }),
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
    plantillasPorPrograma: {
      ...(defaults.plantillasPorPrograma || {}),
      ...(stored.plantillasPorPrograma || {}),
    },
    usuarios: stored.usuarios || defaults.usuarios,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
