-- 5. Tabla de Configuración del Sistema
CREATE TABLE IF NOT EXISTS configuracion (
  "id" TEXT PRIMARY KEY,
  "nombreInstitucion" TEXT,
  "periodoActivo" TEXT,
  "logoUrl" TEXT,
  "direccion" TEXT,
  "telefono" TEXT
);
