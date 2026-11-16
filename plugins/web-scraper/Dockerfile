# Multi-arch Playwright image for Raspberry Pi 4B (ARM64) and x86_64
FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install only Chromium to keep container footprint minimal
RUN playwright install --with-deps chromium

# Copy plugin code
COPY plugin.json .
COPY src/ ./src/

ENV PYTHONUNBUFFERED=1
ENV HEADLESS=true

# Read JSON command from stdin and write JSON result to stdout
ENTRYPOINT ["python3", "src/main.py"]
