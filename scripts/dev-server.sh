#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEX_NODE="/Applications/Codex.app/Contents/Resources/node"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "$CODEX_NODE" ]; then
  NODE_BIN="$CODEX_NODE"
else
  echo "Node.js was not found."
  echo "Install Node.js or run with Codex's bundled runtime:"
  echo "  $CODEX_NODE apps/api/src/server.mjs"
  exit 1
fi

cd "$PROJECT_ROOT"
if [ "${1:-}" != "" ]; then
  export PORT="$1"
fi

exec "$NODE_BIN" apps/api/src/server.mjs
