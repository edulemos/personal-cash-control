import { describe, it, expect } from 'vitest';
import { calculateInvoiceReconciliation, calculateInstallments } from '../../src/main/services/creditCards.service';

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
