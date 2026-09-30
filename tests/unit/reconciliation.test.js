import { describe, it, expect } from 'vitest';
import reconciliationService, {
  normalizeText,
  isSimilarDescription,
  daysDifference,
  matchCreditCardTransactions
} from '../../src/main/services/reconciliation.service';

describe('Reconciliation Service - Matching Helpers', () => {
  describe('normalizeText', () => {
    it('should convert uppercase to lowercase and remove accents', () => {
      expect(normalizeText('PÃO DE AÇÚCAR LTDA')).toBe('pao de acucar ltda');
      expect(normalizeText('Farmácia & Drogaria São Paulo!')).toBe('farmacia drogaria sao paulo');
    });

    it('should handle empty or null values gracefully', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('isSimilarDescription', () => {
    it('should detect identical or contained descriptions', () => {
      expect(isSimilarDescription('Supermercado Extra', 'Supermercado Extra')).toBe(true);
      expect(isSimilarDescription('PAGAMENTO IFOOD *IFOOD', 'IFOOD')).toBe(true);
      expect(isSimilarDescription('UBER *TRIP BR', 'UBER BR')).toBe(true);
    });

    it('should reject completely different descriptions', () => {
      expect(isSimilarDescription('Posto Petrobras', 'Farmacia Raia')).toBe(false);
      expect(isSimilarDescription('Netflix', 'Spotify')).toBe(false);
    });
  });

  describe('daysDifference', () => {
    it('should calculate correct difference between dates', () => {
      expect(daysDifference('2026-03-10', '2026-03-10')).toBe(0);
      expect(daysDifference('2026-03-10', '2026-03-12')).toBe(2);
      expect(daysDifference('2026-03-15', '2026-03-10')).toBe(5);
    });
  });

  describe('matchCreditCardTransactions - Negative amounts & refunds', () => {
    it('should detect refund/reducao as negative amount and flag existing positive transaction as divergent', () => {
      const extractedRecords = [
        {
          date: '2026-09-10',
          description: 'Redução Mensalidade',
          amount: 31.00, // Extracted as positive by mistake or income
          type: 'income'
        }
      ];

      const existingTxs = [
        {
          id: 308,
          date: '2026-09-10',
          description: 'Redução Mensalidade',
          amount: 31.00 // Previously saved as positive in db
        }
      ];

      const items = matchCreditCardTransactions(extractedRecords, existingTxs);
      const divergentItem = items.find(i => i.status === 'divergent');
      expect(divergentItem).toBeDefined();
      expect(divergentItem.amount).toBe(-31.00);
      expect(divergentItem.action).toBe('update');
      expect(divergentItem.existingId).toBe(308);
    });

    it('should match negative refund when both extracted and existing are negative', () => {
      const extractedRecords = [
        {
          date: '2026-09-15',
          description: 'Estorno Compra Online',
          amount: -50.00,
          type: 'income'
        }
      ];

      const existingTxs = [
        {
          id: 400,
          date: '2026-09-15',
          description: 'Estorno Compra Online',
          amount: -50.00
        }
      ];

      const items = matchCreditCardTransactions(extractedRecords, existingTxs);
      const matchedItem = items.find(i => i.status === 'matched');
      expect(matchedItem).toBeDefined();
      expect(matchedItem.amount).toBe(-50.00);
      expect(matchedItem.action).toBe('none');
    });
  });
});

