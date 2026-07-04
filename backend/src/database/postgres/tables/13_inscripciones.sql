-- 13. Tabla de Inscripciones de Estudiantes en Programas
CREATE TABLE IF NOT EXISTS inscripciones (
  "id" TEXT PRIMARY KEY,
  "dniEstudiante" TEXT REFERENCES estudiantes("dni"),
  "programaId" TEXT REFERENCES programas("id"),
  "estadoPago" TEXT,
  "pagoId" TEXT,
  "costoOriginal" DECIMAL(10,2),
  "descuentoAprobado" BOOLEAN,
  "descuentoTipo" TEXT,
  "descuentoValor" DECIMAL(30,2),
  "descuentoFechaAprobacion" TEXT,
  "descuentoMonto" DECIMAL(10,2),
  "descuentoJustificacion" TEXT,
  "descuentoAprobadoPor" TEXT,
  "derivadoCaja" BOOLEAN,
  "estadoCaja" TEXT,
  "origenRegistro" TEXT,
  "fechaRegistro" TEXT
);
