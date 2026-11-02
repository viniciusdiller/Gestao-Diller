import { describe, it, expect } from 'vitest';
import {
  ClientSchema,
  SaleSchema,
  PayInstallmentSchema,
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

    it('rejeita nome vazio ou menor que 2 caracteres', () => {
      const result = ClientSchema.safeParse({
        name: ' ',
        phone: '11987654321',
      });
      expect(result.success).toBe(false);
    });

    it('rejeita telefone inválido com menos de 10 dígitos numéricos', () => {
      const result = ClientSchema.safeParse({
        name: 'Flavia',
        phone: '12345',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SaleSchema', () => {
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
  });

  describe('PayInstallmentSchema', () => {
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
  });
});
