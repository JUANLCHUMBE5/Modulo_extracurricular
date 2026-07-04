import pg from "pg";

const { Pool } = pg;

const poolConfig: pg.PoolConfig = {
  max: Number(process.env.DB_MAX_CONNECTIONS || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS || 2000),
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else {
  poolConfig.host = process.env.DB_HOST || "localhost";
  poolConfig.port = Number(process.env.DB_PORT || 5432);
  poolConfig.user = process.env.DB_USER || "postgres";
  poolConfig.password = process.env.DB_PASSWORD || "postgres";
  poolConfig.database = process.env.DB_NAME || "extracurricular";
}

export const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("[DATABASE ERROR] Error inesperado en un cliente PostgreSQL inactivo:", err);
});
