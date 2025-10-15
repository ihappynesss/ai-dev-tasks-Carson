# NSW Strata Automation - Metrics Exporter
# Task 12.5-12.11: Custom metrics exporter for Prometheus

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy exporter script
COPY exporter.py .

# Make executable
RUN chmod +x exporter.py

# Expose metrics port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/').read()"

# Run exporter
CMD ["python", "exporter.py"]
