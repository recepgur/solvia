FROM node:18-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN echo "Building frontend..." && \
    npm run build && \
    echo "Frontend build contents:" && \
    ls -la dist/ && \
    echo "Frontend assets:" && \
    ls -la dist/assets/ && \
    echo "Verifying index.html:" && \
    cat dist/index.html

FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

FROM python:3.12-slim
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Create dist directory with correct permissions
RUN mkdir -p /app/dist && \
    chown -R nobody:nogroup /app/dist && \
    chmod -R 755 /app/dist

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist/ /app/dist/
RUN echo "Verifying frontend files:" && \
    ls -la /app/dist/ && \
    echo "\nVerifying assets:" && \
    ls -la /app/dist/assets/ && \
    echo "\nVerifying index.html:" && \
    cat /app/dist/index.html

# Copy backend and install dependencies
COPY --from=backend-builder /app/backend /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV PYTHONPATH=/app/backend \
    PORT=8080 \
    FRONTEND_PATH=/app/dist

# Debug frontend path and permissions
RUN echo "Frontend path contents:" && \
    ls -la ${FRONTEND_PATH} && \
    echo "\nFrontend path exists:" && \
    test -d ${FRONTEND_PATH} && echo "Yes" || echo "No" && \
    echo "\nFull contents of /app:" && \
    find /app -type f && \
    echo "\nVerifying permissions:" && \
    chmod -R 755 ${FRONTEND_PATH} && \
    chown -R nobody:nogroup ${FRONTEND_PATH}

# Switch to non-root user
USER nobody

EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/healthz || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
