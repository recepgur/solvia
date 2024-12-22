FROM python:3.12-slim as builder

WORKDIR /app
RUN pip install --no-cache-dir poetry==1.7.1 \
    && poetry config virtualenvs.in-project true

COPY pyproject.toml ./
RUN poetry install --no-dev --no-root --no-interaction --no-ansi

COPY app ./app
RUN poetry install --no-dev --no-interaction --no-ansi \
    && find /app/.venv -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true \
    && find /app/.venv -type d -name "tests" -exec rm -r {} + 2>/dev/null || true \
    && find /app/.venv -type f -name "*.pyc" -delete \
    && find /app/.venv -type f -name "*.pyo" -delete \
    && find /app/.venv -type f -name "*.pyd" -delete \
    && rm -rf /root/.cache

FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
