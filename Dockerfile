FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

FROM python:3.12-slim
WORKDIR /app

# Install debugging tools
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Create directories and set permissions
RUN mkdir -p /app/dist && \
    chown -R nobody:nogroup /app/dist && \
    chmod -R 755 /app/dist

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist/ /app/dist/
RUN chown -R nobody:nogroup /app/dist && \
    chmod -R 755 /app/dist

# Copy backend and install dependencies
COPY --from=backend-builder /app/backend /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV PYTHONPATH=/app/backend \
    PORT=8080 \
    FRONTEND_PATH=/app/dist \
    NODE_ENV=production \
    LOG_LEVEL=debug

# Switch to non-root user
USER nobody

# Expose port
EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Start application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "debug"]
