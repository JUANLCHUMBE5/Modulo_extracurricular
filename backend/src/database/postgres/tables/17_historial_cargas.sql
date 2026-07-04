-- 17. Tabla de Historial de Cargas Masivas
CREATE TABLE IF NOT EXISTS historial_cargas (
  "id" TEXT PRIMARY KEY,
  "fecha" TEXT,
  "periodo" TEXT,
  "archivoNombre" TEXT,
  "archivos" JSONB,
  "usuario" TEXT REFERENCES usuarios("usuario") ON DELETE SET NULL,
  "resumen" JSONB,
  "registros" JSONB
);
