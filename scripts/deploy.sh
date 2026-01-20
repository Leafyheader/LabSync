#!/bin/bash

# MedLab Docker Deployment Script
# This script imports and deploys the MedLab application

echo "🚀 MedLab Docker Deployment Script"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "📦 Loading Docker images..."

# Load Docker images
echo "Loading database image..."
docker load -i medlab-database.tar

echo "Loading backend image..."
docker load -i medlab-backend.tar

echo "Loading frontend image..."
docker load -i medlab-frontend.tar

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating environment file..."
    cp .env.template .env
    echo "⚠️  Please review and update .env file with your specific configuration!"
fi

# Create data directory for persistent storage
mkdir -p ./data/mysql

echo "🏃 Starting MedLab application..."

# Stop any existing containers
docker-compose down

# Start the application
docker-compose up -d

echo "⏳ Waiting for services to start..."

# Wait for database to be ready
echo "Waiting for database..."
timeout 60 bash -c 'until docker exec medlab-database mysqladmin ping -h localhost --silent; do sleep 2; done'

# Wait for backend to be ready
echo "Waiting for backend..."
timeout 60 bash -c 'until curl -f http://localhost:3001/health > /dev/null 2>&1; do sleep 2; done'

# Wait for frontend to be ready
echo "Waiting for frontend..."
timeout 30 bash -c 'until curl -f http://localhost/health > /dev/null 2>&1; do sleep 2; done'

echo ""
echo "✅ MedLab application deployed successfully!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/health"
echo ""
echo "👤 Default Login Credentials:"
echo "   SuperAdmin: superadmin / superadmin123"
echo "   Admin: admin / admin123"
echo "   Staff: staff / staff123"
echo ""
echo "🐳 Docker Management:"
echo "   View logs: docker-compose logs -f"
echo "   Stop app: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""

# Show running containers
docker-compose ps
