const { ipcMain, app } = require('electron');
const path = require('path');
const gdriveService = require('../services/gdrive.service');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');
const { getDbPath, restoreDatabase } = require('../database/sqlite');

function setupSettingsHandlers() {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_STATUS, async () => {
    try {
      const isAuth = gdriveService.isAuthenticated();
      let email = null;
      if (isAuth) {
        email = await gdriveService.getUserInfo();
      }
      return {
        isAuthenticated: isAuth,
        email,
        lastBackup: gdriveService.getLastBackupDate()
      };
    } catch (err) {
      console.error('Erro ao obter status do GDrive:', err);
      return {
        isAuthenticated: false,
        email: null,
        lastBackup: null
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_LOGIN, async () => {
    try {
      const email = await gdriveService.login();
      return { success: true, email };
    } catch (err) {
      console.error('Erro no login GDrive:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_LOGOUT, async () => {
    try {
      await gdriveService.logout();
      return { success: true };
    } catch (err) {
      console.error('Erro no logout GDrive:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_BACKUP, async () => {
    try {
      const dbPath = getDbPath();
      const backupDate = await gdriveService.uploadDatabase(dbPath);
      return { success: true, lastBackup: backupDate };
    } catch (err) {
      console.error('Erro no backup:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_RESTORE, async () => {
    try {
      const dbPath = getDbPath();
      const tempPath = `${dbPath}.temp_${Date.now()}`;
      
      // 1. Baixa o backup completo para arquivo temporário
      await gdriveService.downloadDatabase(tempPath);
      
      // 2. Fecha conexões, remove WAL/SHM, copia arquivo e roda migrations
      restoreDatabase(tempPath);
      
      return { success: true, requireRelogin: true };
    } catch (err) {
      console.error('Erro no restore:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = setupSettingsHandlers;
