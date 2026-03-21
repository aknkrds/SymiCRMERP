#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
PORT="${PGPORT:-5432}"
DUMP_FILE="${1:-$ROOT_DIR/.pgdump/symicrm.dump}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump bulunamadı: $DUMP_FILE"
  exit 1
fi

"$PG_BIN/pg_restore" -h localhost -p "$PORT" -U postgres --role=symicrm -d symicrm --no-owner --no-privileges "$DUMP_FILE"

