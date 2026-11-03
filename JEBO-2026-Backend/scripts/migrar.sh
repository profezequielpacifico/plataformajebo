#!/usr/bin/env bash
# Aplica TODAS las migraciones pendientes del sistema (knex migrate:latest).
# Uso: doble click sobre este archivo, o desde terminal: ./scripts/migrar.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Si se abrió con doble click sin terminal, relanza en una terminal visible.
if ! [ -t 1 ] && [ "${JEBO_MIGRAR_TERM:-0}" != "1" ]; then
  export JEBO_MIGRAR_TERM=1
  for term in gnome-terminal konsole xfce4-terminal x-terminal-emulator xterm; do
    if command -v "$term" >/dev/null 2>&1; then
      case "$term" in
        gnome-terminal) exec "$term" -- bash "$0" ;;
        konsole)        exec "$term" -e bash "$0" ;;
        *)              exec "$term" -e bash "$0" ;;
      esac
    fi
  done
  # Sin terminal disponible: igual corre, la salida va al stdout del sistema.
fi

cd "$BACKEND_DIR"

echo "==============================================="
echo "  JEBO 2026 - Aplicar migraciones"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "==============================================="
echo

if [ ! -d node_modules ]; then
  echo "[1/2] Instalando dependencias (node_modules ausente)..."
  npm install --no-audit --no-fund
else
  echo "[1/2] Dependencias OK"
fi

echo "[2/2] Aplicando migraciones pendientes..."
echo

# CLI de knex directo (el shim de .bin/knex puede estar roto en instalaciones viejas)
KNEX_CLI="node_modules/knex/bin/cli.js"
if [ ! -f "$KNEX_CLI" ]; then
  echo "ERROR: knex no está instalado (falta $KNEX_CLI)."
  echo "Ejecuta: npm install"
  exit 1
fi

node "$KNEX_CLI" migrate:latest

echo
echo "==============================================="
echo "  Listo. Estado final:"
echo "==============================================="
node "$KNEX_CLI" migrate:list

echo
if [ -t 0 ]; then
  read -r -p "Presiona Enter para cerrar..." _
fi
