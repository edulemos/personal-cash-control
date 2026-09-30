const { getDb } = require('../database/sqlite');

/**
 * Normaliza textos para comparação insensível a acentos, pontuações e maiúsculas
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula a similaridade simples entre duas strings
 */
function isSimilarDescription(str1, str2) {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Quebra em tokens e checa interseção
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return false;

  const matches = words1.filter(w => words2.includes(w));
  return matches.length >= Math.min(words1.length, words2.length, 2);
}

/**
 * Calcula diferença em dias entre duas datas YYYY-MM-DD
 */
function daysDifference(dateStr1, dateStr2) {
  try {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (_) {
    return 999;
  }
}

/**
 * Compara transações extraídas com transações existentes no cartão (função pura para facilitar testes)
 */
function matchCreditCardTransactions(extractedRecords, existingTxs) {
  const matchedExistingIds = new Set();
  const items = [];

  // Compara cada registro extraído pelo Gemini
  for (const extracted of extractedRecords) {
    // Ignora linhas de pagamento de fatura anterior em cartão de crédito (não são compras)
    const normDesc = normalizeText(extracted.description);
    const isInvoicePayment = (
      normDesc.includes('pagamento de fatura') ||
      normDesc.includes('pagamento fatura') ||
      normDesc.includes('pagto fatura') ||
      normDesc.includes('pagamento recebido') ||
      normDesc.includes('pagamento efetuado') ||
      (extracted.type === 'income' && normDesc.includes('pagamento'))
    );
    if (isInvoicePayment) {
      continue;
    }

    const isRefundOrCredit = (
      Number(extracted.amount) < 0 ||
      extracted.type === 'income' ||
      normDesc.includes('reembolso') ||
      normDesc.includes('estorno') ||
      normDesc.includes('devolucao') ||
      normDesc.includes('reducao mensalidade') ||
      normDesc.includes('reducao anuidade') ||
      normDesc.includes('reducao') ||
      normDesc.includes('desconto anuidade')
    );

    // Em fatura de cartão, estornos/reembolsos abatem o total (sinal negativo)
    const extractedAmount = isRefundOrCredit
      ? -Math.abs(Number(extracted.amount) || 0)
      : Math.abs(Number(extracted.amount) || 0);

    let matchedTx = null;
    let matchType = null;

    // 2.1 Procura match exato: mesmo valor absoluto e data próxima (<= 2 dias)
    for (const tx of existingTxs) {
      if (matchedExistingIds.has(tx.id)) continue;

      const amountDiff = Math.abs(Math.abs(tx.amount) - Math.abs(extractedAmount));
      const dayDiff = daysDifference(tx.date, extracted.date);

      if (amountDiff < 0.05 && dayDiff <= 2) {
        matchedTx = tx;
        // Se no banco estava com sinal incorreto (positivo em vez de negativo), marca para atualizar
        if (isRefundOrCredit && tx.amount > 0) {
          matchType = 'divergent';
        } else {
          matchType = 'exact';
        }
        break;
      }
    }

    // 2.2 Procura match por descrição similar e valor similar
    if (!matchedTx) {
      for (const tx of existingTxs) {
        if (matchedExistingIds.has(tx.id)) continue;

        const amountDiff = Math.abs(Math.abs(tx.amount) - Math.abs(extractedAmount));
        const isDescMatch = isSimilarDescription(tx.description, extracted.description);

        if (isDescMatch && amountDiff < 0.05) {
          matchedTx = tx;
          if (isRefundOrCredit && tx.amount > 0) {
            matchType = 'divergent';
          } else {
            matchType = 'exact';
          }
          break;
        } else if (isDescMatch && amountDiff < 5.0) {
          matchedTx = tx;
          matchType = 'divergent';
          break;
        }
      }
    }

    if (matchedTx && matchType === 'exact') {
      matchedExistingIds.add(matchedTx.id);
      items.push({
        id: `matched-${matchedTx.id}`,
        status: 'matched', // Já existente e bate com a fatura
        action: 'none',
        existingId: matchedTx.id,
        date: matchedTx.date,
        description: matchedTx.description,
        amount: matchedTx.amount,
        categoryId: matchedTx.category_id,
        categoryName: matchedTx.category_name,
        personId: matchedTx.person_id,
        personName: matchedTx.person_name,
        installments: matchedTx.installments || 1,
        installmentNumber: matchedTx.installment_number || 1,
        extracted: {
          date: extracted.date,
          description: extracted.description,
          amount: extractedAmount,
          installments: extracted.installments,
          installmentNumber: extracted.installment_number
        }
      });
    } else if (matchedTx && matchType === 'divergent') {
      matchedExistingIds.add(matchedTx.id);
      items.push({
        id: `divergent-${matchedTx.id}`,
        status: 'divergent', // Divergência detectada
        action: 'update',
        existingId: matchedTx.id,
        date: extracted.date, // sugere a data real do documento
        description: extracted.description,
        amount: extractedAmount,
        categoryId: extracted.suggested_category_id || matchedTx.category_id,
        personId: extracted.suggested_person_id || matchedTx.person_id,
        installments: extracted.installments || matchedTx.installments || 1,
        installmentNumber: extracted.installment_number || matchedTx.installment_number || 1,
        existing: {
          date: matchedTx.date,
          description: matchedTx.description,
          amount: matchedTx.amount,
          categoryId: matchedTx.category_id,
          categoryName: matchedTx.category_name
        },
        extracted: {
          date: extracted.date,
          description: extracted.description,
          amount: extractedAmount
        }
      });
    } else {
      // Novo registro encontrado na fatura que não está no app
      items.push({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: 'new',
        action: 'insert',
        date: extracted.date,
        description: extracted.description,
        amount: extractedAmount,
        categoryId: extracted.suggested_category_id || null,
        personId: extracted.suggested_person_id || null,
        installments: extracted.installments || 1,
        installmentNumber: extracted.installment_number || 1,
        extracted: {
          date: extracted.date,
          description: extracted.description,
          amount: extractedAmount
        }
      });
    }
  }

  // 3. Identifica registros no banco que não vieram na fatura
  for (const tx of existingTxs) {
    if (!matchedExistingIds.has(tx.id)) {
      items.push({
        id: `unmatched-app-${tx.id}`,
        status: 'unmatched_in_app', // Registrado no app, mas não veio na fatura
        action: 'none',
        existingId: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        categoryId: tx.category_id,
        categoryName: tx.category_name,
        personId: tx.person_id,
        personName: tx.person_name,
        installments: tx.installments || 1,
        installmentNumber: tx.installment_number || 1
      });
    }
  }

  return items;
}

class ReconciliationService {
  /**
   * Concilia os registros extraídos de fatura de cartão com os registros do banco de dados
   */
  reconcileCreditCard(creditCardId, invoiceMonth, extractedRecords) {
    const db = getDb();

    // 1. Busca transações cadastradas no cartão para o mês
    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as person_name
      FROM credit_card_transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN people p ON t.person_id = p.id
      WHERE t.credit_card_id = ? AND t.invoice_month = ?
    `);
    const existingTxs = stmt.all(creditCardId, invoiceMonth) || [];

    return matchCreditCardTransactions(extractedRecords, existingTxs);
  }



  /**
   * Concilia os registros extraídos de extrato de conta corrente com as transações comuns
   */
  reconcileBankTransactions(userId, startDate, endDate, extractedRecords) {
    const db = getDb();

    const stmt = db.prepare(`
      SELECT t.*, c.name as category_name, p.name as person_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN people p ON t.person_id = p.id
      WHERE t.user_id = ? AND t.date >= ? AND t.date <= ?
    `);
    const existingTxs = stmt.all(userId, startDate, endDate) || [];

    const matchedExistingIds = new Set();
    const items = [];

    for (const extracted of extractedRecords) {
      const extractedAmount = Number(extracted.amount) || 0;
      const extractedType = extracted.type || 'expense';
      let matchedTx = null;
      let matchType = null;

      // 1. Match exato: mesmo valor, mesmo tipo e data próxima
      for (const tx of existingTxs) {
        if (matchedExistingIds.has(tx.id)) continue;

        const amountDiff = Math.abs(tx.amount - extractedAmount);
        const dayDiff = daysDifference(tx.date, extracted.date);

        if (tx.type === extractedType && amountDiff < 0.05 && dayDiff <= 2) {
          matchedTx = tx;
          matchType = 'exact';
          break;
        }
      }

      // 2. Match aproximado
      if (!matchedTx) {
        for (const tx of existingTxs) {
          if (matchedExistingIds.has(tx.id)) continue;

          const amountDiff = Math.abs(tx.amount - extractedAmount);
          const isDescMatch = isSimilarDescription(tx.description, extracted.description);

          if (tx.type === extractedType && isDescMatch && amountDiff < 0.05) {
            matchedTx = tx;
            matchType = 'exact';
            break;
          } else if (tx.type === extractedType && isDescMatch && amountDiff < 5.0) {
            matchedTx = tx;
            matchType = 'divergent';
            break;
          }
        }
      }

      if (matchedTx && matchType === 'exact') {
        matchedExistingIds.add(matchedTx.id);
        items.push({
          id: `matched-${matchedTx.id}`,
          status: 'matched',
          action: 'none',
          existingId: matchedTx.id,
          date: matchedTx.date,
          description: matchedTx.description,
          amount: matchedTx.amount,
          type: matchedTx.type,
          categoryId: matchedTx.category_id,
          categoryName: matchedTx.category_name,
          personId: matchedTx.person_id,
          personName: matchedTx.person_name,
          isPaid: matchedTx.is_paid,
          extracted: {
            date: extracted.date,
            description: extracted.description,
            amount: extractedAmount,
            type: extractedType
          }
        });
      } else if (matchedTx && matchType === 'divergent') {
        matchedExistingIds.add(matchedTx.id);
        items.push({
          id: `divergent-${matchedTx.id}`,
          status: 'divergent',
          action: 'update',
          existingId: matchedTx.id,
          date: extracted.date,
          description: extracted.description,
          amount: extractedAmount,
          type: extractedType,
          categoryId: extracted.suggested_category_id || matchedTx.category_id,
          personId: extracted.suggested_person_id || matchedTx.person_id,
          isPaid: 1, // se veio no extrato, já foi compensado/pago
          existing: {
            date: matchedTx.date,
            description: matchedTx.description,
            amount: matchedTx.amount,
            type: matchedTx.type,
            categoryId: matchedTx.category_id,
            categoryName: matchedTx.category_name
          },
          extracted: {
            date: extracted.date,
            description: extracted.description,
            amount: extractedAmount,
            type: extractedType
          }
        });
      } else {
        items.push({
          id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          status: 'new',
          action: 'insert',
          date: extracted.date,
          description: extracted.description,
          amount: extractedAmount,
          type: extractedType,
          categoryId: extracted.suggested_category_id || null,
          personId: extracted.suggested_person_id || null,
          isPaid: 1,
          extracted: {
            date: extracted.date,
            description: extracted.description,
            amount: extractedAmount,
            type: extractedType
          }
        });
      }
    }

    // Registros que estavam no app mas não vieram no extrato
    for (const tx of existingTxs) {
      if (!matchedExistingIds.has(tx.id)) {
        items.push({
          id: `unmatched-app-${tx.id}`,
          status: 'unmatched_in_app',
          action: 'none',
          existingId: tx.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          categoryId: tx.category_id,
          categoryName: tx.category_name,
          personId: tx.person_id,
          personName: tx.person_name,
          isPaid: tx.is_paid
        });
      }
    }

    return items;
  }

  /**
   * Aplica as alterações de conciliação de forma atômica no SQLite
   */
  applyReconciliation({ documentType, creditCardId, invoiceMonth, userId, itemsToApply }) {
    const db = getDb();
    let countInserted = 0;
    let countUpdated = 0;

    const runTransaction = db.transaction(() => {
      if (documentType === 'credit_card') {
        const insertStmt = db.prepare(`
          INSERT INTO credit_card_transactions 
          (credit_card_id, description, amount, date, category_id, installments, installment_number, invoice_month, person_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStmt = db.prepare(`
          UPDATE credit_card_transactions
          SET description = ?, amount = ?, date = ?, category_id = ?, person_id = ?
          WHERE id = ?
        `);

        for (const item of itemsToApply) {
          if (item.action === 'insert') {
            insertStmt.run(
              creditCardId,
              item.description,
              Number(item.amount),
              item.date,
              item.categoryId || null,
              item.installments || 1,
              item.installmentNumber || 1,
              invoiceMonth,
              item.personId || null
            );
            countInserted++;
          } else if (item.action === 'update' && item.existingId) {
            updateStmt.run(
              item.description,
              Number(item.amount),
              item.date,
              item.categoryId || null,
              item.personId || null,
              item.existingId
            );
            countUpdated++;
          }
        }
      } else {
        // Transações de conta corrente
        const insertStmt = db.prepare(`
          INSERT INTO transactions 
          (user_id, description, amount, type, date, category_id, is_fixed, is_paid, person_id) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStmt = db.prepare(`
          UPDATE transactions
          SET description = ?, amount = ?, type = ?, date = ?, category_id = ?, is_paid = ?, person_id = ?
          WHERE id = ?
        `);

        for (const item of itemsToApply) {
          if (item.action === 'insert') {
            insertStmt.run(
              userId,
              item.description,
              Number(item.amount),
              item.type || 'expense',
              item.date,
              item.categoryId || null,
              0, // não é fixo por padrão
              item.isPaid !== undefined ? (item.isPaid ? 1 : 0) : 1,
              item.personId || null
            );
            countInserted++;
          } else if (item.action === 'update' && item.existingId) {
            updateStmt.run(
              item.description,
              Number(item.amount),
              item.type || 'expense',
              item.date,
              item.categoryId || null,
              item.isPaid !== undefined ? (item.isPaid ? 1 : 0) : 1,
              item.personId || null,
              item.existingId
            );
            countUpdated++;
          }
        }
      }
    });

    runTransaction();

    return {
      success: true,
      countInserted,
      countUpdated
    };
  }
}

const service = new ReconciliationService();
service.normalizeText = normalizeText;
service.isSimilarDescription = isSimilarDescription;
service.daysDifference = daysDifference;
service.matchCreditCardTransactions = matchCreditCardTransactions;
service.ReconciliationService = ReconciliationService;

module.exports = service;
