# MedLab Backend Windows Service Setup

This guide explains how to set up the MedLab backend as a Windows service for client deployment.

## What is NSSM?

**NSSM (Non-Sucking Service Manager)** is a lightweight tool that wraps any application (like Node.js) as a Windows service. It:
- Starts automatically on Windows boot
- Restarts automatically if the service crashes
- Logs all output to files
- Manages service lifecycle (start, stop, restart)
- Works without requiring .NET Framework or other dependencies

## Pre-Deployment Checklist

Before packaging for the client, verify:

- [ ] Backend `.env` file is properly configured with MySQL connection string
- [ ] `package.json` dependencies are up to date
- [ ] `node_modules` folder exists (or will be created by `npm install`)
- [ ] MySQL database exists and is accessible from the client's machine
- [ ] Node.js is installed on the client's machine (v18+)

## Installation Steps on Client PC

### Step 1: Download Files

Copy the entire backend folder to the client's PC. Recommended location:
```
C:\MedLab\backend
```

### Step 2: Install Node.js (if not already installed)

- Download from: https://nodejs.org (LTS version recommended)
- Or download the portable Node.js included in the deployment package

### Step 3: Install Dependencies

Open Command Prompt as Administrator:

```cmd
cd C:\MedLab\backend
npm install
```

### Step 4: Configure Environment

Edit `.env` file and ensure MySQL connection is correct:

```env
DATABASE_URL="mysql://root:root@<MYSQL_HOST>:3306/medlab"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="12h"
PORT=3001
```

Replace `<MYSQL_HOST>` with the actual MySQL server hostname or IP.

### Step 5: Install as Windows Service

Open Command Prompt **as Administrator** and run:

```cmd
cd C:\MedLab\backend
install-service.bat
```

This will:
- Check for Administrator privileges
- Install Node.js dependencies (if needed)
- Install the service
- Configure logging

### Step 6: Start the Service

```cmd
net start MedLabBackend
```

Or use the service manager:

```cmd
service-manager.bat start
```

### Step 7: Verify Service is Running

Check status:

```cmd
service-manager.bat status
```

View logs:

```cmd
service-manager.bat logs
```

## Service Management Commands

### Using `service-manager.bat`

```cmd
service-manager.bat start       # Start the service
service-manager.bat stop        # Stop the service
service-manager.bat restart     # Restart the service
service-manager.bat status      # Check status
service-manager.bat logs        # View recent logs
```

### Using Windows Command Line

```cmd
net start MedLabBackend         # Start service
net stop MedLabBackend          # Stop service
sc query MedLabBackend          # Check status
```

### Using Windows Services GUI

1. Press `Win + R`
2. Type `services.msc`
3. Find "MedLab Backend Service"
4. Right-click for start/stop/restart options

## Logs and Troubleshooting

### Log Location

Service logs are stored in:
```
C:\MedLab\backend\logs\service.log      (standard output)
C:\MedLab\backend\logs\service-error.log (error output)
```

### View Real-Time Logs

```cmd
service-manager.bat logs
```

### Common Issues

**Service won't start:**
- Check MySQL is running and accessible
- Verify `.env` DATABASE_URL is correct
- Check logs: `service-manager.bat logs`
- Ensure Node.js is in PATH: `node --version`

**Port 3001 already in use:**
- Change PORT in `.env` file
- Stop conflicting service: `netstat -ano | findstr :3001`

**Permission denied errors:**
- Ensure you're running command prompt as Administrator
- Check folder permissions for `C:\MedLab\backend`

**Service won't stop:**
- Use Task Manager to find and kill the node process
- Then retry: `net stop MedLabBackend`

## Uninstalling the Service

To remove the service from Windows:

```cmd
cd C:\MedLab\backend
nssm\nssm.exe remove MedLabBackend confirm
```

## Packaging for Distribution

To create a deployable package:

1. Ensure `.env` is configured for the target environment
2. Run `npm install` in the backend folder
3. Create a folder structure:
   ```
   MedLab-Backend-Package\
   ├── backend\               (entire backend folder)
   │   ├── src\
   │   ├── node_modules\      (after npm install)
   │   ├── .env
   │   ├── package.json
   │   ├── package-lock.json
   │   ├── install-service.bat
   │   ├── service-manager.bat
   │   ├── nssm\              (NSSM executable)
   │   └── README.md
   ├── DEPLOYMENT_GUIDE.md
   └── QUICK_START.txt
   ```

4. Compress to ZIP and distribute

## Additional Notes

- The service runs with the current user's permissions
- Logs are rotated daily and capped at ~100MB per file
- Service auto-restarts on crash
- Service starts automatically on Windows boot after installation

## Support

If issues occur:
1. Check logs: `service-manager.bat logs`
2. Verify MySQL connection: ping the database host
3. Test Node.js: `node --version`
4. Restart service: `service-manager.bat restart`
