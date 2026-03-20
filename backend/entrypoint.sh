#!/usr/bin/env sh
set -e

echo "[entrypoint] Running migrations..."
python manage.py migrate --noinput

# Optional: only if you actually use static files in production
# echo "[entrypoint] Collecting static files..."
# python manage.py collectstatic --noinput

# Start bgutil PO token provider in background
echo "[entrypoint] Starting bgutil PO token provider..."
(cd /opt/bgutil-server/server/node_modules && \
    deno run --allow-env --allow-net --allow-ffi=. --allow-read=. ../src/main.ts) &
sleep 3

echo "[entrypoint] Starting: $*"
exec "$@"