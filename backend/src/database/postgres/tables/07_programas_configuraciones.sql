-- 7. Tabla de Configuraciones Adicionales de Programas
CREATE TABLE IF NOT EXISTS programas_configuraciones (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "duracionAvisoDias" INTEGER,
  "horaLimiteAviso" TEXT,
  "edadMinima" INTEGER,
  "edadMaxima" INTEGER,
  "grupoEtario" TEXT,
  "requisitos" TEXT,
  "comunicado" TEXT,
  "comunicadoCompleto" JSONB,
  "detalleCosto" TEXT,
  "creadoDesdeDocumento" BOOLEAN,
  "duracionTaller" TEXT,
  "invitacionMasiva" BOOLEAN,
  "alcanceInvitacionMasiva" TEXT,
  "tipoComunicado" TEXT,
  "motivoJustificacion" TEXT,
  "duracion" INTEGER,
  "docente" TEXT,
  "responsable" TEXT,
  "estado" TEXT
);
