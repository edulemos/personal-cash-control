/**
 * Calcula estatísticas do dashboard combinando transações (despesas) e depósitos (recebimentos).
 *
 * @param {Array} transactions Lista de transações do mês (type: 'expense')
 * @param {Array} deposits     Lista de depósitos do mês ({ status: 'pending'|'realized', amount })
 * @returns {Object} {
 *   depositRealized,  // recebimentos confirmados
 *   depositPending,   // recebimentos previstos
 *   expensePaid,      // despesas pagas
 *   expensePending,   // despesas a pagar
 *   balance,          // depositRealized - expensePaid (caixa real)
 *   netBalance,       // (depositRealized + depositPending) - (expensePaid + expensePending)
 * }
 */
const calculateDashboardStats = (transactions, deposits = []) => {
  const txResult = (Array.isArray(transactions) ? transactions : []).reduce((acc, curr) => {
    const amount = Number(curr.amount) || 0;
    if (curr.type === 'expense') {
      if (curr.is_paid) {
        acc.expensePaid += amount;
      } else {
        acc.expensePending += amount;
      }
    }
    return acc;
  }, { expensePaid: 0, expensePending: 0 });

  const depResult = (Array.isArray(deposits) ? deposits : []).reduce((acc, d) => {
    const amount = Number(d.amount) || 0;
    if (d.status === 'realized') {
      acc.depositRealized += amount;
    } else {
      acc.depositPending += amount;
    }
    return acc;
  }, { depositRealized: 0, depositPending: 0 });

  const balance = depResult.depositRealized - txResult.expensePaid;
  const netBalance = (depResult.depositRealized + depResult.depositPending) - (txResult.expensePaid + txResult.expensePending);

  return {
    depositRealized: depResult.depositRealized,
    depositPending: depResult.depositPending,
    expensePaid: txResult.expensePaid,
    expensePending: txResult.expensePending,
    balance,
    netBalance,
    // Mantido por compatibilidade com código legado que leia 'income'
    income: depResult.depositRealized,
  };
};

module.exports = { calculateDashboardStats };
