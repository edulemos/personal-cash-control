const { app, BrowserWindow, screen, session } = require('electron');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

log.transports.file.level = 'info';
autoUpdater.logger = log;

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
    icon: path.join(__dirname, '../../build/icon.png'),
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
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  // Lógica do Auto-Updater
  if (process.env.APP_ENV !== 'dev') {
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();

    autoUpdater.on('update-available', (info) => {
      win.webContents.send('updater:available', info);
    });

    autoUpdater.on('update-downloaded', (info) => {
      win.webContents.send('updater:downloaded', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('Error on autoUpdater:', err);
      win.webContents.send('updater:error', err.message);
    });
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

  // Permite imagens do CDN do Google (fotos de perfil OAuth)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // Remove qualquer CSP existente vinda do servidor (Vite dev) para evitar conflito
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    responseHeaders['Content-Security-Policy'] = [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https://lh3.googleusercontent.com https://*.googleusercontent.com;"
    ];
    callback({ responseHeaders });
  });


  const { ipcMain } = require('electron');
  ipcMain.handle('updater:restart', () => {
    autoUpdater.quitAndInstall();
  });
  ipcMain.handle('updater:download', () => {
    autoUpdater.downloadUpdate();
  });
  ipcMain.handle('updater:check', () => {
    autoUpdater.checkForUpdates();
  });
  ipcMain.handle('app:get_version', () => app.getVersion());

  const win = createWindow();

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
