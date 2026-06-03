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

## 2. Modo producción futura

Uso: Servidor propio conectado a la API oficial del colegio (o Firebase, según la integración final).

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
