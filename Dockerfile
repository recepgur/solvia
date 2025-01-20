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
    ls -la dist/assets/

FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

FROM python:3.12-slim
WORKDIR /app

# Create dist directory
RUN mkdir -p /app/dist

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist/ /app/dist/
RUN echo "Verifying frontend files:" && \
    ls -la /app/dist/ && \
    echo "\nVerifying assets:" && \
    ls -la /app/dist/assets/ || echo "No assets directory found"

# Copy backend and install dependencies
COPY --from=backend-builder /app/backend /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV PYTHONPATH=/app/backend \
    FRONTEND_PATH=/app/dist \
    PORT=8080

# Debug frontend path
RUN echo "Frontend path contents:" && \
    ls -la ${FRONTEND_PATH} && \
    echo "\nFrontend path exists:" && \
    test -d ${FRONTEND_PATH} && echo "Yes" || echo "No"

# Ensure correct permissions
RUN mkdir -p /app/dist && \
    chown -R nobody:nogroup /app/dist && \
    chmod -R 755 /app/dist

# Switch to non-root user
USER nobody

EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/healthz || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
