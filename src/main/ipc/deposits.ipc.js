const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupDepositsHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.DEPOSITS_GET, (event, { userId, startDate, endDate }) => {
    try {
      if (!userId || !startDate || !endDate) return [];
      const db = getDb();
      const stmt = db.prepare(`
        SELECT d.*, b.name as bank_name, b.color as bank_color, b.icon as bank_icon
        FROM deposits d
        LEFT JOIN banks b ON d.bank_id = b.id
        WHERE d.user_id = ? AND d.date >= ? AND d.date <= ?
        ORDER BY d.date ASC
      `);
      return stmt.all(userId, startDate, endDate) || [];
    } catch (err) {
      console.error('Erro em DEPOSITS_GET:', err);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEPOSITS_ADD, (event, { user_id, bank_id, description, amount, date, status, is_fixed }) => {
    try {
      if (!user_id || !description || !amount || !date) {
        return { success: false, error: 'Dados inválidos' };
      }
      const db = getDb();
      const isFixedVal = is_fixed ? 1 : 0;
      const statusVal = status === 'realized' ? 'realized' : 'pending';
      const bankIdVal = bank_id ? Number(bank_id) : null;

      const stmt = db.prepare(
        'INSERT INTO deposits (user_id, bank_id, description, amount, date, status, is_fixed) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );

      let firstId = null;

      const insertMany = db.transaction(() => {
        const iterations = isFixedVal ? 12 : 1;
        let [year, month, day] = date.split('-').map(Number);

        for (let i = 0; i < iterations; i++) {
          const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info = stmt.run(user_id, bankIdVal, description, Number(amount), formattedDate, statusVal, isFixedVal);
          if (i === 0) firstId = Number(info.lastInsertRowid);

          month++;
          if (month > 12) {
            month = 1;
            year++;
          }
        }
      });

      insertMany();
      return { success: true, id: firstId };
    } catch (err) {
      console.error('Erro em DEPOSITS_ADD:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEPOSITS_UPDATE, (event, { id, deposit }) => {
    try {
      if (!id || !deposit) return { success: false, error: 'Dados inválidos' };
      const db = getDb();
      const stmt = db.prepare(
        'UPDATE deposits SET bank_id = ?, description = ?, amount = ?, date = ?, status = ?, is_fixed = ? WHERE id = ?'
      );
      const bankIdVal = deposit.bank_id ? Number(deposit.bank_id) : null;
      const statusVal = deposit.status === 'realized' ? 'realized' : 'pending';
      stmt.run(bankIdVal, deposit.description, Number(deposit.amount), deposit.date, statusVal, deposit.is_fixed ? 1 : 0, id);
      return { success: true };
    } catch (err) {
      console.error('Erro em DEPOSITS_UPDATE:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEPOSITS_DELETE, (event, id) => {
    try {
      if (!id) return { success: false, error: 'ID inválido' };
      const db = getDb();
      db.prepare('DELETE FROM deposits WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      console.error('Erro em DEPOSITS_DELETE:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEPOSITS_TOGGLE_STATUS, (event, id) => {
    try {
      if (!id) return { success: false, error: 'ID inválido' };
      const db = getDb();
      const current = db.prepare('SELECT status FROM deposits WHERE id = ?').get(id);
      if (!current) return { success: false, error: 'Depósito não encontrado' };
      const newStatus = current.status === 'realized' ? 'pending' : 'realized';
      db.prepare('UPDATE deposits SET status = ? WHERE id = ?').run(newStatus, id);
      return { success: true, newStatus };
    } catch (err) {
      console.error('Erro em DEPOSITS_TOGGLE_STATUS:', err);
      return { success: false, error: err.message };
    }
  });
};

module.exports = { setupDepositsHandlers };
