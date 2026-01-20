# MedLab Apache Setup for Production

This Apache configuration serves the MedLab frontend and reverse-proxies API calls to the Node.js backend running on port 3001.

## Prerequisites

- **Backend**: Must be running on `localhost:3001` (npm run dev or production server)
- **Database**: MySQL must be running on `localhost:3306` with credentials `root:root`
- **Node.js version**: Check `project/backend/package.json`

## Configuration Files Modified

1. **conf/httpd.conf**
   - Set `ServerRoot` to `C:/Apache24` (absolute path for Windows)
   - Enabled proxy modules: `mod_proxy`, `mod_proxy_http`
   - Module `mod_rewrite` is already enabled

2. **conf/extra/httpd-vhosts.conf**
   - Added MedLab virtual host on port 80
   - Frontend served from: `C:/Apache24/htdocs/medlab`
   - API proxied to: `http://localhost:3001/api`

## Starting Apache

### Windows (Command Prompt as Administrator)

```cmd
cd C:\Apache24\bin
httpd.exe -k start
```

### Check Status

```cmd
httpd.exe -k status
```

### Stop Apache

```cmd
httpd.exe -k stop
```

### Restart Apache

```cmd
httpd.exe -k restart
```

## Starting the Backend

Before accessing the application, ensure the backend is running:

```powershell
cd C:\Users\Leafyhead\Documents\MedLab\project\backend
npm run dev
```

The backend will start on port 3001 and connect to MySQL.

## Accessing the Application

Once Apache and the backend are running:

1. Open browser: `http://localhost`
2. The frontend will load from Apache
3. API calls to `/api/*` will be automatically proxied to the backend on port 3001

## Frontend Build

If you need to rebuild the frontend before running:

```powershell
cd C:\Users\Leafyhead\Documents\MedLab\project
npm run build
```

Then copy the built files to Apache:

```powershell
xcopy dist\* C:\Apache24\htdocs\medlab\ /E /I /Y
```

Or for a fresh deployment, remove old files first:

```powershell
rmdir C:\Apache24\htdocs\medlab /S /Q
mkdir C:\Apache24\htdocs\medlab
xcopy dist\* C:\Apache24\htdocs\medlab\ /E /I /Y
```

## Logs

- **Error log**: `logs/medlab-error.log`
- **Access log**: `logs/medlab-access.log`
- **Apache error log**: `logs/error.log`

## Troubleshooting

### Port 80 already in use
Change the listen port in `conf/extra/httpd-vhosts.conf`:
```
<VirtualHost *:8080>
```
Then access via `http://localhost:8080`

### Backend not responding
- Verify backend is running on port 3001: `lsof -i :3001` or `netstat -ano | findstr :3001`
- Check `logs/medlab-error.log` for proxy errors

### Frontend not loading
- Verify `dist-simple/frontend/index.html` exists
- Check `logs/medlab-access.log` for 404 errors
- Rebuild frontend with `npm run build`

## Security Notes (for production)

For a production setup, consider:
1. Enable HTTPS (SSL certificates in `conf/ssl/`)
2. Add security headers (CSP, HSTS, etc.)
3. Run Apache as a service with proper user permissions
4. Use environment-based configuration for database URLs
5. Implement rate limiting on `/api` routes
