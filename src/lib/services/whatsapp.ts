import { formatCurrency, formatDateBR } from '../utils';

export function sanitizePhoneForWhatsApp(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

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
  phone: string,
  params: BillingMessageParams
): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const message = generateBillingMessage(params);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
