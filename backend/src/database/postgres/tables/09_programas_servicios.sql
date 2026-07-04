-- 9. Tabla de Servicios Adicionales (Uniforme, Deporte, Almuerzo, Cambridge)
CREATE TABLE IF NOT EXISTS programas_servicios (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "requiereUniforme" BOOLEAN,
  "requiereIndumentaria" BOOLEAN,
  "talleresDeportivos" JSONB,
  "incluyeAlmuerzo" BOOLEAN,
  "horarioRecepcionAlmuerzo" TEXT,
  "concesionarios" JSONB,
  "detalleAlmuerzo" TEXT,
  "nivelCambridge" TEXT,
  "modalidadesCambridge" JSONB,
  "costoCiclo" DECIMAL(10,2),
  "montoPrimerPago" DECIMAL(10,2),
  "cicloI" BOOLEAN,
  "cicloII" BOOLEAN,
  "nombreCiclo" TEXT
);
