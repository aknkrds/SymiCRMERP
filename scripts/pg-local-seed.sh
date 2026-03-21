#!/usr/bin/env bash
set -euo pipefail

PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
PORT="${PGPORT:-5432}"

"$PG_BIN/psql" -h localhost -p "$PORT" -U postgres -d postgres -c "CREATE ROLE symicrm LOGIN PASSWORD 'postgres';" || true
"$PG_BIN/createdb" -h localhost -p "$PORT" -U postgres -O symicrm symicrm || true

