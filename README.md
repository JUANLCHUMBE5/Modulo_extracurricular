# Guía de Conexión y Configuración - PostgreSQL 17

Esta carpeta contiene la documentación y las configuraciones de ejemplo necesarias para que puedas cambiar el Módulo Extracurricular de modo de archivos JSON locales a una base de datos **PostgreSQL 17** en producción de forma inmediata.

> [!IMPORTANT]
> **Inicialización y Semillero Automático (Auto-Seeding):**
> Al iniciar el servidor en modo PostgreSQL por primera vez, el sistema ejecutará automáticamente las sentencias DDL para crear todas las tablas requeridas. Además, si detecta que la base de datos de PostgreSQL está vacía, migrará y poblará las tablas de forma automática usando los datos del archivo local `db.json` / `initialData`.

---

## 1. Configuración del Entorno (`.env`)

Para cambiar la conexión, edita el archivo [`.env`](../.env) en la raíz del proyecto y ajusta las siguientes variables:

```env
# 1. Cambia el modo de datos a postgres
DATA_MODE=postgres
VITE_DATA_MODE=postgres

# 2. Configura los datos de conexión de tu servidor PostgreSQL 17
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_base_datos
DATABASE_SSL=false
```

### Parámetros de conexión:
*   **`DATA_MODE`**: Indica al backend que use el motor PostgreSQL (`postgres`) en lugar de archivos JSON locales (`local`).
*   **`DATABASE_URL`**: La URL estándar de conexión de Postgres (`postgresql://[user]:[password]@[host]:[port]/[database]`).
*   **`DATABASE_SSL`**: Setea en `true` si tu base de datos requiere conexión SSL segura (por ejemplo, al usar AWS RDS, Supabase, Azure, etc.).

---

## 2. Esquema de Tablas (DDL)

> [!TIP]
> **Esquemas Modulares por Tabla:**
> Si prefieres revisar, ejecutar o importar las tablas por separado, puedes encontrar los scripts individuales de cada una ordenados por dependencias en la carpeta [backend/postgres-setup/tables/](../backend/postgres-setup/tables/):
> * [01_usuarios.sql](../backend/postgres-setup/tables/01_usuarios.sql) - Tabla de Usuarios y Accesos
> * [02_categorias.sql](../backend/postgres-setup/tables/02_categorias.sql) - Categorías de Talleres
> * [03_estudiantes.sql](../backend/postgres-setup/tables/03_estudiantes.sql) - Estudiantes Regulares
> * [04_estudiantes_externos.sql](../backend/postgres-setup/tables/04_estudiantes_externos.sql) - Estudiantes Externos/Invitados
> * [05_configuracion.sql](../backend/postgres-setup/tables/05_configuracion.sql) - Configuración del Sistema
> * [06_programas.sql](../backend/postgres-setup/tables/06_programas.sql) - Programas y Talleres
> * [07_programas_configuraciones.sql](../backend/postgres-setup/tables/07_programas_configuraciones.sql) - Detalles y Avisos de Programas
> * [08_programas_horarios.sql](../backend/postgres-setup/tables/08_programas_horarios.sql) - Horarios Específicos
> * [09_programas_servicios.sql](../backend/postgres-setup/tables/09_programas_servicios.sql) - Servicios Cambridge, Uniformes, Almuerzos
> * [10_programas_documentos.sql](../backend/postgres-setup/tables/10_programas_documentos.sql) - Plantillas Word y Documentos
> * [11_programas_anuncios.sql](../backend/postgres-setup/tables/11_programas_anuncios.sql) - Imágenes y Anuncios de Talleres
> * [12_invitados_programa.sql](../backend/postgres-setup/tables/12_invitados_programa.sql) - Invitados por Programa
> * [13_inscripciones.sql](../backend/postgres-setup/tables/13_inscripciones.sql) - Matrículas y Descuentos
> * [14_pagos.sql](../backend/postgres-setup/tables/14_pagos.sql) - Registro de Transacciones en Caja
> * [15_asistencias.sql](../backend/postgres-setup/tables/15_asistencias.sql) - Control de Marcaciones y Asistencias
> * [16_audit_logs.sql](../backend/postgres-setup/tables/16_audit_logs.sql) - Logs de Auditoría
> * [17_historial_cargas.sql](../backend/postgres-setup/tables/17_historial_cargas.sql) - Cargas Masivas de Alumnos

Aunque el backend inicializa el esquema automáticamente al conectar por primera vez, aquí tienes el script SQL completo unificado de la estructura relacional por si necesitas crearlo manualmente o verificarlo en PGAdmin:

