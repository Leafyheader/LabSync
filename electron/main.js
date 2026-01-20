const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess;

function startBackend() {
  if (isDev) {
    // In development, assume backend is running separately
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const backendPath = path.join(__dirname, '../backend');
    const nodePath = process.execPath;
    
    // Start the backend server
    backendProcess = spawn(nodePath, ['server.js'], {
      cwd: backendPath,
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        PORT: '3001'
      }
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
      if (data.toString().includes('Server running on port')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      resolve(); // Continue anyway
    }, 10000);
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built frontend
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!isDev) {
      mainWindow.webContents.executeJavaScript(`
        // Override the API base URL for Electron
        window.ELECTRON_API_BASE = 'http://localhost:3001';
      `);
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    if (!isDev) {
      await startBackend();
      // Wait a bit more for backend to fully start
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
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
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Hide menu bar
Menu.setApplicationMenu(null);
