import { describe, it, expect } from 'vitest';
import { maskPhone, unmaskPhone, maskCurrencyFromDigits } from '../lib/masks';

describe('Input Masks Utility (Mobile Touch Optimized)', () => {
  describe('maskPhone', () => {
    it('formata 2 dígitos de DDD como (11', () => {
      expect(maskPhone('11')).toBe('(11');
    });

    it('formata telefone móvel completo de 11 dígitos', () => {
      expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    });

    it('formata telefone fixo de 10 dígitos', () => {
      expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
    });

    it('remove prefixo 55 se o usuário colar do WhatsApp', () => {
      expect(maskPhone('5511999998888')).toBe('(11) 99999-8888');
      expect(maskPhone('+55 (21) 98888-7777')).toBe('(21) 98888-7777');
    });

    it('limita a 11 dígitos mesmo que receba mais', () => {
      expect(maskPhone('11987654321999')).toBe('(11) 98765-4321');
    });

    it('extrai apenas os dígitos com unmaskPhone', () => {
      expect(unmaskPhone('(11) 98765-4321')).toBe('11987654321');
    });
  });

  describe('maskCurrencyFromDigits', () => {
    it('formata vazio ou 0 como R$ 0,00', () => {
      expect(maskCurrencyFromDigits('').display).toBe('R$\xa00,00');
      expect(maskCurrencyFromDigits('').numericValue).toBe(0);
    });

    it('formata centavos unitários (1 -> R$ 0,01)', () => {
      const res = maskCurrencyFromDigits('1');
      expect(res.display).toBe('R$\xa00,01');
      expect(res.numericValue).toBe(0.01);
    });

    it('formata dezenas de centavos (10 -> R$ 0,10)', () => {
      const res = maskCurrencyFromDigits('10');
      expect(res.display).toBe('R$\xa00,10');
      expect(res.numericValue).toBe(0.1);
    });

    it('formata 1 real (100 -> R$ 1,00)', () => {
      const res = maskCurrencyFromDigits('100');
      expect(res.display).toBe('R$\xa01,00');
      expect(res.numericValue).toBe(1.0);
    });

    it('formata valores altos (150000 -> R$ 1.500,00)', () => {
      const res = maskCurrencyFromDigits('150000');
      expect(res.display).toBe('R$\xa01.500,00');
      expect(res.numericValue).toBe(1500.0);
    });
  });
});

