import { describe, it, expect } from 'vitest';
import { ClientsPaginationParams } from '@/app/actions/clients';
import { SalesPaginationParams } from '@/app/actions/sales';
import { InstallmentsPaginationParams } from '@/app/actions/installments';

describe('Pagination Unit Tests', () => {
  describe('Page count and bounds calculation', () => {
    it('calculates totalPages correctly when items divide evenly', () => {
      const totalItems = 36;
      const pageSize = 12;
      const totalPages = Math.ceil(totalItems / pageSize);
      expect(totalPages).toBe(3);
    });

    it('calculates totalPages correctly when items do not divide evenly', () => {
      const totalItems = 37;
      const pageSize = 12;
      const totalPages = Math.ceil(totalItems / pageSize);
      expect(totalPages).toBe(4);
    });

    it('returns 1 page when totalItems is zero or lower than pageSize', () => {
      expect(Math.ceil(0 / 12) || 1).toBe(1);
      expect(Math.ceil(5 / 12) || 1).toBe(1);
    });

    it('computes correct slice boundaries for each page', () => {
      const items = Array.from({ length: 25 }, (_, i) => `item_${i + 1}`);
      const pageSize = 10;

      // Page 1: items 1..10
      const page1 = items.slice((1 - 1) * pageSize, 1 * pageSize);
      expect(page1).toHaveLength(10);
      expect(page1[0]).toBe('item_1');
      expect(page1[9]).toBe('item_10');

      // Page 2: items 11..20
      const page2 = items.slice((2 - 1) * pageSize, 2 * pageSize);
      expect(page2).toHaveLength(10);
      expect(page2[0]).toBe('item_11');
      expect(page2[9]).toBe('item_20');

      // Page 3: items 21..25
      const page3 = items.slice((3 - 1) * pageSize, 3 * pageSize);
      expect(page3).toHaveLength(5);
      expect(page3[0]).toBe('item_21');
      expect(page3[4]).toBe('item_25');
    });

    it('clamps or returns empty slice when page is out of bounds', () => {
      const items = ['a', 'b', 'c'];
      const pageSize = 10;
      const page99 = items.slice((99 - 1) * pageSize, 99 * pageSize);
      expect(page99).toHaveLength(0);
    });
  });

  describe('Pagination params contracts', () => {
    it('accepts valid ClientsPaginationParams', () => {
      const params: ClientsPaginationParams = {
        page: 2,
        pageSize: 12,
        search: 'Carol',
      };
      expect(params.page).toBe(2);
      expect(params.pageSize).toBe(12);
      expect(params.search).toBe('Carol');
    });

    it('accepts valid SalesPaginationParams with paymentMethod and search', () => {
      const params: SalesPaginationParams = {
        page: 1,
        pageSize: 12,
        search: 'brinco',
        paymentMethod: 'pix',
      };
      expect(params.paymentMethod).toBe('pix');
      expect(params.search).toBe('brinco');
    });

    it('accepts valid InstallmentsPaginationParams with status and clientId', () => {
      const params: InstallmentsPaginationParams = {
        page: 1,
        pageSize: 12,
        status: 'pending',
        clientId: 'client-123',
      };
      expect(params.status).toBe('pending');
      expect(params.clientId).toBe('client-123');
    });
  });

  describe('Page indicator formatting', () => {
    it('formats showing item range accurately', () => {
      const totalItems = 25;
      const pageSize = 10;

      // Page 1: 1 a 10 de 25
      const startP1 = (1 - 1) * pageSize + 1;
      const endP1 = Math.min(1 * pageSize, totalItems);
      expect(startP1).toBe(1);
      expect(endP1).toBe(10);

      // Page 3: 21 a 25 de 25
      const startP3 = (3 - 1) * pageSize + 1;
      const endP3 = Math.min(3 * pageSize, totalItems);
      expect(startP3).toBe(21);
      expect(endP3).toBe(25);
    });
  });
});
