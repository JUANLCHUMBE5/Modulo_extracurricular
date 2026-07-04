-- 8. Tabla de Horarios de Programas
CREATE TABLE IF NOT EXISTS programas_horarios (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "horaInicio" TEXT,
  "horaFin" TEXT,
  "horariosPorGrupo" JSONB,
  "tablaHorariosNivel" JSONB
);
