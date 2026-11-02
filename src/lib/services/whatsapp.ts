import { formatCurrency, formatDateBR } from '../utils';

export function sanitizePhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return '';

  // Número brasileiro padrão sem código do país (DDD + 8 ou 9 dígitos)
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `55${digitsOnly}`;
  }

  // Já possui o DDI 55
  if (digitsOnly.length >= 12 && digitsOnly.startsWith('55')) {
    return digitsOnly;
  }

  return digitsOnly;
}

export interface BillingMessageParams {
  clientName: string;
  amount: number;
  dueDate: string;
  installmentNumber?: number;
  totalInstallments?: number;
}

export function generateBillingMessage(params: BillingMessageParams): string {
  const { clientName, amount, dueDate, installmentNumber, totalInstallments } = params;
  const firstName = clientName.trim().split(' ')[0] || 'Cliente';
  const formattedAmount = formatCurrency(amount);
  const formattedDate = formatDateBR(dueDate);

  const installmentInfo =
    installmentNumber && totalInstallments && totalInstallments > 1
      ? ` (parcela ${installmentNumber}/${totalInstallments})`
      : '';

  return `Oi, ${firstName}! Tudo bem? Passando pra lembrar do vencimento da sua parcela${installmentInfo} de ${formattedAmount} com a Renata Semijoias no dia ${formattedDate}. Qualquer dúvida estou à disposição! Se já realizou o pagamento, desconsidere essa mensagem. ✨`;
}

export function getWhatsAppBillingUrl(
  phone: string | null | undefined,
  params: BillingMessageParams
): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  if (!cleanPhone) return '';
  const message = generateBillingMessage(params);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export interface SaleReceiptParams {
  clientName: string;
  description: string;
  amount: number;
  paymentMethod: string;
  installmentsCount?: number;
}

export function generateSaleReceiptMessage(params: SaleReceiptParams): string {
  const { clientName, description, amount, paymentMethod, installmentsCount } = params;
  const firstName = clientName.trim().split(' ')[0] || 'Cliente';
  const formattedAmount = formatCurrency(amount);

  const paymentLabels: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_debito: 'Cartão de Débito',
    cartao_credito: 'Cartão de Crédito',
    fiado:
      installmentsCount && installmentsCount > 1
        ? `Fiado / Parcelado (${installmentsCount}x)`
        : 'Fiado / A Prazo',
  };

  const methodText = paymentLabels[paymentMethod] || paymentMethod.toUpperCase();

  return `Oi, ${firstName}! ✨ Passando pra registrar seu pedido com a Renata Semijoias: ${description} no valor de ${formattedAmount} (${methodText}). Muito obrigada pela preferência e confiança! Qualquer dúvida estou sempre por aqui. 🥰`;
}

export function getWhatsAppReceiptUrl(
  phone: string | null | undefined,
  params: SaleReceiptParams
): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  if (!cleanPhone) return '';
  const message = generateSaleReceiptMessage(params);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
