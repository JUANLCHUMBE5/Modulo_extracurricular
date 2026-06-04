const API_BASE_URL = String(
  import.meta.env?.VITE_API_URL ||
  (import.meta.env?.DEV ? import.meta.env?.VITE_LOCAL_API_URL : "") ||
  ""
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}) {
  const { body, headers, params, ...requestOptions } = options;
  const isFormData = body instanceof FormData;

  // 1. Resolver query params
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

  // 2. Resolver Token de Autenticación
  const token = typeof window !== "undefined" ? sessionStorage.getItem("san_rafael_token") : null;
  const authHeaders = token ? { "Authorization": `Bearer ${token}` } : {};

  // 3. Timeout (15 segundos)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(url, {
    ...requestOptions,
    signal: controller.signal,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
      ...(headers || {}),
    },
    body: isFormData || body == null ? body : JSON.stringify(body),
  })
    .then((res) => {
      clearTimeout(timeoutId);
      return res;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new ApiError("La solicitud tardó demasiado tiempo en responder (Timeout).", { status: 408 });
      }
      throw new ApiError(getConnectionErrorMessage(), { status: 0 });
    });

  // 4. Manejo de códigos 401 y 403
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("san_rafael_token");
      sessionStorage.removeItem("san_rafael_user");
      localStorage.removeItem("san_rafael_token");
      localStorage.removeItem("san_rafael_user");
      window.dispatchEvent(new CustomEvent("api-unauthorized"));
    }
    throw new ApiError("Su sesión ha expirado o es inválida. Inicie sesión nuevamente.", { status: 401 });
  }

  if (response.status === 403) {
    throw new ApiError("No tiene permisos suficientes para realizar esta acción.", { status: 403 });
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new ApiError(data?.message || "No se pudo completar la solicitud.", {
      status: response.status,
      data,
    });
  }

  return data;
}

export const apiClient = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};

export const localDbApi = {
  getDatabase: () => apiClient.get("/api/db"),
  saveDatabase: (data) => apiClient.put("/api/db", data),
  resetDatabase: () => apiClient.post("/api/db/reset"),
};

export const VITE_API_MODE = String(
  import.meta.env?.VITE_API_MODE || "mock"
).toLowerCase();

export const isApiMode = () => VITE_API_MODE === "api";

function getConnectionErrorMessage() {
  if (import.meta.env?.PROD && !API_BASE_URL) {
    return "No se pudo conectar con el backend. En la nube falta configurar VITE_API_URL con la URL publica de la API.";
  }

  return "No se pudo conectar con el servidor. Verifique que la API este ejecutandose.";
}
