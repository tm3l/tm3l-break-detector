#!/usr/bin/env bash
set -euo pipefail

echo "=== TM3L Break Detector Preflight Checks ==="

# Check Docker daemon
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker daemon is not running."
    exit 1
fi
echo "[OK] Docker daemon is running."

# Check required ports (8080/8081, 5173, 5432)
for port in 8081 5173 5432; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "[WARN] Port $port is already in use."
    else
        echo "[OK] Port $port is available."
    fi
done

# Verify .env exists or create from .env.example
if [ ! -f .env ] && [ -f .env.example ]; then
    echo "[INFO] Creating .env from .env.example..."
    cp .env.example .env
fi

echo "=== Preflight check completed successfully ==="
