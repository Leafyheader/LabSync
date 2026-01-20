@echo off 
echo MedLab Quick Start 
echo. 
echo Checking Node.js installation... 
node --version 
if errorlevel 1 goto :no_node 
 
echo Installing dependencies... 
cd backend 
npm install 
echo. 
echo Setting up database... 
npm run db:migrate 
npm run db:seed 
echo. 
echo Starting MedLab... 
echo Backend will start on http://localhost:3001 
echo. 
npm start 
goto :end 
 
:no_node 
echo ERROR: Node.js is not installed! 
echo Please download and install Node.js from https://nodejs.org 
echo Then run this script again. 
pause 
 
:end 
