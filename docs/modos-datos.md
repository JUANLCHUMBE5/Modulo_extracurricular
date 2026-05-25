# Modos de datos

El frontend siempre habla con la misma ruta: `/api/db`. El cambio de entorno se decide en el backend con `DATA_MODE` y en el frontend con `VITE_DATA_MODE`.

## 1. Modo local

Uso: VS Code, pruebas internas y respaldo local.

Variables:

```env
DATA_MODE=local
VITE_DATA_MODE=local
VITE_API_URL=
VITE_LOCAL_API_URL=http://127.0.0.1:5175
```

Comandos:

```bash
corepack pnpm run api:local
corepack pnpm run dev:local
```

Tambien puedes usar el archivo de arranque en Windows:

```bash
iniciar-react.cmd
```

Estos comandos trabajan en tu maquina y no consumen builds de Vercel.

Datos: `server/db.json`.

## 2. Modo piloto

Uso: Vercel + Supabase para probar por internet.

Variables en Vercel:

```env
DATA_MODE=pilot
VITE_DATA_MODE=pilot
SUPABASE_URL=https://zgfqlgkjibweewcejnro.supabase.co
SUPABASE_SECRET_KEY=TU_SERVICE_ROLE_KEY
SUPABASE_PILOT_TABLE=modulo_pilot_database
SUPABASE_PILOT_ROW_ID=modulo-extracurricular
SUPABASE_STORAGE_MODE=json
```

Si el frontend y la API estan en el mismo proyecto Vercel, `VITE_API_URL` puede quedar vacio porque el navegador usa `/api/db`.

Antes del primer uso, ejecutar en Supabase el SQL de `docs/supabase-piloto.sql`.

Para copiar la base local actual al piloto:

```bash
$env:DATA_MODE="pilot"; corepack pnpm run db:push-supabase-pilot
```

### Piloto por tablas

Este es el camino nuevo para dejar de depender del JSON gigante.

1. Ejecutar en Supabase SQL Editor:

```txt
docs/supabase-tablas-piloto.sql
```

2. Migrar la base local a tablas:

```bash
corepack pnpm run db:push-supabase-tables
```

3. Cuando las tablas ya tengan datos, cambiar en Vercel:

```env
SUPABASE_STORAGE_MODE=tables
```

Con ese modo, `/api/db` arma la base desde tablas como `programas`, `inscripciones`, `pagos`, `estudiantes` y `plantillas_programa`. La app sigue funcionando igual mientras migramos los servicios internos poco a poco.

Para cuidar el plan gratuito de Vercel, configura en Vercel:

```bash
corepack pnpm run vercel:ignore-build
```

Ruta en Vercel: `Project Settings > Git > Ignored Build Step`.

Con ese freno, Vercel no construye cada commit. Solo construye cuando:

- El mensaje del commit contiene `[deploy]`, `[vercel]` o `[nube]`.
- O el push va a una rama llamada `deploy` o `piloto`.

Ejemplo para desplegar intencionalmente:

```bash
git add .
git commit -m "Actualiza piloto [deploy]"
git push
```

Ejemplo para guardar cambios en GitHub sin gastar build de Vercel:

```bash
git add .
git commit -m "Trabajo local de coordinacion"
git push
```

## 3. Modo produccion futura

Uso: Vercel o servidor propio conectado a la API oficial del colegio.

Variables en el backend:

```env
DATA_MODE=production
VITE_DATA_MODE=production
OFFICIAL_API_BASE_URL=https://api-colegio.ejemplo.pe
OFFICIAL_API_DB_PATH=/api/modulo-extracurricular
OFFICIAL_API_TOKEN=
OFFICIAL_API_KEY=
```

El frontend no recibe el token oficial. La app llama a `/api/db`; el backend reenvia la lectura y escritura a `OFFICIAL_API_BASE_URL`.

Contrato esperado por ahora:

- `GET OFFICIAL_API_DB_PATH`: devuelve la base completa o `{ "data": baseCompleta }`.
- `PUT OFFICIAL_API_DB_PATH`: recibe la base completa y devuelve la base guardada o `{ "data": baseGuardada }`.
- `POST OFFICIAL_API_RESET_PATH`: opcional; solo se usa si el colegio ofrece una ruta de reinicio.

Cuando tu jefe entregue el contrato real, solo se ajusta el adaptador del backend. Coordinacion, Secretaria, Padres y Caja siguen usando la misma capa `/api/db`.
