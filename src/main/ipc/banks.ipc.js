const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupBanksHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.BANKS_GET, (event, userId) => {
    try {
      if (!userId) return [];
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM banks WHERE user_id = ? ORDER BY name ASC');
      return stmt.all(userId) || [];
    } catch (err) {
      console.error('Erro em BANKS_GET:', err);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.BANKS_ADD, (event, { user_id, name, color, icon }) => {
    try {
      if (!user_id || !name) return { success: false, error: 'Dados inválidos' };
      const db = getDb();
      const stmt = db.prepare(
        'INSERT INTO banks (user_id, name, color, icon) VALUES (?, ?, ?, ?)'
      );
      const info = stmt.run(user_id, name, color || '#6366f1', icon || null);
      return { success: true, id: Number(info.lastInsertRowid) };
    } catch (err) {
      console.error('Erro em BANKS_ADD:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.BANKS_UPDATE, (event, { id, bank }) => {
    try {
      if (!id || !bank) return { success: false, error: 'Dados inválidos' };
      const db = getDb();
      const stmt = db.prepare(
        'UPDATE banks SET name = ?, color = ?, icon = ? WHERE id = ?'
      );
      stmt.run(bank.name, bank.color || '#6366f1', bank.icon || null, id);
      return { success: true };
    } catch (err) {
      console.error('Erro em BANKS_UPDATE:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.BANKS_DELETE, (event, id) => {
    try {
      if (!id) return { success: false, error: 'ID inválido' };
      const db = getDb();
      // Remove o vínculo de depósitos antes de deletar o banco
      db.prepare('UPDATE deposits SET bank_id = NULL WHERE bank_id = ?').run(id);
      db.prepare('DELETE FROM banks WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      console.error('Erro em BANKS_DELETE:', err);
      return { success: false, error: err.message };
    }
  });
};

module.exports = { setupBanksHandlers };
