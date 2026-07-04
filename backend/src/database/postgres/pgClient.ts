import pg from "pg";
import { pool } from "./connection.js";

/**
 * Determina si la base de datos PostgreSQL 17 está activada en la configuración.
 */
export function isPgEnabled(): boolean {
  return (
    process.env.DATA_MODE === "postgres" ||
    !!process.env.DATABASE_URL ||
    !!process.env.DB_HOST
  );
}

/**
 * Retorna el Pool de conexiones a PostgreSQL 17.
 */
export function getPool(): pg.Pool {
  return pool;
}
