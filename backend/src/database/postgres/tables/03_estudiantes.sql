-- 3. Tabla de Estudiantes Regulares
CREATE TABLE IF NOT EXISTS estudiantes (
  "dni" TEXT PRIMARY KEY,
  "codigoEstudiante" TEXT,
  "nombres" TEXT NOT NULL,
  "apellidos" TEXT,
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
