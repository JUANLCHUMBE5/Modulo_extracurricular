@echo off
set "PATH=%~dp0.tools\node-v24.15.0-win-x64;%PATH%"
cd /d "%~dp0"

echo Iniciando Modulo Extracurricular...
echo.
echo URL de la app:
echo   http://127.0.0.1:5173
echo.
echo El API local se inicia en segundo plano. No necesitas abrirlo.
echo.

start "API Local - Modulo Extracurricular" /min npm.cmd run api
echo Esperando API local y base server/db.json...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 15; $i++) { try { Invoke-RestMethod -Uri 'http://127.0.0.1:5175/api/db' -TimeoutSec 2 | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar la API local en http://127.0.0.1:5175
  echo Verifica que el puerto 5175 no este ocupado o reinicia la terminal.
  pause
  exit /b 1
)

start "Abrir Modulo Extracurricular" cmd /c "timeout /t 3 >nul && start http://127.0.0.1:5173"
npm.cmd run dev -- --host 127.0.0.1
