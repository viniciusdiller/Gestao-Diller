import { describe, it, expect } from 'vitest';
import {
  sanitizePhoneForWhatsApp,
  generateBillingMessage,
  getWhatsAppBillingUrl,
} from '../lib/services/whatsapp';

describe('WhatsApp Billing Service', () => {
  it('higieniza números de telefone com pontuação para o padrão 55...', () => {
    expect(sanitizePhoneForWhatsApp('(11) 98765-4321')).toBe('5511987654321');
    expect(sanitizePhoneForWhatsApp('11 98888-7777')).toBe('5511988887777');
    expect(sanitizePhoneForWhatsApp('+55 (21) 99999-0000')).toBe('5521999990000');
  });

  it('preserva número que já possui o prefixo 55', () => {
    expect(sanitizePhoneForWhatsApp('5519999991111')).toBe('5519999991111');
  });

  it('gera mensagem de cobrança amigável com valor em R$ e primeiro nome', () => {
    const msg = generateBillingMessage({
      clientName: 'Carla Beatriz Alcantara',
      amount: 149.9,
      dueDate: '2026-11-20',
      installmentNumber: 2,
      totalInstallments: 3,
    });

    expect(msg).toContain('Oi, Carla!');
    expect(msg).toContain('R$');
    expect(msg).toContain('149,90');
    expect(msg).toContain('20/11/2026');
    expect(msg).toContain('(parcela 2/3)');
    expect(msg).toContain('Renata Semijoias');
  });

  it('gera URL wa.me com codificação correta para o navegador/app', () => {
    const url = getWhatsAppBillingUrl('(11) 98765-4321', {
      clientName: 'Juliana Silva',
      amount: 80,
      dueDate: '2026-11-10',
    });

    expect(url.startsWith('https://wa.me/5511987654321?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Oi, Juliana!'));
  });
});
