@echo off
REM MedLab Docker Export Script for Windows

echo 🏗️  Building MedLab Docker Images...

REM Get current directory and set paths
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set EXPORT_DIR=%PROJECT_DIR%\docker-exports

REM Create export directory
if not exist "%EXPORT_DIR%" mkdir "%EXPORT_DIR%"

REM Change to project root directory
cd /d "%PROJECT_DIR%"

echo 📦 Building Docker images...

REM Build all images
docker-compose build --no-cache

echo 💾 Exporting Docker images...

REM Pull and export database image
echo Exporting MySQL database image...
docker pull mysql:8.0
docker save mysql:8.0 -o "%EXPORT_DIR%\medlab-database.tar"

REM Export backend image
echo Exporting backend image...
docker save project-backend:latest -o "%EXPORT_DIR%\medlab-backend.tar"

REM Export frontend image
echo Exporting frontend image...
docker save project-frontend:latest -o "%EXPORT_DIR%\medlab-frontend.tar"

REM Create deployment package
echo 📋 Creating deployment package...

REM Copy essential files
copy nginx.conf "%EXPORT_DIR%\"

REM Create deployment-specific docker-compose.yml
(
echo services:
echo   # MySQL Database
echo   database:
echo     image: mysql:8.0
echo     container_name: medlab-database
echo     restart: unless-stopped
echo     environment:
echo       MYSQL_ROOT_PASSWORD: medlab_root_password_2025
echo       MYSQL_DATABASE: labs
echo       MYSQL_USER: medlab_user
echo       MYSQL_PASSWORD: medlab_password_2025
echo     ports:
echo       - "3306:3306"
echo     volumes:
echo       - mysql_data:/var/lib/mysql
echo     command: --default-authentication-plugin=mysql_native_password
echo     healthcheck:
echo       test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
echo       timeout: 20s
echo       retries: 10
echo.
echo   # Backend API
echo   backend:
echo     image: project-backend:latest
echo     container_name: medlab-backend
echo     restart: unless-stopped
echo     environment:
echo       NODE_ENV: production
echo       PORT: 3001
echo       DATABASE_URL: mysql://medlab_user:medlab_password_2025@database:3306/labs
echo       JWT_SECRET: medlab_jwt_secret_2025_super_secure_key_change_in_production
echo       CORS_ORIGIN: http://localhost
echo     ports:
echo       - "3001:3001"
echo     depends_on:
echo       database:
echo         condition: service_healthy
echo     command: sh -c "npx prisma db push && npx tsx src/seed.ts && npm run start"
echo.
echo   # Frontend Web App
echo   frontend:
echo     image: project-frontend:latest
echo     container_name: medlab-frontend
echo     restart: unless-stopped
echo     ports:
echo       - "80:80"
echo     depends_on:
echo       - backend
echo     environment:
echo       - NODE_ENV=production
echo.
echo volumes:
echo   mysql_data:
echo     driver: local
echo.
echo networks:
echo   default:
echo     name: medlab-network
) > "%EXPORT_DIR%\docker-compose.yml"

REM Create environment file template
(
echo # MedLab Environment Configuration
echo # Copy this file to .env and update the values as needed
echo.
echo # Database Configuration
echo MYSQL_ROOT_PASSWORD=medlab_root_password_2025
echo MYSQL_DATABASE=labs
echo MYSQL_USER=medlab_user
echo MYSQL_PASSWORD=medlab_password_2025
echo.
echo # Backend Configuration
echo NODE_ENV=production
echo PORT=3001
echo DATABASE_URL=mysql://medlab_user:medlab_password_2025@database:3306/labs
echo JWT_SECRET=medlab_jwt_secret_2025_super_secure_key_change_in_production
echo CORS_ORIGIN=http://localhost
echo.
echo # Frontend Configuration
echo NODE_ENV=production
) > "%EXPORT_DIR%\.env.template"

REM Create Windows batch files with proper content
REM Deploy batch file
(
echo @echo off
echo REM MedLab Docker Deployment Script for Windows
echo echo 🚀 MedLab Docker Deployment Script
echo docker load -i medlab-database.tar
echo docker load -i medlab-backend.tar
echo docker load -i medlab-frontend.tar
echo if not exist .env copy .env.template .env
echo docker-compose down
echo docker-compose up -d
echo echo ✅ MedLab application deployed successfully!
echo pause
) > "%EXPORT_DIR%\deploy.bat"

REM Start batch file
(
echo @echo off
echo echo 🚀 Starting MedLab Application...
echo docker-compose up -d
echo echo ✅ Application started!
echo pause
) > "%EXPORT_DIR%\start.bat"

REM Stop batch file
(
echo @echo off
echo echo 🛑 Stopping MedLab Application...
echo docker-compose down
echo echo ✅ Application stopped!
echo pause
) > "%EXPORT_DIR%\stop.bat"

REM Restart batch file
(
echo @echo off
echo echo 🔄 Restarting MedLab Application...
echo docker-compose restart
echo echo ✅ Application restarted!
echo pause
) > "%EXPORT_DIR%\restart.bat"

REM Copy scripts
copy scripts\deploy.sh "%EXPORT_DIR%\"
copy scripts\start.sh "%EXPORT_DIR%\"
copy scripts\stop.sh "%EXPORT_DIR%\"
copy scripts\restart.sh "%EXPORT_DIR%\"

echo ✅ Export completed successfully!
echo 📦 Package created in: %EXPORT_DIR%
echo.
echo 🚀 To deploy on client machine:
echo 1. Copy %EXPORT_DIR% folder to client machine
echo 2. Run: deploy.bat (Windows) or ./deploy.sh (Linux/Mac)
echo.

pause
