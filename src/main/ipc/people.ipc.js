const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupPeopleHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.PEOPLE_GET, (event, userId) => {
    try {
      if (!userId) return [];
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM people WHERE user_id = ? ORDER BY name ASC');
      return stmt.all(userId) || [];
    } catch (err) {
      console.error('Erro em PEOPLE_GET:', err);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.PEOPLE_ADD, (event, { user_id, name, avatar_color }) => {
    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO people (user_id, name, avatar_color) VALUES (?, ?, ?)');
      const info = stmt.run(user_id, name, avatar_color || '#6366f1');
      return { id: Number(info.lastInsertRowid) };
    } catch (err) {
      console.error('Erro em PEOPLE_ADD:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PEOPLE_UPDATE, (event, { id, person }) => {
    try {
      const db = getDb();
      const stmt = db.prepare('UPDATE people SET name = ?, avatar_color = ? WHERE id = ?');
      stmt.run(person.name, person.avatar_color, id);
      return { success: true };
    } catch (err) {
      console.error('Erro em PEOPLE_UPDATE:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PEOPLE_DELETE, (event, id) => {
    try {
      const db = getDb();
      // Desvincula a pessoa das transações (SET NULL) antes de deletar
      db.prepare('UPDATE transactions SET person_id = NULL WHERE person_id = ?').run(id);
      db.prepare('UPDATE credit_card_transactions SET person_id = NULL WHERE person_id = ?').run(id);
      db.prepare('DELETE FROM people WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      console.error('Erro em PEOPLE_DELETE:', err);
      return { success: false, error: err.message };
    }
  });
};

module.exports = { setupPeopleHandlers };
