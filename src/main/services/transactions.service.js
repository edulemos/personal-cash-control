/**
 * Função pura para calcular estatísticas do dashboard com base em uma lista de transações
 * @param {Array} transactions Lista de transações do mês
 * @returns {Object} { income, expense, balance }
 */
const calculateDashboardStats = (transactions) => {
  if (!Array.isArray(transactions)) return { income: 0, expense: 0, balance: 0 };
  
  return transactions.reduce((acc, curr) => {
    // Garantir precisão decimal simples e evitar strings
    const amount = Number(curr.amount) || 0;
    
    if (curr.type === 'income') {
      acc.income += amount;
      acc.balance += amount;
    } else if (curr.type === 'expense') {
      acc.expense += amount;
      acc.balance -= amount;
    }
    
    return acc;
  }, { income: 0, expense: 0, balance: 0 });
};

module.exports = { calculateDashboardStats };
