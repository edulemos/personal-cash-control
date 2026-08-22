const { ipcMain } = require('electron');
const { getDb } = require('../database/sqlite');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupCreditCardsHandlers = () => {
  // --- CARDS ---
  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_GET, (event, userId) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM credit_cards WHERE user_id = ? ORDER BY name ASC');
    return stmt.all(userId);
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_ADD, (event, card) => {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO credit_cards (user_id, name, due_day, closing_day) VALUES (?, ?, ?, ?)');
    const info = stmt.run(card.user_id, card.name, card.due_day, card.closing_day);
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_UPDATE, (event, { id, card }) => {
    const db = getDb();
    const stmt = db.prepare('UPDATE credit_cards SET name = ?, due_day = ?, closing_day = ? WHERE id = ?');
    stmt.run(card.name, card.due_day, card.closing_day, id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARDS_DELETE, (event, id) => {
    const db = getDb();
    db.prepare('DELETE FROM credit_card_transactions WHERE credit_card_id = ?').run(id);
    const stmt = db.prepare('DELETE FROM credit_cards WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });

  // --- TRANSACTIONS ---
  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_GET, (event, { creditCardId, invoiceMonth }) => {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color 
      FROM credit_card_transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.credit_card_id = ? AND t.invoice_month = ?
      ORDER BY t.date ASC
    `);
    return stmt.all(creditCardId, invoiceMonth); // invoiceMonth format: 'YYYY-MM'
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_ADD, (event, tx) => {
    const db = getDb();
    
    // Calcula os meses das faturas para as parcelas
    // Regra: Se o dia da compra >= closing_day, entra na fatura do mês subsequente (vencimento M+1 ou M+2 depdendendo do vencimento)
    // Para simplificar: A invoice_month será o mês de VENCIMENTO da fatura.
    
    // Busca os dados do cartão
    const cardStmt = db.prepare('SELECT due_day, closing_day FROM credit_cards WHERE id = ?');
    const card = cardStmt.get(tx.credit_card_id);
    if (!card) throw new Error('Card not found');
    
    const [year, month, day] = tx.date.split('-').map(Number);
    const purchaseDate = new Date(year, month - 1, day);
    
    const installments = tx.installments || 1;
    const installmentAmount = tx.amount / installments;
    
    const insertStmt = db.prepare(`
      INSERT INTO credit_card_transactions 
      (credit_card_id, description, amount, date, category_id, installments, installment_number, invoice_month) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (let i = 0; i < installments; i++) {
        // Cálculo simples da fatura alvo
        // Se a compra foi feita no ou após o dia de fechamento, a primeira parcela vai para o mês seguinte + 1
        let baseInvoiceDate = new Date(year, month - 1, card.due_day);
        
        if (day >= card.closing_day) {
          // Passou do fechamento, a fatura desse mês já fechou, então vai pra próxima
          baseInvoiceDate.setMonth(baseInvoiceDate.getMonth() + 1);
        }
        
        // Se a data de vencimento for MENOR que o dia de fechamento (ex: fecha dia 25, vence dia 05),
        // significa que o vencimento da fatura do mês X ocorre no mês X+1.
        if (card.due_day <= card.closing_day) {
          baseInvoiceDate.setMonth(baseInvoiceDate.getMonth() + 1);
        }
        
        // Adiciona os meses da parcela atual
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
          invoiceMonth
        );
      }
    })();

    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_UPDATE, (event, { id, tx }) => {
    const db = getDb();
    
    // Simplificação: por enquanto atualiza apenas descrição, valor e categoria.
    // Alterar data de compras parceladas é complexo porque muda o invoice_month alvo.
    const stmt = db.prepare('UPDATE credit_card_transactions SET description = ?, amount = ?, category_id = ? WHERE id = ?');
    stmt.run(tx.description, tx.amount, tx.category_id, id);
    
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_DELETE, (event, id) => {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM credit_card_transactions WHERE id = ?');
    stmt.run(id);
    return { success: true };
  });
};

module.exports = { setupCreditCardsHandlers };
