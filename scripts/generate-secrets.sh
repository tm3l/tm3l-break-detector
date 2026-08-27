#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
    echo "[INFO] .env file already exists. Preserving existing secrets."
    exit 0
fi

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s | shasum -a 256 | head -c 64)
CI_TOKEN=$(openssl rand -hex 16 2>/dev/null || date +%s | shasum -a 256 | head -c 32)
DB_PASS=$(openssl rand -hex 16 2>/dev/null || echo "tm3l_password")

cat <<ENVEOF > .env
PORT=8080
DATABASE_URL=postgres://tm3l_user:${DB_PASS}@break-detector-db:5432/tm3l_break_detector?sslmode=disable
POSTGRES_USER=tm3l_user
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=tm3l_break_detector
TM3L_JWT_SECRET=${JWT_SECRET}
TM3L_CI_TOKEN=${CI_TOKEN}
ENVEOF

echo "[OK] Generated new .env with cryptographic secrets."
