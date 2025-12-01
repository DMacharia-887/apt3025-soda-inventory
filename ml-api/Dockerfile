# Use slim Python (smaller, faster builds)
FROM python:3.10-slim

# Install system libs for image processing (Pillow/PyTorch)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR /app

# Copy requirements first (Docker caches pip layers)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip cache purge

# Copy your app files + model
COPY app.py .
COPY soda_bottle_classifier_resnet18.pth .

# Expose dynamic PORT (Railway sets $PORT env)
EXPOSE $PORT

# Run Gunicorn (production server)
# --workers=1 --threads=4: Balanced for ML inference
CMD exec gunicorn --bind 0.0.0.0:${PORT:-8080} \
    --workers 1 \
    --threads 4 \
    --timeout 120 \
    --preload \
    app:app
