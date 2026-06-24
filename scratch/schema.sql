-- SCRIPT DE CREACIÓN DE ESQUEMA PARA SUPABASE
-- Generado automáticamente para migración de cuenta

-- 0. LIMPIEZA DE TABLAS EXISTENTES
DROP TABLE IF EXISTS "programas_configuraciones" CASCADE;
DROP TABLE IF EXISTS "programas_horarios" CASCADE;
DROP TABLE IF EXISTS "programas_servicios" CASCADE;
DROP TABLE IF EXISTS "programas_documentos" CASCADE;
DROP TABLE IF EXISTS "programas_anuncios" CASCADE;
DROP TABLE IF EXISTS "invitados_programa" CASCADE;
DROP TABLE IF EXISTS "asistencias" CASCADE;
DROP TABLE IF EXISTS "pagos" CASCADE;
DROP TABLE IF EXISTS "inscripciones" CASCADE;
DROP TABLE IF EXISTS "programas" CASCADE;
DROP TABLE IF EXISTS "estudiantes_externos" CASCADE;
DROP TABLE IF EXISTS "estudiantes" CASCADE;
DROP TABLE IF EXISTS "usuarios" CASCADE;
DROP TABLE IF EXISTS "historial_cargas" CASCADE;
DROP TABLE IF EXISTS "configuracion" CASCADE;
DROP TABLE IF EXISTS "categorias" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;

-- ==========================================
-- TABLA: usuarios
-- ==========================================
CREATE TABLE "usuarios" (
  "id" INTEGER PRIMARY KEY,
  "nombre" TEXT,
  "usuario" TEXT,
  "rol" TEXT,
  "estado" TEXT,
  "contrasena" TEXT
);

-- ==========================================
-- TABLA: estudiantes
-- ==========================================
CREATE TABLE "estudiantes" (
  "dni" TEXT PRIMARY KEY,
  "codigoEstudiante" TEXT,
  "nombres" TEXT,
  "grado" TEXT,
  "seccion" TEXT,
  "nivel" TEXT,
  "sexo" TEXT,
  "fechaNacimiento" TEXT,
  "tipoAlumno" TEXT,
  "estadoMatricula" TEXT,
  "apoderado" TEXT,
  "telefonoApoderado" TEXT,
  "correoApoderado" TEXT,
  "estadoInscripcion" TEXT,
  "estadoCaja" TEXT
);

-- ==========================================
-- TABLA: estudiantes_externos
-- ==========================================
CREATE TABLE "estudiantes_externos" (
  "dni" TEXT PRIMARY KEY,
  "codigoEstudiante" TEXT,
  "nombres" TEXT,
  "grado" TEXT,
  "seccion" TEXT,
  "nivel" TEXT,
  "sexo" TEXT,
  "fechaNacimiento" TEXT,
  "tipoAlumno" TEXT,
  "estadoMatricula" TEXT,
  "apoderado" TEXT,
  "telefonoApoderado" TEXT,
  "correoApoderado" TEXT,
  "estadoInscripcion" TEXT,
  "estadoCaja" TEXT
);

-- ==========================================
-- TABLA: programas
-- ==========================================
CREATE TABLE "programas" (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT,
  "categoria" TEXT,
  "fechaInicio" TEXT,
  "fechaFin" TEXT,
  "costo" NUMERIC,
  "cupos" INTEGER,
  "cuposOcupados" INTEGER,
  "gradosAplicables" JSONB,
  "periodo" TEXT,
  "modalidadCobro" TEXT,
  "horario" TEXT,
  "grupo" TEXT
);

