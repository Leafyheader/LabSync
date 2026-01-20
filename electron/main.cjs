const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development';

// Function to get Documents logo path
function getDocumentsLogoPath() {
  const documentsPath = os.homedir(); // Gets user home directory
  const logoPath = path.join(documentsPath, 'Documents', 'logo', 'Logo.jpg');
  return logoPath.replace(/\\/g, '/'); // Convert to forward slashes for consistency
}

// Function to ensure logo exists in Documents folder
function ensureDocumentsLogo() {
  try {
    const documentsLogoPath = path.join(os.homedir(), 'Documents', 'logo');
    const logoFile = path.join(documentsLogoPath, 'Logo.jpg');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(documentsLogoPath)) {
      fs.mkdirSync(documentsLogoPath, { recursive: true });
      console.log('Created logo directory at:', documentsLogoPath);
    }
    
    // Copy logo if it doesn't exist
    if (!fs.existsSync(logoFile)) {
      const sourcePaths = [
        path.join(__dirname, '..', 'public', 'logo', 'Logo.jpg'),
        path.join(__dirname, '..', 'src', 'logo', 'Logo.jpg'),
        path.join(process.resourcesPath || '', 'app', 'dist', 'logo', 'Logo.jpg')
      ];
      
      for (const sourcePath of sourcePaths) {
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, logoFile);
          console.log('Copied logo from', sourcePath, 'to', logoFile);
          break;
        }
      }
    }
    
    return logoFile;
  } catch (error) {
    console.error('Error ensuring Documents logo:', error);
    return null;
  }
}

// Embedded base64 logo (JPEG) used to ensure logo always prints even from data/file URLs
// Replaces occurrences of ./logo/Logo.jpg in incoming HTML before printing (works for all paths)
const BASE64_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4SzQRXhpZgAATU0AKgAAAAgABgALAAIAAAAmAAAIYgESAAMAAAABAAEAAAExAAIAAAAmAAAIiAEyAAIAAAAUAAAIrodpAAQAAAABAAAIwuocAAcAAAgMAAAAVgAAEUYc6gAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFdpbmRvd3MgUGhvdG8gRWRpdG9yIDEwLjAuMTAwMTEuMTYzODQAV2luZG93cyBQaG90byBFZGl0b3IgMTAuMC4xMDAxMS4xNjM4NAAyMDIxOjExOjI4IDEzOjMzOjA5AAAGkAMAAgAAABQAABEckAQAAgAAABQAABEwkpEAAgAAAAM4OAAAkpIAAgAAAAM4OAAAoAEAAwAAAAEAAQAA6hwABwAACAwAAAkQAAAAABzqAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAyMToxMToyOCAxMzozMDoxNQAyMDIxOjExOjI4IDEzOjMwOjE1AAAAAAYBAwADAAAAAQAGAAABGgAFAAAAAQAAEZQBGwAFAAAAAQAAEZwBKAADAAAAAQACAAACAQ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";

let mainWindow;
let backendProcess;
let isInitializing = false;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance of MedLab is already running. Exiting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });
}

function loadDatabaseUrl() {
  try {
    const userDataDir = app.getPath('userData');
    let databaseUrl = '';
    
    // Try to load from packaged application first (production)
    if (!isDev) {
      const packagedDbUrl = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'database.url');
      const packagedDbFile = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'data', 'medlab.db');
      
      if (fs.existsSync(packagedDbUrl)) {
        const content = fs.readFileSync(packagedDbUrl, 'utf8').trim();
        if (content) {
          // Copy the packaged database to user data if it doesn't exist
          const userDbPath = path.join(userDataDir, 'medlab.db');
          if (fs.existsSync(packagedDbFile) && !fs.existsSync(userDbPath)) {
            fs.mkdirSync(userDataDir, { recursive: true });
            fs.copyFileSync(packagedDbFile, userDbPath);
            console.log('Copied packaged database to user data directory');
          }
          
          // Use user data directory for the actual database
          databaseUrl = `file:${userDbPath.replace(/\\/g, '/')}`;
          console.log('Using packaged database configuration with user data location');
        }
      }
    }
    
    // Fallback: check for existing database.url in user data
    if (!databaseUrl) {
      const urlFile = path.join(userDataDir, 'database.url');
      if (fs.existsSync(urlFile)) {
        const content = fs.readFileSync(urlFile, 'utf8').trim();
        if (content) {
          databaseUrl = content;
          console.log('Loaded DATABASE_URL from user data:', urlFile);
        }
      }
    }
    
    // Final fallback: create new SQLite database in user data
    if (!databaseUrl) {
      fs.mkdirSync(userDataDir, { recursive: true });
      const sqlitePath = path.join(userDataDir, 'medlab.db');
      databaseUrl = `file:${sqlitePath.replace(/\\/g, '/')}`;
      console.log('Creating new SQLite database at:', sqlitePath);
      
      // Save the database URL for future use
      const urlFile = path.join(userDataDir, 'database.url');
      fs.writeFileSync(urlFile, databaseUrl);
      
      // Mark that this is a fresh database that needs seeding
      process.env.FRESH_DATABASE = 'true';
    }
    
    process.env.DATABASE_URL = databaseUrl;
    console.log('Final DATABASE_URL:', databaseUrl);
    return databaseUrl;
    
  } catch (err) {
    console.error('Failed to load database configuration:', err);
    // Emergency fallback
    const userDataDir = app.getPath('userData');
    const sqlitePath = path.join(userDataDir, 'medlab.db');
    const fallbackUrl = `file:${sqlitePath.replace(/\\/g, '/')}`;
    process.env.DATABASE_URL = fallbackUrl;
    console.log('Using emergency fallback database:', fallbackUrl);
    return fallbackUrl;
  }
}

