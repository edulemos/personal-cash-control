const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupCategoriesHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_GET, (event, userId) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type, name');
    return stmt.all(userId);
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_ADD, (event, { user_id, name, type, color, icon }) => {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(user_id, name, type, color, icon);
    return { id: Number(info.lastInsertRowid), user_id, name, type, color, icon };
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_UPDATE, (event, { id, category }) => {
    const db = getDb();
    const stmt = db.prepare('UPDATE categories SET name = ?, type = ?, color = ?, icon = ? WHERE id = ?');
    stmt.run(category.name, category.type, category.color, category.icon, id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORIES_DELETE, (event, id) => {
    const db = getDb();
    try {
      const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (error) {
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        return { success: false, message: 'Não é possível excluir esta categoria pois ela já está sendo usada em alguma transação.' };
      }
      return { success: false, message: error.message };
    }
  });
};

module.exports = { setupCategoriesHandlers };
