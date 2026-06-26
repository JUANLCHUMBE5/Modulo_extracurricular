@echo off
set "PATH=%~dp0.tools\node-v24.15.0-win-x64;%PATH%"

echo =======================================================
echo Instalando dependencias de Monorepo (Workspace PNPM)
echo =======================================================
cd /d "%~dp0"
call corepack pnpm install

echo.
echo ¡Todas las dependencias se instalaron correctamente!
echo.
pause
