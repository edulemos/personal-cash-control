/**
 * Divide o valor total de uma compra em parcelas com exatamente duas casas decimais,
 * distribuindo os centavos remanescentes nas primeiras parcelas para que a soma seja exata.
 *
 * @param {number|string} totalAmount Valor total da compra
 * @param {number|string} installmentsCount Número de parcelas
 * @returns {number[]} Lista de valores de cada parcela
 */
const calculateInstallments = (totalAmount, installmentsCount) => {
  const total = Math.round((Number(totalAmount) || 0) * 100) / 100;
  const count = Math.max(1, parseInt(installmentsCount, 10) || 1);
  if (count === 1) return [total];

  const base = Math.floor((total / count) * 100) / 100;
  const remainderCents = Math.round((total - (base * count)) * 100);

  const installments = [];
  for (let i = 0; i < count; i++) {
    const amount = i < remainderCents
      ? Math.round((base + 0.01) * 100) / 100
      : base;
    installments.push(amount);
  }
  return installments;
};

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

/**
 * Retorna o dia de corte efetivo para uma fatura, priorizando o dia customizado
 * daquele mês sobre o dia fixo do cartão se informado e válido (1 a 31).
 *
 * @param {number|string} cardClosingDay Dia de corte fixo/padrão do cartão
 * @param {number|string|null|undefined} invoiceClosingDay Dia de corte customizado do mês
 * @returns {number} Dia de corte efetivo (1 a 31)
 */
const getEffectiveClosingDay = (cardClosingDay, invoiceClosingDay) => {
  const parsedInvoice = parseInt(invoiceClosingDay, 10);
  if (!isNaN(parsedInvoice) && parsedInvoice >= 1 && parsedInvoice <= 31) {
    return parsedInvoice;
  }
  const parsedCard = parseInt(cardClosingDay, 10);
  if (!isNaN(parsedCard) && parsedCard >= 1 && parsedCard <= 31) {
    return parsedCard;
  }
  return 1;
};

/**
 * Retorna o período de cobrança (startDate e endDate no formato YYYY-MM-DD)
 * de uma fatura específica (invoiceMonth no formato YYYY-MM) para um cartão.
 *
 * Exemplo: fatura de setembro/2026 com corte no dia 29 e corte anterior dia 1:
 * startDate: '2026-09-01'
 * endDate: '2026-09-28' (véspera do corte atual 29/09)
 *
 * @param {{ due_day: number, closing_day: number }} card Configuração do cartão
 * @param {string} invoiceMonth Mês da fatura no formato 'YYYY-MM'
 * @param {Object.<string, number>} [customClosingDaysMap={}] Mapa de faturas com cortes customizados
 * @returns {{ startDate: string, endDate: string, closingDate: string } | null}
 */
/**
 * Retorna o objeto Date da data de fechamento da fatura invoiceMonth ('YYYY-MM')
 */
const getInvoiceClosingDate = (card, invoiceMonth, customClosingDaysMap = {}) => {
  const [year, month] = invoiceMonth.split('-').map(Number);
  const dueDay = Number(card.due_day) || 10;
  const fixedClosingDay = Number(card.closing_day) || 1;
  const effectiveClosingDay = getEffectiveClosingDay(fixedClosingDay, customClosingDaysMap[invoiceMonth]);

  let closingYear = year;
  let closingMonth = month;

  // No Padrão de Mercado, o fechamento é SEMPRE anterior ao vencimento da fatura.
  // Se o dia de corte for maior ou igual ao dia de vencimento (ex: vence dia 1 ou 5 e fecha dia 25;
  // ou vence dia 6 e tem corte no dia 29 do mês anterior), o fechamento ocorre no mês anterior ao vencimento.
  if (effectiveClosingDay >= dueDay) {
    const prev = new Date(year, month - 1 - 1, 1);
    closingYear = prev.getFullYear();
    closingMonth = prev.getMonth() + 1;
  }

  const maxDays = new Date(closingYear, closingMonth, 0).getDate();
  const safeDay = Math.min(effectiveClosingDay, maxDays);
  return new Date(closingYear, closingMonth - 1, safeDay);
};

/**
 * Retorna o período de cobrança (startDate e endDate no formato YYYY-MM-DD)
 * de uma fatura específica (invoiceMonth no formato YYYY-MM) para um cartão.
 *
 * @param {{ due_day: number, closing_day: number }} card Configuração do cartão
 * @param {string} invoiceMonth Mês de vencimento da fatura no formato 'YYYY-MM'
 * @param {Object.<string, number>} [customClosingDaysMap={}] Mapa de faturas com cortes customizados
 * @returns {{ startDate: string, endDate: string, closingDate: string, dueDate: string } | null}
 */
