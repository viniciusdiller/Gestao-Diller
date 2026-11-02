import { describe, it, expect } from 'vitest';
import { generateInstallments } from '../lib/services/installment-calculator';

describe('Installment Calculator Service', () => {
  it('divide 100 em 3 parcelas com resto no último centavo (33.33, 33.33, 33.34)', () => {
    const installments = generateInstallments({
      totalAmount: 100,
      numInstallments: 3,
      firstDueDate: '2026-11-10',
      intervalType: 'monthly',
    });

    expect(installments).toHaveLength(3);
    expect(installments[0].amount).toBe(33.33);
    expect(installments[1].amount).toBe(33.33);
    expect(installments[2].amount).toBe(33.34);

    const sum = installments.reduce((acc, curr) => acc + curr.amount, 0);
    expect(Number(sum.toFixed(2))).toBe(100.0);
  });

  it('divide 250 em 4 parcelas exatas de 62.50', () => {
    const installments = generateInstallments({
      totalAmount: 250,
      numInstallments: 4,
      firstDueDate: '2026-11-05',
    });

    expect(installments).toHaveLength(4);
    installments.forEach((inst) => {
      expect(inst.amount).toBe(62.5);
    });
  });

  it('gera datas mensais consecutivas corretamente', () => {
    const installments = generateInstallments({
      totalAmount: 300,
      numInstallments: 3,
      firstDueDate: '2026-11-15',
      intervalType: 'monthly',
    });

    expect(installments[0].due_date).toBe('2026-11-15');
    expect(installments[1].due_date).toBe('2026-12-15');
    expect(installments[2].due_date).toBe('2027-01-15');
  });

  it('ajusta datas para final de mês curto (31 de janeiro para 28 de fevereiro)', () => {
    const installments = generateInstallments({
      totalAmount: 200,
      numInstallments: 2,
      firstDueDate: '2027-01-31',
      intervalType: 'monthly',
    });

    expect(installments[0].due_date).toBe('2027-01-31');
    expect(installments[1].due_date).toBe('2027-02-28');
  });

  it('suporta intervalo quinzenal (14 dias)', () => {
    const installments = generateInstallments({
      totalAmount: 150,
      numInstallments: 3,
      firstDueDate: '2026-11-01',
      intervalType: 'biweekly',
    });

    expect(installments[0].due_date).toBe('2026-11-01');
    expect(installments[1].due_date).toBe('2026-11-15');
    expect(installments[2].due_date).toBe('2026-11-29');
  });

  it('rejeita valor zero ou negativo', () => {
    expect(() =>
      generateInstallments({
        totalAmount: 0,
        numInstallments: 2,
        firstDueDate: '2026-11-01',
      })
    ).toThrow();
  });

  it('rejeita parcelas menores que 1', () => {
    expect(() =>
      generateInstallments({
        totalAmount: 100,
        numInstallments: 0,
        firstDueDate: '2026-11-01',
      })
    ).toThrow();
  });
});
