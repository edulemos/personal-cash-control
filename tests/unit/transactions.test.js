import { describe, it, expect } from 'vitest';
import { calculateDashboardStats } from '../../src/main/services/transactions.service';

describe('Transactions Service', () => {
  describe('calculateDashboardStats', () => {
    it('should return zeros for empty array', () => {
      const result = calculateDashboardStats([]);
      expect(result).toEqual({
        depositRealized: 0,
        depositPending: 0,
        expensePaid: 0,
        expensePending: 0,
        balance: 0,
        netBalance: 0,
        income: 0
      });
    });

    it('should handle undefined or null input gracefully', () => {
      const expected = {
        depositRealized: 0,
        depositPending: 0,
        expensePaid: 0,
        expensePending: 0,
        balance: 0,
        netBalance: 0,
        income: 0
      };
      expect(calculateDashboardStats(null)).toEqual(expected);
      expect(calculateDashboardStats(undefined)).toEqual(expected);
    });

    it('should calculate correct totals with expenses and deposits', () => {
      const transactions = [
        { type: 'expense', amount: 500, is_paid: true },
        { type: 'expense', amount: 300, is_paid: false },
      ];
      const deposits = [
        { status: 'realized', amount: 1500 },
        { status: 'pending', amount: 200 },
      ];
      const result = calculateDashboardStats(transactions, deposits);
      expect(result.depositRealized).toBe(1500);
      expect(result.depositPending).toBe(200);
      expect(result.expensePaid).toBe(500);
      expect(result.expensePending).toBe(300);
      expect(result.balance).toBe(1000); // 1500 - 500
      expect(result.netBalance).toBe(900); // (1500 + 200) - (500 + 300)
    });

    it('should handle decimal values without losing precision due to simple float issues', () => {
      const transactions = [
        { type: 'expense', amount: 50.11, is_paid: true },
      ];
      const deposits = [
        { status: 'realized', amount: 100.55 },
      ];
      const result = calculateDashboardStats(transactions, deposits);
      expect(result.depositRealized).toBeCloseTo(100.55);
      expect(result.expensePaid).toBeCloseTo(50.11);
      expect(result.balance).toBeCloseTo(50.44);
    });

    it('should safely parse string numbers', () => {
      const transactions = [
        { type: 'expense', amount: "200.25", is_paid: true },
      ];
      const deposits = [
        { status: 'realized', amount: "1000.50" },
      ];
      const result = calculateDashboardStats(transactions, deposits);
      expect(result.depositRealized).toBe(1000.50);
      expect(result.expensePaid).toBe(200.25);
      expect(result.balance).toBe(800.25);
    });
  });
});