-- ==========================================
-- TABLA: inscripciones
-- ==========================================
CREATE TABLE "inscripciones" (
  "id" TEXT PRIMARY KEY,
  "dniEstudiante" TEXT,
  "codigoEstudiante" TEXT,
  "nombresEstudiante" TEXT,
  "gradoEstudiante" TEXT,
  "seccion" TEXT,
  "programaId" TEXT,
  "programa" TEXT,
  "categoria" TEXT,
  "periodo" TEXT,
  "horario" TEXT,
  "docente" TEXT,
  "costo" NUMERIC,
  "modalidadCobro" TEXT,
  "fechaInicio" TEXT,
  "fechaFin" TEXT,
  "estadoPago" TEXT,
  "pagoId" TEXT,
  "costoOriginal" NUMERIC,
  "descuentoAprobado" BOOLEAN,
  "descuentoTipo" TEXT,
  "descuentoValor" NUMERIC,
  "descuentoMonto" NUMERIC,
  "descuentoJustificacion" TEXT,
  "descuentoAprobadoPor" TEXT,
  "descuentoFechaAprobacion" TEXT,
  "derivadoCaja" BOOLEAN,
  "estadoCaja" TEXT,
  "origenRegistro" TEXT,
  "fechaRegistro" TEXT,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE,
  CONSTRAINT fk_inscripcion_estudiante FOREIGN KEY ("dniEstudiante") REFERENCES "estudiantes" ("dni") ON DELETE CASCADE
);

-- ==========================================
-- TABLA: pagos
-- ==========================================
CREATE TABLE "pagos" (
  "id" TEXT PRIMARY KEY,
  "inscripcionId" TEXT,
  "dniEstudiante" TEXT,
  "nombresEstudiante" TEXT,
  "programaId" TEXT,
  "programa" TEXT,
  "periodo" TEXT,
  "monto" NUMERIC,
  "formaPago" TEXT,
  "numeroOperacion" TEXT,
  "telefonoOperacion" TEXT,
  "capturaPagoNombre" TEXT,
  "capturaPagoBase64" TEXT,
  "estado" TEXT,
  "fechaPago" TEXT,
  "origenRegistro" TEXT,
  "nro_recibo" TEXT,
  CONSTRAINT fk_inscripcion FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones" ("id") ON DELETE SET NULL,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE SET NULL,
  CONSTRAINT fk_pago_estudiante FOREIGN KEY ("dniEstudiante") REFERENCES "estudiantes" ("dni") ON DELETE CASCADE
);

-- ==========================================
-- TABLA: asistencias
-- ==========================================
CREATE TABLE "asistencias" (
  "id" TEXT PRIMARY KEY,
  "inscripcionId" TEXT,
  "pagoId" TEXT,
  "dniEstudiante" TEXT,
  "codigoEstudiante" TEXT,
  "nombresEstudiante" TEXT,
  "programaId" TEXT,
  "programa" TEXT,
  "horario" TEXT,
  "estadoPago" TEXT,
  "estadoAcceso" TEXT,
  "observacion" TEXT,
  "origen" TEXT,
  "fechaRegistro" TEXT,
  CONSTRAINT fk_inscripcion FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones" ("id") ON DELETE SET NULL,
  CONSTRAINT fk_pago FOREIGN KEY ("pagoId") REFERENCES "pagos" ("id") ON DELETE SET NULL,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE,
  CONSTRAINT fk_asistencia_estudiante FOREIGN KEY ("dniEstudiante") REFERENCES "estudiantes" ("dni") ON DELETE CASCADE
);

-- ==========================================
-- TABLA: invitados_programa
-- ==========================================
CREATE TABLE "invitados_programa" (
  "programaId" TEXT,
  "dni" TEXT,
  "nombres" TEXT,
  "grado" TEXT,
  "seccion" TEXT,
  "seleccion" TEXT,
  "nivelCambridge" TEXT,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE,
  PRIMARY KEY ("programaId", "dni")
);

-- ==========================================
-- TABLA: historial_cargas
-- ==========================================
CREATE TABLE "historial_cargas" (
  "id" TEXT PRIMARY KEY,
  "fecha" TEXT,
  "periodo" TEXT,
  "archivoNombre" TEXT,
  "archivos" JSONB,
  "usuario" TEXT,
  "resumen" JSONB,
  "registros" JSONB
);

-- ==========================================
-- TABLA: configuracion
-- ==========================================
CREATE TABLE "configuracion" (
  "clave" TEXT PRIMARY KEY,
  "valor" TEXT,
  "updated_at" TEXT
);