function startBackend() {
  if (isDev) {
    // In development, assume backend is running separately
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    console.log('🚀 Starting backend in production mode...');
    console.log('🔍 Environment info:');
    console.log('  - Platform:', process.platform);
    console.log('  - Architecture:', process.arch);
    console.log('  - Node version:', process.version);
    console.log('  - Electron version:', process.versions.electron);
    console.log('  - Is packaged:', app.isPackaged);
    console.log('  - Resources path:', process.resourcesPath);
    console.log('  - User data path:', app.getPath('userData'));
    
    // Use Electron's built-in Node.js to run the backend directly
    const unpackedBackendPath = path.join(process.resourcesPath || '', 'app', 'backend');
    const scriptPath = path.join(unpackedBackendPath, 'dist', 'server.cjs');
    
    console.log('📁 Backend path:', unpackedBackendPath);
    console.log('📄 Script path:', scriptPath);
    
    // Check if backend directory exists
    if (!fs.existsSync(unpackedBackendPath)) {
      console.error('❌ Backend directory not found:', unpackedBackendPath);
      
      // Try alternative paths
      const alternatives = [
        path.join(process.resourcesPath || '', 'backend'),
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'backend'),
        path.join(__dirname, '..', 'backend')
      ];
      
      console.log('🔍 Checking alternative backend paths:');
      for (const alt of alternatives) {
        const exists = fs.existsSync(alt);
        console.log(`  - ${alt}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        if (exists) {
          const altScriptPath = path.join(alt, 'dist', 'server.cjs');
          if (fs.existsSync(altScriptPath)) {
            console.log(`✅ Using alternative backend path: ${alt}`);
            unpackedBackendPath = alt;
            scriptPath = altScriptPath;
            break;
          }
        }
      }
    }
    
    if (!fs.existsSync(scriptPath)) {
      console.error('❌ server.cjs not found at:', scriptPath);
      
      // Try alternative script names/locations
      const alternatives = [
        path.join(unpackedBackendPath, 'server.cjs'),
        path.join(unpackedBackendPath, 'src', 'server.cjs'),
        path.join(unpackedBackendPath, 'dist', 'server.js'),
        path.join(unpackedBackendPath, 'src', 'server.js')
      ];
      
      console.log('🔍 Checking alternative server script paths:');
      for (const alt of alternatives) {
        const exists = fs.existsSync(alt);
        console.log(`  - ${alt}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      }
      
      return reject(new Error(`Backend server script not found at: ${scriptPath}`));
    }

    console.log('✅ Found server script at:', scriptPath);
    console.log('📁 Working directory will be:', unpackedBackendPath);

    // Set environment for backend
    const originalEnv = { ...process.env };
    
    // Load environment variables from .env.sqlite file
    const envFilePath = path.join(unpackedBackendPath, '.env.sqlite');
    if (fs.existsSync(envFilePath)) {
      const envContent = fs.readFileSync(envFilePath, 'utf8');
      const envLines = envContent.split('\n');
      
      envLines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            let value = valueParts.join('=').trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            // Don't override DATABASE_URL if it's already been set dynamically
            if (key.trim() !== 'DATABASE_URL' || !process.env.DATABASE_URL) {
              process.env[key.trim()] = value;
            }
          }
        }
      });
      console.log('✅ Loaded environment variables from .env.sqlite');
    } else {
      console.log('⚠️ .env.sqlite file not found at:', envFilePath);
      console.log('   Using default environment configuration');
    }
    
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3001';
    process.env.NODE_OPTIONS = '--max-old-space-size=512';
    
    console.log('🌍 Environment variables:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - PORT:', process.env.PORT);
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL);
    
    // Change working directory temporarily
    const originalCwd = process.cwd();
    console.log('📂 Changing working directory from:', originalCwd);
    console.log('📂 Changing working directory to:', unpackedBackendPath);
    
    try {
      process.chdir(unpackedBackendPath);
      console.log('✅ Working directory changed successfully');
    } catch (chdirError) {
      console.error('❌ Failed to change working directory:', chdirError);
      return reject(chdirError);
    }
    
    try {
      console.log('🔧 Loading backend server script...');
      
      // Load and run the backend server using require for CommonJS
      require(scriptPath);
      console.log('✅ Server script loaded successfully');
      
      // Wait a moment for server to start
      setTimeout(() => {
        console.log('✅ Backend server should be running on port 3001');
        resolve();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      console.error('📝 Error message:', error.message);
      console.error('📚 Stack trace:', error.stack);
      
      // Restore environment and working directory
      process.env = originalEnv;
      process.chdir(originalCwd);
      
      reject(error);
    }
  });
}

