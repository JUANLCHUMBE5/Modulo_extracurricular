-- 10. Tabla de Plantillas y Documentos de Programas
CREATE TABLE IF NOT EXISTS programas_documentos (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "plantilla" TEXT,
  "plantillaBase64" TEXT,
  "plantillaVariables" JSONB,
  "plantillaValidada" BOOLEAN,
  "tipoDocumento" TEXT,
  "numeroDocumento" TEXT,
  "areaTematica" TEXT
);
