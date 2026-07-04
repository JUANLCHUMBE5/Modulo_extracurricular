import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseRepository } from "../../../database/database.repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTRANJEROS_DB_PATH = path.resolve(__dirname, "../../../estudiantes_externos.json");

export class EstudianteRepository extends DatabaseRepository {
  async readExternalStudents(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(EXTRANJEROS_DB_PATH, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
}
