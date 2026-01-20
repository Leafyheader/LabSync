# MedLab Setup Instructions 
 
## Prerequisites 
- Node.js 18 or higher (download from https://nodejs.org) 
- Git (optional, for updates) 
 
## Installation Steps 
 
1. Extract this ZIP file to your desired location 
2. Open Command Prompt or PowerShell as Administrator 
3. Navigate to the backend folder: `cd backend` 
4. Install dependencies: `npm install` 
5. Setup database: `npm run db:migrate` 
6. Seed initial data: `npm run db:seed` 
7. Start the application: `npm start` 
8. Open http://localhost:3001 in your web browser 
 
## Default Login 
- Username: superadmin 
- Password: Infinity@97 
 
## Troubleshooting 
- Make sure no other applications are using port 3001 
- Run Command Prompt as Administrator if you get permission errors 
- Check that Node.js is properly installed by running: `node --version` 
