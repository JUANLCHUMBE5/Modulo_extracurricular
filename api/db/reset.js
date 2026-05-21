import { resetDb, setJsonHeaders } from "../db.js";

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Metodo no permitido." });
    return;
  }

  try {
    res.status(200).json(await resetDb());
  } catch (error) {
    res.status(500).json({
      message: error?.message || "No se pudo reiniciar la base de datos.",
    });
  }
}
