const { app, BrowserWindow, screen } = require('electron');
require('dotenv').config();
const path = require('node:path');

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: Math.floor(width * 0.75),
    height: Math.floor(height * 0.75),
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
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

const { initDb } = require('./database/sqlite');
const { setupCategoriesHandlers } = require('./ipc/categories.ipc');
const { setupTransactionsHandlers } = require('./ipc/transactions.ipc');
const { setupAuthHandlers } = require('./ipc/auth.ipc');
const { setupCreditCardsHandlers } = require('./ipc/creditCards.ipc');
const setupSettingsHandlers = require('./ipc/settings.ipc');

app.whenReady().then(() => {
  // Initialize Database and IPC before creating the window
  initDb();
  setupAuthHandlers();
  setupCategoriesHandlers();
  setupTransactionsHandlers();
  setupCreditCardsHandlers();
  setupSettingsHandlers();
  
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
