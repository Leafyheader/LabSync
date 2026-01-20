@echo off
echo Building MedLab Electron Desktop App...

REM Build the frontend
echo Building frontend...
call npm run build
if errorlevel 1 (
    echo Frontend build failed!
    pause
    exit /b 1
)

REM Copy backend to build directory
echo Copying backend...
if not exist "backend-temp" mkdir backend-temp
xcopy /E /I /Y backend backend-temp

REM Install production dependencies for backend
echo Installing backend dependencies...
cd backend-temp
call npm install --production
if errorlevel 1 (
    echo Backend dependency installation failed!
    cd ..
    pause
    exit /b 1
)
cd ..

REM Update Electron build config to include backend
echo Updating build configuration...
powershell -Command "(Get-Content package.json) -replace '\"dist/\*\*/\*\"', '\"dist/**/*\", \"backend-temp/**/*\"' | Set-Content package.json"

REM Build Electron app
echo Building Electron app...
call npx electron-builder
if errorlevel 1 (
    echo Electron build failed!
    pause
    exit /b 1
)

REM Restore original package.json
echo Restoring configuration...
powershell -Command "(Get-Content package.json) -replace '\"dist/\*\*/\*\", \"backend-temp/\*\*/\*\"', '\"dist/**/*\"' | Set-Content package.json"

REM Clean up
echo Cleaning up...
rmdir /s /q backend-temp

echo.
echo Build complete! Check the dist-electron folder for your installer.
echo.
pause
