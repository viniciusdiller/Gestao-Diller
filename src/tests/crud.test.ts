import { describe, it, expect } from 'vitest';
import {
  ClientSchema,
  UpdateClientSchema,
  SaleSchema,
  UpdateSaleSchema,
  PayInstallmentSchema,
  UpdateInstallmentSchema,
} from '../lib/validations';

describe('CRUD Validation & IDOR Boundaries', () => {
  describe('Client Management (Create & Update)', () => {
    it('permite cadastro de cliente com telefone nulo ou vazio', () => {
      const res1 = ClientSchema.safeParse({ name: 'Denise OE WL', phone: '' });
      expect(res1.success).toBe(true);

      const res2 = ClientSchema.safeParse({ name: 'Melissa', phone: null });
      expect(res2.success).toBe(true);
    });

    it('permite cadastro de cliente com telefone preenchido e sanitizado', () => {
      const res = ClientSchema.safeParse({
        name: 'Andréa WL',
        phone: '(19) 98765-4321',
        notes: '160,00 (14/09) + 146,00 (19/10) = 306,00',
      });
      expect(res.success).toBe(true);
    });

    it('bloqueia atualização sem ID válido (prevenção de IDOR e payload malformado)', () => {
      const res = UpdateClientSchema.safeParse({
        id: '123-fake-id',
        name: 'Teste',
      });
      expect(res.success).toBe(false);
    });

    it('permite atualização completa de cliente com UUID válido', () => {
      const res = UpdateClientSchema.safeParse({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Iris Atualizada',
        phone: '(11) 91234-5678',
        notes: 'Crédito quitado',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Sale Management (Create & Update)', () => {
    it('valida payload estrito ao atualizar venda', () => {
      const res = UpdateSaleSchema.safeParse({
        id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        description: 'Conjunto Colar e Brinco Esmeralda Ouro 18k',
        total_amount: 450,
        payment_method: 'fiado',
        sale_date: '2026-10-15',
      });
      expect(res.success).toBe(true);
    });

    it('rejeita atualização de venda com valor zerado ou negativo', () => {
      const res = UpdateSaleSchema.safeParse({
        id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        description: 'Conjunto',
        total_amount: -50,
        payment_method: 'pix',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('Installment Management (Update & Revert)', () => {
    it('valida atualização de vencimento e valor da parcela', () => {
      const res = UpdateInstallmentSchema.safeParse({
        id: 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        amount: 153,
        due_date: '2026-12-10',
        status: 'pending',
        notes: 'Prorrogado a pedido da cliente',
      });
      expect(res.success).toBe(true);
    });

    it('rejeita formato de data inválido na parcela', () => {
      const res = UpdateInstallmentSchema.safeParse({
        id: 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        amount: 100,
        due_date: '10/12/2026', // Formato errado (deve ser YYYY-MM-DD)
      });
      expect(res.success).toBe(false);
    });
  });
});
