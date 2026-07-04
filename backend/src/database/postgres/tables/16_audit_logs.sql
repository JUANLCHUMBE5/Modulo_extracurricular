-- 16. Tabla de Logs de Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  "id" TEXT PRIMARY KEY,
  "usuario" TEXT REFERENCES usuarios("usuario") ON DELETE SET NULL,
  "rol" TEXT,
  "fecha" TIMESTAMP,
  "accion" TEXT,
  "detalles" JSONB
);
