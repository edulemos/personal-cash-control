import { describe, it, expect } from 'vitest';
import { calculateDashboardStats } from '../../src/main/services/transactions.service';

describe('Transactions Service', () => {
  describe('calculateDashboardStats', () => {
    it('should return zeros for empty array', () => {
      const result = calculateDashboardStats([]);
      expect(result).toEqual({ income: 0, expense: 0, balance: 0 });
    });

    it('should handle undefined or null input gracefully', () => {
      expect(calculateDashboardStats(null)).toEqual({ income: 0, expense: 0, balance: 0 });
      expect(calculateDashboardStats(undefined)).toEqual({ income: 0, expense: 0, balance: 0 });
    });

    it('should calculate correct totals with basic income and expenses', () => {
      const transactions = [
        { type: 'income', amount: 1500 },
        { type: 'expense', amount: 500 },
        { type: 'expense', amount: 300 },
      ];
      const result = calculateDashboardStats(transactions);
      expect(result).toEqual({
        income: 1500,
        expense: 800,
        balance: 700
      });
    });

    it('should handle decimal values without losing precision due to simple float issues', () => {
      const transactions = [
        { type: 'income', amount: 100.55 },
        { type: 'expense', amount: 50.11 },
      ];
      const result = calculateDashboardStats(transactions);
      expect(result.income).toBeCloseTo(100.55);
      expect(result.expense).toBeCloseTo(50.11);
      expect(result.balance).toBeCloseTo(50.44);
    });

    it('should handle negative amount edge cases (though unlikely in UI)', () => {
      const transactions = [
        { type: 'income', amount: -500 }, // Negative income is basically an expense mathematically
        { type: 'expense', amount: -100 }, // Negative expense is basically income mathematically
      ];
      const result = calculateDashboardStats(transactions);
      expect(result.income).toBe(-500);
      expect(result.expense).toBe(-100);
      expect(result.balance).toBe(-400); // -500 - (-100)
    });
    
    it('should safely parse string numbers', () => {
      const transactions = [
        { type: 'income', amount: "1000.50" },
        { type: 'expense', amount: "200.25" },
      ];
      const result = calculateDashboardStats(transactions);
      expect(result.income).toBe(1000.50);
      expect(result.expense).toBe(200.25);
      expect(result.balance).toBe(800.25);
    });
  });
});
