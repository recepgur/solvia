FROM node:18-slim AS frontend-builder

# Set up frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Backend builder stage
FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# Final stage
FROM python:3.12-slim
WORKDIR /app

# Copy frontend build and backend
COPY --from=frontend-builder /app/frontend/dist /app/dist
COPY --from=backend-builder /app/backend /app/backend
COPY backend/requirements.txt ./

# Install production dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Environment configuration
ENV PYTHONPATH=/app \
    FRONTEND_PATH=/app/dist \
    PORT=8080

# Expose port
EXPOSE 8080

# Start the application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
