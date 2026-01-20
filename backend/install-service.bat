@echo off
REM MedLab Backend Windows Service Installer
REM This script installs the Node.js backend as a Windows service
REM Run as Administrator

setlocal enabledelayedexpansion

REM Check if running as Administrator
net session >nul 2>&1
if not errorLevel 1 goto :admin_ok
echo.
echo ERROR: This script must be run as Administrator.
echo Please right-click on Command Prompt and select "Run as Administrator"
echo.
pause
exit /b 1

:admin_ok

cd /d "%~dp0"
set BACKEND_DIR=%CD%
set SERVICE_NAME=MedLabBackend
set NSSM_EXE=%BACKEND_DIR%\nssm\nssm.exe

echo.
echo ====================================
echo MedLab Backend Service Installer
echo ====================================
echo.
echo Backend Directory: %BACKEND_DIR%
echo Service Name: %SERVICE_NAME%
echo.

REM Check if NSSM exists, download if needed
if exist "%NSSM_EXE%" goto :nssm_exists

echo NSSM not found. Attempting to download...
echo.

REM Try PowerShell script first
if exist "%BACKEND_DIR%\setup-nssm.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%BACKEND_DIR%\setup-nssm.ps1"
    if not errorLevel 1 goto :nssm_downloaded
)

REM Try batch script if PowerShell failed
if exist "%BACKEND_DIR%\setup-nssm.bat" (
    call "%BACKEND_DIR%\setup-nssm.bat"
    if not errorLevel 1 goto :nssm_downloaded
)

echo ERROR: Could not download NSSM
echo Please run setup-nssm.bat or setup-nssm.ps1 first
pause
exit /b 1

:nssm_downloaded
echo NSSM downloaded successfully.
echo.

:nssm_exists

REM Check if node_modules exists, install if needed
if exist "%BACKEND_DIR%\node_modules" goto :node_modules_ok

echo Installing Node.js dependencies...
call npm install
if errorLevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

:node_modules_ok

REM Generate Prisma client if needed
if exist "%BACKEND_DIR%\node_modules\.prisma\client\index.d.ts" goto :prisma_ok

echo Generating Prisma client...
call npx prisma generate
if errorLevel 1 (
    echo ERROR: Prisma generation failed
    pause
    exit /b 1
)

:prisma_ok
"%NSSM_EXE%" status "%SERVICE_NAME%" >nul 2>&1
if errorLevel 1 goto :service_not_exists

echo Service "%SERVICE_NAME%" already exists.
echo Removing existing service...
"%NSSM_EXE%" stop "%SERVICE_NAME%" >nul 2>&1
"%NSSM_EXE%" remove "%SERVICE_NAME%" confirm >nul 2>&1
echo.

:service_not_exists

REM Find Node.js installation
for /f "delims=" %%i in ('where node.exe 2^>nul') do set NODE_EXE=%%i

if not defined NODE_EXE (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Found Node.js at: %NODE_EXE%
echo.

REM Install service with absolute paths to src/server.ts
echo Installing service "%SERVICE_NAME%"...
"%NSSM_EXE%" install "%SERVICE_NAME%" "%BACKEND_DIR%\node_modules\.bin\tsx.cmd" "watch %BACKEND_DIR%\src\server.ts"
if errorLevel 1 (
    echo ERROR: Failed to install service
    pause
    exit /b 1
)

REM CRITICAL: Set AppDirectory to ensure tsx runs in the correct context
echo Setting service working directory...
"%NSSM_EXE%" set "%SERVICE_NAME%" AppDirectory "%BACKEND_DIR%"

REM Set service properties
echo Configuring service...
"%NSSM_EXE%" set "%SERVICE_NAME%" AppDirectory "%BACKEND_DIR%"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStdout "%BACKEND_DIR%\logs\service.log"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStderr "%BACKEND_DIR%\logs\service-error.log"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateFiles 1
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateOnline 1
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateSeconds 86400
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateBytes 104857600
"%NSSM_EXE%" set "%SERVICE_NAME%" Description "MedLab Backend Service - Node.js API Server"

REM Create logs directory if it doesn't exist
if not exist "%BACKEND_DIR%\logs" mkdir "%BACKEND_DIR%\logs"

echo.
echo ====================================
echo Installation Complete!
echo ====================================
echo.
echo Service: %SERVICE_NAME%
echo Status: Ready to start
echo.
echo To start the service, run:
echo   net start %SERVICE_NAME%
echo.
echo To stop the service, run:
echo   net stop %SERVICE_NAME%
echo.
echo To remove the service, run:
echo   "%NSSM_EXE%" remove %SERVICE_NAME% confirm
echo.
echo Service logs are stored in:
echo   %BACKEND_DIR%\logs\service.log
echo   %BACKEND_DIR%\logs\service-error.log
echo.
echo For detailed information, see: SERVICE_RUNNING.txt
echo.
pause