```sql
-- 1. Tabla de Usuarios y Accesos
CREATE TABLE IF NOT EXISTS usuarios (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT,
  "usuario" TEXT UNIQUE,
  "contrasena" TEXT,
  "rol" TEXT,
  "estado" TEXT,
  "permisos" JSONB
);

-- 2. Tabla de Estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
  "dni" TEXT PRIMARY KEY,
  "codigoEstudiante" TEXT,
  "nombres" TEXT,
  "apellidos" TEXT,
  "grado" TEXT,
  "nivel" TEXT,
  "seccion" TEXT,
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

-- 3. Tabla de Programas / Talleres
CREATE TABLE IF NOT EXISTS programas (
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

-- 4. Configuraciones Adicionales de Programas
CREATE TABLE IF NOT EXISTS programas_configuraciones (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "duracionAvisoDias" INTEGER,
  "horaLimiteAviso" TEXT,
  "edadMinima" INTEGER,
  "edadMaxima" INTEGER,
  "grupoEtario" TEXT,
  "requisitos" TEXT,
  "comunicado" TEXT,
  "comunicadoCompleto" TEXT,
  "detalleCosto" TEXT,
  "creadoDesdeDocumento" BOOLEAN,
  "duracionTaller" TEXT,
  "invitacionMasiva" BOOLEAN,
  "alcanceInvitacionMasiva" TEXT,
  "tipoComunicado" TEXT,
  "motivoJustificacion" TEXT,
  "docente" TEXT,
  "responsable" TEXT,
  "estado" TEXT
);

-- 5. Horarios Específicos
CREATE TABLE IF NOT EXISTS programas_horarios (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "horaInicio" TEXT,
  "horaFin" TEXT,
  "horariosPorGrupo" JSONB,
  "tablaHorariosNivel" JSONB
);

-- 6. Servicios Adicionales (Uniforme, Almuerzo, Cambridge)
CREATE TABLE IF NOT EXISTS programas_servicios (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "requiereUniforme" BOOLEAN,
  "requiereIndumentaria" BOOLEAN,
  "incluyeAlmuerzo" BOOLEAN,
  "horarioRecepcionAlmuerzo" TEXT,
  "concesionarios" JSONB,
  "detalleAlmuerzo" TEXT,
  "nivelCambridge" TEXT,
  "modalidadesCambridge" JSONB,
  "costoCiclo" NUMERIC,
  "montoPrimerPago" NUMERIC,
  "cicloI" JSONB,
  "cicloII" JSONB,
  "nombreCiclo" TEXT
);

-- 7. Plantillas Word de Programas
CREATE TABLE IF NOT EXISTS programas_documentos (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "plantilla" TEXT,
  "plantillaBase64" TEXT,
  "plantillaVariables" JSONB,
  "plantillaValidada" BOOLEAN,
  "tipoDocumento" TEXT,
  "numeroDocumento" TEXT,
  "areaTematica" TEXT
);

-- 8. Anuncios e Imágenes de Programas
CREATE TABLE IF NOT EXISTS programas_anuncios (
  "programaId" TEXT PRIMARY KEY REFERENCES programas("id") ON DELETE CASCADE,
  "anuncioImagen" TEXT,
  "anuncioImagenNombre" TEXT,
  "anuncioImagenTamano" INTEGER,
  "anuncioImagenComprimida" BOOLEAN
);

-- 9. Inscripciones de Estudiantes en Talleres
CREATE TABLE IF NOT EXISTS inscripciones (
  "id" TEXT PRIMARY KEY,
  "dniEstudiante" TEXT,
  "programaId" TEXT,
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
  "extraFields" JSONB
);

-- 10. Pagos Registrados en Caja
CREATE TABLE IF NOT EXISTS pagos (
  "id" TEXT PRIMARY KEY,
  "inscripcionId" TEXT,
  "dniEstudiante" TEXT,
  "programaId" TEXT,
  "monto" NUMERIC,
  "formaPago" TEXT,
  "numeroOperacion" TEXT,
  "telefonoOperacion" TEXT,
  "capturaPagoNombre" TEXT,
  "capturaPagoBase64" TEXT,
  "estado" TEXT,
  "fecha" TEXT,
  "fechaPago" TEXT,
  "origenRegistro" TEXT,
  "nroRecibo" TEXT,
  "extraFields" JSONB
);

-- 11. Control de Asistencias (QR o DNI)
CREATE TABLE IF NOT EXISTS asistencias (
  "id" TEXT PRIMARY KEY,
  "inscripcionId" TEXT,
  "pagoId" TEXT,
  "dniEstudiante" TEXT,
  "programaId" TEXT,
  "estadoAcceso" TEXT,
  "observacion" TEXT,
  "origen" TEXT,
  "fechaRegistro" TEXT,
  "extraFields" JSONB
);

-- 12. Listas de Invitados de los Programas
CREATE TABLE IF NOT EXISTS invitados_programa (
  "programaId" TEXT,
  "dni" TEXT,
  "nombres" TEXT,
  "grado" TEXT,
  "seccion" TEXT,
  "seleccion" TEXT,
  "nivelCambridge" TEXT,
  PRIMARY KEY ("programaId", "dni")
);

-- 13. Historial de Cargas Masivas de Alumnos
CREATE TABLE IF NOT EXISTS historial_cargas (
  "id" TEXT PRIMARY KEY,
  "fecha" TEXT,
  "periodo" TEXT,
  "archivoNombre" TEXT,
  "archivos" JSONB,
  "usuario" TEXT,
  "resumen" JSONB,
  "registros" JSONB
);

-- 14. Logs de Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  "id" TEXT PRIMARY KEY,
  "fecha" TEXT,
  "usuario" TEXT,
  "rol" TEXT,
  "accion" TEXT,
  "detalles" JSONB
);

-- 15. Categorías de Cursos
CREATE TABLE IF NOT EXISTS categorias (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT,
  "color" TEXT,
  "icono" TEXT
);

-- 16. Configuración Institucional
CREATE TABLE IF NOT EXISTS configuracion (
  "id" TEXT PRIMARY KEY,
  "nombreInstitucion" TEXT,
  "periodoActivo" TEXT,
  "logoUrl" TEXT,
  "direccion" TEXT,
  "telefono" TEXT
);
```

---

## 3. Verificación de Funcionamiento

Una vez que guardes los cambios en el archivo `.env`, inicia el sistema ejecutando [`iniciar-sistema.cmd`](../iniciar-sistema.cmd).

Para confirmar que está operando sobre PostgreSQL, puedes abrir el endpoint de salud de la API en tu navegador:
👉 **[http://127.0.0.1:5175/api/health](http://127.0.0.1:5175/api/health)**

Si la conexión es exitosa, el campo `dbSource` responderá `"postgresql"`:
```json
{
  "ok": true,
  "dbSource": "postgresql"
}
```
y verás las consultas e inserciones reflejadas en tiempo real en tu base de datos de PostgreSQL 17.
