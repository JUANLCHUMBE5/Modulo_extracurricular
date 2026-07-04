-- 12. Tabla de Invitados por Programa
CREATE TABLE IF NOT EXISTS invitados_programa (
  "programaId" TEXT REFERENCES programas("id") ON DELETE CASCADE,
  "dni" TEXT,
  "nombres" TEXT NOT NULL,
  "grado" TEXT,
  "seccion" TEXT,
  "seleccion" TEXT,
  "nivelCambridge" TEXT,
  PRIMARY KEY ("programaId", "dni")
);
