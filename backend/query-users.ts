import "./src/config/env.js";
import { getPool } from "./src/database/pgClient.js";

async function run() {
  const pool = getPool();
  try {
    const res = await pool.query("SELECT id, nombre, usuario, contrasena, rol, estado FROM usuarios");
    console.log("=== USUARIOS EN LA BASE DE DATOS POSTGRES ===");
    console.log(res.rows);
  } catch (err) {
    console.error("ERROR querying users:", err);
  } finally {
    await pool.end();
  }
}

run();
