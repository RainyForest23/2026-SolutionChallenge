#!/usr/bin/env sh
set -e

echo "[entrypoint] Running migrations..."
python manage.py migrate --noinput

# Optional: only if you actually use static files in production
# echo "[entrypoint] Collecting static files..."
# python manage.py collectstatic --noinput

echo "[entrypoint] Starting: $*"
exec "$@"