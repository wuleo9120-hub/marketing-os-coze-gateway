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
  echo "Run: /Applications/Codex.app/Contents/Resources/node apps/api/src/bridges/openclaw-http-bridge.mjs"
  exit 1
fi

cd "$PROJECT_ROOT"
exec "$NODE_BIN" apps/api/src/bridges/openclaw-http-bridge.mjs
