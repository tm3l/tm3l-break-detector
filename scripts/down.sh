#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> Stopping TM3L Break Detector stack..."
docker compose down
