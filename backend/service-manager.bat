@echo off
REM MedLab Backend Service Manager

setlocal enabledelayedexpansion

if "%1"=="" (
    echo.
    echo Usage: service-manager.bat [start^|stop^|restart^|status^|logs]
    echo.
    echo Commands:
    echo   start      - Start the MedLab Backend service
    echo   stop       - Stop the MedLab Backend service
    echo   restart    - Restart the MedLab Backend service
    echo   status     - Check service status
    echo   logs       - View service logs
    echo.
    pause
    exit /b 1
)

set SERVICE_NAME=MedLabBackend
set LOG_FILE=%~dp0logs\service.log

if /i "%1"=="start" (
    echo Starting service "%SERVICE_NAME%"...
    net start "%SERVICE_NAME%"
    if !errorLevel! equ 0 (
        echo Service started successfully.
    ) else (
        echo Failed to start service.
    )
    goto :end
)

if /i "%1"=="stop" (
    echo Stopping service "%SERVICE_NAME%"...
    net stop "%SERVICE_NAME%"
    if !errorLevel! equ 0 (
        echo Service stopped successfully.
    ) else (
        echo Failed to stop service.
    )
    goto :end
)

if /i "%1"=="restart" (
    echo Restarting service "%SERVICE_NAME%"...
    net stop "%SERVICE_NAME%"
    timeout /t 2 /nobreak
    net start "%SERVICE_NAME%"
    if !errorLevel! equ 0 (
        echo Service restarted successfully.
    ) else (
        echo Failed to restart service.
    )
    goto :end
)

if /i "%1"=="status" (
    echo.
    sc query "%SERVICE_NAME%"
    goto :end
)

if /i "%1"=="logs" (
    if exist "%LOG_FILE%" (
        echo.
        echo Displaying last 100 lines of logs:
        echo.
        powershell -NoProfile -Command "Get-Content '%LOG_FILE%' -Tail 100"
    ) else (
        echo No logs found at %LOG_FILE%
    )
    goto :end
)

:end
pause
