#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
DATA_DIR="$ROOT_DIR/.pgdata"
PORT="${PGPORT:-5432}"

if [ ! -d "$DATA_DIR" ]; then
  "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust
fi

if "$PG_BIN/pg_isready" -h localhost -p "$PORT" >/dev/null 2>&1; then
  echo "PostgreSQL zaten çalışıyor: localhost:$PORT"
  exit 0
fi

exec "$PG_BIN/postgres" -D "$DATA_DIR" -p "$PORT"

