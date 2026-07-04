-- 14. Tabla de Pagos Registrados en Caja
CREATE TABLE IF NOT EXISTS pagos (
  "id" TEXT PRIMARY KEY,
  "inscripcionId" TEXT REFERENCES inscripciones("id") ON DELETE SET NULL,
  "dniEstudiante" TEXT REFERENCES estudiantes("dni"),
  "programaId" TEXT REFERENCES programas("id"),
  "monto" DECIMAL(10,2) NOT NULL CHECK ("monto" >= 0),
  "formaPago" TEXT,
  "numeroOperacion" TEXT,
  "telefonoOperacion" TEXT,
  "capturaPagoNombre" TEXT,
  "capturaPagoBase64" TEXT,
  "estado" TEXT,
  "fecha" TEXT,
  "fechaPago" DATE,
  "origenRegistro" TEXT,
  "nroRecibo" TEXT
);
