#!/usr/bin/env bash
set -euo pipefail

echo "=== Checking TM3L Break Detector Service Health ==="

# 1. Check Database
if docker compose exec -T break-detector-db pg_isready -U tm3l_user -d tm3l_break_detector >/dev/null 2>&1; then
    echo "[OK] PostgreSQL Database is healthy."
else
    echo "[FAIL] PostgreSQL Database is unreachable."
fi

# 2. Check Go Server / API
SERVER_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/api/projects || echo "000")
if [ "$SERVER_HTTP" != "000" ]; then
    echo "[OK] API Server is responding on http://localhost:8081 (HTTP $SERVER_HTTP)."
else
    echo "[FAIL] API Server is not responding on port 8081."
fi

# 3. Check React Viewer UI
VIEWER_HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ || echo "000")
if [ "$VIEWER_HTTP" = "200" ]; then
    echo "[OK] Viewer UI is responding on http://localhost:5173."
else
    echo "[WARN] Viewer UI returned HTTP $VIEWER_HTTP on port 5173."
fi

echo "=== Health check finished ==="
