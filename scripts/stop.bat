@echo off
REM MedLab Docker Stop Script for Windows

echo 🛑 Stopping MedLab Application...

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo ❌ docker-compose.yml not found in current directory
    echo Please run this script from the MedLab directory
    pause
    exit /b 1
)

REM Stop services
echo 📦 Stopping Docker containers...
docker-compose down

echo.
echo ✅ MedLab application stopped successfully!
echo.
echo 📝 Other options:
echo    Start application: start.bat
echo    Restart application: restart.bat
echo    View stopped containers: docker-compose ps -a
echo    Remove containers and data: docker-compose down -v

pause
