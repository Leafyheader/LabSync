@echo off
REM MedLab Docker Restart Script for Windows

echo 🔄 Restarting MedLab Application...

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo ❌ docker-compose.yml not found in current directory
    echo Please run this script from the MedLab directory
    pause
    exit /b 1
)

REM Restart services
echo 📦 Restarting Docker containers...
docker-compose restart

echo ⏳ Waiting for services to be ready...

REM Wait for services (simplified for Windows)
echo Waiting 30 seconds for services to restart...
timeout /t 30 /nobreak >nul

echo.
echo 🎉 MedLab application restarted successfully!
echo.
echo 🌐 Access the application:
echo    Frontend: http://localhost
echo    Backend API: http://localhost:3001
echo.
echo 📊 Container Status:
docker-compose ps

pause
