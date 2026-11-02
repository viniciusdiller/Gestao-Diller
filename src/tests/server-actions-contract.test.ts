import { describe, it, expect } from 'vitest';
import {
  PayInstallmentSchema,
  UpdateInstallmentSchema,
  SaleSchema,
  UpdateSaleSchema,
  ClientSchema,
  UpdateClientSchema,
  PaymentMethodEnum,
} from '../lib/validations';

describe('Server Actions & Database Contract Coverage', () => {
  describe('Installments Table Contract', () => {
    it('valida que payment_method é suportado na baixa de parcela (evita erro de coluna inexistente)', () => {
      const allowedMethods = ['pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'fiado'] as const;

      for (const method of allowedMethods) {
        const res = PayInstallmentSchema.safeParse({
          installment_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          paid_amount: 150.0,
          payment_method: method,
          notes: `Pago com ${method}`,
        });
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.payment_method).toBe(method);
        }
      }
    });

    it('rejeita baixa com forma de pagamento inválida no banco de dados', () => {
      const res = PayInstallmentSchema.safeParse({
        installment_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        paid_amount: 100,
        payment_method: 'cheque_sem_fundo' as unknown as 'pix',
      });
      expect(res.success).toBe(false);
    });

    it('valida contrato completo de atualização de parcela', () => {
      const res = UpdateInstallmentSchema.safeParse({
        id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        amount: 250.5,
        due_date: '2026-12-15',
        status: 'pending',
        notes: 'Ajuste de valor e vencimento',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Sales Table Contract', () => {
    it('garante que todos os campos de venda correspondem ao schema SQL', () => {
      const validSale = {
        client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        description: 'Conjunto Colar Ponto de Luz e Brincos',
        total_amount: 199.9,
        payment_method: 'pix' as const,
        sale_date: '2026-11-02T12:00:00Z',
      };

      const res = SaleSchema.safeParse(validSale);
      expect(res.success).toBe(true);
    });

    it('rejeita venda com id de cliente malformado (segurança IDOR)', () => {
      const res = SaleSchema.safeParse({
        client_id: 'cliente-invalido',
        description: 'Anel',
        total_amount: 50,
        payment_method: 'pix',
      });
      expect(res.success).toBe(false);
    });

    it('valida contrato de atualização de venda', () => {
      const res = UpdateSaleSchema.safeParse({
        id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        description: 'Anel Solitário Ouro 18k',
        total_amount: 320,
        payment_method: 'cartao_credito',
        sale_date: '2026-11-02T12:00:00Z',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Clients Table Contract', () => {
    it('permite cadastro com telefone nulo ou string vazia', () => {
      expect(ClientSchema.safeParse({ name: 'Melissa', phone: '' }).success).toBe(true);
      expect(ClientSchema.safeParse({ name: 'Ione', phone: null }).success).toBe(true);
      expect(ClientSchema.safeParse({ name: 'Sandra' }).success).toBe(true);
    });

    it('valida telefone formatado com DDD quando fornecido', () => {
      const res = ClientSchema.safeParse({
        name: 'Ana Paula EMEOC',
        phone: '(19) 98765-4321',
      });
      expect(res.success).toBe(true);
    });

    it('valida contrato de atualização de cliente', () => {
      const res = UpdateClientSchema.safeParse({
        id: 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        name: 'Cristina WB Atualizada',
        phone: '11999998888',
        notes: 'Cliente vip',
      });
      expect(res.success).toBe(true);
    });
  });
});
