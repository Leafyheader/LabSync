# Testing the Updated MedLab Application

## Database URL Resolution Fix

The MedLab application has been updated to properly handle database URL configuration and prevent multiple instances. Here's what was fixed:

### ✅ **Single Instance Protection**
- Added `app.requestSingleInstanceLock()` to prevent multiple app instances
- If a second instance is launched, it will focus the existing window instead
- Added initialization flags to prevent rapid clicking issues

### ✅ **Improved Database URL Resolution**
The application now follows this priority order:

1. **Packaged Database** (Production):
   - Looks for `resources/app.asar.unpacked/backend/database.url`
   - Copies packaged database to user data directory if needed
   - Uses user data location for actual database operations

2. **User Data Database**:
   - Checks `%APPDATA%/MedLab/database.url`
   - Uses existing user configuration if found

3. **Automatic Fallback**:
   - Creates new SQLite database in `%APPDATA%/MedLab/medlab.db`
   - Saves configuration for future use
   - Logs all steps for troubleshooting

### ✅ **Enhanced Logging**
- Console logs show exactly what database configuration is being used
- Clear error messages for troubleshooting
- Step-by-step initialization logging

## Testing the Fix

### Before Starting MedLab:
1. **Close any existing MedLab processes** in Task Manager
2. **Delete old configuration** (optional): Remove `%APPDATA%/MedLab/` folder to test fresh install
3. **Check available RAM**: Ensure other applications aren't using excessive memory

### Expected Startup Behavior:
```
MedLab starting up...
Loaded database configuration...
Starting backend server...
Backend: Server running on port 3001
Checking if database needs seeding...
Backend is healthy, database should be ready
Creating new MedLab window...
MedLab window ready and shown
```

### If Multiple Instances Are Clicked:
```
Another instance of MedLab is already running. Exiting...
```
OR (if already running):
```
Window already exists or is initializing, focusing existing window
```

## Database Locations

### Development:
- Database file: `project/backend/data/medlab.db`
- Config file: `project/backend/database.url`

### Production (Installed App):
- Database file: `%APPDATA%/MedLab/medlab.db`
- Config file: `%APPDATA%/MedLab/database.url`
- Packaged template: `Program Files/MedLab/resources/app.asar.unpacked/backend/`

## Troubleshooting

### If "database.url not found" still appears:
1. Check that the app is properly installed with the new version
2. Verify `%APPDATA%/MedLab/` directory has write permissions
3. Run the app as administrator once to create initial files

### If app still opens multiple times:
1. Wait 10 seconds between clicks (initialization takes time)
2. Check Task Manager - kill any orphaned MedLab.exe processes
3. Restart computer to clear any stuck processes

### Database Issues:
- The app will automatically create a fresh database if none exists
- Default users will be available: superadmin/admin/staff
- Check `%APPDATA%/MedLab/` for database file location

## Performance Notes for 2GB RAM:
- First startup may take 30-60 seconds
- Subsequent startups should be faster (15-30 seconds)
- Close other applications before running MedLab
- Database operations may take 2-5 seconds on slower systems

---

**The updated installer is ready for deployment!**
File: `dist-electron/MedLab Setup 1.0.0.exe`
