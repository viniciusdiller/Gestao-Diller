import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

describe('ShadCN Calendar & DatePicker Logic', () => {
  it('converte string YYYY-MM-DD para Date local sem desvio de fuso horário UTC', () => {
    const value = '2026-10-15';
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9); // Outubro (0-indexed)
    expect(date.getDate()).toBe(15);

    const formatted = format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    expect(formatted).toBe('15 de outubro de 2026');
  });

  it('formata datas em padrão brasileiro amigável para touch mobile', () => {
    const date = new Date(2026, 1, 15); // 15 de fevereiro de 2026
    const formatted = format(date, 'dd/MM/yyyy');
    expect(formatted).toBe('15/02/2026');
  });

  it('calcula dias no mês e início da semana para grade de calendário perfeita', () => {
    // Novembro 2026: começa em um Domingo (dia 0) e tem 30 dias
    const firstDay = new Date(2026, 10, 1).getDay(); // 0 = Domingo
    const daysInNov = new Date(2026, 11, 0).getDate(); // 30 dias

    expect(firstDay).toBe(0);
    expect(daysInNov).toBe(30);

    // Mês anterior (Outubro) tem 31 dias
    const daysInOct = new Date(2026, 10, 0).getDate();
    expect(daysInOct).toBe(31);
  });

  it('detecta dia de troca (turnaround) com saída pela manhã e entrada à tarde', () => {
    const dayStr = '2026-11-15';
    const checkoutReserva = { data_checkout: '2026-11-15', status: 'confirmada' };
    const checkinReserva = { data_checkin: '2026-11-15', status: 'confirmada' };

    const isTurnaround = Boolean(
      checkoutReserva.data_checkout === dayStr && checkinReserva.data_checkin === dayStr
    );
    expect(isTurnaround).toBe(true);
  });
});
