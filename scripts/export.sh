#!/bin/bash

# MedLab Docker Export Script
# This script builds and exports all Docker images for client deployment

echo "🏗️  Building MedLab Docker Images..."

# Set variables
PROJECT_NAME="medlab"
VERSION="1.0.0"
EXPORT_DIR="./docker-exports"

# Create export directory
mkdir -p "$EXPORT_DIR"

echo "📦 Building Docker images..."

# Build all images
docker-compose build --no-cache

echo "💾 Exporting Docker images..."

# Export database image
echo "Exporting MySQL database image..."
docker save mysql:8.0 -o "$EXPORT_DIR/medlab-database.tar"

# Export backend image
echo "Exporting backend image..."
docker save project-backend:latest -o "$EXPORT_DIR/medlab-backend.tar"

# Export frontend image
echo "Exporting frontend image..."
docker save project-frontend:latest -o "$EXPORT_DIR/medlab-frontend.tar"

# Create deployment package
echo "📋 Creating deployment package..."

# Copy essential files
cp docker-compose.yml "$EXPORT_DIR/"
cp nginx.conf "$EXPORT_DIR/"

# Create environment file template
cat > "$EXPORT_DIR/.env.template" << EOF
# MedLab Environment Configuration
# Copy this file to .env and update the values as needed

# Database Configuration
MYSQL_ROOT_PASSWORD=medlab_root_password_2025
MYSQL_DATABASE=labs
MYSQL_USER=medlab_user
MYSQL_PASSWORD=medlab_password_2025

# Backend Configuration
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://medlab_user:medlab_password_2025@database:3306/labs
JWT_SECRET=medlab_jwt_secret_2025_super_secure_key_change_in_production
CORS_ORIGIN=http://localhost

# Frontend Configuration
NODE_ENV=production
EOF

# Compress the export
echo "🗜️  Compressing export package..."
cd "$EXPORT_DIR"
tar -czf "../medlab-docker-package-v$VERSION.tar.gz" .
cd ..

echo "✅ Export completed successfully!"
echo "📦 Package created: medlab-docker-package-v$VERSION.tar.gz"
echo "📁 Package size: $(du -h medlab-docker-package-v$VERSION.tar.gz | cut -f1)"

echo ""
echo "🚀 To deploy on client machine:"
echo "1. Copy medlab-docker-package-v$VERSION.tar.gz to client machine"
echo "2. Extract: tar -xzf medlab-docker-package-v$VERSION.tar.gz"
echo "3. Run: ./deploy.sh"
echo ""

# Clean up temporary directory
rm -rf "$EXPORT_DIR"

echo "🧹 Cleanup completed!"
