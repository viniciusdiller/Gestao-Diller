import { describe, it, expect } from 'vitest';
import {
  PurchaseSchema,
  UpdatePurchaseSchema,
} from '@/lib/validations';
import {
  calculateDashboardMetrics,
  SaleRecord,
  InstallmentRecord,
  PurchaseRecord,
} from '@/lib/services/kpi-calculator';

describe('Compras de Fábrica (Purchases) - Validações e Regras de Negócio', () => {
  it('valida compra com dados válidos com sucesso', () => {
    const valid = {
      factory_name: 'Limeira Joias',
      total_amount: 1450.5,
      purchase_date: '2026-11-11',
      notes: 'Lote de anéis 18k e brincos ponto de luz',
    };

    const parsed = PurchaseSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.factory_name).toBe('Limeira Joias');
      expect(parsed.data.total_amount).toBe(1450.5);
      expect(parsed.data.purchase_date).toBe('2026-11-11');
      expect(parsed.data.notes).toBe('Lote de anéis 18k e brincos ponto de luz');
    }
  });

  it('rejeita compra com nome de fábrica vazio', () => {
    const invalid = {
      factory_name: '   ',
      total_amount: 500,
      purchase_date: '2026-11-11',
    };

    const parsed = PurchaseSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejeita compra com valor total zero ou negativo', () => {
    const zeroAmount = {
      factory_name: 'Fornecedor X',
      total_amount: 0,
      purchase_date: '2026-11-11',
    };
    expect(PurchaseSchema.safeParse(zeroAmount).success).toBe(false);

    const negativeAmount = {
      factory_name: 'Fornecedor X',
      total_amount: -150,
      purchase_date: '2026-11-11',
    };
    expect(PurchaseSchema.safeParse(negativeAmount).success).toBe(false);
  });

  it('rejeita compra com data em formato inválido', () => {
    const invalidDate = {
      factory_name: 'Amorelli',
      total_amount: 300,
      purchase_date: '11/11/2026', // não é AAAA-MM-DD
    };

    const parsed = PurchaseSchema.safeParse(invalidDate);
    expect(parsed.success).toBe(false);
  });

  it('valida UpdatePurchaseSchema exigindo ID UUID válido', () => {
    const validUpdate = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      factory_name: 'Zane Semijoias',
      total_amount: 820,
      purchase_date: '2026-11-05',
      notes: null,
    };

    expect(UpdatePurchaseSchema.safeParse(validUpdate).success).toBe(true);

    const invalidUuid = {
      ...validUpdate,
      id: 'id-invalido',
    };
    expect(UpdatePurchaseSchema.safeParse(invalidUuid).success).toBe(false);
  });
});

describe('Integração de Compras no Dashboard KPI Calculator', () => {
  const refDate = '2026-11-11T12:00:00.000Z';

  const mockSales: SaleRecord[] = [
    {
      id: 's1',
      client_id: 'c1',
      total_amount: 3000,
      payment_method: 'pix',
      status: 'completed',
      sale_date: '2026-11-05T10:00:00.000Z',
    },
    {
      id: 's2',
      client_id: 'c2',
      total_amount: 2000,
      payment_method: 'cartao_credito',
      status: 'completed',
      sale_date: '2026-11-10T14:00:00.000Z',
    },
  ];

  const mockInstallments: InstallmentRecord[] = [];

  it('calcula corretamente o total de compras do mês e o lucro líquido real', () => {
    const mockPurchases: PurchaseRecord[] = [
      {
        id: 'p1',
        factory_name: 'Limeira Joias',
        total_amount: 1500,
        purchase_date: '2026-11-02',
      },
      {
        id: 'p2',
        factory_name: 'Carol Freitas',
        total_amount: 800,
        purchase_date: '2026-11-08',
      },
      {
        id: 'p3',
        factory_name: 'Amorelli',
        total_amount: 1000,
        purchase_date: '2026-10-15', // mês anterior - deve ser ignorado no mês atual
      },
    ];

    const metrics = calculateDashboardMetrics(
      mockSales,
      mockInstallments,
      refDate,
      mockPurchases
    );

    // Vendas do mês: 3000 + 2000 = 5000
    expect(metrics.monthRevenue).toBe(5000);
    // Compras do mês: 1500 + 800 = 2300 (outubro ignorado)
    expect(metrics.monthPurchases).toBe(2300);
    // Lucro Líquido: 5000 - 2300 = 2700
    expect(metrics.netProfit).toBe(2700);
  });

  it('lida graciosamente com ausência de compras', () => {
    const metrics = calculateDashboardMetrics(mockSales, mockInstallments, refDate, []);

    expect(metrics.monthRevenue).toBe(5000);
    expect(metrics.monthPurchases).toBe(0);
    expect(metrics.netProfit).toBe(5000);
  });

  it('calcula lucro negativo quando as compras superam o faturamento do mês', () => {
    const heavyPurchases: PurchaseRecord[] = [
      {
        id: 'p1',
        factory_name: 'Atacado Maior',
        total_amount: 7500,
        purchase_date: '2026-11-03',
      },
    ];

    const metrics = calculateDashboardMetrics(
      mockSales,
      mockInstallments,
      refDate,
      heavyPurchases
    );

    // Vendas: 5000, Compras: 7500 => Lucro: -2500
    expect(metrics.monthRevenue).toBe(5000);
    expect(metrics.monthPurchases).toBe(7500);
    expect(metrics.netProfit).toBe(-2500);
  });
});