const getInvoiceBillingPeriod = (card, invoiceMonth, customClosingDaysMap = {}) => {
  if (!card || !invoiceMonth) return null;
  const [year, month] = invoiceMonth.split('-').map(Number);
  const dueDay = Number(card.due_day) || 10;

  // Data de corte da fatura atual
  const currentClosingObj = getInvoiceClosingDate(card, invoiceMonth, customClosingDaysMap);

  // endDate é a véspera da data de corte
  const endObj = new Date(currentClosingObj);
  endObj.setDate(endObj.getDate() - 1);
  const endDate = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;

  // Data de corte da fatura anterior
  const prevDate = new Date(year, month - 1 - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const startObj = getInvoiceClosingDate(card, prevMonthKey, customClosingDaysMap);

  const startDate = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;
  const closingDate = `${currentClosingObj.getFullYear()}-${String(currentClosingObj.getMonth() + 1).padStart(2, '0')}-${String(currentClosingObj.getDate()).padStart(2, '0')}`;

  const maxDueDays = new Date(year, month, 0).getDate();
  const safeDueDay = Math.min(dueDay, maxDueDays);
  const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(safeDueDay).padStart(2, '0')}`;

  return {
    startDate,
    endDate,
    closingDate,
    dueDate
  };
};

/**
 * Calcula o mês da fatura (invoice_month no formato YYYY-MM) em que uma transação
 * de cartão de crédito se encaixa, considerando o período de cobrança das faturas.
 *
 * @param {string} txDate Data da compra no formato 'YYYY-MM-DD'
 * @param {{ due_day: number, closing_day: number }} card Configuração do cartão
 * @param {Object.<string, number>} [customClosingDaysMap={}] Mapa de faturas com cortes customizados { 'YYYY-MM': closing_day }
 * @returns {string} Mês da fatura no formato 'YYYY-MM'
 */
const calculateTransactionInvoiceMonth = (txDate, card, customClosingDaysMap = {}) => {
  if (!txDate || !card) return '';
  const [year, month, day] = txDate.split('-').map(Number);

  // Janela de meses candidatos ao redor da compra (mês anterior, atual, próximo, etc)
  const candidateMonths = [];
  for (let offset = -2; offset <= 2; offset++) {
    const d = new Date(year, month - 1 + offset, 1);
    candidateMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // Verifica em qual período de cobrança a compra se encaixa
  for (const invMonth of candidateMonths) {
    const period = getInvoiceBillingPeriod(card, invMonth, customClosingDaysMap);
    if (period && txDate >= period.startDate && txDate <= period.endDate) {
      return invMonth;
    }
  }

  // Fallback padrão se não encontrar nos períodos da janela
  const dueDay = Number(card.due_day);
  const fixedClosingDay = Number(card.closing_day);

  if (dueDay > fixedClosingDay) {
    const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;
    const effectiveClosing = getEffectiveClosingDay(fixedClosingDay, customClosingDaysMap[currentMonthKey]);

    if (day < effectiveClosing) {
      return currentMonthKey;
    } else {
      const nextDate = new Date(year, month - 1 + 1, 1);
      return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    }
  } else {
    const targetDate = new Date(year, month - 1 + 1, 1);
    const targetMonthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const effectiveClosing = getEffectiveClosingDay(fixedClosingDay, customClosingDaysMap[targetMonthKey]);

    if (day < effectiveClosing) {
      return targetMonthKey;
    } else {
      const subsequentDate = new Date(year, month - 1 + 2, 1);
      return `${subsequentDate.getFullYear()}-${String(subsequentDate.getMonth() + 1).padStart(2, '0')}`;
    }
  }
};

/**
 * Calcula os meses de fatura para cada uma das parcelas de uma compra.
 *
 * @param {string} txDate Data da compra no formato 'YYYY-MM-DD'
 * @param {number|string} installmentsCount Número de parcelas
 * @param {{ due_day: number, closing_day: number }} card Configuração do cartão
 * @param {Object.<string, number>} [customClosingDaysMap={}] Mapa de cortes customizados
 * @returns {string[]} Lista de invoice_month ('YYYY-MM') para cada parcela
 */
const calculateInstallmentInvoiceMonths = (txDate, installmentsCount, card, customClosingDaysMap = {}) => {
  const count = Math.max(1, parseInt(installmentsCount, 10) || 1);
  const baseInvoiceMonth = calculateTransactionInvoiceMonth(txDate, card, customClosingDaysMap);
  if (!baseInvoiceMonth) return [];

  const [baseYear, baseMonth] = baseInvoiceMonth.split('-').map(Number);
  const months = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(baseYear, baseMonth - 1 + i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(m);
  }
  return months;
};

module.exports = {
  calculateInstallments,
  calculateInvoiceReconciliation,
  getEffectiveClosingDay,
  getInvoiceBillingPeriod,
  calculateTransactionInvoiceMonth,
  calculateInstallmentInvoiceMonths
};
