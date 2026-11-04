import { describe, it, expect } from 'vitest';
import {
  calculateSaleItemsTotal,
  calculateSettlement,
  distributeFIFOAbatement,
  roundToCents,
} from '@/lib/services/caderneta-calculator';
import { SaleSchema, ClientAbatementSchema } from '@/lib/validations';

describe('Caderneta de Fiado & Motor de Conta Corrente', () => {
  describe('calculateSaleItemsTotal (Somatório de Itens)', () => {
    it('calcula corretamente o total de múltiplos itens com quantidades variadas', () => {
      const items = [
        { name: '1 anel dourado', quantity: 1, unit_price: 20 },
        { name: 'Uma pulseira prata', quantity: 1, unit_price: 40 },
        { name: '2 brincos', quantity: 2, unit_price: 35 },
      ];
      // 1x20 + 1x40 + 2x35 = 20 + 40 + 70 = 130
      const total = calculateSaleItemsTotal(items);
      expect(total).toBe(130);
    });

    it('mantém a precisão exata de centavos ao somar itens fracionados', () => {
      const items = [
        { name: 'Brinco Ponto de Luz', quantity: 3, unit_price: 33.33 },
        { name: 'Pingente Mini', quantity: 1, unit_price: 19.99 },
      ];
      // 3 * 33.33 = 99.99 + 19.99 = 119.98
      const total = calculateSaleItemsTotal(items);
      expect(total).toBe(119.98);
    });

    it('retorna 0 para lista de itens vazia', () => {
      expect(calculateSaleItemsTotal([])).toBe(0);
    });
  });

  describe('calculateSettlement (Cenários Reais de Saldo Devedor e Abatimento)', () => {
    it('Cenário exato do usuário: deve 20, compra 40, paga 60 -> zera tudo (saldo 0)', () => {
      const result = calculateSettlement({
        previousDebt: 20,
        saleTotal: 40,
        paidAmountNow: 60,
      });

      expect(result.totalDueWithSale).toBe(60);
      expect(result.newSaleRemaining).toBe(0);
      expect(result.surplusForPreviousDebt).toBe(20);
      expect(result.amountAbatedFromPrevious).toBe(20);
      expect(result.finalOutstandingBalance).toBe(0);
      expect(result.isFullySettled).toBe(true);
    });

    it('Cenário parcial superior: deve 20, compra 40, paga 50 -> abate 10 da dívida anterior, resta 10', () => {
      const result = calculateSettlement({
        previousDebt: 20,
        saleTotal: 40,
        paidAmountNow: 50,
      });

      expect(result.totalDueWithSale).toBe(60);
      expect(result.newSaleRemaining).toBe(0);
      expect(result.surplusForPreviousDebt).toBe(10);
      expect(result.amountAbatedFromPrevious).toBe(10);
      expect(result.finalOutstandingBalance).toBe(10);
      expect(result.isFullySettled).toBe(false);
    });

    it('Cenário de pagamento exato do pedido: deve 20, compra 40, paga 40 -> quita pedido, continua devendo 20', () => {
      const result = calculateSettlement({
        previousDebt: 20,
        saleTotal: 40,
        paidAmountNow: 40,
      });

      expect(result.totalDueWithSale).toBe(60);
      expect(result.newSaleRemaining).toBe(0);
      expect(result.surplusForPreviousDebt).toBe(0);
      expect(result.amountAbatedFromPrevious).toBe(0);
      expect(result.finalOutstandingBalance).toBe(20);
      expect(result.isFullySettled).toBe(false);
    });

    it('Cenário parcial inferior: deve 20, compra 40, paga 15 na hora -> resta dever 45 no total', () => {
      const result = calculateSettlement({
        previousDebt: 20,
        saleTotal: 40,
        paidAmountNow: 15,
      });

      expect(result.totalDueWithSale).toBe(60);
      expect(result.newSalePaid).toBe(15);
      expect(result.newSaleRemaining).toBe(25);
      expect(result.finalOutstandingBalance).toBe(45);
      expect(result.isFullySettled).toBe(false);
    });

    it('Cenário fiado total: deve 20, compra 40, paga 0 -> acumula dívida para 60', () => {
      const result = calculateSettlement({
        previousDebt: 20,
        saleTotal: 40,
        paidAmountNow: 0,
      });

      expect(result.totalDueWithSale).toBe(60);
      expect(result.newSalePaid).toBe(0);
      expect(result.newSaleRemaining).toBe(40);
      expect(result.finalOutstandingBalance).toBe(60);
      expect(result.isFullySettled).toBe(false);
    });

    it('Cenário de cliente sem dívida anterior: deve 0, compra 50, paga 20 -> resta 30', () => {
      const result = calculateSettlement({
        previousDebt: 0,
        saleTotal: 50,
        paidAmountNow: 20,
      });

      expect(result.totalDueWithSale).toBe(50);
      expect(result.newSaleRemaining).toBe(30);
      expect(result.finalOutstandingBalance).toBe(30);
    });

    it('Cenário exato do usuário com saldo extra: deve 100, paga 150 -> quita e fica com 50 de crédito', () => {
      const result = calculateSettlement({
        previousDebt: 100,
        saleTotal: 0,
        paidAmountNow: 150,
      });

      expect(result.totalDueWithSale).toBe(100);
      expect(result.amountAbatedFromPrevious).toBe(100);
      expect(result.finalOutstandingBalance).toBe(0);
      expect(result.surplusCreditGenerated).toBe(50);
      expect(result.finalCreditBalance).toBe(50);
      expect(result.isFullySettled).toBe(true);
    });

    it('Cenário de compra utilizando saldo extra: tem 50 de crédito, compra 120 -> desconta 50 e restam 70', () => {
      const result = calculateSettlement({
        previousDebt: 0,
        saleTotal: 120,
        paidAmountNow: 0,
        availableCredit: 50,
        applyCredit: true,
      });

      expect(result.creditApplied).toBe(50);
      expect(result.effectiveSaleTotal).toBe(70);
      expect(result.newSaleRemaining).toBe(70);
      expect(result.finalOutstandingBalance).toBe(70);
      expect(result.finalCreditBalance).toBe(0);
    });

    it('Cenário onde compra é menor que o saldo extra: tem 50 de crédito, compra 30 -> quita tudo e sobram 20', () => {
      const result = calculateSettlement({
        previousDebt: 0,
        saleTotal: 30,
        paidAmountNow: 0,
        availableCredit: 50,
        applyCredit: true,
      });

      expect(result.creditApplied).toBe(30);
      expect(result.effectiveSaleTotal).toBe(0);
      expect(result.newSaleRemaining).toBe(0);
      expect(result.finalOutstandingBalance).toBe(0);
      expect(result.finalCreditBalance).toBe(20);
      expect(result.isFullySettled).toBe(true);
    });

    it('Cenário com escolha de guardar crédito: tem 50, compra 100 com applyCredit false -> mantém os 50', () => {
      const result = calculateSettlement({
        previousDebt: 0,
        saleTotal: 100,
        paidAmountNow: 40,
        availableCredit: 50,
        applyCredit: false,
      });

      expect(result.creditApplied).toBe(0);
      expect(result.effectiveSaleTotal).toBe(100);
      expect(result.newSalePaid).toBe(40);
      expect(result.newSaleRemaining).toBe(60);
      expect(result.finalCreditBalance).toBe(50);
    });
  });

  describe('distributeFIFOAbatement (Liquidação de Dívidas Antigas)', () => {
    it('quita integralmente a dívida mais antiga e amortiza parcialmente a seguinte', () => {
      const pendingDebts = [
        { id: 'deb-1', amount: 30, due_date: '2026-10-01' },
        { id: 'deb-2', amount: 50, due_date: '2026-10-15' },
      ];

      // Cliente paga R$ 50 de abatimento: R$ 30 quita deb-1, R$ 20 abate de deb-2 (restam R$ 30)
      const plan = distributeFIFOAbatement(pendingDebts, 50);

      expect(plan.operations).toHaveLength(2);
      expect(plan.operations[0]).toEqual({
        installmentId: 'deb-1',
        action: 'full',
        originalAmount: 30,
        amountPaid: 30,
        newRemainingAmount: 0,
      });
      expect(plan.operations[1]).toEqual({
        installmentId: 'deb-2',
        action: 'partial',
        originalAmount: 50,
        amountPaid: 20,
        newRemainingAmount: 30,
      });
      expect(plan.totalAbated).toBe(50);
      expect(plan.newTotalDebt).toBe(30);
      expect(plan.remainingCashUnused).toBe(0);
    });

    it('suporta quitação completa de todos os débitos com sobra de troco', () => {
      const pendingDebts = [
        { id: 'deb-1', amount: 20 },
        { id: 'deb-2', amount: 15 },
      ];

      const plan = distributeFIFOAbatement(pendingDebts, 40);

      expect(plan.operations).toHaveLength(2);
      expect(plan.operations[0].action).toBe('full');
      expect(plan.operations[1].action).toBe('full');
      expect(plan.totalAbated).toBe(35);
      expect(plan.newTotalDebt).toBe(0);
      expect(plan.remainingCashUnused).toBe(5);
    });
  });

  describe('Validações Zod (Zero-Trust Boundaries)', () => {
    it('valida venda com array de múltiplos itens e valor pago na hora', () => {
      const validSale = {
        client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        items: [
          { name: 'Anel Ouro', quantity: 1, unit_price: 20 },
          { name: 'Pulseira Prata', quantity: 1, unit_price: 40 },
        ],
        total_amount: 60,
        paid_amount_now: 60,
        payment_method: 'pix',
      };

      const parsed = SaleSchema.safeParse(validSale);
      expect(parsed.success).toBe(true);
    });

    it('valida schema de abatimento de cliente avulso', () => {
      const validAbatement = {
        client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount: 25.5,
        payment_method: 'dinheiro',
        notes: 'Pagou 25 reais em notas',
      };

      const parsed = ClientAbatementSchema.safeParse(validAbatement);
      expect(parsed.success).toBe(true);
    });

    it('rejeita abatimento com valor zero ou negativo', () => {
      const invalid = {
        client_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        amount: 0,
      };

      const parsed = ClientAbatementSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });
});