async function seedDatabaseIfNeeded() {
  try {
    console.log('Checking if database needs seeding...');
    
    // Wait longer for backend to complete initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check database seeding status
    let attempts = 0;
    const maxAttempts = 8;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`🔍 Attempt ${attempts + 1}/${maxAttempts}: Checking database seeding status...`);
        
        // Use the new database status endpoint
        const response = await fetch('http://localhost:3001/api/db-status');
        
        if (response.ok) {
          const dbStatus = await response.json();
          console.log(`📊 Database status:`, dbStatus);
          
          if (dbStatus.seeded) {
            console.log(`✅ Database is properly seeded with ${dbStatus.userCount} users and ${dbStatus.labTestCount} lab tests`);
            break;
          } else {
            console.log('⚠️ Database not yet seeded, waiting for backend to complete initialization...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          console.log(`⚠️ Database status check failed with status: ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (fetchError) {
        console.log(`❌ Attempt ${attempts + 1} failed:`, fetchError.message);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️ Could not verify database seeding status after multiple attempts');
      console.log('🚀 Continuing with app startup - backend should handle seeding automatically');
    }
    
  } catch (error) {
    console.log('❌ Database seed check failed:', error.message);
    console.log('🚀 Continuing startup - backend should handle seeding automatically');
  }
}

// Create custom application menu
function createMenu() {
  try {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Refresh',
            accelerator: 'F5',
            click: () => {
              if (mainWindow) {
                console.log('Refreshing application...');
                mainWindow.reload();
              }
            }
          },
          {
            label: 'Force Refresh',
            accelerator: 'Ctrl+F5',
            click: () => {
              if (mainWindow) {
                console.log('Force refreshing application...');
                mainWindow.webContents.reloadIgnoringCache();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              console.log('Exit requested via menu/keyboard shortcut');
              app.isQuitting = true;
              app.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Zoom In',
            accelerator: 'Ctrl+=',
            click: () => {
              if (mainWindow) {
                const currentZoom = mainWindow.webContents.getZoomLevel();
                mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
              }
            }
          },
          {
            label: 'Zoom Out',
            accelerator: 'Ctrl+-',
            click: () => {
              if (mainWindow) {
                const currentZoom = mainWindow.webContents.getZoomLevel();
                mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
              }
            }
          },
          {
            label: 'Reset Zoom',
            accelerator: 'Ctrl+0',
            click: () => {
              if (mainWindow) {
                mainWindow.webContents.setZoomLevel(0);
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Toggle Fullscreen',
            accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
            click: () => {
              if (mainWindow) {
                mainWindow.setFullScreen(!mainWindow.isFullScreen());
              }
            }
          }
        ]
      },
      {
        label: 'Tools',
        submenu: [
          {
            label: 'Clear Cache',
            click: async () => {
              if (mainWindow) {
                console.log('Clearing application cache...');
                try {
                  await mainWindow.webContents.session.clearCache();
                  await mainWindow.webContents.session.clearStorageData();
                  console.log('Cache cleared successfully');
                  mainWindow.reload();
                } catch (error) {
                  console.error('Failed to clear cache:', error);
                }
              }
            }
          },
          {
            label: 'Reset Database',
            click: () => {
              if (mainWindow) {
                const { dialog } = require('electron');
                dialog.showMessageBox(mainWindow, {
                  type: 'warning',
                  buttons: ['Cancel', 'Reset'],
                  defaultId: 0,
                  message: 'Reset Database',
                  detail: 'This will delete all data and restart the application. Are you sure?'
                }).then((result) => {
                  if (result.response === 1) {
                    try {
                      const userDataDir = app.getPath('userData');
                      const dbPath = path.join(userDataDir, 'medlab.db');
                      const urlPath = path.join(userDataDir, 'database.url');
                      
                      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
                      if (fs.existsSync(urlPath)) fs.unlinkSync(urlPath);
                      
                      console.log('Database reset, restarting application...');
                      app.relaunch();
                      app.exit(0);
                    } catch (error) {
                      console.error('Failed to reset database:', error);
                    }
                  }
                });
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Developer Tools',
            accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            click: () => {
              if (mainWindow) {
                console.log('Opening Developer Tools...');
                mainWindow.webContents.toggleDevTools();
              }
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About MedLab',
            click: () => {
              if (mainWindow) {
                const { dialog } = require('electron');
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'About MedLab',
                  message: 'MedLab Desktop Application',
                  detail: `Version: 1.0.0\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nChromium: ${process.versions.chrome}`
                });
              }
            }
          },
          {
            label: 'Show Logs',
            click: () => {
              if (mainWindow) {
                console.log('Opening logs...');
                mainWindow.webContents.openDevTools({ mode: 'detach' });
              }
            }
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    return Menu.buildFromTemplate(template);
  } catch (error) {
    console.error('Failed to create menu:', error);
    // Return a simple fallback menu
    return Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              console.log('Exit requested via fallback menu');
              app.isQuitting = true;
              app.quit();
            }
          }
        ]
      }
    ]);
  }
}

