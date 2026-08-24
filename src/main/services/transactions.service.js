/**
 * Função pura para calcular estatísticas do dashboard com base em uma lista de transações
 * @param {Array} transactions Lista de transações do mês
 * @returns {Object} { income, expensePaid, expensePending, balance, netBalance }
 *   balance:    receitas - despesas pagas (saldo em caixa real)
 *   netBalance: receitas - despesas pagas - despesas pendentes (saldo após pagar tudo)
 */
const calculateDashboardStats = (transactions) => {
  if (!Array.isArray(transactions)) return { income: 0, expensePaid: 0, expensePending: 0, balance: 0, netBalance: 0 };
  
  const result = transactions.reduce((acc, curr) => {
    // Garantir precisão decimal simples e evitar strings
    const amount = Number(curr.amount) || 0;
    
    if (curr.type === 'income') {
      acc.income += amount;
      acc.balance += amount;
    } else if (curr.type === 'expense') {
      if (curr.is_paid) {
        acc.expensePaid += amount;
        acc.balance -= amount;
      } else {
        acc.expensePending += amount;
      }
    }
    
    return acc;
  }, { income: 0, expensePaid: 0, expensePending: 0, balance: 0 });

  // Saldo real: o que sobra após pagar todas as despesas (pagas + pendentes)
  result.netBalance = result.balance - result.expensePending;

  return result;
};

module.exports = { calculateDashboardStats };
