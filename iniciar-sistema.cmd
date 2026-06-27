@echo off
set "PATH=%~dp0.tools\node-v24.15.0-win-x64;%PATH%"
cd /d "%~dp0"

set "APP_URL=http://localhost:5173"
set "API_URL=http://127.0.0.1:5175/api/health"

echo =======================================================
echo    Modulo Extracurricular - Gestor de Inicio Rapido
echo =======================================================
echo.

:: 1. Verificar si requiere instalacion de dependencias
if not exist "%~dp0node_modules" (
  echo [INFO] No se detecto la carpeta node_modules.
  echo [INFO] Instalando dependencias por primera vez, por favor espere...
  echo.
  call corepack pnpm install
  if errorlevel 1 (
    echo.
    echo [ERROR] No se pudieron instalar las dependencias correctamente.
    echo Verifica tu conexion a internet o si Node/pnpm estan instalados.
    pause
    exit /b 1
  )
  echo.
  echo [OK] Dependencias instaladas con exito.
  echo.
)

:: 2. Iniciar el API Backend si no esta corriendo
call :check_url "%API_URL%"
if errorlevel 1 (
  echo [INFO] Iniciando servidor backend en segundo plano...
  start "API Local - Modulo Extracurricular" /min cmd /c "cd /d "%~dp0backend" && node server.js"
)

:: 3. Esperar que el backend este listo
echo [INFO] Esperando a que el backend responda...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 15; $i++) { try { Invoke-RestMethod -Uri '%API_URL%' -TimeoutSec 2 | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo conectar con el API local en http://127.0.0.1:5175
  echo Verifica que el puerto 5175 no este ocupado o reinicia la terminal.
  pause
  exit /b 1
)

:: 4. Iniciar y abrir el navegador para el Frontend
call :check_url "%APP_URL%"
if not errorlevel 1 (
  echo.
  echo [INFO] El modulo ya esta activo. Abriendo en el navegador...
  start "" "%APP_URL%"
  exit /b 0
)

echo [INFO] Abriendo aplicacion en el navegador...
start "Abrir Modulo Extracurricular" cmd /c "timeout /t 3 >nul && start %APP_URL%"

echo [INFO] Iniciando frontend...
cd /d "%~dp0frontend"
corepack pnpm run dev --host localhost
exit /b %errorlevel%

:check_url
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
exit /b %errorlevel%
