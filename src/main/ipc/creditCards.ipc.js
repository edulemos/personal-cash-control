const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupCreditCardsHandlers = () => {
  // --- CARDS ---
  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_GET, (event, userId) => {
    try {
      if (!userId) return [];
      const db = getDb();
      const stmt = db.prepare('SELECT * FROM credit_cards WHERE user_id = ? ORDER BY name ASC');
      return stmt.all(userId) || [];
    } catch (err) {
      console.error('Erro em CREDIT_CARDS_GET:', err);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_ADD, (event, card) => {
    try {
      const db = getDb();
      const stmt = db.prepare('INSERT INTO credit_cards (user_id, name, due_day, closing_day) VALUES (?, ?, ?, ?)');
      const info = stmt.run(card.user_id, card.name, card.due_day, card.closing_day);
      return { id: info.lastInsertRowid };
    } catch (err) {
      console.error('Erro em CREDIT_CARDS_ADD:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_UPDATE, (event, { id, card }) => {
    try {
      const db = getDb();
      const stmt = db.prepare('UPDATE credit_cards SET name = ?, due_day = ?, closing_day = ? WHERE id = ?');
      stmt.run(card.name, card.due_day, card.closing_day, id);
      return { success: true };
    } catch (err) {
      console.error('Erro em CREDIT_CARDS_UPDATE:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_DELETE, (event, id) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM credit_card_transactions WHERE credit_card_id = ?').run(id);
      const stmt = db.prepare('DELETE FROM credit_cards WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (err) {
      console.error('Erro em CREDIT_CARDS_DELETE:', err);
      return { success: false, error: err.message };
    }
  });

  // --- TRANSACTIONS ---
  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_GET, (event, { creditCardId, invoiceMonth }) => {
    try {
      if (!creditCardId || !invoiceMonth) return [];
      const db = getDb();
      try {
        const stmt = db.prepare(`
          SELECT t.*, c.name as category_name, c.color as category_color,
                 p.name as person_name, p.avatar_color as person_avatar_color
          FROM credit_card_transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN people p ON t.person_id = p.id
          WHERE t.credit_card_id = ? AND t.invoice_month = ?
          ORDER BY t.date ASC
        `);
        return stmt.all(creditCardId, invoiceMonth) || [];
      } catch (_) {
        // Fallback sem JOIN (migration ainda não rodou)
        const stmt = db.prepare(`
          SELECT t.*, c.name as category_name, c.color as category_color
          FROM credit_card_transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.credit_card_id = ? AND t.invoice_month = ?
          ORDER BY t.date ASC
        `);
        return stmt.all(creditCardId, invoiceMonth) || [];
      }
    } catch (err) {
      console.error('Erro em CREDIT_CARD_TRANSACTIONS_GET:', err);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_ADD, (event, tx) => {
    try {
      const db = getDb();
      
      const cardStmt = db.prepare('SELECT due_day, closing_day FROM credit_cards WHERE id = ?');
      const card = cardStmt.get(tx.credit_card_id);
      if (!card) throw new Error('Cartão não encontrado.');
      
      const [year, month, day] = tx.date.split('-').map(Number);
      const installments = tx.installments || 1;
      const installmentAmount = tx.amount / installments;
      
      const insertStmt = db.prepare(`
        INSERT INTO credit_card_transactions 
        (credit_card_id, description, amount, date, category_id, installments, installment_number, invoice_month, person_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const personIdVal = tx.person_id || null;

      db.transaction(() => {
        for (let i = 0; i < installments; i++) {
          let baseInvoiceDate = new Date(year, month - 1, card.due_day);
          
          if (day >= card.closing_day) {
            baseInvoiceDate.setMonth(baseInvoiceDate.getMonth() + 1);
          }
          
          if (card.due_day <= card.closing_day) {
            baseInvoiceDate.setMonth(baseInvoiceDate.getMonth() + 1);
          }
          
          baseInvoiceDate.setMonth(baseInvoiceDate.getMonth() + i);
          
          const invoiceMonth = `${baseInvoiceDate.getFullYear()}-${String(baseInvoiceDate.getMonth() + 1).padStart(2, '0')}`;
          
          insertStmt.run(
            tx.credit_card_id,
            tx.description,
            installmentAmount,
            tx.date,
            tx.category_id,
            installments,
            i + 1,
            invoiceMonth,
            personIdVal
          );
        }
      })();

      return { success: true };
    } catch (err) {
      console.error('Erro em CREDIT_CARD_TRANSACTIONS_ADD:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_UPDATE, (event, { id, tx }) => {
    try {
      const db = getDb();
      const description = tx.description !== undefined ? tx.description : null;
      const amount = tx.amount !== undefined ? Number(tx.amount) : null;
      const categoryId = tx.category_id !== undefined ? Number(tx.category_id) : null;
      const personId = tx.person_id !== undefined ? (tx.person_id || null) : null;
      try {
        const stmt = db.prepare('UPDATE credit_card_transactions SET description = ?, amount = ?, category_id = ?, person_id = ? WHERE id = ?');
        stmt.run(description, amount, categoryId, personId, id);
      } catch (_) {
        // Fallback sem person_id (coluna ainda não existe)
        const stmt = db.prepare('UPDATE credit_card_transactions SET description = ?, amount = ?, category_id = ? WHERE id = ?');
        stmt.run(description, amount, categoryId, id);
      }
      return { success: true };
    } catch (err) {
      console.error('Erro em CREDIT_CARD_TRANSACTIONS_UPDATE:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_DELETE, (event, id) => {
    try {
      const db = getDb();
      const stmt = db.prepare('DELETE FROM credit_card_transactions WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (err) {
      console.error('Erro em CREDIT_CARD_TRANSACTIONS_DELETE:', err);
      return { success: false, error: err.message };
    }
  });
};

module.exports = { setupCreditCardsHandlers };
