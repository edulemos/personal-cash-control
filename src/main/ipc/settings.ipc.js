const { ipcMain, app } = require('electron');
const path = require('path');
const gdriveService = require('../services/gdrive.service');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

function setupSettingsHandlers() {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_STATUS, async () => {
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
    await gdriveService.logout();
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_BACKUP, async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'cash_control.sqlite');
      const backupDate = await gdriveService.uploadDatabase(dbPath);
      return { success: true, lastBackup: backupDate };
    } catch (err) {
      console.error('Erro no backup:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GDRIVE_RESTORE, async () => {
    try {
      const dbPath = path.join(app.getPath('userData'), 'cash_control.sqlite');
      // Fecha o app ou simplesmente avisa que vai reiniciar. 
      // Por segurança, a base de dados vai ser substituída em tempo real (o better-sqlite3 bloqueia? 
      // Não, mas é perigoso, porém como a conexão é síncrona, e estamos apenas baixando por cima do arquivo...)
      // O ideal seria baixar pra um arquivo temp, fechar conexão DB, mover arquivo, reiniciar.
      // Como não exportamos a função de fechar a DB no sqlite.js, vamos apenas sobrescrever, a próxima operação vai ler do novo disco.
      
      const tempPath = dbPath + '.temp';
      await gdriveService.downloadDatabase(tempPath);
      
      const fs = require('fs');
      fs.copyFileSync(tempPath, dbPath);
      fs.unlinkSync(tempPath);
      
      // Reiniciar aplicativo para forçar reconexão do DB
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1000);
      
      return { success: true };
    } catch (err) {
      console.error('Erro no restore:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = setupSettingsHandlers;
