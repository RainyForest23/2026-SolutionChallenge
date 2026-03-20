FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies and JS runtime needed for full YouTube support in yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

ENV DENO_INSTALL=/opt/deno
RUN curl -fsSL https://deno.land/install.sh | sh -s -- -q \
    && ln -s /opt/deno/bin/deno /usr/local/bin/deno

# Install bgutil PO token provider server (for yt-dlp YouTube bot bypass)
RUN git clone --single-branch --branch 1.3.1 \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-server \
    && cd /opt/bgutil-server/server \
    && deno install --allow-scripts=npm:canvas

# Install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
COPY ai-pipeline/requirements.txt /app/ai-requirements.txt

RUN pip install --upgrade pip \
    && pip install -r /app/requirements.txt \
    && pip install -r /app/ai-requirements.txt

# Copy project files
COPY backend /app
COPY ai-pipeline /app/ai-pipeline

# Pre-compile numba/librosa JIT to avoid cold-start memory spike at runtime
RUN python -c "import sys; sys.path.insert(0, '/app/ai-pipeline'); import numpy as np; import librosa; y = np.zeros(22050, dtype=np.float32); librosa.feature.rms(y=y); print('numba warmup done')"

# entrypoint script will migrate & collectstatic
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# expose Django port
EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
# default command; override in docker‑compose.override.yml or via `docker run`
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "600"]
