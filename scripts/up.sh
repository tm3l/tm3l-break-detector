#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> Starting TM3L Break Detector stack..."
docker compose up -d

echo "==> Waiting for services to stabilize..."
sleep 2
./scripts/healthcheck.sh || true
