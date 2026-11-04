FROM python:3.13-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Ensure data directory exists for persistent SQLite database
RUN mkdir -p /app/data

# Environment configuration
ENV DATABASE_URL="sqlite:////app/data/app.db"
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Default command runs database migrations then launches uvicorn
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