function createWindow() {
  // Prevent creating multiple windows or rapid initialization
  if (mainWindow || isInitializing) {
    console.log('Window already exists or is initializing, focusing existing window');
    if (mainWindow) {
      mainWindow.focus();
      mainWindow.show();
    }
    return;
  }

  isInitializing = true;
  console.log('Creating new MedLab window...');

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: false
    // Removed closable: false - we'll handle close events instead
  });

  // Only clear cache in production to prevent stale issues, but preserve dev changes
  if (!isDev) {
    console.log('Clearing browser cache (production mode)...');
    mainWindow.webContents.session.clearCache().then(() => {
      console.log('Cache cleared');
      // Only clear specific storages, preserve localStorage for app state
      return mainWindow.webContents.session.clearStorageData({
        storages: ['filesystem', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
      });
    }).then(() => {
      console.log('Storage data cleared');
    }).catch((error) => {
      console.log('Error clearing cache:', error);
    });
  } else {
    console.log('Skipping cache clear in development mode to preserve changes');
  }

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Dev tools removed for production-ready behavior
  } else {
    // In production, load from the built frontend
    const frontendPath = path.join(process.resourcesPath || '', 'app', 'dist', 'index.html');
    console.log('Loading frontend from:', frontendPath);
    mainWindow.loadFile(frontendPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Create and set the custom menu
    const menu = createMenu();
    Menu.setApplicationMenu(menu);
    // Dev tools removed for production-ready behavior
    isInitializing = false; // Reset initialization flag
    console.log('MedLab window ready and shown');
    if (!isDev) {
      mainWindow.webContents.executeJavaScript(`
        // Override the API base URL for Electron
        window.ELECTRON_API_BASE = 'http://localhost:3001';
      `);
    }
  });

  // Handle did-finish-load event to call getPrintersAsync()
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      console.log('Window finished loading, checking for printers...');
      const printers = await mainWindow.webContents.getPrintersAsync();
      console.log('Available printers:', printers.length);
      if (printers.length > 0) {
        console.log('Printer names:', printers.map(p => p.name));
      }
    } catch (error) {
      console.error('Error checking printers on window load:', error);
    }
  });

  // Handle window close attempts - prevent accidental closing but allow programmatic exit
  mainWindow.on('close', (event) => {
    // Allow closing if app is quitting (via menu or Ctrl+Q)
    if (app.isQuitting) {
      console.log('MedLab window closing via menu/keyboard shortcut');
      return;
    }
    
    // Prevent accidental closing via other means
    console.log('Preventing accidental window close');
    event.preventDefault();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    console.log('MedLab window closed');
    mainWindow = null;
    isInitializing = false; // Reset initialization flag
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Prevent multiple ready handlers
  if (isInitializing || mainWindow) {
    console.log('App already initializing or initialized');
    return;
  }
  
  console.log('MedLab starting up...');
  
  // Load database URL configuration early
  const databaseUrl = loadDatabaseUrl();
  
  try {
    if (!isDev) {
      console.log('Starting backend server...');
      await startBackend();
      // Wait longer for backend to fully start and initialize database
      console.log('⏳ Waiting for backend to fully initialize...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test backend connectivity
      try {
        const http = require('http');
        const testConnection = () => {
          return new Promise((resolve, reject) => {
            const req = http.request({
              hostname: 'localhost',
              port: 3001,
              path: '/health',
              method: 'GET',
              timeout: 2000
            }, (res) => {
              console.log('✅ Backend health check successful');
              resolve(true);
            });
            
            req.on('error', (error) => {
              console.log('⚠️ Backend health check failed:', error.message);
              reject(error);
            });
            
            req.on('timeout', () => {
              console.log('⚠️ Backend health check timed out');
              req.destroy();
              reject(new Error('Health check timeout'));
            });
            
            req.end();
          });
        };
        
        await testConnection();
      } catch (healthError) {
        console.error('❌ Backend not responding, but continuing anyway...');
      }
      
      // Check if database needs seeding (new installation)
      await seedDatabaseIfNeeded();
    }
    createWindow();
    
    // Register IPC handlers for printer functionality
    ipcMain.handle('get-printers', async () => {
      try {
        // Use mainWindow.webContents.getPrintersAsync() - correct API for Electron 37+
        if (mainWindow && mainWindow.webContents) {
          const printers = await mainWindow.webContents.getPrintersAsync();
          console.log('Found printers:', printers.length);
          return printers;
        } else {
          console.log('Main window not available for printer detection');
          return [];
        }
      } catch (error) {
        console.error('Error getting printers:', error);
        return [];
      }
    });

    ipcMain.handle('print-content', async (event, options) => {
      try {
        console.log('🖨️ Print-content handler called with options:', {
          printerName: options?.printerName,
          htmlLength: options?.html?.length,
          hasHtml: !!options?.html,
          debug: !!options?.debug
        });

        const { html, printerName, debug } = options || {};
        
        if (!html) {
          console.error('❌ No HTML content provided for printing');
          return { success: false, error: 'No HTML content provided' };
        }

        if (!printerName) {
          console.error('❌ No printer name provided');
          return { success: false, error: 'No printer name provided' };
        }

        // Fetch and log printer list for diagnostics (especially when silent print produces no job)
        let printerList = [];
        try {
          if (mainWindow && mainWindow.webContents) {
            printerList = await mainWindow.webContents.getPrintersAsync();
            if (debug) {
              console.log('🔍 Full printer objects:', JSON.stringify(printerList, null, 2));
            } else {
              console.log('📃 Printers available (names only):', printerList.map(p => p.name));
            }
          }
        } catch (plistErr) {
          console.log('⚠️ Could not retrieve printers inside print-content:', plistErr.message);
        }

        // Verify printer exists (case-insensitive match) to avoid silent success when deviceName mismatched
        const matchedPrinter = printerList.find(p => p.name === printerName) || printerList.find(p => p.name?.toLowerCase() === printerName.toLowerCase());
        if (!matchedPrinter) {
          console.error('❌ Requested printer not found in current printer list:', printerName);
          if (printerList.length) {
            console.error('🔎 Available printers at time of print:', printerList.map(p => p.name));
          }
          return { success: false, error: 'Printer not found at time of printing' };
        }

        // Try thermal/PDF printer method using hidden BrowserWindow
        if (printerName.includes('GA-E200') || printerName.includes('EPSON') || printerName.toLowerCase().includes('thermal') || printerName.includes('Microsoft Print to PDF')) {
          console.log('🌡️ Attempting thermal/PDF printer method with hidden BrowserWindow...');
          let printResult = false; // Initialize printResult
          try {
            console.log(`🎯 Creating hidden window for printer: ${printerName}`);
            
            const isPdfPrinter = printerName.includes('PDF');
            
            // Create a properly sized window for the printer type
            const thermalWindow = new BrowserWindow({
              show: false,
              width: isPdfPrinter ? 794 : 302, // A4 width for PDF, 80mm for thermal
              height: isPdfPrinter ? 1123 : 600, // A4 height for PDF
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: false // Allow data URLs and file access
              }
            });
            
            console.log('📝 Creating enhanced HTML for better compatibility...');
            
            // Ensure logo exists in Documents folder
            const documentsLogoPath = ensureDocumentsLogo();
            const logoSrc = documentsLogoPath ? `file:///${documentsLogoPath.replace(/\\/g, '/')}` : BASE64_LOGO;
            console.log('🖼️ Using logo source:', logoSrc.substring(0, 50) + '...');
            
            // Create better HTML structure for PDF/thermal compatibility - using exact Receipt component CSS
            const enhancedHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Receipt</title>
                <style>
                  @page {
                    size: 80mm auto;
                    margin: 0;
                    padding: 0;
                  }
                  
                  * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                  }
                  
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: monospace, Courier, "Courier New" !important;
                    font-size: 16px !important;
                    line-height: 1.3 !important;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                    background: white;
                    color: black;
                    width: 80mm;
                    max-width: 80mm;
                  }
                  
                  .print-receipt {
                    width: 80mm !important;
                    max-width: 80mm !important;
                    min-width: 80mm !important;
                    margin: 0 !important;
                    padding: 4mm !important;
                    font-family: monospace, Courier, "Courier New" !important;
                    font-size: 16px !important;
                    line-height: 1.3 !important;
                    background: white !important;
                    color: black !important;
                    box-sizing: border-box;
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                  }
                  
                  /* Specific font sizes to match Receipt component exactly */
                  h1 {
                    font-size: 18px !important;
                    font-weight: bold !important;
                    margin: 0 !important;
                  }
                  
                  /* Address text - 12px */
                  p {
                    font-size: 12px !important;
                  }
                  
                  /* Receipt info, date, payment, footer - 12px */
                  span {
                    font-size: 12px !important;
                  }
                  
                  /* Table headers - 13px */
                  div[style*="font-weight: bold"][style*="13px"] {
                    font-size: 13px !important;
                  }
                  
                  /* Total section - 14px */
                  div[style*="font-size: 14px"] {
                    font-size: 14px !important;
                  }
                  
                  /* Force specific elements */
                  .total-section {
                    font-size: 14px !important;
                  }
                  
                  .table-header {
                    font-size: 13px !important;
                  }
                  
                  .table-cell {
                    font-size: 12px !important;
                  }
                </style>
              </head>
              <body>
                <div class="print-receipt">
                  ${html
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<html[^>]*>|<\/html>|<head[^>]*>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '')
                    .replace(/src="\.\/logo\/Logo\.jpg"/gi, 'src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4SzQRXhpZgAATU0AKgAAAAgABgALAAIAAAAmAAAIYgESAAMAAAABAAEAAAExAAIAAAAmAAAIiAEyAAIAAAAUAAAIrodpAAQAAAABAAAIwuocAAcAAAgMAAAAVgAAEUYc6gAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFdpbmRvd3MgUGhvdG8gRWRpdG9yIDEwLjAuMTAwMTEuMTYzODQAV2luZG93cyBQaG90byBFZGl0b3IgMTAuMC4xMDAxMS4xNjM4NAAyMDIxOjExOjI4IDEzOjMzOjA5AAAGkAMAAgAAABQAABEckAQAAgAAABQAABEwkpEAAgAAAAM4OAAAkpIAAgAAAAM4OAAAoAEAAwAAAAEAAQAA6hwABwAACAwAAAkQAAAAABzqAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAyMToxMToyOCAxMzozMDoxNQAyMDIxOjExOjI4IDEzOjMwOjE1AAAAAAYBAwADAAAAAQAGAAABGgAFAAAAAQAAEZQBGwAFAAAAAQAAEZwBKAADAAAAAQACAAACAQ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"')
                  }
                </div>
              </body>
              </html>
            `;
            
            // Write to a temporary file for better compatibility
            const fs = require('fs');
            const path = require('path');
            const os = require('os');
            const tempDir = os.tmpdir();
            const tempFileName = `medlab-receipt-${Date.now()}.html`;
            const tempFilePath = path.join(tempDir, tempFileName);
            
            console.log('📁 Writing enhanced HTML to temporary file:', tempFilePath);
            fs.writeFileSync(tempFilePath, enhancedHtml, 'utf8');
            
            
            
            console.log('📝 Loading receipt HTML from file...');
            // Load from file instead of data URL for better PDF compatibility
            await thermalWindow.loadFile(tempFilePath);
            
            // Add a timeout to prevent hanging
            console.log('⏳ Waiting for content to load...');
            await new Promise((resolve) => {
              const timeout = setTimeout(() => {
                console.log('⚠️ Load timeout reached, proceeding with print...');
                resolve();
              }, 5000); // Increased to 5 seconds for better loading
              
              thermalWindow.webContents.once('did-finish-load', () => {
                console.log('✅ Content loaded successfully');
                clearTimeout(timeout);
                resolve();
              });
            });
            
            // Give the renderer MORE time to fully render CSS/images
            console.log('⏳ Waiting for full render (CSS/images)...');
            await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds
            
            console.log('🖨️ Calling silent print to printer...');
            
            // Configure print options specifically for the printer type
            const printOptions = {
              deviceName: printerName,
              printBackground: true,
              color: false,
              landscape: false
            };
            
            // Add specific options for PDF vs thermal printers
            if (isPdfPrinter) {
              console.log('📄 Using Electron PDF generation instead of Print to PDF driver...');
              
              // Use Electron's built-in PDF generation
              try {
                const { dialog } = require('electron');
                const path = require('path');
                const os = require('os');
                
                // Show save dialog to let user choose location
                const result = await dialog.showSaveDialog(mainWindow, {
                  title: 'Save Receipt PDF',
                  defaultPath: path.join(os.homedir(), 'Documents', `Receipt-${Date.now()}.pdf`),
                  filters: [
                    { name: 'PDF Files', extensions: ['pdf'] }
                  ]
                });
                
                if (!result.canceled && result.filePath) {
                  console.log('📁 User chose save location:', result.filePath);
                  
                  // Generate PDF using Electron's printToPDF
                  const pdfOptions = {
                    pageSize: 'A4',
                    margins: {
                      top: 0.5,
                      bottom: 0.5,
                      left: 0.5,
                      right: 0.5
                    },
                    printBackground: true,
                    landscape: false
                  };
                  
                  console.log('🔄 Generating PDF...');
                  const pdfData = await thermalWindow.webContents.printToPDF(pdfOptions);
                  
                  console.log('💾 Writing PDF to file...');
                  fs.writeFileSync(result.filePath, pdfData);
                  
                  console.log('✅ PDF saved successfully to:', result.filePath);
                  
                  // Clean up
                  try {
                    thermalWindow.close();
                    if (fs.existsSync(tempFilePath)) {
                      fs.unlinkSync(tempFilePath);
                      console.log('🗑️ Temporary file cleaned up');
                    }
                  } catch (cleanupError) {
                    console.error('⚠️ Cleanup error:', cleanupError.message);
                  }
                  
                  return { success: true, filePath: result.filePath };
                } else {
                  console.log('❌ User canceled PDF save');
                  
                  // Clean up
                  try {
                    thermalWindow.close();
                    if (fs.existsSync(tempFilePath)) {
                      fs.unlinkSync(tempFilePath);
                    }
                  } catch (cleanupError) {
                    console.error('⚠️ Cleanup error:', cleanupError.message);
                  }
                  
                  return { success: false, error: 'User canceled' };
                }
                
              } catch (pdfError) {
                console.error('❌ PDF generation failed:', pdfError.message);
                console.log('🔄 Falling back to standard print method...');
              }
            } else {
              console.log('🌡️ Configuring for thermal printer...');
              // For thermal printers, use silent printing with callback form
              printOptions.silent = true; // Start with silent: true
              printOptions.margins = {
                marginType: 'none'
              };
              printOptions.pageSize = {
                width: 80000, // 80mm in microns
                height: 297000 // Auto height - let content determine length
              };
              printOptions.scaleFactor = 100;
              printOptions.shouldPrintBackgrounds = true;
              
              // Use callback form for better reliability
              console.log('🖨️ Using callback-based print for thermal printer...');
              
              const printPromise = new Promise((resolve, reject) => {
                const start = Date.now();
                thermalWindow.webContents.print(printOptions, (success, errorType) => {
                  const elapsed = Date.now() - start;
                  if (!success) {
                    console.error('❌ Thermal print failed:', errorType, `(elapsed ${elapsed}ms)`);
                    if (!debug) {
                      console.log('ℹ️ Re-run with debug enabled to keep window open longer (set options.debug=true)');
                    }
                    console.log('🔄 Trying with silent: false for debugging...');
                    
                    // Fallback: try with dialog to debug
                    const dialogOptions = { ...printOptions, silent: false };
                    thermalWindow.webContents.print(dialogOptions, (dialogSuccess, dialogErrorType) => {
                      const elapsed2 = Date.now() - start;
                      if (!dialogSuccess) {
                        console.error('❌ Dialog print also failed:', dialogErrorType, `(elapsed ${elapsed2}ms)`);
                        reject(new Error(`Print failed: ${errorType || dialogErrorType}`));
                      } else {
                        console.log('✅ Dialog print succeeded - printer/HTML OK, silent mode issue (elapsed', elapsed2, 'ms)');
                        resolve(true);
                      }
                    });
                  } else {
                    console.log('✅ Thermal print job sent successfully (elapsed', elapsed, 'ms)');
                    resolve(true);
                  }
                });
              });
              
              try {
                printResult = await printPromise;
                console.log('📊 Thermal print result:', printResult);
              } catch (callbackError) {
                console.error('❌ Callback print operation failed:', callbackError.message);
                printResult = false;
              }

              // Optional: keep window alive a bit longer to ensure Windows spooler picks up job
              const postDelay = debug ? 5000 : 2000;
              console.log(`⏳ Post-print hold window open for ${postDelay}ms to allow spooler pickup...`);
              await new Promise(r => setTimeout(r, postDelay));
            }
            
            // Clean up resources
            try {
              thermalWindow.close();
              console.log('🔒 Window closed');
              
              // Clean up temporary file
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
                console.log('🗑️ Temporary file cleaned up');
              }
            } catch (closeError) {
              console.error('⚠️ Failed to close window or clean up:', closeError.message);
            }
            
            // In Electron 37+, print() returns undefined when successful
            const success = printResult !== false;
            console.log('✅ Treating print as successful:', success);
            
            if (success) {
              console.log('✅ Print job sent successfully');
              return { success: true };
            } else {
              console.log('⚠️ Print returned false, trying fallback...');
            }
            
          } catch (thermalError) {
            console.error('❌ Thermal print method failed:', thermalError.message);
            console.log('🔄 Falling back to standard Electron print method...');
          }
        }

        console.log('📄 Creating print window...');
        // Create a hidden window for printing
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        console.log('📝 Loading HTML content into print window...');
        // Load the HTML content
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Wait for full render before printing
        console.log('⏳ Waiting for fallback print window to fully render...');
        await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 seconds for full render

        console.log('⚙️ Preparing print options for printer:', printerName);
        // Print with the specified printer - optimized for thermal printers
        const printOptions = {
          silent: true, // Start with silent: true
          deviceName: printerName,
          margins: {
            marginType: 'none'
          },
          printBackground: true,
          color: false,
          landscape: false
        };

        console.log('🖨️ Sending print job with callback form...');
        
        // Use callback form for better reliability
        const printPromise = new Promise((resolve, reject) => {
          const start = Date.now();
            printWindow.webContents.print(printOptions, (success, errorType) => {
            const elapsed = Date.now() - start;
            if (!success) {
              console.error('❌ Fallback print failed:', errorType, `(elapsed ${elapsed}ms)`);
              console.log('🔄 Trying fallback with silent: false for debugging...');
              
              // Fallback: try with dialog to debug
              const dialogOptions = { ...printOptions, silent: false };
              printWindow.webContents.print(dialogOptions, (dialogSuccess, dialogErrorType) => {
                const elapsed2 = Date.now() - start;
                if (!dialogSuccess) {
                  console.error('❌ Fallback dialog print also failed:', dialogErrorType, `(elapsed ${elapsed2}ms)`);
                  reject(new Error(`Print failed: ${errorType || dialogErrorType}`));
                } else {
                  console.log('✅ Fallback dialog print succeeded - printer/HTML OK, silent mode issue (elapsed', elapsed2, 'ms)');
                  resolve(true);
                }
              });
            } else {
              console.log('✅ Fallback print job sent successfully (elapsed', elapsed, 'ms)');
              resolve(true);
            }
          });
        });
        
        let result;
        try {
          result = await printPromise;
          console.log('📋 Fallback print result:', result);
        } catch (callbackError) {
          console.error('❌ Fallback callback print failed:', callbackError.message);
          result = false;
        }
        
        console.log('⏳ Waiting for fallback print job to process...');
        
  // Give the print job time to be sent to the printer (longer if debug)
  const postDelay = (options && options.debug) ? 5000 : 2000;
  console.log(`⏳ Post-print (fallback) hold window for ${postDelay}ms...`);
  await new Promise(resolve => setTimeout(resolve, postDelay));
        
        // Close the print window
        printWindow.close();
        console.log('🗑️ Print window closed');
        
        // In Electron 37+, print() returns undefined when successful
        // We'll consider undefined as success since no error was thrown
        const success = result !== false; // true if result is true or undefined
        console.log('✅ Treating print as successful:', success);
        
        return { success };
      } catch (error) {
        console.error('❌ Error in print-content handler:', error);
        console.error('❌ Error stack:', error.stack);
        return { success: false, error: error.message };
      }
    });

    // New print-to-printer handler for cleaner API
    ipcMain.handle('print-to-printer', async (event, printerName, html) => {
      try {
        console.log('🚀 Print-to-printer handler called with:', {
          printerName,
          htmlLength: html?.length,
          hasHtml: !!html
        });
        
        if (!html) {
          console.error('❌ No HTML content provided for print-to-printer');
          return { success: false, error: 'No HTML content provided' };
        }

        if (!printerName) {
          console.error('❌ No printer name provided for print-to-printer');
          return { success: false, error: 'No printer name provided' };
        }

        console.log('📄 Creating print window for print-to-printer...');
        // Create a hidden window for printing
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        console.log('📝 Loading HTML content for print-to-printer...');
        // Load the HTML content
        await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Wait for full render before printing
        console.log('⏳ Waiting for print-to-printer window to fully render...');
        await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 seconds for full render

        console.log('⚙️ Preparing print-to-printer options for:', printerName);
        // Print silently with the specified printer - optimized for thermal printers
        const printOptions = {
          silent: true, // Start with silent: true
          deviceName: printerName,
          margins: {
            marginType: 'none'
          },
          printBackground: true,
          color: false,
          landscape: false
        };

        console.log('🖨️ Executing print-to-printer with callback form...');
        
        // Use callback form for better reliability
        const printPromise = new Promise((resolve, reject) => {
          printWindow.webContents.print(printOptions, (success, errorType) => {
            if (!success) {
              console.error('❌ Print-to-printer failed:', errorType);
              console.log('🔄 Trying print-to-printer with silent: false for debugging...');
              
              // Fallback: try with dialog to debug
              const dialogOptions = { ...printOptions, silent: false };
              printWindow.webContents.print(dialogOptions, (dialogSuccess, dialogErrorType) => {
                if (!dialogSuccess) {
                  console.error('❌ Print-to-printer dialog also failed:', dialogErrorType);
                  reject(new Error(`Print failed: ${errorType || dialogErrorType}`));
                } else {
                  console.log('✅ Print-to-printer dialog succeeded - printer/HTML OK, silent mode issue');
                  resolve(true);
                }
              });
            } else {
              console.log('✅ Print-to-printer job sent successfully');
              resolve(true);
            }
          });
        });
        
        let result;
        try {
          result = await printPromise;
          console.log('📋 Print-to-printer result:', result);
        } catch (callbackError) {
          console.error('❌ Print-to-printer callback failed:', callbackError.message);
          result = false;
        }
        
        console.log('⏳ Waiting for print-to-printer job to process...');
        
        // Give the print job time to be sent to the printer
        await new Promise(resolve => setTimeout(resolve, 1500)); // Slightly longer wait
        
        // Close the print window
        printWindow.close();
        console.log('🗑️ Print-to-printer window closed');
        
        // In Electron 37+, print() returns undefined when successful
        // We'll consider undefined as success since no error was thrown
        const success = result !== false; // true if result is true or undefined
        console.log('✅ Treating print-to-printer as successful:', success);
        
        return { success };
      } catch (error) {
        console.error('❌ Error in print-to-printer handler:', error);
        console.error('❌ Print-to-printer error stack:', error.stack);
        return { success: false, error: error.message };
      }
    });

    // Handler for storing printer preference
    ipcMain.handle('store-printer', async (event, printerName) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const userDataPath = app.getPath('userData');
        const prefsPath = path.join(userDataPath, 'printer-prefs.json');
        
        const prefs = { selectedPrinter: printerName };
        fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
        console.log('Stored printer preference:', printerName);
        return { success: true };
      } catch (error) {
        console.error('Error storing printer preference:', error);
        return { success: false, error: error.message };
      }
    });

    // Handler for getting stored printer preference
    ipcMain.handle('get-stored-printer', async () => {
      try {
        const fs = require('fs');
        const path = require('path');
        const userDataPath = app.getPath('userData');
        const prefsPath = path.join(userDataPath, 'printer-prefs.json');
        
        if (fs.existsSync(prefsPath)) {
          const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
          console.log('Retrieved stored printer:', prefs.selectedPrinter);
          return prefs.selectedPrinter;
        }
        return null;
      } catch (error) {
        console.error('Error getting stored printer preference:', error);
        return null;
      }
    });
    
  } catch (error) {
    console.error('Failed to start application:', error);
    isInitializing = false; // Reset flag on error
    createWindow(); // Try to start anyway
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Kill backend process
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up on app quit
app.on('before-quit', () => {
  console.log('App is quitting - cleaning up backend process');
  app.isQuitting = true;
  if (backendProcess) {
    backendProcess.kill();
  }
});
