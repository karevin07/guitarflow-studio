FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv to make dependency installation fast
RUN pip install uv

# Copy configuration files
COPY pyproject.toml uv.lock ./

# Install Python dependencies
RUN uv pip install --system -r pyproject.toml

# Copy all project files
COPY . .

# Expose port
EXPOSE 8000

# Run migrations and start Django development server on startup
CMD ["sh", "-c", "python manage.py migrate --fake-initial && python manage.py runserver 0.0.0.0:8000"]
