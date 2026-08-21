const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');
const { hashPassword, verifyPassword } = require('../services/auth.service');

const setupAuthHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.AUTH_REGISTER, async (event, { name, username, password }) => {
    try {
      const db = getDb();
      // Check if user exists
      const checkStmt = db.prepare('SELECT id FROM users WHERE username = ?');
      const existingUser = checkStmt.get(username);
      
      if (existingUser) {
        return { success: false, error: 'Nome de usuário já existe.' };
      }

      const { hash, salt } = await hashPassword(password);
      
      const insertStmt = db.prepare('INSERT INTO users (name, username, password_hash, salt) VALUES (?, ?, ?, ?)');
      const info = insertStmt.run(name, username, hash, salt);
      
      return { success: true, user: { id: Number(info.lastInsertRowid), name, username } };
    } catch (error) {
      console.error('Erro no registro:', error);
      return { success: false, error: 'Erro interno ao registrar usuário.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (event, { username, password }) => {
    try {
      const db = getDb();
      const stmt = db.prepare('SELECT id, name, username, password_hash, salt FROM users WHERE username = ?');
      const user = stmt.get(username);
      
      if (!user) {
        return { success: false, error: 'Usuário não encontrado.' };
      }

      const isMatch = await verifyPassword(password, user.password_hash, user.salt);
      
      if (isMatch) {
        return { success: true, user: { id: user.id, name: user.name, username: user.username } };
      } else {
        return { success: false, error: 'Senha incorreta.' };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro interno ao fazer login.' };
    }
  });
};

module.exports = { setupAuthHandlers };
