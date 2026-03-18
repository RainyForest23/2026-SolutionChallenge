FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies (optional but safe)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh

ENV DENO_INSTALL=/root/.deno
ENV PATH=/root/.deno/bin:$PATH

# Install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
COPY ai-pipeline/requirements.txt /app/ai-requirements.txt

RUN pip install --upgrade pip \
    && pip install -r /app/requirements.txt \
    && pip install -r /app/ai-requirements.txt \
    && pip install yt-dlp yt-dlp-ejs

# Copy project files
COPY backend /app
COPY ai-pipeline /app/ai-pipeline

# entrypoint script will migrate & collectstatic
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN deno --version && python -m yt_dlp --version

# expose Django port
EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
# default command; override in docker‑compose.override.yml or via `docker run`
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "2"]
