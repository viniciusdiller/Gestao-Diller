import { describe, it, expect } from 'vitest';
import {
  calculateDashboardMetrics,
  SaleRecord,
  InstallmentRecord,
} from '../lib/services/kpi-calculator';

describe('Dashboard KPI Calculator', () => {
  const refDate = '2026-11-02T12:00:00.000Z';

  const mockSales: SaleRecord[] = [
    {
      id: '1',
      client_id: 'c1',
      client_name: 'Ana Silva',
      total_amount: 200,
      payment_method: 'pix',
      status: 'completed',
      sale_date: '2026-11-01T10:00:00.000Z',
    },
    {
      id: '2',
      client_id: 'c2',
      client_name: 'Mariana Lima',
      total_amount: 500,
      payment_method: 'fiado',
      status: 'completed',
      sale_date: '2026-11-02T09:00:00.000Z',
    },
    {
      id: '3',
      client_id: 'c1',
      client_name: 'Ana Silva',
      total_amount: 150,
      payment_method: 'cartao_credito',
      status: 'completed',
      sale_date: '2026-11-02T11:00:00.000Z',
    },
    {
      id: '4',
      client_id: 'c3',
      client_name: 'Bruna Rocha',
      total_amount: 300,
      payment_method: 'pix',
      status: 'cancelled', // deve ser ignorado
      sale_date: '2026-11-01T15:00:00.000Z',
    },
    {
      id: '5',
      client_id: 'c3',
      client_name: 'Bruna Rocha',
      total_amount: 400,
      payment_method: 'dinheiro',
      status: 'completed',
      sale_date: '2026-10-15T15:00:00.000Z', // mês anterior
    },
  ];

  const mockInstallments: InstallmentRecord[] = [
    {
      id: 'i1',
      sale_id: 's1',
      client_id: 'c1',
      client_name: 'Ana Silva',
      installment_number: 1,
      total_installments: 2,
      amount: 100,
      due_date: '2026-10-25', // vencida
      status: 'pending',
    },
    {
      id: 'i2',
      sale_id: 's2',
      client_id: 'c2',
      client_name: 'Mariana Lima',
      installment_number: 1,
      total_installments: 1,
      amount: 150,
      due_date: '2026-11-05', // nos próximos 7 dias (refDate: 2026-11-02)
      status: 'pending',
    },
    {
      id: 'i3',
      sale_id: 's3',
      client_id: 'c3',
      client_name: 'Bruna Rocha',
      installment_number: 2,
      total_installments: 2,
      amount: 250,
      due_date: '2026-12-01', // futuro > 7 dias
      status: 'pending',
    },
    {
      id: 'i4',
      sale_id: 's4',
      client_id: 'c1',
      installment_number: 1,
      total_installments: 1,
      amount: 80,
      due_date: '2026-10-10',
      status: 'paid', // já pago, não conta
    },
  ];

  it('calcula faturamento do mês excluindo vendas canceladas e meses anteriores', () => {
    const kpis = calculateDashboardMetrics(mockSales, mockInstallments, refDate);
    // Vendas válidas nov/2026: 200 + 500 + 150 = 850
    expect(kpis.monthRevenue).toBe(850);
    expect(kpis.monthSalesCount).toBe(3);
  });

  it('calcula total a receber e separa inadimplência de parcelas a vencer', () => {
    const kpis = calculateDashboardMetrics(mockSales, mockInstallments, refDate);
    // Parcelas pendentes: 100 (vencida) + 150 (próxima) + 250 (futura) = 500
    expect(kpis.totalReceivable).toBe(500);
    expect(kpis.totalOverdue).toBe(100);
  });

  it('identifica alertas de atraso e vencimento na semana', () => {
    const kpis = calculateDashboardMetrics(mockSales, mockInstallments, refDate);
    expect(kpis.overdueAlerts).toHaveLength(1);
    expect(kpis.overdueAlerts[0].id).toBe('i1');

    expect(kpis.dueSoonAlerts).toHaveLength(1);
    expect(kpis.dueSoonAlerts[0].id).toBe('i2');
  });

  it('gera ranking Top 3 de clientes do mês por volume gasto', () => {
    const kpis = calculateDashboardMetrics(mockSales, mockInstallments, refDate);
    expect(kpis.topClients).toHaveLength(2);
    // Mariana: 500, Ana: 350 (200 + 150)
    expect(kpis.topClients[0].clientName).toBe('Mariana Lima');
    expect(kpis.topClients[0].totalSpent).toBe(500);
    expect(kpis.topClients[1].clientName).toBe('Ana Silva');
    expect(kpis.topClients[1].totalSpent).toBe(350);
  });

  it('gera histórico de 6 meses contendo mês atual e anterior', () => {
    const kpis = calculateDashboardMetrics(mockSales, mockInstallments, refDate);
    expect(kpis.monthlyHistory).toHaveLength(6);
    const lastMonth = kpis.monthlyHistory[5]; // Mês atual (Nov/26)
    expect(lastMonth.total).toBe(850);
  });
});
