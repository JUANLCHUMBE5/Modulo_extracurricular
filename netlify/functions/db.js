import { getDb, resetDb, saveDb } from "../../api/db.js";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return response(204, null);
  }

  try {
    if (event.httpMethod === "GET") {
      return response(200, await getDb());
    }

    if (event.httpMethod === "PUT") {
      const body = parseBody(event.body);
      return response(200, await saveDb(body));
    }

    if (event.httpMethod === "POST" && event.path.endsWith("/reset")) {
      return response(200, await resetDb());
    }

    return response(405, { message: "Metodo no permitido." });
  } catch (error) {
    return response(500, {
      message: error?.message || "No se pudo conectar con la base de datos.",
    });
  }
}

function parseBody(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function response(statusCode, data) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: data == null ? "" : JSON.stringify(data),
  };
}
