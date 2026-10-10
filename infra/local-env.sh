#!/bin/sh
# Membuat .env untuk demo LOKAL dengan nilai acak baru. Jangan pakai nilai produksi; jangan commit .env.
# Pemakaian (dari root repo): sh infra/local-env.sh && docker compose up --build
set -e
if [ -e .env ]; then
  echo ".env sudah ada; tidak ditimpa. Hapus dulu bila ingin dibuat ulang." >&2
  exit 1
fi
r() { openssl rand -hex "$1"; }
cat > .env <<ENV
# Demo lokal. APP_ENV=development wajib: di production backend menolak akun demo dan data contoh.
APP_ENV=development
API_TOKEN=$(r 32)
REDIS_PASSWORD=$(r 24)
AUTH_SECRET=$(r 32)
STREAM_ENC_KEY=$(r 32)
DEMO_ACCOUNTS=true
SEED_COUNT=200
ENV
echo ".env dibuat. Jalankan: docker compose up --build   lalu buka http://localhost:3000/login"
