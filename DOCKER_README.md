# MedLab Docker Deployment Guide

## 🐳 Overview

This guide explains how to deploy the MedLab application using Docker containers. The application consists of three main components:

- **Frontend**: React application (Nginx server)
- **Backend**: Node.js API server
- **Database**: MySQL 8.0 database

## 📋 Prerequisites

### Required Software

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
   - Download: https://docs.docker.com/get-docker/
   - Version: 20.10.0 or later

2. **Docker Compose**
   - Usually included with Docker Desktop
   - Linux users: https://docs.docker.com/compose/install/

### System Requirements

- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 2GB free space
- **Ports**: 80, 3001, 3306 (must be available)

## 🚀 Quick Start

### For Developers (Building from Source)

1. **Clone and prepare the project**:
   ```bash
   cd /path/to/medlab/project
   ```

2. **Build and export Docker images**:
   ```bash
   # Linux/Mac
   chmod +x scripts/*.sh
   ./scripts/export.sh
   
   # Windows
   scripts\export.bat
   ```

3. **Start the application**:
   ```bash
   # Linux/Mac
   ./scripts/start.sh
   
   # Windows
   scripts\start.bat
   ```

### For Clients (Using Exported Package)

1. **Extract the deployment package**:
   ```bash
   tar -xzf medlab-docker-package-v1.0.0.tar.gz
   cd medlab-docker-package
   ```

2. **Deploy the application**:
   ```bash
   # Linux/Mac
   chmod +x *.sh
   ./deploy.sh
   
   # Windows
   deploy.bat
   ```

## 📁 Package Contents

When you receive the MedLab Docker package, it contains:

```
medlab-docker-package/
├── docker-compose.yml      # Container orchestration
├── nginx.conf             # Frontend web server config
├── .env.template          # Environment variables template
├── medlab-database.tar    # MySQL database image
├── medlab-backend.tar     # Backend API image
├── medlab-frontend.tar    # Frontend web app image
├── deploy.sh/.bat         # Deployment script
├── start.sh/.bat          # Start application
├── stop.sh/.bat           # Stop application
└── restart.sh/.bat        # Restart application
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.template` to `.env` and modify as needed:

```bash
cp .env.template .env
```

**Important settings to review**:

```env
# Database passwords (change in production)
MYSQL_ROOT_PASSWORD=medlab_root_password_2025
MYSQL_PASSWORD=medlab_password_2025

# JWT secret (must change in production)
JWT_SECRET=medlab_jwt_secret_2025_super_secure_key_change_in_production

# Frontend URL (change if not running on localhost)
CORS_ORIGIN=http://localhost
```

### Port Configuration

Default ports used:
- **80**: Frontend web interface
- **3001**: Backend API
- **3306**: MySQL database

To change ports, edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # Change 8080 to your desired port
```

## 🎯 Usage

### Starting the Application

```bash
# Linux/Mac
./start.sh

# Windows
start.bat

# Or manually
docker-compose up -d
```

### Stopping the Application

```bash
# Linux/Mac
./stop.sh

# Windows
stop.bat

# Or manually
docker-compose down
```

### Restarting the Application

```bash
# Linux/Mac
./restart.sh

# Windows
restart.bat

# Or manually
docker-compose restart
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

## 🌐 Accessing the Application

Once running, access the application at:

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| SuperAdmin | superadmin | superadmin123 |
| Admin | admin | admin123 |
| Staff | staff | staff123 |

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep :80

# Stop conflicting services
sudo systemctl stop apache2  # Linux
sudo systemctl stop nginx    # Linux
```

#### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

#### Database Connection Issues
```bash
# Check database container
docker-compose logs database

# Restart database service
docker-compose restart database
```

#### Application Not Loading
```bash
# Check all containers are running
docker-compose ps

# Check container health
docker-compose logs frontend
docker-compose logs backend
```

### Health Checks

```bash
# Database
docker exec medlab-database mysqladmin ping -h localhost

# Backend API
curl http://localhost:3001/health

# Frontend
curl http://localhost/health
```

## 🔄 Updates and Maintenance

### Updating the Application

1. **Stop current version**:
   ```bash
   ./stop.sh
   ```

2. **Load new images**:
   ```bash
   docker load -i new-medlab-backend.tar
   docker load -i new-medlab-frontend.tar
   ```

3. **Start updated version**:
   ```bash
   ./start.sh
   ```

### Backup Database

```bash
# Create backup
docker exec medlab-database mysqldump -u root -p labs > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i medlab-database mysql -u root -p labs < backup_20240101_120000.sql
```

### Clearing Data (Fresh Start)

```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove images (optional)
docker rmi project-frontend:latest project-backend:latest mysql:8.0

# Start fresh
./start.sh
```

## 📊 Monitoring

### Container Resource Usage

```bash
# Real-time stats
docker stats

# Container disk usage
docker system df
```

### Application Metrics

- **Frontend**: Check browser developer tools
- **Backend**: Monitor logs for API response times
- **Database**: Check MySQL performance schema

## 🔒 Security Considerations

### Production Deployment

1. **Change default passwords** in `.env`
2. **Use HTTPS** (configure reverse proxy)
3. **Restrict database access** (firewall rules)
4. **Regular updates** (security patches)
5. **Backup strategy** (automated backups)

### Network Security

```bash
# Create custom network (optional)
docker network create medlab-secure

# Update docker-compose.yml to use custom network
```

## 📞 Support

For technical support or issues:

1. Check the troubleshooting section above
2. Review container logs: `docker-compose logs`
3. Verify system requirements are met
4. Contact system administrator

## 📝 Additional Notes

- Data persistence: Database data is stored in Docker volumes
- Updates: Images can be updated without losing data
- Scaling: Backend and frontend can be scaled horizontally
- Monitoring: Consider adding monitoring stack (Prometheus, Grafana)
