import { describe, it, expect } from 'vitest';
import {
  sanitizePhoneForWhatsApp,
  generateBillingMessage,
  getWhatsAppBillingUrl,
  generateSaleReceiptMessage,
  getWhatsAppReceiptUrl,
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

  it('lida com segurança para telefones vazios ou indefinidos', () => {
    expect(sanitizePhoneForWhatsApp('')).toBe('');
    expect(sanitizePhoneForWhatsApp(null)).toBe('');
    expect(sanitizePhoneForWhatsApp(undefined)).toBe('');

    const billingUrl = getWhatsAppBillingUrl('', {
      clientName: 'Cliente Sem Telefone',
      amount: 100,
      dueDate: '2026-11-20',
    });
    expect(billingUrl).toBe('');

    const receiptUrl = getWhatsAppReceiptUrl(null, {
      clientName: 'Cliente Sem Telefone',
      description: 'Colar',
      amount: 100,
      paymentMethod: 'pix',
    });
    expect(receiptUrl).toBe('');
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

  it('gera comprovante de venda amigável no WhatsApp com detalhes da peça', () => {
    const receipt = generateSaleReceiptMessage({
      clientName: 'Fernanda Oliveira',
      description: 'Anel Solitário e Brinco Pérola',
      amount: 280,
      paymentMethod: 'pix',
    });

    expect(receipt).toContain('Oi, Fernanda!');
    expect(receipt).toContain('Anel Solitário e Brinco Pérola');
    expect(receipt).toContain('280,00');
    expect(receipt).toContain('PIX');
  });

  it('gera link de comprovante wa.me formatado', () => {
    const url = getWhatsAppReceiptUrl('11977776666', {
      clientName: 'Larissa Manoela',
      description: 'Colar Gravatinha',
      amount: 190,
      paymentMethod: 'cartao_credito',
    });

    expect(url.startsWith('https://wa.me/5511977776666?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Colar Gravatinha'));
  });
});
