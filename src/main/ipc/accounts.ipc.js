const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupIpcHandlers = () => {
  // Rota para buscar contas
  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_GET, () => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM accounts');
    return stmt.all();
  });

  // Rota para adicionar uma conta
  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_ADD, (event, { name, balance }) => {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO accounts (name, balance) VALUES (?, ?)');
    const info = stmt.run(name, balance);
    // lastInsertRowid returns BigInt which might fail IPC serialization in some versions
    return { id: Number(info.lastInsertRowid), name, balance };
  });
};

module.exports = { setupIpcHandlers };