-- ==========================================
-- TABLA: categorias
-- ==========================================
CREATE TABLE "categorias" (
  "id" BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "categoria" TEXT
);

-- ==========================================
-- TABLA: audit_logs
-- ==========================================
CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "usuario" TEXT,
  "rol" TEXT,
  "fecha" TEXT,
  "accion" TEXT,
  "detalles" JSONB
);

-- ==========================================
-- TABLA: programas_configuraciones
-- ==========================================
CREATE TABLE "programas_configuraciones" (
  "programaId" TEXT PRIMARY KEY,
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
  "duracionTaller" INTEGER,
  "invitacionMasiva" BOOLEAN,
  "alcanceInvitacionMasiva" TEXT,
  "tipoComunicado" TEXT,
  "motivoJustificacion" TEXT,
  "duracion" INTEGER,
  "docente" TEXT,
  "responsable" TEXT,
  "estado" TEXT,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE
);

-- ==========================================
-- TABLA: programas_horarios
-- ==========================================
CREATE TABLE "programas_horarios" (
  "programaId" TEXT PRIMARY KEY,
  "horaInicio" TEXT,
  "horaFin" TEXT,
  "horariosPorGrupo" JSONB,
  "tablaHorariosNivel" JSONB,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE
);

-- ==========================================
-- TABLA: programas_servicios
-- ==========================================
CREATE TABLE "programas_servicios" (
  "programaId" TEXT PRIMARY KEY,
  "requiereUniforme" BOOLEAN,
  "requiereIndumentaria" BOOLEAN,
  "talleresDeportivos" JSONB,
  "incluyeAlmuerzo" BOOLEAN,
  "horarioRecepcionAlmuerzo" TEXT,
  "concesionarios" JSONB,
  "detalleAlmuerzo" TEXT,
  "nivelCambridge" TEXT,
  "modalidadesCambridge" JSONB,
  "costoCiclo" NUMERIC,
  "montoPrimerPago" NUMERIC,
  "cicloI" BOOLEAN,
  "cicloII" BOOLEAN,
  "nombreCiclo" TEXT,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE
);

-- ==========================================
-- TABLA: programas_documentos
-- ==========================================
CREATE TABLE "programas_documentos" (
  "programaId" TEXT PRIMARY KEY,
  "plantilla" TEXT,
  "plantillaBase64" TEXT,
  "plantillaVariables" JSONB,
  "plantillaValidada" BOOLEAN,
  "tipoDocumento" TEXT,
  "numeroDocumento" TEXT,
  "areaTematica" TEXT,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE
);

-- ==========================================
-- TABLA: programas_anuncios
-- ==========================================
CREATE TABLE "programas_anuncios" (
  "programaId" TEXT PRIMARY KEY,
  "anuncioImagen" TEXT,
  "anuncioImagenNombre" TEXT,
  "anuncioImagenTamano" INTEGER,
  "anuncioImagenComprimida" TEXT,
  CONSTRAINT fk_programa FOREIGN KEY ("programaId") REFERENCES "programas" ("id") ON DELETE CASCADE
);

-- HABILITAR ACCESO COMPLETO (DESACTIVAR RLS PARA SIMPLIFICAR EL MÓDULO ACTUAL)
ALTER TABLE "usuarios" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "estudiantes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "estudiantes_externos" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "programas" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "inscripciones" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "pagos" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "asistencias" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "invitados_programa" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "historial_cargas" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "configuracion" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "categorias" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "programas_configuraciones" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "programas_horarios" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "programas_servicios" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "programas_documentos" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "programas_anuncios" DISABLE ROW LEVEL SECURITY;

-- CONCEDER PERMISOS A LOS ROLES ANON Y AUTHENTICATED
GRANT ALL PRIVILEGES ON TABLE "usuarios" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "estudiantes" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "estudiantes_externos" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "programas" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "inscripciones" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "pagos" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "asistencias" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "invitados_programa" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "historial_cargas" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "configuracion" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "categorias" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "audit_logs" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "programas_configuraciones" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "programas_horarios" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "programas_servicios" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "programas_documentos" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE "programas_anuncios" TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
