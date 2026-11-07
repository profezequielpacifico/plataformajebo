#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

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
