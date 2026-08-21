const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');
const { calculateDashboardStats } = require('../services/transactions.service');

const setupTransactionsHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_GET, (event, { userId, startDate, endDate }) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
      ORDER BY t.date DESC
    `);
    return stmt.all(userId, startDate, endDate);
  });

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_ADD, (event, { user_id, description, amount, type, date, category_id, is_fixed }) => {
    const db = getDb();
    const isFixedVal = is_fixed ? 1 : 0;
    const stmt = db.prepare('INSERT INTO transactions (user_id, description, amount, type, date, category_id, is_fixed) VALUES (?, ?, ?, ?, ?, ?, ?)');
    
    let firstId = null;
    
    // Loop de inserção dentro de uma transaction para performance e atomicidade
    const insertMany = db.transaction(() => {
      const iterations = isFixedVal ? 12 : 1;
      
      // Quebra a data para evitar fuso horário do JS (YYYY-MM-DD)
      let [year, month, day] = date.split('-').map(Number);
      
      for (let i = 0; i < iterations; i++) {
        // Formata YYYY-MM-DD garantindo 2 dígitos
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const info = stmt.run(user_id, description, amount, type, formattedDate, category_id, isFixedVal);
        if (i === 0) firstId = Number(info.lastInsertRowid);
        
        // Adiciona 1 mês matematicamente
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }
    });
    
    insertMany();
    return { id: firstId };
  });

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_UPDATE, (event, { id, transaction }) => {
    const db = getDb();
    const stmt = db.prepare('UPDATE transactions SET description = ?, amount = ?, type = ?, date = ?, category_id = ?, is_fixed = ? WHERE id = ?');
    console.log('Received update for id', id, 'payload', transaction);
    stmt.run(transaction.description, transaction.amount, transaction.type, transaction.date, transaction.category_id, transaction.is_fixed ? 1 : 0, id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_DELETE, (event, id) => {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, (event, { userId, startDate, endDate }) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT amount, type FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `);
    const transactions = stmt.all(userId, startDate, endDate);
    
    return calculateDashboardStats(transactions);
  });
};

module.exports = { setupTransactionsHandlers };
