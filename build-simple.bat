@echo off
echo Creating Simple ZIP Distribution for MedLab...

REM Create distribution directory
if not exist "dist-simple" mkdir dist-simple
cd dist-simple

REM Build frontend
echo Building frontend...
cd ..
call npm run build
xcopy /E /I /Y dist dist-simple\frontend

REM Copy backend (without node_modules - customer will need to run npm install)
echo Copying backend...
xcopy /E /I /Y backend dist-simple\backend
del dist-simple\backend\node_modules /q /s 2>nul
rmdir dist-simple\backend\node_modules /s /q 2>nul

REM Create setup instructions
cd dist-simple
echo # MedLab Setup Instructions > README.md
echo. >> README.md
echo ## Prerequisites >> README.md
echo - Node.js 18 or higher (download from https://nodejs.org) >> README.md
echo - Git (optional, for updates) >> README.md
echo. >> README.md
echo ## Installation Steps >> README.md
echo. >> README.md
echo 1. Extract this ZIP file to your desired location >> README.md
echo 2. Open Command Prompt or PowerShell as Administrator >> README.md
echo 3. Navigate to the backend folder: `cd backend` >> README.md
echo 4. Install dependencies: `npm install` >> README.md
echo 5. Setup database: `npm run db:migrate` >> README.md
echo 6. Seed initial data: `npm run db:seed` >> README.md
echo 7. Start the application: `npm start` >> README.md
echo 8. Open http://localhost:3001 in your web browser >> README.md
echo. >> README.md
echo ## Default Login >> README.md
echo - Username: superadmin >> README.md
echo - Password: Infinity@97 >> README.md
echo. >> README.md
echo ## Troubleshooting >> README.md
echo - Make sure no other applications are using port 3001 >> README.md
echo - Run Command Prompt as Administrator if you get permission errors >> README.md
echo - Check that Node.js is properly installed by running: `node --version` >> README.md

REM Create quick start script
echo @echo off > quick-start.bat
echo echo MedLab Quick Start >> quick-start.bat
echo echo. >> quick-start.bat
echo echo Checking Node.js installation... >> quick-start.bat
echo node --version >> quick-start.bat
echo if errorlevel 1 goto :no_node >> quick-start.bat
echo. >> quick-start.bat
echo echo Installing dependencies... >> quick-start.bat
echo cd backend >> quick-start.bat
echo npm install >> quick-start.bat
echo echo. >> quick-start.bat
echo echo Setting up database... >> quick-start.bat
echo npm run db:migrate >> quick-start.bat
echo npm run db:seed >> quick-start.bat
echo echo. >> quick-start.bat
echo echo Starting MedLab... >> quick-start.bat
echo echo Backend will start on http://localhost:3001 >> quick-start.bat
echo echo. >> quick-start.bat
echo npm start >> quick-start.bat
echo goto :end >> quick-start.bat
echo. >> quick-start.bat
echo :no_node >> quick-start.bat
echo echo ERROR: Node.js is not installed! >> quick-start.bat
echo echo Please download and install Node.js from https://nodejs.org >> quick-start.bat
echo echo Then run this script again. >> quick-start.bat
echo pause >> quick-start.bat
echo. >> quick-start.bat
echo :end >> quick-start.bat

echo.
echo Simple distribution created in dist-simple folder!
echo Customer just needs to:
echo 1. Install Node.js
echo 2. Extract the ZIP
echo 3. Run quick-start.bat
echo.
pause
