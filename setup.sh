#!/bin/bash

# Setup script for Infrastructure 3 Project
# This script prepares everything needed to run the project

echo "==================================="
echo "Infrastructure 3 Project Setup"
echo "==================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
echo "Creating project directories..."
mkdir -p frontend backend nginx/ssl database

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Environment configuration
NODE_ENV=production
NGINX_HOST=localhost

# Database configuration
DB_NAME=taskdb
DB_USER=taskuser
DB_PASSWORD=taskpass

# API configuration
API_URL=https://localhost/api
JWT_SECRET=your-secret-jwt-key-change-this

# Application ports (internal)
BACKEND_PORT=3000
FRONTEND_PORT=80
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Generate SSL certificates
echo "Generating SSL certificates..."
chmod +x generate-ssl.sh
./generate-ssl.sh

# Build containers
echo "Building Docker containers..."
docker compose build

echo ""
echo "==================================="
echo "✅ Setup complete!"
echo "==================================="
echo ""
echo "To start the application, run:"
echo "  docker compose up -d"
echo ""
echo "Or use the Makefile:"
echo "  make up"
echo ""
echo "Access the application at:"
echo "  https://localhost"
echo ""