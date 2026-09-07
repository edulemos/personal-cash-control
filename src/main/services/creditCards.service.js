/**
 * Calcula estatísticas de conferência/conciliação de uma fatura de cartão de crédito.
 *
 * @param {Array} transactions Lista de lançamentos da fatura ({ amount, is_checked })
 * @returns {Object} {
 *   totalAmount,    // Valor total da fatura
 *   checkedAmount,  // Valor total já conferido
 *   pendingAmount,  // Valor total ainda pendente de conferência
 *   totalCount,     // Quantidade total de lançamentos
 *   checkedCount,   // Quantidade de lançamentos conferidos
 *   pendingCount,   // Quantidade de lançamentos pendentes
 *   percentage,     // Percentual conferido (0 a 100)
 *   status,         // 'pending' (nenhum conferido), 'in_progress' (parcial), 'completed' (100% conferido)
 * }
 */
const calculateInvoiceReconciliation = (transactions) => {
  const list = Array.isArray(transactions) ? transactions : [];

  let totalAmount = 0;
  let checkedAmount = 0;
  let checkedCount = 0;

  for (const t of list) {
    const amount = Math.round((Number(t.amount) || 0) * 100) / 100;
    totalAmount += amount;
    if (t.is_checked) {
      checkedAmount += amount;
      checkedCount++;
    }
  }

  totalAmount = Math.round(totalAmount * 100) / 100;
  checkedAmount = Math.round(checkedAmount * 100) / 100;
  const pendingAmount = Math.max(0, Math.round((totalAmount - checkedAmount) * 100) / 100);
  const totalCount = list.length;
  const pendingCount = totalCount - checkedCount;

  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  let status = 'pending';
  if (totalCount > 0 && checkedCount === totalCount) {
    status = 'completed';
  } else if (checkedCount > 0) {
    status = 'in_progress';
  }

  return {
    totalAmount,
    checkedAmount,
    pendingAmount,
    totalCount,
    checkedCount,
    pendingCount,
    percentage,
    status
  };
};

module.exports = { calculateInvoiceReconciliation };
