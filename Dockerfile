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
    echo "\nIndex.html contents:" && \
    cat dist/index.html

FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

FROM python:3.12-slim
WORKDIR /app

# Install required packages
RUN apt-get update && \
    apt-get install -y curl libcap2-bin && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN adduser --system --group --no-create-home appuser

# Create directories and set permissions
RUN mkdir -p /app/dist && \
    chown -R appuser:appuser /app/dist && \
    chmod -R 755 /app/dist

# Copy frontend build and verify
COPY --from=frontend-builder /app/frontend/dist/ /app/dist/
RUN echo "Verifying frontend files in final image:" && \
    ls -la /app/dist/ && \
    echo "\nVerifying index.html exists and is readable:" && \
    cat /app/dist/index.html && \
    echo "\nSetting permissions..." && \
    chown -R appuser:appuser /app/dist && \
    chmod -R 755 /app/dist && \
    echo "\nFinal permissions:" && \
    ls -la /app/dist/

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
    LOG_LEVEL=debug

# Grant capability to bind to privileged ports
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/python3.12

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Start application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "debug"]
