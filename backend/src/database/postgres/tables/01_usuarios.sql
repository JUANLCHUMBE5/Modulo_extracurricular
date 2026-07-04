-- 1. Tabla de Usuarios y Accesos
CREATE TABLE IF NOT EXISTS usuarios (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "usuario" TEXT NOT NULL UNIQUE,
  "rol" TEXT NOT NULL,
  "estado" TEXT,
  "contrasena" TEXT NOT NULL,
  "permisos" JSONB
);
