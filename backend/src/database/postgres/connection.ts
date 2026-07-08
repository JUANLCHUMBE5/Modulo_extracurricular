import { Sequelize } from "sequelize";

const sslConfig = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false;

// Instancia de Sequelize
export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        ssl: sslConfig,
      },
      pool: {
        max: Number(process.env.DB_MAX_CONNECTIONS || 20),
        idle: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
        acquire: 20000,
      },
    })
  : new Sequelize(
      process.env.DB_NAME || "extracurricular",
      process.env.DB_USER || "postgres",
      process.env.DB_PASSWORD || "postgres",
      {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5432),
        dialect: "postgres",
        logging: false,
        dialectOptions: {
          ssl: sslConfig,
        },
        pool: {
          max: Number(process.env.DB_MAX_CONNECTIONS || 20),
          idle: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
          acquire: 20000,
        },
      }
    );
