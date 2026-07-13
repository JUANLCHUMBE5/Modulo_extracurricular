# Manual de Despliegue - Módulo Extracurricular

Esta guía detalla los pasos para compilar, configurar y desplegar la plataforma **Módulo Extracurricular** (sistema de control de pagos, matrículas y talleres del Colegio San Rafael) en entornos de desarrollo local y producción.

---

## 1. Arquitectura del Sistema

El proyecto está diseñado bajo una estructura de **Monorepo** gestionado con `pnpm`. Cuenta con dos componentes principales:
*   **Backend**: Servidor de API REST estructurado con **Node.js, Express, TypeScript y tsx** (para ejecución en caliente). Soporta almacenamiento híbrido: persistencia en archivos JSON locales (`local`) o una base de datos relacional (**PostgreSQL 17** o **Supabase**).
*   **Frontend**: Aplicación de página única (SPA) desarrollada con **React, Vite, Mantine (UI Components) y TailwindCSS**.

```mermaid
graph TD
    Browser[Navegador del Usuario / Frontend] -->|Peticiones HTTP / JSON| API[Servidor Express / Backend]
    API -->|Consulta / Escritura| DB_Postgres[(PostgreSQL 17 / Supabase)]
    API -->|Fallback Local / Test| DB_JSON[(db.json / Archivos Locales)]
    API -->|Envío de Alertas / Recibos| SMTP[Servidor SMTP / Gmail]
```

---

## 2. Requisitos Previos del Sistema

Asegúrate de contar con el siguiente software instalado en el servidor o máquina local:
*   **Node.js**: Versión `v20.0.0` o superior (se recomienda LTS `v22.x` o superior).
*   **pnpm**: Administrador de paquetes de Node.js (Versión `9.x` o superior).
*   **PostgreSQL**: Versión `17.x` o superior (solo si se configura en modo de datos `postgres`).
*   **Git**: Para control de versiones y clonación del repositorio.

---

## 3. Configuración del Entorno (`.env`)

Tanto el backend como el frontend requieren variables de entorno específicas para su funcionamiento. Crea los archivos `.env` basándote en las siguientes plantillas:

### A. Backend (`/backend/.env`)
Crea el archivo [backend/.env](../backend/.env) y define las siguientes claves:

```env
# Modo de almacenamiento de datos: 'local' (JSON) o 'postgres' (Base de datos relacional)
DATA_MODE=postgres
VITE_DATA_MODE=postgres

# Puerto del servidor backend y host
PORT=5175
API_HOST=0.0.0.0

# Orígenes CORS permitidos en producción (separados por comas)
FRONTEND_URL=https://talleres.colegiosanrafael.edu.pe
ALLOWED_ORIGINS=https://talleres.colegiosanrafael.edu.pe

# Url de conexión de base de datos PostgreSQL (Requerido si DATA_MODE=postgres)
DATABASE_URL=postgresql://postgres_user:secure_password@127.0.0.1:5432/sanrafael_extracurricular
DATABASE_SSL=false

# Clave secreta para la firma de tokens de sesión JWT
JWT_SECRET=tu-firma-secreta-altamente-segura-en-produccion-64-caracteres

# Configuración del servidor de correo SMTP para alertas de cobranza y fichas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=alertas@colegiosanrafael.edu.pe
SMTP_PASS=tu_contraseña_de_aplicación_gmail
SMTP_SENDER_NAME="Modulo Extracurricular Colegios"

# Emails de copia de cobranzas
EMAIL_COBRANZAS=cobranzas@colegiosanrafael.edu.pe
```

### B. Frontend (`/frontend/.env`)
Crea el archivo [frontend/.env](../frontend/.env) con la URL donde responderá la API del backend:

```env
# Modo de API para el frontend: 'api' para conectar al servidor express, o 'mock' para desarrollo local sin servidor
VITE_API_MODE=api
VITE_DATA_MODE=postgres

# URL pública de producción del Backend (sin '/' al final)
VITE_API_URL=https://api-talleres.colegiosanrafael.edu.pe

# URL de API para desarrollo local
VITE_LOCAL_API_URL=http://127.0.0.1:5175
```

---

## 4. Instalación e Inicio Rápido (Desarrollo Local)

Sigue estos pasos en tu terminal para arrancar la plataforma en modo desarrollo:

1. **Clonar e instalar dependencias de la raíz**:
   ```bash
   pnpm install
   ```
