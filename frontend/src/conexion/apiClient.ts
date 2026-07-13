import { CONFIG_CONEXION } from "./conexionBackend.js";

export const API_BASE_URL = String(
  import.meta.env?.VITE_API_URL ||
  import.meta.env?.VITE_LOCAL_API_URL ||
  ""
).replace(/\/$/, "");


// Clase de Error de API tipificada para el manejo de fallos HTTP
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Procesa la respuesta HTTP y gestiona eventos globales de seguridad (401/403)
 */
const procesarRespuesta = async (response) => {
  // Manejo de expiración de sesión (401 Unauthorized)
  if (response.status === 401) {
    const urlStr = String(response.url || "");
    const esLogin = urlStr.includes("/auth/login");
    const esValidarPadre = urlStr.includes("/padres/validar");

    if (esLogin || esValidarPadre) {
      let msg = esLogin 
        ? "Usuario incorrecto o contraseña incorrecta, vuelva a intentarlo."
        : "DNI o fecha de nacimiento incorrectos, vuelva a intentarlo.";

      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await response.clone().json().catch(() => null);
          if (body && body.message) {
            msg = body.message;
          }
        }
      } catch (e) {
        // Fallback
      }

      // Asegurar que si el backend retorna error de login, mostremos el mensaje exacto pedido por el usuario
      if (esLogin && (msg.toLowerCase().includes("incorrectos") || msg.toLowerCase().includes("incorrecto"))) {
        msg = "Usuario incorrecto o contraseña incorrecta, vuelva a intentarlo.";
      }

      throw new ApiError(msg, 401);
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(CONFIG_CONEXION.tokenKey);
      sessionStorage.removeItem("san_rafael_user");
      localStorage.removeItem(CONFIG_CONEXION.tokenKey);
      localStorage.removeItem("san_rafael_user");
      window.dispatchEvent(new CustomEvent("api-unauthorized"));
    }
    throw new ApiError("Su sesión ha expirado o es inválida. Inicie sesión nuevamente.", 401);
  }

  // Manejo de acceso prohibido (403 Forbidden)
  if (response.status === 403) {
    throw new ApiError("No tiene permisos suficientes para realizar esta acción.", 403);
  }

  const renewedToken = response.headers.get("X-Renewed-Token") || response.headers.get("x-renewed-token");
  if (renewedToken && typeof window !== "undefined") {
    sessionStorage.setItem(CONFIG_CONEXION.tokenKey, renewedToken);
    localStorage.setItem(CONFIG_CONEXION.tokenKey, renewedToken);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new ApiError(data?.message || "No se pudo completar la solicitud.", response.status, data);
  }

  return data;
};

/**
 * Función centralizada para realizar llamadas HTTP (wrapper de fetch)
 */
export async function apiRequest(path, options = {}) {
  const { body, headers, params, ...requestOptions } = options;
  const isFormData = body instanceof FormData;

  // 1. Construir URL y Query Params
  let url = `${API_BASE_URL}${path}`;
  if (params && typeof params === "object") {
    const cleanParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        cleanParams[key] = String(val);
      }
    });
    const searchParams = new URLSearchParams(cleanParams).toString();
    if (searchParams) {
      url += (url.includes("?") ? "&" : "?") + searchParams;
    }
  }

  // 2. Adjuntar Token de Autorización JWT
  const token = typeof window !== "undefined" ? sessionStorage.getItem(CONFIG_CONEXION.tokenKey) : null;
  const authHeaders = token ? { "Authorization": `Bearer ${token}` } : {};

  // 3. Control de Timeout (Cancelación por lentitud de red)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG_CONEXION.timeoutMs);

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...authHeaders,
        ...(headers || {}),
      },
      body: isFormData || body == null ? body : JSON.stringify(body),
    });

    clearTimeout(timeoutId);
    return await procesarRespuesta(response);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new ApiError("La solicitud excedió el tiempo máximo de espera (Timeout).", 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError("Error de conexión con el servidor. Verifique que la API esté activa.", 0);
  }
}

// Métodos abreviados para peticiones REST
export const apiClient = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};

// Acceso a la base de datos local
export const localDbApi = {
  getDatabase: () => apiClient.get("/api/db"),
  saveDatabase: (data) => apiClient.put("/api/db", data),
  resetDatabase: () => apiClient.post("/api/db/reset"),
};

export const VITE_API_MODE = "api";

export const isApiMode = () => true;
