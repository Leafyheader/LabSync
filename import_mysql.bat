@echo off
REM MySQL Import Script - Optimized
REM This script imports the optimized backup into MySQL database

echo ========================================
echo MySQL Database Import - MedLab System
echo ========================================
echo.

REM Check if MySQL is accessible
echo Checking MySQL connection...
mysql -u root -proot -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to MySQL server!
    echo Please ensure MySQL is running and credentials are correct.
    pause
    exit /b 1
)
echo MySQL connection OK!
echo.

REM Create database if it doesn't exist
echo Creating database 'labs' if not exists...
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS labs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create database!
    pause
    exit /b 1
)
echo Database ready!
echo.

REM Import the optimized SQL file
echo Importing data from backup_mysql_optimized.sql...
echo This may take a moment...
mysql -u root -proot labs < backup_mysql_optimized.sql
if %errorlevel% neq 0 (
    echo ERROR: Import failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Import completed successfully!
echo ========================================
echo.
echo Database: labs
echo Tables imported:
mysql -u root -proot -e "USE labs; SHOW TABLES;"
echo.
echo Record counts:
mysql -u root -proot -e "USE labs; SELECT 'Users' as Table_Name, COUNT(*) as Records FROM User UNION ALL SELECT 'Lab Tests', COUNT(*) FROM LabTest UNION ALL SELECT 'Customers', COUNT(*) FROM Customer UNION ALL SELECT 'Transactions', COUNT(*) FROM Transaction;"
echo.
pause
