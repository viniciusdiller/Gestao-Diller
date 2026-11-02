/**
 * Utilitários de Máscaras e Formatação para Mobile (Zero Falhas)
 * Especialmente desenhados para interação touch e teclados numéricos de smartphones.
 */

/**
 * Aplica máscara de telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * Lida perfeitamente com digitação, colagem (paste) e backspace.
 */
export function maskPhone(value: string): string {
  if (!value) return '';

  // Remove tudo que não for dígito
  let digits = value.replace(/\D/g, '');

  // Se o usuário colou com código do país (ex: 5511987654321), remove o 55 inicial se tiver 12 ou 13 dígitos
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  // Limita a no máximo 11 dígitos (DDD + 9 dígitos)
  digits = digits.slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Remove formatação do telefone, retornando apenas números
 */
export function unmaskPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formata um valor numérico em centavos para a representação monetária R$ 0,00
 * Digitação contínua estilo ATM/Bancário:
 * Digitar 1 -> R$ 0,01
 * Digitar 10 -> R$ 0,10
 * Digitar 100 -> R$ 1,00
 * Digitar 15000 -> R$ 150,00
 */
export function maskCurrencyFromDigits(digitsOnlyStr: string): {
  display: string;
  numericValue: number;
} {
  const digits = digitsOnlyStr.replace(/\D/g, '');

  if (!digits || digits === '0') {
    return { display: formatCurrencyFloat(0), numericValue: 0 };
  }

  // Converte a cadeia de dígitos em centavos
  const cents = parseInt(digits, 10);
  const numericValue = cents / 100;

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);

  return { display: formatted, numericValue };
}

/**
 * Converte um número (float) para string formatada de moeda
 */
export function formatCurrencyFloat(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(val);
}
