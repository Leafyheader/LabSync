# Electron SQLite Database Location Guide

## Overview
The Electron app uses SQLite database with automatic path resolution based on the environment.

## Database File Location

### Development Mode
When running in development (`npm run dev`):
- **Location**: Backend expects database from `.env` file or default backend location
- **Path**: Typically `project/backend/data/medlab.db`

### Production Mode (Packaged Electron App)
When running the built Electron app:

#### Priority 1: Packaged Database (First Run)
- **Source**: `app.asar.unpacked/backend/data/medlab.db`
- **Destination**: User Data Directory + `medlab.db`
- **Process**: The packaged database is copied to user data on first run

#### Priority 2: User Data Directory (Normal Operation)
- **Windows**: `%APPDATA%\medlab\medlab.db`
  - Full path: `C:\Users\<Username>\AppData\Roaming\medlab\medlab.db`
- **macOS**: `~/Library/Application Support/medlab/medlab.db`
- **Linux**: `~/.config/medlab/medlab.db`

#### Priority 3: Fallback (New Database)
If no database exists, creates new SQLite database at User Data Directory

## Database URL Format
The database URL is stored in `database.url` file and follows this format:
```
file:C:/Users/<Username>/AppData/Roaming/medlab/medlab.db
```

## Code Implementation (electron/main.cjs)

```javascript
function loadDatabaseUrl() {
  const userDataDir = app.getPath('userData');
  
  // 1. Try packaged database (production first run)
  if (!isDev) {
    const packagedDbUrl = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'database.url');
    const packagedDbFile = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'data', 'medlab.db');
    
    if (fs.existsSync(packagedDbFile)) {
      const userDbPath = path.join(userDataDir, 'medlab.db');
      if (!fs.existsSync(userDbPath)) {
        fs.copyFileSync(packagedDbFile, userDbPath);
      }
      databaseUrl = `file:${userDbPath}`;
    }
  }
  
  // 2. Check existing database.url in user data
  const urlFile = path.join(userDataDir, 'database.url');
  if (fs.existsSync(urlFile)) {
    databaseUrl = fs.readFileSync(urlFile, 'utf8').trim();
  }
  
  // 3. Create new database
  if (!databaseUrl) {
    const sqlitePath = path.join(userDataDir, 'medlab.db');
    databaseUrl = `file:${sqlitePath}`;
    fs.writeFileSync(urlFile, databaseUrl);
    process.env.FRESH_DATABASE = 'true';
  }
  
  process.env.DATABASE_URL = databaseUrl;
}
```

## Finding Your Database

### Windows
1. **Open Run dialog**: `Win + R`
2. **Type**: `%APPDATA%\medlab`
3. **Press Enter**
4. **Look for**: `medlab.db` file

### Alternative: PowerShell
```powershell
# Show database location
$env:APPDATA + "\medlab\medlab.db"

# Open folder in Explorer
explorer "$env:APPDATA\medlab"

# Check if database exists
Test-Path "$env:APPDATA\medlab\medlab.db"

# Copy database to desktop
Copy-Item "$env:APPDATA\medlab\medlab.db" "$env:USERPROFILE\Desktop\medlab-backup.db"
```

### macOS/Linux
```bash
# Show database location (macOS)
echo ~/Library/Application\ Support/medlab/medlab.db

# Show database location (Linux)
echo ~/.config/medlab/medlab.db

# Check if database exists
ls -lh ~/Library/Application\ Support/medlab/medlab.db  # macOS
ls -lh ~/.config/medlab/medlab.db                        # Linux
```

## Database Migration/Reset

### To Replace Database:
1. **Close the Electron app completely**
2. **Navigate to User Data Directory** (see locations above)
3. **Backup existing database** (optional): Copy `medlab.db` to safe location
4. **Replace with new database**: Copy your new `medlab.db` file
5. **Delete `database.url` file** (will be recreated on next launch)
6. **Start the app**

### To Reset Database:
1. **Close the Electron app**
2. **Delete** `medlab.db` and `database.url` from User Data Directory
3. **Start the app** - it will create a fresh database

## Important Notes

1. **User Data Persistence**: The database in User Data Directory persists across app updates
2. **Packaged Database**: Only copied on first run, won't overwrite existing user database
3. **Multiple Instances**: Each Windows user has their own database in their AppData
4. **Backup Recommendation**: Regularly backup `medlab.db` from User Data Directory

## Troubleshooting

### Database Not Found
- Check if app has permission to write to User Data Directory
- Look for error messages in console logs
- Verify `database.url` file contains valid path

### Database Locked
- Ensure only one instance of the app is running
- Check if another process is accessing the database file
- Restart the application

### Corrupted Database
- Replace with backup database
- Or delete and let app create fresh database (will lose data)
