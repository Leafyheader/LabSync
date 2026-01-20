#!/bin/bash

# MedLab Docker Restart Script
# Restarts the MedLab application stack

echo "🔄 Restarting MedLab Application..."

# Check if docker-compose.yml exists
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found in current directory"
    echo "Please run this script from the MedLab directory"
    exit 1
fi

# Restart services
echo "📦 Restarting Docker containers..."
docker-compose restart

echo "⏳ Waiting for services to be ready..."

# Wait for database
echo "Checking database..."
timeout 60 bash -c 'until docker exec medlab-database mysqladmin ping -h localhost --silent 2>/dev/null; do 
    echo -n "."
    sleep 2
done'
echo " ✅"

# Wait for backend
echo "Checking backend..."
timeout 60 bash -c 'until curl -f http://localhost:3001/health > /dev/null 2>&1; do 
    echo -n "."
    sleep 2
done'
echo " ✅"

# Wait for frontend
echo "Checking frontend..."
timeout 30 bash -c 'until curl -f http://localhost/health > /dev/null 2>&1; do 
    echo -n "."
    sleep 2
done'
echo " ✅"

echo ""
echo "🎉 MedLab application restarted successfully!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:3001"
echo ""
echo "📊 Container Status:"
docker-compose ps
