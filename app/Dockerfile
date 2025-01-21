FROM python:3.12-slim

WORKDIR /app

RUN pip install poetry
RUN poetry config virtualenvs.create false

COPY . .

RUN poetry install --no-dev --no-root

ENV PYTHONPATH=/app

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
