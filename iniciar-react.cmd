@echo off
set "PATH=%~dp0.tools\node-v24.15.0-win-x64;%PATH%"
cd /d "%~dp0"
set "APP_URL=http://localhost:5173"
set "API_URL=http://127.0.0.1:5175/api/db"

echo Iniciando Modulo Extracurricular...
echo.
echo URL de la app:
echo   %APP_URL%
echo.
echo El API local se inicia en segundo plano. No necesitas abrirlo.
echo.

call :check_url "%API_URL%"
if errorlevel 1 (
  start "API Local - Modulo Extracurricular" /min corepack pnpm run api
)

echo Esperando API local y base server/db.json...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 15; $i++) { try { Invoke-RestMethod -Uri '%API_URL%' -TimeoutSec 2 | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar la API local en http://127.0.0.1:5175
  echo Verifica que el puerto 5175 no este ocupado o reinicia la terminal.
  pause
  exit /b 1
)

call :check_url "%APP_URL%"
if not errorlevel 1 (
  echo.
  echo La app ya esta iniciada. Abriendo navegador...
  start "" "%APP_URL%"
  exit /b 0
)

start "Abrir Modulo Extracurricular" cmd /c "timeout /t 3 >nul && start %APP_URL%"
corepack pnpm run dev --host localhost
exit /b %errorlevel%

:check_url
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
exit /b %errorlevel%
