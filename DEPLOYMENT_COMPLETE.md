# MedLab Complete Deployment Guide for Windows Clients

This document provides step-by-step instructions for deploying the entire MedLab application (backend, frontend, and Apache) on a client's Windows PC.

## System Requirements

- **OS**: Windows 7 SP1 or later (Windows 10/11 recommended)
- **RAM**: Minimum 2GB (4GB recommended)
- **Disk Space**: 1GB for application + data
- **Database**: MySQL 5.7+ or MariaDB 10.2+ (can be local or remote)
- **Node.js**: v18 LTS or later (optional if using portable version)

## Deployment Package Structure

```
MedLab-Client-Package/
├── backend/                      # Node.js backend service
│   ├── src/
│   ├── node_modules/            (after npm install)
│   ├── .env                      (configured for target environment)
│   ├── package.json
│   ├── install-service.bat       (install as Windows service)
│   ├── service-manager.bat       (manage service)
│   ├── setup-nssm.bat           (download NSSM tool)
│   ├── QUICK_START.txt
│   ├── SERVICE_SETUP_GUIDE.md
│   └── nssm/                    (NSSM executable directory)
│
├── Apache24/                     # Apache web server with MedLab config
│   ├── bin/
│   ├── conf/
│   │   ├── httpd.conf           (configured for port 8081)
│   │   └── extra/
│   │       └── httpd-vhosts.conf
│   ├── htdocs/
│   │   └── medlab/              (frontend SPA - copy dist here)
│   ├── logs/
│   ├── MEDLAB_SETUP.md
│   └── (rest of Apache24 files)
│
└── DEPLOYMENT_README.md         (this file)
```

## Pre-Deployment Setup (On Your Development Machine)

### 1. Build the Frontend

```powershell
cd C:\Users\Leafyhead\Documents\MedLab\project
npm run build
```

### 2. Copy Frontend to Apache

```powershell
xcopy dist\* "C:\Users\Leafyhead\Documents\MedLab\project\Apache24\htdocs\medlab\" /E /I /Y
```

### 3. Prepare Backend Package

In the backend folder:
```powershell
cd C:\Users\Leafyhead\Documents\MedLab\project\backend
npm install --production
```

### 4. Create Deployment Package

