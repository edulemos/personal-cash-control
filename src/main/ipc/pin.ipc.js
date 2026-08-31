const { ipcMain } = require('electron');
const crypto = require('node:crypto');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

/**
 * Gera hash SHA-256 do PIN em texto plano.
 * Usa crypto nativo do Node.js — sem dependências externas.
 */
const hashPin = (pin) =>
  crypto.createHash('sha256').update(String(pin)).digest('hex');

function setupPinHandlers() {
  /**
   * Retorna se o PIN está habilitado para o usuário.
   * { enabled: boolean }
   */
  ipcMain.handle(IPC_CHANNELS.PIN_STATUS, (_event, userId) => {
    try {
      const db = getDb();
      const row = db.prepare('SELECT pin_enabled FROM users WHERE id = ?').get(userId);
      return { enabled: row ? Boolean(row.pin_enabled) : false };
    } catch (err) {
      console.error('[pin] Erro ao buscar status:', err);
      return { enabled: false };
    }
  });

  /**
   * Define ou atualiza o PIN do usuário.
   * Recebe PIN em texto plano, armazena apenas o hash.
   * { success: boolean, message?: string }
   */
  ipcMain.handle(IPC_CHANNELS.PIN_SET, (_event, { userId, pin }) => {
    try {
      if (!userId || !pin) throw new Error('Dados inválidos.');
      const pinStr = String(pin).trim();
      if (pinStr.length < 4 || pinStr.length > 8) {
        return { success: false, message: 'O PIN deve ter entre 4 e 8 dígitos.' };
      }
      const db = getDb();
      db.prepare(
        'UPDATE users SET pin_hash = ?, pin_enabled = 1 WHERE id = ?'
      ).run(hashPin(pinStr), userId);
      return { success: true };
    } catch (err) {
      console.error('[pin] Erro ao definir PIN:', err);
      return { success: false, message: err.message };
    }
  });

  /**
   * Verifica se o PIN digitado está correto.
   * { success: boolean }
   */
  ipcMain.handle(IPC_CHANNELS.PIN_VERIFY, (_event, { userId, pin }) => {
    try {
      if (!userId || pin === undefined || pin === null) {
        return { success: false };
      }
      const db = getDb();
      const row = db.prepare('SELECT pin_hash FROM users WHERE id = ?').get(userId);
      if (!row || !row.pin_hash) return { success: false };
      const match = hashPin(String(pin).trim()) === row.pin_hash;
      return { success: match };
    } catch (err) {
      console.error('[pin] Erro ao verificar PIN:', err);
      return { success: false };
    }
  });

  /**
   * Remove o PIN e desativa a proteção.
   * Chamado após re-login Google (esqueceu o PIN) ou ao desativar nas configurações.
   * { success: boolean }
   */
  ipcMain.handle(IPC_CHANNELS.PIN_REMOVE, (_event, userId) => {
    try {
      if (!userId) throw new Error('userId inválido.');
      const db = getDb();
      db.prepare(
        'UPDATE users SET pin_hash = NULL, pin_enabled = 0 WHERE id = ?'
      ).run(userId);
      return { success: true };
    } catch (err) {
      console.error('[pin] Erro ao remover PIN:', err);
      return { success: false, message: err.message };
    }
  });
}

module.exports = { setupPinHandlers };
