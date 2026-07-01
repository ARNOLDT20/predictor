#!/bin/sh
set -e

echo "==> Running database migrations..."
node /app/migrate.mjs

echo "==> Starting BetPredict Pro API server..."
exec node --enable-source-maps /app/dist/index.mjs
