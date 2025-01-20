FROM node:18-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS backend-builder
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

FROM python:3.12-slim
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist /app/dist
COPY --from=backend-builder /app/backend /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
ENV PYTHONPATH=/app \
    FRONTEND_PATH=/app/dist \
    PORT=8080
EXPOSE 8080
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
