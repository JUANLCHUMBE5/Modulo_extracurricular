# Módulo Extracurricular - Colegio San Rafael

Este es el módulo de control de programas extracurriculares de la Institución Matemática San Rafael S.A.C.

## Guía de Trabajo Local

### Arquitectura
El sistema está estructurado bajo el siguiente flujo:
```
Frontend React -> Services / apiClient -> API local -> db.json
```

El frontend no lee archivos locales directamente. Siempre consume endpoints de la API local a través de services.

### Advertencia de Persistencia Local
> [!IMPORTANT]
> El archivo db.json se utiliza únicamente como fuente de datos local para pruebas funcionales durante la etapa de desarrollo. El frontend no accede directamente a dicho archivo, sino que consume la API local mediante services y apiClient. En una etapa posterior, db.json será reemplazado por una base de datos real o por la base de datos del sistema principal, según la arquitectura definida con el responsable del sistema institucional.

### Comandos de Ejecución Local

1. **Levantar la API Local (Backend):**
   ```bash
   npm run api
   ```
   o si usa pnpm:
   ```bash
   pnpm api
   ```
   El servidor se iniciará en `http://127.0.0.1:5175`.

2. **Levantar el Frontend:**
   ```bash
   npm run dev
   ```
   o si usa pnpm:
   ```bash
   pnpm dev
   ```
   La aplicación se iniciará en `http://localhost:5173` (o `http://localhost:5173`).

### Configuración del Entorno (.env)
Asegúrese de contar con el archivo `.env` en la raíz del proyecto configurado de la siguiente manera:
```env
DATA_MODE=local
VITE_DATA_MODE=local
VITE_API_MODE=api
VITE_API_URL=http://127.0.0.1:5175
VITE_LOCAL_API_URL=http://127.0.0.1:5175
JWT_SECRET=cambiar-por-secreto-seguro-en-produccion
```