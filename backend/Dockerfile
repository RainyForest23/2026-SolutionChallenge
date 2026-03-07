FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies (optional but safe)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
COPY ai-pipeline/requirements.txt /app/ai-requirements.txt

RUN pip install --upgrade pip \
    && pip install -r /app/requirements.txt \
    && pip install -r /app/ai-requirements.txt

# Copy project files
COPY backend /app
COPY ai-pipeline /app/ai-pipeline

# entrypoint script will migrate & collectstatic
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# expose Django port
EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
# default command; override in docker‑compose.override.yml or via `docker run`
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "2"]
