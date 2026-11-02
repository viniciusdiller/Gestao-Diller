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

  it('calcula atalhos de fiado (+15 e +30 dias) com precisão', () => {
    const base = new Date(2026, 9, 1); // 01/10/2026
    const plus15 = new Date(base);
    plus15.setDate(plus15.getDate() + 15);

    expect(plus15.getDate()).toBe(16);
    expect(plus15.getMonth()).toBe(9);

    const plus30 = new Date(base);
    plus30.setDate(plus30.getDate() + 30);
    expect(plus30.getDate()).toBe(31);
  });
});
