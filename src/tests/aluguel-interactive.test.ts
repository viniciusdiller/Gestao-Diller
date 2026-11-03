import { describe, it, expect } from 'vitest';
import {
  CreateReservaSchema,
  CreateHospedeSchema,
  CreateDespesaSchema,
} from '@/lib/validations/aluguel';
import {
  calculateReservaTotals,
  hasDateConflict,
  checkVacancyStatus,
} from '@/lib/services/aluguel-calculator';

describe('Suíte de Testes dos Fluxos da Casa Itaúna', () => {
  it('valida criação e regras de negócio da reserva com comissão e taxa de limpeza', () => {
    const input = {
      hospede_id: '123e4567-e89b-12d3-a456-426614174000',
      data_checkin: '2026-12-28',
      data_checkout: '2027-01-04',
      valor_diaria: 1200, // Tarifa especial de réveillon
      taxa_limpeza: 250,
      taxa_plataforma: 400,
      origem: 'airbnb' as const,
      status: 'confirmada' as const,
      status_pagamento: 'pago' as const,
    };

    const parsed = CreateReservaSchema.safeParse(input);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      const totals = calculateReservaTotals({
        checkin: parsed.data.data_checkin,
        checkout: parsed.data.data_checkout,
        valorDiaria: parsed.data.valor_diaria,
        taxaLimpeza: parsed.data.taxa_limpeza,
        taxaPlataforma: parsed.data.taxa_plataforma,
      });

      expect(totals.num_diarias).toBe(7);
      expect(totals.subtotal_diarias).toBe(8400); // 7 * 1200
      expect(totals.valor_total).toBe(8650); // 8400 + 250
      expect(totals.lucro_liquido_reserva).toBe(8250); // 8650 - 400
    }
  });

  it('bloqueia criação de reserva com sobreposição de datas (Double Booking prevention)', () => {
    const reservasExistentes = [
      {
        id: 'res-reveillon',
        data_checkin: '2026-12-28',
        data_checkout: '2027-01-04',
        status: 'confirmada',
      },
    ];

    // Tentativa de reservar no meio do réveillon
    const conflito = hasDateConflict(
      reservasExistentes,
      '2026-12-30',
      '2027-01-02'
    );
    expect(conflito).toBe(true);

    // Tentativa de reservar após o check-out do réveillon (livre)
    const semConflito = hasDateConflict(
      reservasExistentes,
      '2027-01-04',
      '2027-01-10'
    );
    expect(semConflito).toBe(false);
  });

  it('valida regras de validação para despesas operacionais da casa', () => {
    const despesaInvalida = CreateDespesaSchema.safeParse({
      categoria: 'energia',
      descricao: 'Enel',
      valor: -100, // Valor negativo
      data_despesa: '2026-11-02',
    });
    expect(despesaInvalida.success).toBe(false);

    const despesaValida = CreateDespesaSchema.safeParse({
      categoria: 'internet',
      descricao: 'Internet Fibra Óptica 500MB',
      valor: 119.9,
      data_despesa: '2026-11-05',
    });
    expect(despesaValida.success).toBe(true);
  });

  it('valida que status de vacância responde corretamente ao dia atual', () => {
    const reservas = [
      {
        id: '1',
        data_checkin: '2026-11-02',
        data_checkout: '2026-11-06',
        status: 'confirmada',
        hospede_nome: 'Lucas Silveira',
        hospede_telefone: '21988887777',
      },
    ];

    const hoje = checkVacancyStatus(reservas, '2026-11-02');
    expect(hoje.isOccupied).toBe(true);
    expect(hoje.statusLabel).toBe('Ocupada Hoje');
    expect(hoje.reservation?.hospede_nome).toBe('Lucas Silveira');

    const depois = checkVacancyStatus(reservas, '2026-11-10');
    expect(depois.isOccupied).toBe(false);
    expect(depois.statusLabel).toBe('Livre Hoje');
  });
});
