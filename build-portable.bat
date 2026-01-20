@echo off
echo Building MedLab Portable Application...

REM Create build directory
if not exist "build-portable" mkdir build-portable
cd build-portable

REM Download portable Node.js
echo Downloading Node.js portable...
curl -L "https://nodejs.org/dist/v18.17.0/node-v18.17.0-win-x64.zip" -o node-portable.zip
powershell -command "Expand-Archive -Path node-portable.zip -DestinationPath . -Force"
ren node-v18.17.0-win-x64 nodejs

REM Build frontend
echo Building frontend...
cd ..\
call npm run build
xcopy /E /I /Y dist build-portable\app\frontend

REM Copy backend
echo Copying backend...
xcopy /E /I /Y backend build-portable\app\backend
cd build-portable\app\backend
..\..\..\nodejs\npm.cmd install --production

REM Create startup scripts
cd ..\..
echo Creating startup scripts...

REM Create database startup
echo @echo off > start-database.bat
echo echo Starting SQLite database... >> start-database.bat
echo cd app\backend >> start-database.bat
echo ..\..\nodejs\npm.cmd run db:migrate >> start-database.bat
echo ..\..\nodejs\npm.cmd run db:seed >> start-database.bat

REM Create backend startup
echo @echo off > start-backend.bat
echo echo Starting MedLab Backend... >> start-backend.bat
echo cd app\backend >> start-backend.bat
echo set NODE_ENV=production >> start-backend.bat
echo ..\..\nodejs\node.exe server.js >> start-backend.bat

REM Create frontend startup (using a simple HTTP server)
echo @echo off > start-frontend.bat
echo echo Starting MedLab Frontend... >> start-frontend.bat
echo cd app\frontend >> start-frontend.bat
echo ..\..\nodejs\npx.cmd serve -s . -p 3000 >> start-frontend.bat

REM Create main startup script
echo @echo off > start-medlab.bat
echo echo Starting MedLab Application... >> start-medlab.bat
echo echo. >> start-medlab.bat
echo echo Initializing database... >> start-medlab.bat
echo call start-database.bat >> start-medlab.bat
echo echo. >> start-medlab.bat
echo echo Starting backend server... >> start-medlab.bat
echo start /b start-backend.bat >> start-medlab.bat
echo timeout /t 3 /nobreak ^> nul >> start-medlab.bat
echo echo Starting frontend... >> start-medlab.bat
echo start /b start-frontend.bat >> start-medlab.bat
echo timeout /t 2 /nobreak ^> nul >> start-medlab.bat
echo echo. >> start-medlab.bat
echo echo MedLab is starting... >> start-medlab.bat
echo echo Frontend: http://localhost:3000 >> start-medlab.bat
echo echo Backend: http://localhost:3001 >> start-medlab.bat
echo echo. >> start-medlab.bat
echo echo Opening MedLab in your default browser... >> start-medlab.bat
echo timeout /t 3 /nobreak ^> nul >> start-medlab.bat
echo start http://localhost:3000 >> start-medlab.bat
echo pause >> start-medlab.bat

echo.
echo Portable build complete!
echo Run start-medlab.bat to start the application
echo.
pause
