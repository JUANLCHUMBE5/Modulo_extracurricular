import pg from "pg";

const { Pool } = pg;

// Inicialización diferida del pool de conexiones para PostgreSQL 17
let pool: pg.Pool | null = null;

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
 * Retorna o inicializa el Pool de conexiones a PostgreSQL.
 * Diseñado con manejo de errores en clientes inactivos y configuraciones optimizadas para producción.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    const maxConnections = Number(process.env.DB_MAX_CONNECTIONS || 20);
    const idleTimeout = Number(process.env.DB_IDLE_TIMEOUT_MS || 30000);
    const connectionTimeout = Number(process.env.DB_CONN_TIMEOUT_MS || 2000);
    const sslEnabled = process.env.DATABASE_SSL === "true";

    const config: pg.PoolConfig = {
      max: maxConnections,
      idleTimeoutMillis: idleTimeout,
      connectionTimeoutMillis: connectionTimeout,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    };

    // Soporte para URL unificada o campos de conexión separados (estándar en nubes tipo AWS/Azure)
    if (process.env.DATABASE_URL) {
      config.connectionString = process.env.DATABASE_URL;
    } else {
      config.host = process.env.DB_HOST || "localhost";
      config.port = Number(process.env.DB_PORT || 5432);
      config.user = process.env.DB_USER || "postgres";
      config.password = process.env.DB_PASSWORD || "postgres";
      config.database = process.env.DB_NAME || "extracurricular";
    }

    console.log(`🔌 [DATABASE] Inicializando Pool de conexiones PostgreSQL (Max Conexiones: ${maxConnections}, SSL: ${sslEnabled})`);

    pool = new Pool(config);

    // Capturador de errores global del pool para evitar caídas del servidor Node (uncaught exceptions)
    // causadas por la pérdida repentina de conexión de un socket inactivo.
    pool.on("error", (err) => {
      console.error("❌ [DATABASE ERROR] Error inesperado en un cliente PostgreSQL inactivo:", err);
    });
  }
  return pool;
}
