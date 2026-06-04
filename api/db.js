import { getDb, resetDb, saveDb } from "../server/localDb.js";

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
      message: error?.message || "No se pudo conectar con la base de datos.",
    });
  }
}

export { getDb, resetDb, saveDb };

export function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json");
}
