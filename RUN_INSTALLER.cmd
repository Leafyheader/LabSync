@echo off
REM Run the installer via cmd.exe to avoid PowerShell parsing issues
REM This ensures batch syntax is interpreted correctly
cd /d "%~dp0"
cd backend
cmd.exe /c "install-service.bat"
pause
