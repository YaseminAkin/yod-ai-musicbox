# Use the official Python image as the base image
FROM --platform=linux/amd64 python:3.11-slim as build

# Set the working directory inside the container
WORKDIR /app

# Install dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file to the working directory
COPY requirements.txt ./

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that Flask runs on (default is 3000)
EXPOSE 3000

# Command to run the Flask application
CMD ["python3", "app.py", "runserver"]
