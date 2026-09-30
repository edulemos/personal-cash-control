const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');
const {
  calculateInstallments,
  calculateInstallmentInvoiceMonths,
  getEffectiveClosingDay,
  getInvoiceBillingPeriod
} = require('../services/creditCards.service');

const getCustomClosingDaysMap = (db, creditCardId) => {
  try {
    const rows = db.prepare('SELECT invoice_month, closing_day FROM credit_card_invoices WHERE credit_card_id = ? AND closing_day IS NOT NULL').all(creditCardId) || [];
    const map = {};
    for (const r of rows) {
      map[r.invoice_month] = r.closing_day;
    }
    return map;
  } catch (_) {
    return {};
  }
};

const recalculateCardTransactions = (db, creditCardId) => {
  try {
    const cardStmt = db.prepare('SELECT id, due_day, closing_day FROM credit_cards WHERE id = ?');
    const card = cardStmt.get(creditCardId);
    if (!card) return;

    const customMap = getCustomClosingDaysMap(db, creditCardId);
    const txs = db.prepare('SELECT id, date, installments, installment_number, invoice_month FROM credit_card_transactions WHERE credit_card_id = ?').all(creditCardId) || [];

    const updateStmt = db.prepare('UPDATE credit_card_transactions SET invoice_month = ? WHERE id = ?');

    db.transaction(() => {
      for (const tx of txs) {
        const installmentNumber = tx.installment_number || 1;
        const count = tx.installments || 1;
        const months = calculateInstallmentInvoiceMonths(tx.date, count, card, customMap);
        const newInvoiceMonth = months[installmentNumber - 1] || months[0];
        if (newInvoiceMonth && newInvoiceMonth !== tx.invoice_month) {
          updateStmt.run(newInvoiceMonth, tx.id);
        }
      }
    })();
  } catch (err) {
    console.error('Erro ao recalcular transações do cartão:', err);
  }
};

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
      stmt.run(card.name, Number(card.due_day), Number(card.closing_day), id);
      recalculateCardTransactions(db, id);
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
      try {
        db.prepare('DELETE FROM credit_card_invoices WHERE credit_card_id = ?').run(id);
      } catch (_) {}
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
      recalculateCardTransactions(db, creditCardId);
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
      
      const installmentAmounts = calculateInstallments(tx.amount, tx.installments);
      const installments = installmentAmounts.length;
      const customMap = getCustomClosingDaysMap(db, tx.credit_card_id);
      const invoiceMonths = calculateInstallmentInvoiceMonths(tx.date, installments, card, customMap);
      
      const insertStmt = db.prepare(`
        INSERT INTO credit_card_transactions 
        (credit_card_id, description, amount, date, category_id, installments, installment_number, invoice_month, person_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const personIdVal = tx.person_id || null;

      db.transaction(() => {
        for (let i = 0; i < installments; i++) {
          const invoiceMonth = invoiceMonths[i];
          const currentInstallmentAmount = installmentAmounts[i];

          insertStmt.run(
            tx.credit_card_id,
            tx.description,
            currentInstallmentAmount,
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
      const amount = tx.amount !== undefined ? Math.round(Number(tx.amount) * 100) / 100 : null;
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

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_TOGGLE_CHECK, (event, { id, is_checked }) => {
    try {
      if (!id) throw new Error('ID da transação não fornecido.');
      const db = getDb();
      const isCheckedVal = is_checked ? 1 : 0;
      const stmt = db.prepare('UPDATE credit_card_transactions SET is_checked = ? WHERE id = ?');
      stmt.run(isCheckedVal, id);
      return { success: true, is_checked: isCheckedVal };
    } catch (err) {
      console.error('Erro em CREDIT_CARD_TRANSACTIONS_TOGGLE_CHECK:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_CHECK_ALL, (event, { creditCardId, invoiceMonth, is_checked }) => {
    try {
      if (!creditCardId || !invoiceMonth) throw new Error('Cartão e mês da fatura são obrigatórios.');
      const db = getDb();
      const isCheckedVal = is_checked ? 1 : 0;
      const stmt = db.prepare('UPDATE credit_card_transactions SET is_checked = ? WHERE credit_card_id = ? AND invoice_month = ?');
      stmt.run(isCheckedVal, creditCardId, invoiceMonth);
      return { success: true, is_checked: isCheckedVal };
    } catch (err) {
      console.error('Erro em CREDIT_CARD_TRANSACTIONS_CHECK_ALL:', err);
      return { success: false, error: err.message };
    }
  });

  // --- INVOICES ---
  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_INVOICE_GET, (event, { creditCardId, invoiceMonth }) => {
    try {
      if (!creditCardId || !invoiceMonth) return null;
      const db = getDb();
      const card = db.prepare('SELECT id, name, due_day, closing_day FROM credit_cards WHERE id = ?').get(creditCardId);
      if (!card) return null;

      let invoice = null;
      try {
        invoice = db.prepare('SELECT credit_card_id, invoice_month, is_paid, closing_day FROM credit_card_invoices WHERE credit_card_id = ? AND invoice_month = ?').get(creditCardId, invoiceMonth);
      } catch (_) {}

      const customMap = getCustomClosingDaysMap(db, creditCardId);
      const customClosingDay = (invoice && invoice.closing_day != null) ? Number(invoice.closing_day) : null;
      const effectiveClosingDay = customClosingDay != null ? customClosingDay : card.closing_day;
      const billingPeriod = getInvoiceBillingPeriod(card, invoiceMonth, customMap);

      let formattedPeriod = '';
      let formattedDueDate = '';
      let formattedClosingDate = '';
      if (billingPeriod) {
        const [sy, sm, sd] = billingPeriod.startDate.split('-');
        const [ey, em, ed] = billingPeriod.endDate.split('-');
        formattedPeriod = `${sd}/${sm}/${sy} até ${ed}/${em}/${ey}`;

        if (billingPeriod.dueDate) {
          const [dy, dm, dd] = billingPeriod.dueDate.split('-');
          formattedDueDate = `${dd}/${dm}/${dy}`;
        }
        if (billingPeriod.closingDate) {
          const [cy, cm, cd] = billingPeriod.closingDate.split('-');
          formattedClosingDate = `${cd}/${cm}/${cy}`;
        }
      }

      return {
        credit_card_id: card.id,
        invoice_month: invoiceMonth,
        due_day: card.due_day,
        card_closing_day: card.closing_day,
        custom_closing_day: customClosingDay,
        effective_closing_day: effectiveClosingDay,
        is_custom: customClosingDay != null,
        is_paid: !!(invoice && invoice.is_paid),
        billing_period: billingPeriod ? {
          startDate: billingPeriod.startDate,
          endDate: billingPeriod.endDate,
          closingDate: billingPeriod.closingDate,
          dueDate: billingPeriod.dueDate,
          formatted: formattedPeriod,
          formattedDueDate,
          formattedClosingDate
        } : null
      };
    } catch (err) {
      console.error('Erro em CREDIT_CARD_INVOICE_GET:', err);
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_INVOICE_SET_CLOSING_DAY, (event, { creditCardId, invoiceMonth, closingDay }) => {
    try {
      if (!creditCardId || !invoiceMonth) throw new Error('ID do cartão e mês da fatura são obrigatórios.');
      const db = getDb();

      let closingDayVal = null;
      if (closingDay !== null && closingDay !== undefined && closingDay !== '') {
        const parsed = parseInt(closingDay, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 31) {
          throw new Error('Dia de corte inválido. Escolha um número entre 1 e 31.');
        }
        closingDayVal = parsed;
      }

      if (closingDayVal !== null) {
        db.prepare(`
          INSERT INTO credit_card_invoices (credit_card_id, invoice_month, closing_day)
          VALUES (?, ?, ?)
          ON CONFLICT(credit_card_id, invoice_month) DO UPDATE SET closing_day = excluded.closing_day
        `).run(creditCardId, invoiceMonth, closingDayVal);
      } else {
        // Restaurar padrão: define closing_day = NULL
        db.prepare(`
          UPDATE credit_card_invoices SET closing_day = NULL
          WHERE credit_card_id = ? AND invoice_month = ?
        `).run(creditCardId, invoiceMonth);
      }

      // Recalcula faturas das transações deste cartão para refletir o novo corte
      recalculateCardTransactions(db, creditCardId);

      return { success: true, closing_day: closingDayVal };
    } catch (err) {
      console.error('Erro em CREDIT_CARD_INVOICE_SET_CLOSING_DAY:', err);
      return { success: false, error: err.message };
    }
  });
};

module.exports = { setupCreditCardsHandlers };
