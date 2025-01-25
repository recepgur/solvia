FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock ./

# Install dependencies using yarn
RUN corepack enable && \
    yarn install --frozen-lockfile

# Copy frontend source and build
COPY frontend/ ./
RUN echo "Frontend directory contents:" && \
    ls -la && \
    echo "\nInstalling dependencies..." && \
    yarn install --frozen-lockfile && \
    echo "\nBuilding frontend..." && \
    yarn build && \
    echo "\nFrontend build output:" && \
    ls -la dist/ && \
    echo "\nDist directory tree:" && \
    find dist -type f -ls && \
    echo "\nIndex.html contents:" && \
    cat dist/index.html && \
    echo "\nVerifying static files:" && \
    test -f dist/index.html || (echo "ERROR: index.html not found" && exit 1) && \
    test -d dist/assets || (echo "ERROR: assets directory not found" && exit 1)

FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

FROM python:3.12-slim
WORKDIR /app

# Install required packages
RUN apt-get update && \
    apt-get install -y curl tree && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN adduser --system --group --no-create-home appuser

# Create directories and set permissions
RUN mkdir -p /app/dist && \
    chown -R appuser:appuser /app/dist && \
    chmod -R 755 /app/dist

# Copy frontend build and verify
COPY --from=frontend-builder /app/frontend/dist/ /app/dist/
COPY scripts/check_env.py /app/scripts/check_env.py

RUN echo "Verifying frontend files in final image:" && \
    ls -la /app/dist/ && \
    echo "\nDirectory tree:" && \
    tree /app/dist && \
    echo "\nVerifying index.html exists and is readable:" && \
    cat /app/dist/index.html && \
    echo "\nSetting permissions..." && \
    chown -R appuser:appuser /app/dist && \
    chmod -R 755 /app/dist && \
    echo "\nFinal permissions:" && \
    ls -la /app/dist/ && \
    echo "\nRunning environment check:" && \
    FRONTEND_PATH=/app/dist python3 /app/scripts/check_env.py

# Copy backend and install dependencies
COPY --from=backend-builder /app/backend /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    chown -R appuser:appuser /app/backend && \
    chmod -R 755 /app/backend

# Set environment variables
ENV PYTHONPATH=/app/backend \
    PORT=8080 \
    FRONTEND_PATH=/app/dist \
    NODE_ENV=production \
    LOG_LEVEL=debug \
    STATIC_FILES_DEBUG=true

# Expose port
EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Start application with increased logging
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "debug", "--reload"]