Create folder: `C:\Deployment\MedLab-Client-Package\`

Copy:
- `backend/` → `MedLab-Client-Package/backend/`
- `Apache24/` → `MedLab-Client-Package/Apache24/`

Add file: `MedLab-Client-Package/DEPLOYMENT_README.md` (this guide)

ZIP entire folder for distribution.

## Client Installation (Step-by-Step)

### Step 1: Extract Package

1. Extract `MedLab-Client-Package.zip` to `C:\MedLab\`
2. Folder structure should be:
   ```
   C:\MedLab\
   ├── backend/
   ├── Apache24/
   └── DEPLOYMENT_README.md
   ```

### Step 2: Install Node.js (if not already installed)

Option A: Download and Install
- Visit https://nodejs.org (LTS version)
- Run installer, accept defaults
- Restart computer

Option B: Use Portable Node.js (if included in package)
- Extract portable Node.js to `C:\MedLab\nodejs\`
- Add to PATH or use full path when running commands

Verify installation:
```cmd
node --version
npm --version
```

### Step 3: Configure Database Connection

Edit `C:\MedLab\backend\.env`:

```env
DATABASE_URL="mysql://root:root@<DATABASE_HOST>:3306/medlab"
JWT_SECRET="your-secure-random-string"
JWT_EXPIRES_IN="12h"
PORT=3001
NODE_ENV="production"
```

**Important**: Replace `<DATABASE_HOST>` with:
- `localhost` if MySQL is on the same machine
- IP address or hostname if MySQL is on a different server

### Step 4: Install Backend as Windows Service

Open **Command Prompt as Administrator**:

```cmd
cd C:\MedLab\backend
setup-nssm.bat
```

Wait for completion, then:

```cmd
install-service.bat
```

### Step 5: Start Backend Service

```cmd
service-manager.bat start
```

Verify it's running:
```cmd
service-manager.bat status
```

Check logs:
```cmd
service-manager.bat logs
```

### Step 6: Configure Apache (if needed)

Default configuration listens on port 8081.

If you need to change the port, edit `C:\MedLab\Apache24\conf\httpd.conf`:

Find: `Listen 8081`
Change to: `Listen <YOUR_PORT>`

### Step 7: Start Apache

Open **Command Prompt as Administrator**:

```cmd
cd C:\MedLab\Apache24\bin
httpd.exe -k start
```

Check status:
```cmd
httpd.exe -k status
```

### Step 8: Access the Application

Open browser and navigate to:
```
http://localhost:8081
```

## Post-Installation

### Service Management

**Start/Stop Backend**:
```cmd
service-manager.bat start
service-manager.bat stop
service-manager.bat restart
```

**Start/Stop Apache**:
```cmd
cd C:\MedLab\Apache24\bin
httpd.exe -k start
httpd.exe -k stop
httpd.exe -k restart
```

### Automatic Startup

Both services are configured to start automatically on Windows boot:

- Backend: Enabled via NSSM
- Apache: Can be configured via Windows Services or startup scripts

### Monitor Services

**Check Backend Status**:
```cmd
cd C:\MedLab\backend
service-manager.bat status
service-manager.bat logs
```

**Check Apache Status**:
```cmd
cd C:\MedLab\Apache24\bin
httpd.exe -k status
```

View Apache error logs:
```
C:\MedLab\Apache24\logs\medlab-error.log
```

## Troubleshooting

### Backend Service Won't Start

1. Verify MySQL is running and accessible:
   ```cmd
   mysql -h <DATABASE_HOST> -u root -p
   ```

2. Check .env DATABASE_URL is correct

3. View service logs:
   ```cmd
   cd C:\MedLab\backend
   service-manager.bat logs
   ```

4. Check port 3001 isn't already in use:
   ```cmd
   netstat -ano | findstr :3001
   ```

### Apache Won't Start

1. Check port 8081 isn't in use:
   ```cmd
   netstat -ano | findstr :8081
   ```

2. Change to different port in `httpd.conf` if needed

3. Test Apache configuration:
   ```cmd
   cd C:\MedLab\Apache24\bin
   httpd.exe -t
   ```

### Frontend Not Loading

1. Verify Apache is running:
   ```cmd
   cd C:\MedLab\Apache24\bin
   httpd.exe -k status
   ```

2. Check frontend files exist:
   ```
   C:\MedLab\Apache24\htdocs\medlab\index.html
   ```

3. Check Apache error logs:
   ```
   C:\MedLab\Apache24\logs\medlab-error.log
   ```

### Uninstalling

To completely remove MedLab:

1. Stop Backend Service:
   ```cmd
   cd C:\MedLab\backend
   service-manager.bat stop
   nssm\nssm.exe remove MedLabBackend confirm
   ```

2. Stop Apache:
   ```cmd
   cd C:\MedLab\Apache24\bin
   httpd.exe -k stop
   httpd.exe -k remove
   ```

3. Delete folder:
   ```cmd
   rmdir C:\MedLab /S /Q
   ```

## Maintenance

### Database Backups

Regular backups of the MySQL database are recommended:

```cmd
mysqldump -h <DATABASE_HOST> -u root -p medlab > medlab-backup.sql
```

### Logs Cleanup

Service logs are automatically rotated. Clear old logs if needed:

```cmd
cd C:\MedLab\backend\logs
del *.log.* /Q
```

### Updating Backend

To deploy an updated backend:

1. Stop the service:
   ```cmd
   service-manager.bat stop
   ```

2. Replace backend files (keep .env and nssm folders)

3. Run npm install if dependencies changed:
   ```cmd
   npm install --production
   ```

4. Start service:
   ```cmd
   service-manager.bat start
   ```

## Support and Documentation

For detailed information, see:

- `backend/SERVICE_SETUP_GUIDE.md` - Backend service setup details
- `backend/QUICK_START.txt` - Quick reference guide
- `Apache24/MEDLAB_SETUP.md` - Apache configuration details

## Security Recommendations

For production deployment, consider:

1. **Firewall**: Restrict access to port 8081
2. **HTTPS**: Configure SSL certificates for Apache
3. **Database**: Use strong passwords, limit remote access
4. **User Accounts**: Run services with limited privileges
5. **Backups**: Implement automated database backups
6. **Updates**: Keep Node.js and MySQL updated

## Contact & Support

For issues or questions, provide:
- Windows version (10, 11, etc.)
- Output of `service-manager.bat logs`
- Output of `httpd.exe -t`
- MySQL connectivity test results
