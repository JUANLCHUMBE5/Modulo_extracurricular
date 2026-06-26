#!/bin/bash

# Evitar errores si alguna carpeta no existe
set -e

echo "==========================================="
echo "Instalando dependencias de Frontend (React)"
echo "==========================================="
cd "$(dirname "$0")/frontend"
corepack pnpm install

echo -e "\n==========================================="
echo "Instalando dependencias de Backend (Node)"
echo "==========================================="
cd "../backend"
corepack pnpm install

echo -e "\n¡Todas las dependencias se instalaron correctamente de forma automática!"
