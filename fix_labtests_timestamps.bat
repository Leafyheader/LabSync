@echo off
REM Add createdAt and updatedAt columns to LabTest table
REM This fixes missing timestamp columns that cause 500 errors

echo ========================================
echo Add Timestamps to LabTest Table
echo ========================================
echo.

REM Check MySQL connection
echo Checking MySQL connection...
mysql -u root -proot -e "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to MySQL!
    pause
    exit /b 1
)
echo [OK] MySQL connected
echo.

REM Run the ALTER TABLE script
echo Adding createdAt and updatedAt columns...
mysql -u root -proot labs < "C:\Users\Leafyhead\Documents\MedLab\project\add_timestamps_to_labtests.sql" 2>&1

if %errorlevel% neq 0 (
    echo.
    echo Note: If you see "Duplicate column" error, the columns already exist.
    echo This is normal and can be ignored.
)

echo.
echo ========================================
echo Verification
echo ========================================
mysql -u root -proot -e "USE labs; DESCRIBE LabTest;" 
echo.
mysql -u root -proot -e "USE labs; SELECT COUNT(*) as 'Lab Tests', MIN(createdAt) as 'Earliest', MAX(updatedAt) as 'Latest' FROM LabTest;"

echo.
echo Done! Restart the backend service for changes to take effect.
pause
