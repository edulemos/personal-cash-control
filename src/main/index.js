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

  if (process.env.APP_ENV === 'dev') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

const { initDb } = require('./database/sqlite');
const { setupCategoriesHandlers } = require('./ipc/categories.ipc');
const { setupTransactionsHandlers } = require('./ipc/transactions.ipc');
const { setupAuthHandlers } = require('./ipc/auth.ipc');

app.whenReady().then(() => {
  // Initialize Database and IPC before creating the window
  initDb();
  setupAuthHandlers();
  setupCategoriesHandlers();
  setupTransactionsHandlers();
  
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
