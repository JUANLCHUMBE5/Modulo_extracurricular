-- 2. Tabla de Categorías de Talleres
CREATE TABLE IF NOT EXISTS categorias (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);
