@echo off
REM MedLab Deployment Checklist & Helper
REM Use this to verify everything is ready for client distribution

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ================================================
echo MedLab Deployment Verification Checklist
echo ================================================
echo.

set /a PASS=0
set /a FAIL=0

REM Check backend files
echo [1] Checking Backend Files...
if exist "backend\src\server.ts" (
    echo   ✓ Backend source found
    set /a PASS+=1
) else (
    echo   ✗ Backend source missing (backend\src\server.ts)
    set /a FAIL+=1
)

if exist "backend\package.json" (
    echo   ✓ package.json found
    set /a PASS+=1
) else (
    echo   ✗ package.json missing
    set /a FAIL+=1
)

if exist "backend\install-service.bat" (
    echo   ✓ install-service.bat found
    set /a PASS+=1
) else (
    echo   ✗ install-service.bat missing
    set /a FAIL+=1
)

if exist "backend\service-manager.bat" (
    echo   ✓ service-manager.bat found
    set /a PASS+=1
) else (
    echo   ✗ service-manager.bat missing
    set /a FAIL+=1
)

if exist "backend\.env" (
    echo   ✓ .env file found
    set /a PASS+=1
) else (
    echo   ✗ .env file missing (required for configuration)
    set /a FAIL+=1
)

echo.
echo [2] Checking Apache Files...
if exist "Apache24\bin\httpd.exe" (
    echo   ✓ Apache executable found
    set /a PASS+=1
) else (
    echo   ✗ Apache executable missing
    set /a FAIL+=1
)

if exist "Apache24\conf\httpd.conf" (
    echo   ✓ httpd.conf found
    set /a PASS+=1
) else (
    echo   ✗ httpd.conf missing
    set /a FAIL+=1
)

if exist "Apache24\conf\extra\httpd-vhosts.conf" (
    echo   ✓ httpd-vhosts.conf found
    set /a PASS+=1
) else (
    echo   ✗ httpd-vhosts.conf missing
    set /a FAIL+=1
)

if exist "Apache24\htdocs\medlab" (
    echo   ✓ medlab frontend directory exists
    if exist "Apache24\htdocs\medlab\index.html" (
        echo   ✓ Frontend built (index.html found)
        set /a PASS+=1
    ) else (
        echo   ✗ Frontend not built (index.html missing)
        echo     Run: npm run build
        echo     Then copy dist\* to Apache24\htdocs\medlab\
        set /a FAIL+=1
    )
    set /a PASS+=1
) else (
    echo   ✗ medlab frontend directory missing
    set /a FAIL+=1
)

echo.
echo [3] Checking Documentation...
if exist "DEPLOYMENT_COMPLETE.md" (
    echo   ✓ Deployment guide found
    set /a PASS+=1
) else (
    echo   ✗ Deployment guide missing
    set /a FAIL+=1
)

if exist "backend\SERVICE_SETUP_GUIDE.md" (
    echo   ✓ Service setup guide found
    set /a PASS+=1
) else (
    echo   ✗ Service setup guide missing
    set /a FAIL+=1
)

if exist "backend\QUICK_START.txt" (
    echo   ✓ Quick start guide found
    set /a PASS+=1
) else (
    echo   ✗ Quick start guide missing
    set /a FAIL+=1
)

echo.
echo ================================================
echo Results: %PASS% Passed, %FAIL% Failed
echo ================================================
echo.

if %FAIL% gtr 0 (
    echo Issues found! Please address the failures above.
    echo.
    echo BEFORE DISTRIBUTING:
    echo 1. Build frontend: npm run build
    echo 2. Copy frontend: xcopy dist\* Apache24\htdocs\medlab\ /E /I /Y
    echo 3. Verify this checklist again
    echo.
) else (
    echo ✓ All checks passed! Ready for distribution.
    echo.
    echo TO DISTRIBUTE:
    echo 1. Folder structure:
    echo    C:\Deployment\MedLab-Client-Package\
    echo    ├── backend\
    echo    ├── Apache24\
    echo    └── DEPLOYMENT_COMPLETE.md
    echo.
    echo 2. Compress to ZIP file
    echo 3. Distribute to clients
    echo.
    echo CLIENT INSTALLATION:
    echo   - Extract package to C:\MedLab\
    echo   - Read DEPLOYMENT_COMPLETE.md
    echo   - Follow installation steps
    echo.
)

pause
