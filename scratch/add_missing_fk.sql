-- =====================================================
-- SCRIPT: Agregar Foreign Keys faltantes
-- Conectar tablas independientes que deben tener relación
-- =====================================================
-- EJECUTAR EN: Supabase > SQL Editor
-- =====================================================

-- 1. INSCRIPCIONES → ESTUDIANTES (por dniEstudiante)
ALTER TABLE "inscripciones"
  DROP CONSTRAINT IF EXISTS fk_inscripcion_estudiante;

ALTER TABLE "inscripciones"
  ADD CONSTRAINT fk_inscripcion_estudiante
  FOREIGN KEY ("dniEstudiante")
  REFERENCES "estudiantes" ("dni")
  ON DELETE CASCADE;

-- 2. PAGOS → ESTUDIANTES (por dniEstudiante)
ALTER TABLE "pagos"
  DROP CONSTRAINT IF EXISTS fk_pago_estudiante;

ALTER TABLE "pagos"
  ADD CONSTRAINT fk_pago_estudiante
  FOREIGN KEY ("dniEstudiante")
  REFERENCES "estudiantes" ("dni")
  ON DELETE CASCADE;

-- 3. ASISTENCIAS → ESTUDIANTES (por dniEstudiante)
ALTER TABLE "asistencias"
  DROP CONSTRAINT IF EXISTS fk_asistencia_estudiante;

ALTER TABLE "asistencias"
  ADD CONSTRAINT fk_asistencia_estudiante
  FOREIGN KEY ("dniEstudiante")
  REFERENCES "estudiantes" ("dni")
  ON DELETE CASCADE;
