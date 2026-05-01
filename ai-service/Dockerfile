FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (needed for mysql-connector)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache optimisation)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for model coefficient persistence
RUN mkdir -p /app/data

# Expose port
EXPOSE 5001

# Use gunicorn for production (4 workers)
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "4", "--timeout", "120", "app:create_app()"]
