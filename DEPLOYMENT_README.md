# MedLab Windows Deployment Package

Complete guide for deploying MedLab (backend, frontend, Apache) as a production application on Windows client machines.

## 📦 What's Included

This package enables you to:

✅ **Run Backend as Windows Service** - Automatic startup, restart on crash, service management  
✅ **Serve Frontend via Apache** - Production-ready web server on port 8081  
✅ **Automated Installation** - Simple one-command setup for clients  
✅ **Service Management** - Easy start/stop/restart from command line or Windows Services GUI  
✅ **Comprehensive Logging** - Full operation logs for troubleshooting  

## 🚀 Quick Start (Your Development Machine)

### 1. Build Frontend
```powershell
cd C:\Users\Leafyhead\Documents\MedLab\project
npm run build
```

### 2. Deploy Frontend to Apache
```powershell
xcopy dist\* "Apache24\htdocs\medlab\" /E /I /Y
```

### 3. Verify Deployment Checklist
```cmd
cd project
deployment-checklist.bat
```

### 4. Create Distribution Package
```
Folder: C:\Deployment\MedLab-Client-Package\
├── backend\              (entire backend folder)
├── Apache24\             (entire Apache folder)
└── DEPLOYMENT_COMPLETE.md
```

ZIP and distribute to clients.

## 📋 Files Created for Windows Service

In `backend/` folder:

| File | Purpose |
|------|---------|
| `install-service.bat` | Installs backend as Windows service |
| `service-manager.bat` | Manages service (start/stop/restart/logs) |
| `setup-nssm.bat` | Downloads NSSM tool (batch version) |
| `setup-nssm.ps1` | Downloads NSSM tool (PowerShell version) |
| `SERVICE_SETUP_GUIDE.md` | Detailed service setup guide |
| `QUICK_START.txt` | Quick reference for clients |

## 🔧 Client Installation (Simple)

```cmd
# 1. Extract package to C:\MedLab\

# 2. Open Command Prompt as Administrator

# 3. Install backend service
cd C:\MedLab\backend
install-service.bat

# 4. Start the service
service-manager.bat start

# 5. Start Apache
cd C:\MedLab\Apache24\bin
httpd.exe -k start

# 6. Open browser: http://localhost:8081
```

## 📝 Configuration for Clients

Before distribution, update `.env` in backend:

```env
DATABASE_URL="mysql://root:root@<DATABASE_HOST>:3306/medlab"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="12h"
PORT=3001
```

## 📊 Architecture

```
┌─────────────────────────────────────────────────┐
│           Client Windows PC                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────────────┐                    │
│  │   Apache (port 8081)   │ ← Browser          │
│  │  - Serves Frontend     │                    │
│  │  - Proxies /api/*      │                    │
│  └────────────┬───────────┘                    │
│               │ (reverse proxy)                │
│               ↓                                │
│  ┌────────────────────────┐                    │
│  │ Backend Service (3001) │ ← Windows Service  │
│  │  - Node.js + Express   │   Auto-restart     │
│  │  - Prisma ORM          │   Logs to disk     │
│  └────────────┬───────────┘                    │
│               │                                │
│               ↓                                │
│  ┌────────────────────────┐                    │
│  │   MySQL Database       │ ← Local or Remote  │
│  │                        │                    │
│  └────────────────────────┘                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🛠️ Key Features

### Automatic Service Management
- ✅ Runs without user login
- ✅ Auto-restarts on failure
- ✅ Logs to files
- ✅ Starts on Windows boot

### Easy Service Control
```cmd
service-manager.bat start      # Start backend
service-manager.bat stop       # Stop backend
service-manager.bat restart    # Restart backend
service-manager.bat status     # Check status
service-manager.bat logs       # View logs
```

### Apache Control
```cmd
httpd.exe -k start             # Start Apache
httpd.exe -k stop              # Stop Apache
httpd.exe -k restart           # Restart Apache
httpd.exe -k status            # Check status
```

## 📚 Documentation Files

| File | For Whom | Content |
|------|----------|---------|
| `DEPLOYMENT_COMPLETE.md` | System Admins | Full deployment guide |
| `backend/SERVICE_SETUP_GUIDE.md` | Tech Staff | Service technical details |
| `backend/QUICK_START.txt` | End Users | Quick reference card |
| `Apache24/MEDLAB_SETUP.md` | Admins | Apache configuration |

## 🔍 Troubleshooting

### Backend won't start?
```cmd
cd C:\MedLab\backend
service-manager.bat logs
```

Check MySQL is running and `.env` DATABASE_URL is correct.

### Apache won't start?
```cmd
cd C:\MedLab\Apache24\bin
httpd.exe -t           # Test configuration
httpd.exe -k start     # Start with error output
```

### Frontend not loading?
1. Verify Apache is running: `httpd.exe -k status`
2. Check `Apache24/logs/medlab-error.log`
3. Verify files exist: `Apache24/htdocs/medlab/index.html`

## 🔐 Security Notes

For production deployment:

1. **Database**: Use strong passwords in `.env`
2. **Firewall**: Restrict access to port 8081
3. **HTTPS**: Configure SSL certificates
4. **Backups**: Schedule regular database backups
5. **Users**: Run services with limited privileges

## 📦 Distribution

### Recommended Folder Structure
```
C:\Deployment\
└── MedLab-Client-Package\ (ZIP this folder)
    ├── backend\
    ├── Apache24\
    ├── DEPLOYMENT_COMPLETE.md
    ├── deployment-checklist.bat
    └── README.txt (quick instructions)
```

### File Size Estimate
- Backend: ~200MB (with node_modules)
- Apache24: ~150MB
- Total: ~350MB (compressed: ~100-150MB)

## ✅ Pre-Delivery Checklist

- [ ] Run `deployment-checklist.bat` and verify all pass
- [ ] Frontend built and in `Apache24/htdocs/medlab/`
- [ ] `.env` configured with correct DATABASE_URL
- [ ] All documentation files present
- [ ] NSSM available or setup scripts included
- [ ] Package tested on a clean Windows machine

## 📞 Support

For detailed information:
1. Read `DEPLOYMENT_COMPLETE.md` for full setup guide
2. Check `backend/SERVICE_SETUP_GUIDE.md` for service details
3. See `Apache24/MEDLAB_SETUP.md` for web server config
4. Refer to `backend/QUICK_START.txt` for quick commands

## 🎯 Next Steps

1. **Build & Test**
   ```powershell
   npm run build
   xcopy dist\* Apache24\htdocs\medlab\ /E /I /Y
   deployment-checklist.bat
   ```

2. **Create Package**
   - Copy backend/ and Apache24/ folders
   - Include DEPLOYMENT_COMPLETE.md
   - Create ZIP file

3. **Distribute**
   - Send to clients
   - Clients extract to C:\MedLab\
   - Clients run install-service.bat
   - Done!

---

**Version**: 1.0  
**Last Updated**: 2025-10-20  
**Requires**: Windows 7+, Node.js 18+, MySQL 5.7+
