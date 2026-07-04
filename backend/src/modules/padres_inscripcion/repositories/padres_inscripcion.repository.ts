import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseRepository } from "../../../database/database.repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTRANJEROS_DB_PATH = path.resolve(__dirname, "../../../estudiantes_externos.json");

export class PadresInscripcionRepository extends DatabaseRepository {
  async readExternalStudents(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(EXTRANJEROS_DB_PATH, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveExternalStudent(student: any): Promise<void> {
    try {
      const current = await this.readExternalStudents();
      current[student.dni] = {
        ...student,
        guardadoEn: new Date().toISOString(),
      };
      await fs.writeFile(EXTRANJEROS_DB_PATH, JSON.stringify(current, null, 2), "utf-8");
    } catch (error) {
      console.error("Error saving external student:", error);
    }
  }
}
