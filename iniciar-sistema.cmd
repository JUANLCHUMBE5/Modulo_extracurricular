@echo off
set "PATH=%~dp0.tools\node-v24.15.0-win-x64;%PATH%"
cd /d "%~dp0"

:: Detectar el comando de pnpm
where pnpm >nul 2>nul
if %errorlevel% equ 0 (
  set "PM_CMD=pnpm"
) else (
  set "PM_CMD=corepack pnpm"
)

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
  call %PM_CMD% install
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

:: 1.5 Iniciar el Emulador de Firebase si DATA_MODE=firestore y no esta corriendo
findstr /C:"DATA_MODE=firestore" "%~dp0backend\.env" >nul
if %errorlevel% equ 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $t = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 8080); $t.Close(); exit 0 } catch { exit 1 }"
  if errorlevel 1 (
    echo [INFO] Detectado DATA_MODE=firestore. Iniciando emulador de Firebase en segundo plano...
    start "Firebase Emulator - Modulo Extracurricular" /min cmd /c "%PM_CMD% emulators"
    timeout /t 5 >nul
  ) else (
    echo [INFO] Emulador de Firebase ya se encuentra activo en el puerto 8080.
  )
)

:: 2. Iniciar el API Backend si no esta corriendo
call :check_url "%API_URL%"
if errorlevel 1 (
  echo [INFO] Iniciando servidor backend en segundo plano...
  start "API Local - Modulo Extracurricular" /min cmd /c "cd /d "%~dp0backend" && %PM_CMD% start"
)

:: 3. Esperar que el backend este listo
echo [INFO] Esperando a que el backend responda...
where curl >nul 2>nul
if %errorlevel% equ 0 (
  call :wait_backend_curl
) else (
  call :wait_backend_powershell
)
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
%PM_CMD% run dev --host localhost
exit /b %errorlevel%

:check_url
where curl >nul 2>nul
if %errorlevel% equ 0 (
  curl -s -I -m 1 "%~1" >nul 2>nul
  exit /b %errorlevel%
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
  exit /b %errorlevel%
)

:wait_backend_curl
for /l %%i in (1,1,15) do (
  curl -s -m 1 "%API_URL%" >nul 2>nul
  if not errorlevel 1 exit /b 0
  timeout /t 1 >nul
)
exit /b 1

:wait_backend_powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 15; $i++) { try { Invoke-RestMethod -Uri '%API_URL%' -TimeoutSec 2 | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
exit /b %errorlevel%
