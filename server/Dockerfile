FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    poppler-utils \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN git clone --depth 1 https://github.com/BreezeWhite/oemer /tmp/oemer && \
    sed -i 's/onnxruntime-gpu/onnxruntime/g' /tmp/oemer/setup.py && \
    pip install --no-cache-dir /tmp/oemer && \
    rm -rf /tmp/oemer

COPY . .

EXPOSE 3000
CMD ["python3", "app.py"]
