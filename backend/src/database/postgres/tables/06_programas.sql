-- 6. Tabla de Programas / Talleres
CREATE TABLE IF NOT EXISTS programas (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT REFERENCES categorias("id"),
  "fechaInicio" DATE,
  "fechaFin" DATE,
  "costo" DECIMAL(10,2) NOT NULL CHECK ("costo" >= 0),
  "cupos" INTEGER NOT NULL CHECK ("cupos" >= 0),
  "cuposOcupados" INTEGER,
  "gradosAplicables" JSONB,
  "periodo" TEXT,
  "modalidadCobro" TEXT,
  "horario" TEXT,
  "grupo" TEXT
);
