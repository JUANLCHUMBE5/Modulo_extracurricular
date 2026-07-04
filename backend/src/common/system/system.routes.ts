import express, { Request, Response } from "express";
import { getDb, getDbSource, resetDb, saveDb } from "../../database/local/dbLocal.js";
import { requireLocalDbAccess } from "../middlewares/auth.js";

const router = express.Router();

router.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, dbSource: getDbSource() });
});

router.get("/api/db", requireLocalDbAccess, async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const sanitizedDb = {
      ...db,
      usuarios: (db.usuarios || []).map(({ contrasena, ...u }) => u),
    };
    res.json(sanitizedDb);
  } catch (error) {
    console.error("No se pudo leer la base local:", error);
    res.status(500).json({ message: "No se pudo leer la base local." });
  }
});

router.put("/api/db", requireLocalDbAccess, async (req: Request, res: Response) => {
  try {
    const db = await saveDb(req.body);
    res.json(db);
  } catch (error) {
    console.error("No se pudo guardar la base local:", error);
    res.status(500).json({ message: "No se pudo guardar la base local." });
  }
});

router.post("/api/db/reset", requireLocalDbAccess, async (_req: Request, res: Response) => {
  try {
    res.json(await resetDb());
  } catch (error) {
    console.error("No se pudo reiniciar la base local:", error);
    res.status(500).json({ message: "No se pudo reiniciar la base local." });
  }
});

router.get("/api/modulo", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const publicDb = {
      programas: db.programas || [],
      categorias: db.categorias || [],
      configuracionInstitucional: db.configuracionInstitucional || {},
    };
    res.json(publicDb);
  } catch {
    res.status(500).json({ message: "No se pudo leer el modulo extracurricular." });
  }
});

export default router;
