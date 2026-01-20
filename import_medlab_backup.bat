@echo off
REM Import medlab.db backup into MySQL
REM This script imports the converted SQLite backup

echo ========================================
echo MedLab MySQL Import Script
echo ========================================
echo.
echo Source: medlab.db (SQLite)
echo Target: MySQL database 'labs'
echo.

REM Check MySQL connectivity
echo Checking MySQL connection...
mysql -u root -proot -e "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to MySQL!
    echo Please ensure:
    echo   1. MySQL is running
    echo   2. Username: root
    echo   3. Password: root
    pause
    exit /b 1
)
echo [OK] MySQL connection successful
echo.

REM Create database
echo Creating database 'labs' if not exists...
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS labs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create database!
    pause
    exit /b 1
)
echo [OK] Database ready
echo.

REM Import SQL file
echo Importing backup...
echo This may take a moment, please wait...
mysql -u root -proot labs < "C:\Users\Leafyhead\Documents\MedLab\project\medlab_backup_mysql.sql"
if %errorlevel% neq 0 (
    echo ERROR: Import failed!
    echo Check the SQL file for errors
    pause
    exit /b 1
)

echo.
echo ========================================
echo [SUCCESS] Import completed!
echo ========================================
echo.

REM Show results
echo Database Tables:
mysql -u root -proot -e "USE labs; SHOW TABLES;"
echo.

echo Record Counts:
mysql -u root -proot -e "USE labs; SELECT 'Users' as 'Table', COUNT(*) as 'Records' FROM User UNION ALL SELECT 'Lab Tests', COUNT(*) FROM LabTest UNION ALL SELECT 'Customers', COUNT(*) FROM Customer UNION ALL SELECT 'Transactions', COUNT(*) FROM Transaction UNION ALL SELECT 'Activations', COUNT(*) FROM Activation;"

echo.
echo Import complete! Database 'labs' is ready to use.
pause
