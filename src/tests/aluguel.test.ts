import { describe, it, expect } from 'vitest';
import {
  calculateNights,
  calculateReservaTotals,
  checkVacancyStatus,
  calculateMonthlyProfit,
  hasDateConflict,
} from '@/lib/services/aluguel-calculator';
import {
  CreateReservaSchema,
  CreateHospedeSchema,
  CreateDespesaSchema,
} from '@/lib/validations/aluguel';

describe('Calculador Financeiro e Operacional da Casa Itaúna', () => {
  it('calcula o número exato de noites entre check-in e check-out', () => {
    expect(calculateNights('2026-11-10', '2026-11-15')).toBe(5);
    expect(calculateNights('2026-11-01', '2026-11-02')).toBe(1);
    expect(calculateNights('2026-11-05', '2026-11-05')).toBe(0);
    expect(calculateNights('2026-11-10', '2026-11-05')).toBe(0);
  });

  it('calcula os totais da reserva: subtotal, taxa de limpeza e lucro líquido deduzindo comissão', () => {
    // 4 diárias a R$ 650/dia + R$ 200 limpeza. Airbnb cobrou R$ 350 de comissão fixa
    const res = calculateReservaTotals({
      checkin: '2026-11-20',
      checkout: '2026-11-24',
      valorDiaria: 650,
      taxaLimpeza: 200,
      taxaPlataforma: 350,
    });

    expect(res.num_diarias).toBe(4);
    expect(res.subtotal_diarias).toBe(2600);
    expect(res.taxa_limpeza).toBe(200);
    expect(res.valor_total).toBe(2800); // 2600 + 200
    expect(res.taxa_plataforma).toBe(350);
  });

  it('calcula comissão da plataforma em % (ex: 16% Airbnb), despesa de faxina R$ 180 e comissão da Dani 20%', () => {
    // Exemplo real do usuário:
    // 5 noites a R$ 600/noite = R$ 3.000 subtotal
    // Taxa de limpeza = R$ 180,00
    // Total cobrado = R$ 3.180,00
    // Taxa Airbnb 16% sobre R$ 3.180,00 = R$ 508,80
    // Despesa faxina = R$ 180,00
    // Saldo após Airbnb e faxina = 3180 - 508.80 - 180 = R$ 2.491,20
    // Dani tira 20% do que sobrou = 2491.20 * 0.20 = R$ 498,24
    // Lucro Líquido Real dos Proprietários = 2491.20 - 498.24 = R$ 1.992,96
    const res = calculateReservaTotals({
      checkin: '2026-11-10',
      checkout: '2026-11-15',
      valorDiaria: 600,
      taxaLimpeza: 180,
      taxaPlataformaPercentual: 16,
      temComissaoDani: true,
      taxaDaniPercentual: 20,
    });

    expect(res.num_diarias).toBe(5);
    expect(res.subtotal_diarias).toBe(3000);
    expect(res.taxa_limpeza).toBe(180);
    expect(res.valor_total).toBe(3180);
    expect(res.taxa_plataforma_percentual).toBe(16);
    expect(res.taxa_plataforma).toBe(508.8);
    expect(res.saldo_apos_plataforma_e_faxina).toBe(2491.2);
    expect(res.tem_comissao_dani).toBe(true);
    expect(res.valor_comissao_dani).toBe(498.24);
    expect(res.lucro_liquido_real).toBe(1992.96);
  });

  it('identifica corretamente o status de vacância para hoje (Livre vs Ocupada)', () => {
    const mockReservas = [
      {
        id: '1',
        data_checkin: '2026-11-01',
        data_checkout: '2026-11-05',
        status: 'confirmada',
        hospede_nome: 'Gabriel Medina',
      },
      {
        id: '2',
        data_checkin: '2026-11-10',
        data_checkout: '2026-11-15',
        status: 'confirmada',
        hospede_nome: 'Italo Ferreira',
      },
    ];

    // No dia 03/11 a casa está ocupada por Medina
    const status1 = checkVacancyStatus(mockReservas, '2026-11-03');
    expect(status1.isOccupied).toBe(true);
    expect(status1.statusLabel).toBe('Ocupada Hoje');
    expect(status1.reservation?.hospede_nome).toBe('Gabriel Medina');

    // No dia 07/11 a casa está livre
    const status2 = checkVacancyStatus(mockReservas, '2026-11-07');
    expect(status2.isOccupied).toBe(false);
    expect(status2.statusLabel).toBe('Livre Hoje');

    // No dia 10/11 (dia do check-in de Italo), a casa tem check-in hoje
    const status3 = checkVacancyStatus(mockReservas, '2026-11-10');
    expect(status3.statusLabel).toBe('Ocupada Hoje');
  });

  it('apura o Lucro Líquido Real do Mês abatendo taxas de plataforma e despesas operacionais', () => {
    const reservas = [
      {
        valor_total: 4000,
        taxa_plataforma: 500,
        status: 'confirmada',
        data_checkin: '2026-11-02',
      },
      {
        valor_total: 3000,
        taxa_plataforma: 0, // direto/whatsapp
        status: 'confirmada',
        data_checkin: '2026-11-15',
      },
      {
        valor_total: 2000,
        taxa_plataforma: 200,
        status: 'cancelada', // cancelada não deve entrar
        data_checkin: '2026-11-25',
      },
    ];

    const despesas = [
      { valor: 350, data_despesa: '2026-11-05' }, // Luz
      { valor: 150, data_despesa: '2026-11-08' }, // Água
      { valor: 200, data_despesa: '2026-11-20' }, // Faxina manutenção
      { valor: 500, data_despesa: '2026-10-10' }, // Mês anterior (outubro), não entra
    ];

    const resumo = calculateMonthlyProfit({
      reservas,
      despesas,
      monthPrefix: '2026-11',
    });

    expect(resumo.faturamentoBruto).toBe(7000); // 4000 + 3000
    expect(resumo.totalComissoes).toBe(500);
    expect(resumo.totalDespesas).toBe(700); // 350 + 150 + 200
    // Lucro Líquido Real = 7000 - 500 - 700 = 5800
    expect(resumo.lucroLiquidoReal).toBe(5800);
    expect(resumo.reservasCount).toBe(2);
    expect(resumo.despesasCount).toBe(3);
  });

  it('detecta conflito de datas de reservas para impedir sobreposição no calendário', () => {
    const existing = [
      {
        id: 'res-1',
        data_checkin: '2026-11-10',
        data_checkout: '2026-11-15',
        status: 'confirmada',
      },
    ];

    // Colisão direta no meio
    expect(hasDateConflict(existing, '2026-11-12', '2026-11-14')).toBe(true);

    // Colisão envolvendo as pontas
    expect(hasDateConflict(existing, '2026-11-08', '2026-11-12')).toBe(true);
    expect(hasDateConflict(existing, '2026-11-13', '2026-11-18')).toBe(true);

    // Sem colisão: entra no dia que o outro sai (check-out 15h, novo check-in 15h)
    expect(hasDateConflict(existing, '2026-11-15', '2026-11-20')).toBe(false);
    expect(hasDateConflict(existing, '2026-11-05', '2026-11-10')).toBe(false);

    // Ignora o próprio ID em edição
    expect(hasDateConflict(existing, '2026-11-10', '2026-11-15', 'res-1')).toBe(false);
  });
});

describe('Validações Zod Casa Itaúna', () => {
  it('valida criação de hóspede com dados válidos e opcionais', () => {
    const valid = CreateHospedeSchema.safeParse({
      nome: 'Filipe Toledo',
      telefone: '21999998888',
      notas_observacoes: 'Excelente hóspede, deixou a casa impecável.',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateHospedeSchema.safeParse({
      nome: 'A', // menor que 2 caracteres
    });
    expect(invalid.success).toBe(false);
  });

  it('rejeita reserva com check-out anterior ou igual ao check-in', () => {
    const res = CreateReservaSchema.safeParse({
      hospede_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      data_checkin: '2026-11-15',
      data_checkout: '2026-11-10',
      valor_diaria: 500,
    });
    expect(res.success).toBe(false);
  });

  it('valida criação de despesa operacional', () => {
    const valid = CreateDespesaSchema.safeParse({
      categoria: 'energia',
      descricao: 'Conta de luz Enel Novembro',
      valor: 285.4,
      data_despesa: '2026-11-05',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateDespesaSchema.safeParse({
      categoria: 'despesa_invalida',
      descricao: '',
      valor: -50,
      data_despesa: '2026-11-05',
    });
    expect(invalid.success).toBe(false);
  });
});

