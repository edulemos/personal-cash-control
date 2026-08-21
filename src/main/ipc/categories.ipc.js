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
};

module.exports = { setupCategoriesHandlers };
