#!/bin/bash

# MedLab Docker Stop Script
# Stops the MedLab application stack

echo "🛑 Stopping MedLab Application..."

# Check if docker-compose.yml exists
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found in current directory"
    echo "Please run this script from the MedLab directory"
    exit 1
fi

# Stop services
echo "📦 Stopping Docker containers..."
docker-compose down

echo ""
echo "✅ MedLab application stopped successfully!"
echo ""
echo "📝 Other options:"
echo "   Start application: ./start.sh"
echo "   Restart application: ./restart.sh"
echo "   View stopped containers: docker-compose ps -a"
echo "   Remove containers and data: docker-compose down -v"
