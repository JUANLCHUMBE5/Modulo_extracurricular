import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { saveSupabaseDb } from "../supabaseDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "..", "db.json");

const raw = await fs.readFile(dbPath, "utf8");
const db = JSON.parse(raw);
const saved = await saveSupabaseDb(db);

console.log("Base local enviada a Supabase piloto.");
console.log(`Programas: ${Array.isArray(saved.programas) ? saved.programas.length : 0}`);
console.log(`Estudiantes: ${Object.keys(saved.estudiantes || {}).length}`);
console.log(`Inscripciones: ${Array.isArray(saved.inscripciones) ? saved.inscripciones.length : 0}`);
