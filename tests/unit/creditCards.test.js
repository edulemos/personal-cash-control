import { describe, it, expect } from 'vitest';
import {
  calculateInvoiceReconciliation,
  calculateInstallments,
  getEffectiveClosingDay,
  calculateTransactionInvoiceMonth,
  calculateInstallmentInvoiceMonths
} from '../../src/main/services/creditCards.service';

describe('Credit Cards Service - Installments Calculation', () => {
  it('should return single installment with 2 decimals when installments is 1', () => {
    expect(calculateInstallments(150.556, 1)).toEqual([150.56]);
  });

  it('should divide installments with exactly 2 decimals and distribute cents correctly', () => {
    // 100 em 3x: 33.34, 33.33, 33.33 -> soma 100.00
    const result = calculateInstallments(100, 3);
    expect(result).toEqual([33.34, 33.33, 33.33]);
    const sum = result.reduce((acc, v) => acc + v, 0);
    expect(sum).toBe(100);
  });

  it('should handle case like the user reported (ex: 526.19 em 12x = 43.84916666666667)', () => {
    // 526.19 / 12 = 43.84916666666667
    const result = calculateInstallments(526.19, 12);
    // Cada parcela deve ter no máximo 2 casas decimais
    result.forEach(val => {
      const decimals = (val.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
      expect([43.85, 43.84]).toContain(val);
    });
    // A soma das 12 parcelas deve bater exatamente com o total de 526.19
    const sum = Math.round(result.reduce((acc, v) => acc + v, 0) * 100) / 100;
    expect(sum).toBe(526.19);
  });

  it('should handle string inputs safely', () => {
    const result = calculateInstallments('200.50', '2');
    expect(result).toEqual([100.25, 100.25]);
  });
});

describe('Credit Cards Service - Invoice Reconciliation', () => {
  it('should handle empty array gracefully', () => {
    const result = calculateInvoiceReconciliation([]);
    expect(result).toEqual({
      totalAmount: 0,
      checkedAmount: 0,
      pendingAmount: 0,
      totalCount: 0,
      checkedCount: 0,
      pendingCount: 0,
      percentage: 0,
      status: 'pending',
    });
  });

  it('should handle undefined or null input', () => {
    expect(calculateInvoiceReconciliation(null).totalCount).toBe(0);
    expect(calculateInvoiceReconciliation(undefined).totalCount).toBe(0);
  });

  it('should return pending status when no items are checked', () => {
    const transactions = [
      { amount: 150.50, is_checked: 0 },
      { amount: 49.50, is_checked: false },
    ];
    const result = calculateInvoiceReconciliation(transactions);
    expect(result.totalAmount).toBe(200);
    expect(result.checkedAmount).toBe(0);
    expect(result.pendingAmount).toBe(200);
    expect(result.totalCount).toBe(2);
    expect(result.checkedCount).toBe(0);
    expect(result.pendingCount).toBe(2);
    expect(result.percentage).toBe(0);
    expect(result.status).toBe('pending');
  });

  it('should calculate partial progress and in_progress status correctly', () => {
    const transactions = [
      { amount: 100, is_checked: 1 },
      { amount: 100, is_checked: 0 },
      { amount: 100, is_checked: 0 },
      { amount: 100, is_checked: 0 },
    ];
    const result = calculateInvoiceReconciliation(transactions);
    expect(result.totalAmount).toBe(400);
    expect(result.checkedAmount).toBe(100);
    expect(result.pendingAmount).toBe(300);
    expect(result.totalCount).toBe(4);
    expect(result.checkedCount).toBe(1);
    expect(result.pendingCount).toBe(3);
    expect(result.percentage).toBe(25);
    expect(result.status).toBe('in_progress');
  });

  it('should calculate completed status and 100% when all items are checked', () => {
    const transactions = [
      { amount: '129.90', is_checked: 1 },
      { amount: '70.10', is_checked: true },
    ];
    const result = calculateInvoiceReconciliation(transactions);
    expect(result.totalAmount).toBe(200);
    expect(result.checkedAmount).toBe(200);
    expect(result.pendingAmount).toBe(0);
    expect(result.totalCount).toBe(2);
    expect(result.checkedCount).toBe(2);
    expect(result.pendingCount).toBe(0);
    expect(result.percentage).toBe(100);
    expect(result.status).toBe('completed');
  });

  it('should preserve floating-point accuracy without weird decimals', () => {
    const transactions = [
      { amount: 19.99, is_checked: 1 },
      { amount: 10.01, is_checked: 1 },
      { amount: 33.33, is_checked: 0 },
    ];
    const result = calculateInvoiceReconciliation(transactions);
    expect(result.totalAmount).toBe(63.33);
    expect(result.checkedAmount).toBe(30.00);
    expect(result.pendingAmount).toBe(33.33);
  });
});

describe('Credit Cards Service - Effective Closing Day', () => {
  it('should use fixed card closing day when custom is not provided or null', () => {
    expect(getEffectiveClosingDay(3, null)).toBe(3);
    expect(getEffectiveClosingDay(3, undefined)).toBe(3);
    expect(getEffectiveClosingDay(3, '')).toBe(3);
  });

  it('should override with custom closing day when valid integer', () => {
    expect(getEffectiveClosingDay(3, 5)).toBe(5);
    expect(getEffectiveClosingDay(3, '5')).toBe(5);
    expect(getEffectiveClosingDay(25, 28)).toBe(28);
  });

  it('should ignore invalid custom closing day (< 1 or > 31)', () => {
    expect(getEffectiveClosingDay(3, 0)).toBe(3);
    expect(getEffectiveClosingDay(3, 32)).toBe(3);
    expect(getEffectiveClosingDay(3, -5)).toBe(3);
    expect(getEffectiveClosingDay(3, 'invalid')).toBe(3);
  });
});

describe('Credit Cards Service - Transaction Invoice Month Calculation', () => {
  const standardCard = { due_day: 10, closing_day: 3 }; // fecha dia 3, vence dia 10
  const monthBoundaryCard = { due_day: 5, closing_day: 25 }; // fecha dia 25, vence dia 5 do mês seguinte

  it('should assign purchase to current month if before fixed closing day (due > closing)', () => {
    // 2 de abril está antes do fechamento (3 de abril) -> fatura 2026-04
    expect(calculateTransactionInvoiceMonth('2026-04-02', standardCard)).toBe('2026-04');
  });

  it('should assign purchase to next month if on or after fixed closing day (due > closing)', () => {
    // 3 de abril é o fechamento -> já entra na fatura 2026-05
    expect(calculateTransactionInvoiceMonth('2026-04-03', standardCard)).toBe('2026-05');
    expect(calculateTransactionInvoiceMonth('2026-04-20', standardCard)).toBe('2026-05');
  });

  it('should respect custom overridden closing day for the specific month (due > closing)', () => {
    // Corte padrão é dia 3. Mas em abril/2026 foi alterado para dia 5 (por ter fim de semana ou mês curto/longo):
    const customMap = { '2026-04': 5 };

    // Compra no dia 4 de abril: normalmente iria para 2026-05, mas com o corte no dia 5, fica em 2026-04!
    expect(calculateTransactionInvoiceMonth('2026-04-04', standardCard, customMap)).toBe('2026-04');

    // Compra no dia 5 de abril: já fechou no dia 5 -> vai para 2026-05
    expect(calculateTransactionInvoiceMonth('2026-04-05', standardCard, customMap)).toBe('2026-05');
  });

  it('should allow overriding closing day to an earlier day (due > closing)', () => {
    // Corte padrão é dia 3. Mas em abril foi antecipado para dia 1:
    const customMap = { '2026-04': 1 };

    // Compra no dia 2 de abril: normalmente ficaria em 2026-04, mas fechou dia 1 -> vai para 2026-05
    expect(calculateTransactionInvoiceMonth('2026-04-02', standardCard, customMap)).toBe('2026-05');
  });

  it('should assign purchase correctly when due <= closing (due: 5, closing: 25)', () => {
    // Compra em 20 de abril: antes de 25/04 -> fatura que vence em 05/05 (2026-05)
    expect(calculateTransactionInvoiceMonth('2026-04-20', monthBoundaryCard)).toBe('2026-05');

    // Compra em 25 de abril: no dia do corte -> fatura que vence em 05/06 (2026-06)
    expect(calculateTransactionInvoiceMonth('2026-04-25', monthBoundaryCard)).toBe('2026-06');
  });

  it('should respect custom overridden closing day when due <= closing', () => {
    // Fatura 2026-05 (vence 05/05) fecha normalmente em 25/04.
    // Se o corte de 2026-05 for alterado para dia 28:
    const customMap = { '2026-05': 28 };

    // Compra em 26 de abril: com corte no dia 28, continua na fatura 2026-05!
    expect(calculateTransactionInvoiceMonth('2026-04-26', monthBoundaryCard, customMap)).toBe('2026-05');

    // Compra em 28 de abril: dia 28 fechou -> vai para 2026-06
    expect(calculateTransactionInvoiceMonth('2026-04-28', monthBoundaryCard, customMap)).toBe('2026-06');
  });

  it('should calculate installment invoice months correctly across consecutive months', () => {
    const customMap = { '2026-04': 5 };
    // Compra em 04/04 em 3x com corte customizado no dia 5:
    // 1ª parcela em 2026-04, 2ª em 2026-05, 3ª em 2026-06
    const months = calculateInstallmentInvoiceMonths('2026-04-04', 3, standardCard, customMap);
    expect(months).toEqual(['2026-04', '2026-05', '2026-06']);
  });

  it('should handle installments crossing year-end boundary', () => {
    // Compra em 15/11 em 3x (após corte dia 3 -> 1ª parcela em 2026-12)
    const months = calculateInstallmentInvoiceMonths('2026-11-15', 3, standardCard);
    expect(months).toEqual(['2026-12', '2027-01', '2027-02']);
  });
});
