-- 11. Tabla de Anuncios e Imágenes de Programas
CREATE TABLE IF NOT EXISTS programas_anuncios (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "anuncioImagen" TEXT,
  "anuncioImagenNombre" TEXT,
  "anuncioImagenTamano" INTEGER,
  "anuncioImagenComprimida" BOOLEAN
);