2. **Ejecutar el sistema en paralelo (Frontend + Backend)**:
   ```bash
   pnpm start
   ```
   > [!TIP]
   > Este comando inicia concurrentemente el servidor backend en el puerto `5175` (con refresco en caliente vía tsx watch) y la aplicación Vite del frontend en el puerto `5173`.
   
3. **Detener la ejecución**:
   Presiona `Ctrl + C` una vez en la consola para apagar ambos servidores simultáneamente.

---

## 5. Configuración de Base de Datos y Semillero (Auto-Seeding)

El backend de **Módulo Extracurricular** cuenta con un sistema de inicialización automática muy robusto que facilita la primera instalación:

> [!IMPORTANT]
> **Inicialización y Auto-Seeding Automático:**
> Al cambiar el modo a `postgres` e iniciar el backend por primera vez, Sequelize verificará la conexión a la base de datos y ejecutará de forma automática las sentencias DDL para crear las 17 tablas del sistema. 
> Además, si detecta que la base de datos está vacía, leerá el archivo local de respaldo de datos iniciales y poblará la base de datos relacional de inmediato (seeding automático) para que la plataforma comience con información activa (grados, secciones, configuración de caja inicial, etc.).

### Creación manual (Opcional)
Si deseas realizar auditorías del esquema o deseas crearlo manualmente a través de herramientas de administración como pgAdmin o DBeaver, puedes ejecutar de forma ordenada los scripts DDL individuales ubicados en:
*   [backend/postgres-setup/tables/](../backend/postgres-setup/tables/) (del script `01_usuarios.sql` al `17_historial_cargas.sql`).

---

## 6. Despliegue en Producción

### Paso 1: Empaquetar el Frontend (Vite Build)
Compila la SPA de React para generar los archivos estáticos de producción optimizados:
```bash
pnpm --filter frontend build
```
Este comando generará una carpeta llamada `/frontend/dist` en la raíz del frontend.

*   **Publicación**: Debes subir el contenido de la carpeta `/frontend/dist` a tu servidor de hosting estático favorito (por ejemplo: Nginx local en tu servidor virtual, Apache, AWS S3, Vercel, Netlify, o Cloudflare Pages).
*   **Regla de Redirección (SPA)**: Al ser una aplicación React Router SPA, debes configurar tu servidor web (ej. Nginx) para redireccionar todas las rutas desconocidas al archivo `/index.html`:
    ```nginx
    location / {
        try_files $uri $uri/ /index.html;
    }
    ```

### Paso 2: Desplegar el Backend (Express Server)
1. **Compilar el código TypeScript del backend**:
   ```bash
   pnpm --filter backend build
   ```
   Esto generará el código JavaScript listo para producción en la carpeta `/backend/dist`.
2. **Administrar el proceso en producción (PM2)**:
   Se recomienda usar un gestor de procesos como **PM2** en tu servidor Linux para mantener la API en ejecución en segundo plano y asegurar el autoreinicios ante fallos del sistema:
   ```bash
   # Instalar PM2 globalmente (si no está instalado)
   npm install -g pm2
   
   # Iniciar el backend con PM2
   pm2 start backend/dist/server.js --name "api-extracurricular"
   
   # Guardar la lista de procesos para arranques del servidor
   pm2 save
   pm2 startup
   ```

### Paso 3: SSL y Proxy Inverso (Nginx)
Se recomienda encarecidamente utilizar un servidor proxy inverso como **Nginx** delante de tu API backend para gestionar de forma segura los certificados SSL (vía Let's Encrypt) y enrutar las peticiones HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name api-talleres.colegiosanrafael.edu.pe;

    ssl_certificate /etc/letsencrypt/live/api-talleres.colegiosanrafael.edu.pe/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api-talleres.colegiosanrafael.edu.pe/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5175;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. Mantenimiento y Backups

*   **Base de Datos Relacional**: Programa tareas `cron` semanales de backups mediante `pg_dump`:
    ```bash
    pg_dump -U postgres_user -h 127.0.0.1 -d sanrafael_extracurricular -F c -b -v -f "/backups/db_backup_$(date +%F).dump"
    ```
*   **Logs del Servidor**: Si utilizas PM2, puedes consultar los registros de logs de Express en caliente mediante:
    ```bash
    pm2 logs api-extracurricular
    ```
