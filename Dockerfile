FROM python:3.12-slim as builder

# Install node and build tools
RUN apt-get update && \
    apt-get install -y nodejs npm curl git && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set up backend
WORKDIR /app
COPY backend/ ./backend/
WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Set up frontend
WORKDIR /app/frontend
COPY frontend/ ./
RUN pnpm install
RUN pnpm build

# Final stage
FROM python:3.12-slim
WORKDIR /app

# Copy backend and frontend build
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/frontend/dist /app/dist

# Install production dependencies
COPY --from=builder /app/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Set environment variables
ENV FRONTEND_PATH=/app/dist
ENV PORT=8080
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8080

# Start the application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
