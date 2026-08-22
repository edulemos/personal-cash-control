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
    `);
    
    let normalTxs = stmt.all(userId, startDate, endDate);
    
    // Calcula as faturas de cartões de crédito para os meses no período de forma segura (sem fuso horário)
    const invoiceMonths = [];
    let [y, m] = startDate.split('-').map(Number);
    const [ey, em] = endDate.split('-').map(Number);
    
    while (y < ey || (y === ey && m <= em)) {
      invoiceMonths.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    
    const invoiceStmt = db.prepare(`
      SELECT SUM(t.amount) as total, c.id, c.name, c.due_day, t.invoice_month, IFNULL(i.is_paid, 0) as is_paid
      FROM credit_card_transactions t
      JOIN credit_cards c ON t.credit_card_id = c.id
      LEFT JOIN credit_card_invoices i ON i.credit_card_id = c.id AND i.invoice_month = t.invoice_month
      WHERE c.user_id = ? AND t.invoice_month IN (${invoiceMonths.map(() => '?').join(',')})
      GROUP BY c.id, t.invoice_month
    `);
    
    if (invoiceMonths.length > 0) {
      const invoices = invoiceStmt.all(userId, ...invoiceMonths);
      
      const invoiceTxs = invoices.map(inv => {
        // inv.invoice_month está no formato YYYY-MM
        const [year, month] = inv.invoice_month.split('-');
        // A data da transação virtual será a data de vencimento
        const invoiceDate = `${year}-${month}-${String(inv.due_day).padStart(2, '0')}`;
        
        return {
          id: `invoice-${inv.id}-${inv.invoice_month}`,
          description: `Fatura Cartão: ${inv.name}`,
          amount: inv.total,
          type: 'expense',
          date: invoiceDate,
          category_name: 'Fatura de Cartão',
          category_color: '#8b5cf6', // Roxo (Tailwind purple-500)
          is_fixed: 0,
          is_paid: !!inv.is_paid,
          is_invoice: true // Flag pro frontend
        };
      });
      
      // Injeta na lista principal
      normalTxs = [...normalTxs, ...invoiceTxs];
    }

    return normalTxs.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  ipcMain.handle(IPC_CHANNELS.TRANSACTIONS_ADD, (event, { user_id, description, amount, type, date, category_id, is_fixed, is_paid }) => {
    const db = getDb();
    const isFixedVal = is_fixed ? 1 : 0;
    const isPaidVal = is_paid !== undefined ? (is_paid ? 1 : 0) : (type === 'income' ? 1 : 0);
    const stmt = db.prepare('INSERT INTO transactions (user_id, description, amount, type, date, category_id, is_fixed, is_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    
    let firstId = null;
    
    // Loop de inserção dentro de uma transaction para performance e atomicidade
    const insertMany = db.transaction(() => {
      const iterations = isFixedVal ? 12 : 1;
      
      // Quebra a data para evitar fuso horário do JS (YYYY-MM-DD)
      let [year, month, day] = date.split('-').map(Number);
      
      for (let i = 0; i < iterations; i++) {
        // Formata YYYY-MM-DD garantindo 2 dígitos
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const info = stmt.run(user_id, description, amount, type, formattedDate, category_id, isFixedVal, isPaidVal);
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
    
    // Intercepta atualização de faturas de cartão de crédito (marcar como pago)
    if (typeof id === 'string' && id.startsWith('invoice-')) {
      const parts = id.split('-');
      const cardId = parts[1];
      const invoiceMonth = `${parts[2]}-${parts[3]}`; // Ex: 2026-09
      const isPaidVal = transaction.is_paid ? 1 : 0;
      
      const stmt = db.prepare(`
        INSERT INTO credit_card_invoices (credit_card_id, invoice_month, is_paid) 
        VALUES (?, ?, ?)
        ON CONFLICT(credit_card_id, invoice_month) DO UPDATE SET is_paid = excluded.is_paid
      `);
      stmt.run(cardId, invoiceMonth, isPaidVal);
      return { success: true };
    }

    const stmt = db.prepare('UPDATE transactions SET description = ?, amount = ?, type = ?, date = ?, category_id = ?, is_fixed = ?, is_paid = ? WHERE id = ?');
    console.log('Received update for id', id, 'payload', transaction);
    
    // Mantém is_paid se não for fornecido explicitamente na edição
    const isPaidVal = transaction.is_paid !== undefined ? (transaction.is_paid ? 1 : 0) : 0;
    
    stmt.run(transaction.description, transaction.amount, transaction.type, transaction.date, transaction.category_id, transaction.is_fixed ? 1 : 0, isPaidVal, id);
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
    
    // Busca transações normais
    const stmt = db.prepare(`
      SELECT amount, type, is_paid FROM transactions
      WHERE user_id = ? AND date >= ? AND date <= ?
    `);
    const transactions = stmt.all(userId, startDate, endDate);
    
    // Busca as faturas de cartões para injetar nos stats
    const invoiceMonths = [];
    let [y, m] = startDate.split('-').map(Number);
    const [ey, em] = endDate.split('-').map(Number);
    
    while (y < ey || (y === ey && m <= em)) {
      invoiceMonths.push(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    
    if (invoiceMonths.length > 0) {
      const invoiceStmt = db.prepare(`
        SELECT SUM(t.amount) as total, IFNULL(i.is_paid, 0) as is_paid
        FROM credit_card_transactions t
        JOIN credit_cards c ON t.credit_card_id = c.id
        LEFT JOIN credit_card_invoices i ON i.credit_card_id = c.id AND i.invoice_month = t.invoice_month
        WHERE c.user_id = ? AND t.invoice_month IN (${invoiceMonths.map(() => '?').join(',')})
        GROUP BY c.id, t.invoice_month
      `);
      
      const invoices = invoiceStmt.all(userId, ...invoiceMonths);
      
      invoices.forEach(inv => {
        transactions.push({
          amount: inv.total,
          type: 'expense',
          is_paid: inv.is_paid
        });
      });
    }
    
    return calculateDashboardStats(transactions);
  });
};

module.exports = { setupTransactionsHandlers };
