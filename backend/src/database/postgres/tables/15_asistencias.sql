-- 15. Tabla de Asistencias (Marcaciones)
CREATE TABLE IF NOT EXISTS asistencias (
  "id" TEXT PRIMARY KEY,
  "inscripcionId" TEXT REFERENCES inscripciones("id") ON DELETE SET NULL,
  "pagoId" TEXT REFERENCES pagos("id") ON DELETE SET NULL,
  "dniEstudiante" TEXT REFERENCES estudiantes("dni"),
  "programaId" TEXT REFERENCES programas("id"),
  "estadoAcceso" TEXT,
  "observacion" TEXT,
  "origen" TEXT,
  "fechaRegistro" TIMESTAMP
);
