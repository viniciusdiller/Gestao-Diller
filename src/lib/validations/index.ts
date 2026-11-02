import { z } from 'zod';

export const ClientSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  phone: z
    .string()
    .trim()
    .refine((val) => {
      const digits = val.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13;
    }, 'Informe um telefone com DDD válido (10 ou 11 dígitos).'),
  notes: z.string().trim().optional().nullable(),
});

export type ClientInput = z.infer<typeof ClientSchema>;

export const PaymentMethodEnum = z.enum([
  'pix',
  'dinheiro',
  'cartao_debito',
  'cartao_credito',
  'fiado',
]);

export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const InstallmentDraftSchema = z.object({
  installment_number: z.number().int().positive(),
  total_installments: z.number().int().positive(),
  amount: z.number().positive('O valor da parcela deve ser maior que zero.'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.'),
});

export const SaleSchema = z.object({
  client_id: z.string().uuid('Selecione uma cliente válida.'),
  description: z.string().trim().min(2, 'A descrição deve ter pelo menos 2 caracteres.'),
  total_amount: z.number().positive('O valor total deve ser maior que zero.'),
  payment_method: PaymentMethodEnum,
  sale_date: z.string().optional(),
  installments: z.array(InstallmentDraftSchema).optional(),
});

export type SaleInput = z.infer<typeof SaleSchema>;

export const PayInstallmentSchema = z.object({
  installment_id: z.string().uuid('ID de parcela inválido.'),
  paid_amount: z.number().positive('O valor pago deve ser maior que zero.'),
  payment_method: PaymentMethodEnum.optional(),
  notes: z.string().trim().optional(),
});

export type PayInstallmentInput = z.infer<typeof PayInstallmentSchema>;
