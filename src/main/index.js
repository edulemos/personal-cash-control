const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    // Modern frameless-like window
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#f8fafc'
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
};

const { initDb } = require('./database/sqlite');
const { setupIpcHandlers } = require('./ipc/accounts.ipc');

app.whenReady().then(() => {
  // Initialize Database and IPC before creating the window
  initDb();
  setupIpcHandlers();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
