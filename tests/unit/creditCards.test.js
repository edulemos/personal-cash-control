import { describe, it, expect } from 'vitest';
import { calculateInvoiceReconciliation } from '../../src/main/services/creditCards.service';

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
