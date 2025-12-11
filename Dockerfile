# Multi-stage Dockerfile for Next.js + Python Backend

# ============================================
# Stage 1: Install Node.js dependencies
# ============================================
FROM node:20-slim AS node-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# Stage 2: Build Next.js
# ============================================
FROM node:20-slim AS node-builder
WORKDIR /app
COPY . .
COPY --from=node-deps /app/node_modules ./node_modules
RUN npm run build

# ============================================
# Stage 3: Final production image
# ============================================
FROM python:3.11-slim AS runner

# Install Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng \
    poppler-utils \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Next.js build from builder
COPY --from=node-builder /app/public ./public
COPY --from=node-builder /app/.next ./.next
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/package.json ./package.json

# Setup Python backend
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/*.py .

# Supervisor configuration to run both services
RUN mkdir -p /var/log/supervisor
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:nextjs]
command=npm start
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV="production",PORT="3000",PYTHON_BACKEND_URL="http://localhost:8000"

[program:python-backend]
command=python -m uvicorn main:app --host 0.0.0.0 --port 8000
directory=/app/backend
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

WORKDIR /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

# Expose ports
EXPOSE 3000 8000

# Run supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
