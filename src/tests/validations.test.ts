import { describe, it, expect } from 'vitest';
import {
  ClientSchema,
  UpdateClientSchema,
  SaleSchema,
  UpdateSaleSchema,
  PayInstallmentSchema,
  UpdateInstallmentSchema,
} from '../lib/validations';

describe('Zod Validation Schemas (Zero-Trust Boundaries)', () => {
  describe('ClientSchema', () => {
    it('aprova cliente com nome e telefone válidos', () => {
      const result = ClientSchema.safeParse({
        name: 'Renata Diller',
        phone: '(11) 98765-4321',
        notes: 'Cliente vip',
      });
      expect(result.success).toBe(true);
    });

    it('aprova cliente SEM telefone (telefone opcional)', () => {
      const resEmpty = ClientSchema.safeParse({
        name: 'Marcela WB',
        phone: '',
      });
      expect(resEmpty.success).toBe(true);

      const resNull = ClientSchema.safeParse({
        name: 'Gilmara',
        phone: null,
      });
      expect(resNull.success).toBe(true);

      const resUndefined = ClientSchema.safeParse({
        name: 'Valéria Alice',
      });
      expect(resUndefined.success).toBe(true);
    });

    it('rejeita nome vazio ou menor que 2 caracteres', () => {
      const result = ClientSchema.safeParse({
        name: ' ',
        phone: '11987654321',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita telefone inválido se preenchido com menos de 10 dígitos numéricos', () => {
      const result = ClientSchema.safeParse({
        name: 'Flavia',
        phone: '12345',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateClientSchema', () => {
    it('aprova atualização de cliente com UUID válido e campos opcionais', () => {
      const result = UpdateClientSchema.safeParse({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Marcela WB Alterada',
        phone: null,
        notes: 'Nova nota de compras',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita atualização sem UUID válido', () => {
      const result = UpdateClientSchema.safeParse({
        id: 'invalido',
        name: 'Marcela',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SaleSchema & UpdateSaleSchema', () => {
    it('aprova venda válida com meio de pagamento permitido', () => {
      const result = SaleSchema.safeParse({
        client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        description: 'Conjunto Colar e Brinco Esmeralda',
        total_amount: 320.5,
        payment_method: 'fiado',
        installments: [
          {
            installment_number: 1,
            total_installments: 2,
            amount: 160.25,
            due_date: '2026-11-20',
          },
          {
            installment_number: 2,
            total_installments: 2,
            amount: 160.25,
            due_date: '2026-12-20',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejeita valor total negativo ou zero', () => {
      const result = SaleSchema.safeParse({
        client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        description: 'Pulseira',
        total_amount: 0,
        payment_method: 'pix',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita método de pagamento desconhecido', () => {
      const result = SaleSchema.safeParse({
        client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        description: 'Pulseira',
        total_amount: 100,
        payment_method: 'bitcoin',
      });
      expect(result.success).toBe(false);
    });

    it('aprova UpdateSaleSchema com campos válidos', () => {
      const result = UpdateSaleSchema.safeParse({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        description: 'Conjunto Colar Alterado',
        total_amount: 350.0,
        payment_method: 'pix',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('PayInstallmentSchema & UpdateInstallmentSchema', () => {
    it('aprova baixa com valor positivo e UUID válido', () => {
      const result = PayInstallmentSchema.safeParse({
        installment_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        paid_amount: 150,
        payment_method: 'pix',
      });
      expect(result.success).toBe(true);
    });

    it('rejeita UUID inválido na baixa', () => {
      const result = PayInstallmentSchema.safeParse({
        installment_id: 'nao-e-uuid',
        paid_amount: 150,
      });
      expect(result.success).toBe(false);
    });

    it('aprova UpdateInstallmentSchema com valores e data válidos', () => {
      const result = UpdateInstallmentSchema.safeParse({
        id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        amount: 200,
        due_date: '2026-12-15',
        status: 'pending',
        notes: 'Ajuste de data combinado via WhatsApp',
      });
      expect(result.success).toBe(true);
    });
  });
});
