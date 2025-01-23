FROM node:18-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./

# Build frontend with verbose output and error handling
RUN echo "Building frontend..." && \
    echo "Node version: $(node -v)" && \
    echo "NPM version: $(npm -v)" && \
    echo "Installing dependencies..." && \
    npm install && \
    echo "Running TypeScript check..." && \
    npx tsc --noEmit && \
    echo "Building project..." && \
    npm run build || (echo "Build failed. Error log:" && cat /root/.npm/_logs/*-debug.log && exit 1) && \
    echo "Build successful!" && \
    echo "Frontend build contents:" && \
    ls -la dist/ && \
    echo "Frontend assets:" && \
    ls -la dist/assets/ && \
    echo "Verifying index.html:" && \
    cat dist/index.html && \
    echo "Verifying file permissions:" && \
    find dist/ -type f -exec ls -l {} \;

FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

FROM python:3.12-slim
WORKDIR /app

# Install debugging tools
RUN apt-get update && \
    apt-get install -y curl tree && \
    rm -rf /var/lib/apt/lists/*

# Set up frontend directory
RUN mkdir -p /app/dist && \
    chmod -R 755 /app/dist

# Copy frontend build with verification
COPY --from=frontend-builder /app/frontend/dist/ /app/dist/
RUN echo "=== Verifying frontend files ===" && \
    echo "Directory structure:" && \
    tree /app/dist && \
    echo "\nFile permissions:" && \
    find /app/dist -type f -exec ls -l {} \; && \
    echo "\nIndex.html contents:" && \
    cat /app/dist/index.html && \
    echo "\nVerifying assets:" && \
    ls -la /app/dist/assets/ && \
    echo "\nSetting correct permissions:" && \
    chmod -R 755 /app/dist && \
    chown -R root:root /app/dist

# Copy backend and install dependencies
COPY --from=backend-builder /app/backend /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV PYTHONPATH=/app/backend \
    PORT=8080 \
    FRONTEND_PATH=/app/dist

# Verify final setup
RUN echo "=== Final Verification ===" && \
    echo "Environment:" && \
    env | grep -E "FRONTEND_PATH|PORT|PYTHONPATH" && \
    echo "\nDirectory structure:" && \
    tree /app && \
    echo "\nFile permissions:" && \
    find /app -type f -exec ls -l {} \; && \
    echo "\nFrontend path test:" && \
    test -d "${FRONTEND_PATH}" && \
    test -f "${FRONTEND_PATH}/index.html" && \
    test -d "${FRONTEND_PATH}/assets" && \
    echo "All frontend path tests passed"

# Expose port
EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Start application with debug output
CMD echo "Starting server with FRONTEND_PATH=${FRONTEND_PATH}" && \
    echo "Directory structure:" && \
    tree /app && \
    echo "\nFrontend directory contents:" && \
    ls -la ${FRONTEND_PATH} && \
    echo "\nStarting server..." && \
    cd /app && \
    PYTHONPATH=/app/backend uvicorn backend.app.main:app --host 0.0.0.0 --port 8080 --log-level debug
