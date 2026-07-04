-- 4. Tabla de Estudiantes Externos (Invitados sin matrícula regular)
CREATE TABLE IF NOT EXISTS estudiantes_externos (
  "dni" TEXT PRIMARY KEY,
  "codigoEstudiante" TEXT,
  "nombres" TEXT NOT NULL,
  "grado" TEXT,
  "seccion" TEXT,
  "nivel" TEXT,
  "sexo" TEXT,
  "fechaNacimiento" DATE,
  "tipoAlumno" TEXT,
  "estadoMatricula" TEXT,
  "apoderado" TEXT,
  "telefonoApoderado" TEXT,
  "correoApoderado" TEXT,
  "estadoInscripcion" TEXT,
  "estadoCaja" TEXT
);
