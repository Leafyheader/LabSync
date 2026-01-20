@echo off
echo Building MedLab Desktop App (Development Build)...
echo =====================================================

REM Change to project root
cd /d "%~dp0"

echo.
echo Step 1: Building Frontend...
echo ----------------------------
call npm run build
if errorlevel 1 (
    echo ❌ Frontend build failed!
    pause
    exit /b 1
)
echo ✅ Frontend build complete!

echo.
echo Step 2: Building Backend...
echo ---------------------------
cd backend

echo Building backend TypeScript...
call npm run build
if errorlevel 1 (
    echo ❌ Backend build failed!
    pause
    exit /b 1
)

echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ❌ Prisma generate failed!
    pause
    exit /b 1
)

echo ✅ Backend build complete!

REM Return to project root
cd ..

echo.
echo Step 3: Building Electron App (No Installer)...
echo -----------------------------------------------
call npx electron-builder --dir
if errorlevel 1 (
    echo ❌ Electron build failed!
    pause
    exit /b 1
)

echo.
echo ✅ Build Complete!
echo ==================
echo.
echo Your app is ready at:
echo dist-electron-new\win-unpacked\MedLab.exe
echo.
echo You can now run the application directly without installation.
echo.
pause