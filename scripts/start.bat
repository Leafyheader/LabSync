@echo off
REM MedLab Docker Start Script for Windows

echo 🚀 Starting MedLab Application...

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo ❌ docker-compose.yml not found in current directory
    echo Please run this script from the MedLab directory
    pause
    exit /b 1
)

REM Start services
echo 📦 Starting Docker containers...
docker-compose up -d

echo ⏳ Waiting for services to be ready...

REM Wait for services (simplified for Windows)
echo Waiting 30 seconds for services to start...
timeout /t 30 /nobreak >nul

echo.
echo 🎉 MedLab application is now running!
echo.
echo 🌐 Access the application:
echo    Frontend: http://localhost
echo    Backend API: http://localhost:3001
echo.
echo 📊 Container Status:
docker-compose ps

echo.
echo 📝 Useful commands:
echo    View logs: docker-compose logs -f
echo    Stop application: stop.bat
echo    Restart application: restart.bat

pause
