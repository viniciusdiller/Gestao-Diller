import { z } from 'zod';

export const ClientSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const digits = val.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13;
    }, 'Se informado, o telefone deve ter DDD válido (10 ou 11 dígitos).'),
  notes: z.string().trim().optional().nullable(),
});

export type ClientInput = z.infer<typeof ClientSchema>;

export const UpdateClientSchema = z.object({
  id: z.string().uuid('ID de cliente inválido.'),
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const digits = val.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 13;
    }, 'Se informado, o telefone deve ter DDD válido (10 ou 11 dígitos).'),
  notes: z.string().trim().optional().nullable(),
});

export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

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

export const SaleItemSchema = z.object({
  name: z.string().trim().min(1, 'O nome da peça é obrigatório.'),
  quantity: z.number().int().min(1, 'A quantidade mínima é 1.').default(1),
  unit_price: z.number().positive('O valor unitário deve ser maior que zero.'),
});

export type SaleItemInput = z.infer<typeof SaleItemSchema>;

export const SaleSchema = z
  .object({
    client_id: z.string().uuid('Selecione uma cliente válida.'),
    description: z.string().trim().optional().nullable(),
    items: z.array(SaleItemSchema).optional(),
    total_amount: z.number().positive('O valor total deve ser maior que zero.'),
    paid_amount_now: z.number().min(0, 'O valor pago não pode ser negativo.').optional(),
    payment_method: PaymentMethodEnum,
    sale_date: z.string().optional(),
    installments: z.array(InstallmentDraftSchema).optional(),
  })
  .refine(
    (data) => {
      const hasDesc = Boolean(data.description && data.description.trim().length >= 2);
      const hasItems = Boolean(Array.isArray(data.items) && data.items.length > 0);
      return hasDesc || hasItems;
    },
    {
      message: 'Informe a descrição ou ao menos um item para a venda.',
      path: ['description'],
    }
  );

export type SaleInput = z.infer<typeof SaleSchema>;

export const ClientAbatementSchema = z.object({
  client_id: z.string().uuid('ID de cliente inválido.'),
  amount: z.number().positive('O valor do abatimento deve ser maior que zero.'),
  payment_method: PaymentMethodEnum.default('pix'),
  notes: z.string().trim().optional().nullable(),
});

export type ClientAbatementInput = z.infer<typeof ClientAbatementSchema>;

export const UpdateSaleSchema = z.object({
  id: z.string().uuid('ID de venda inválido.'),
  client_id: z.string().uuid('Selecione uma cliente válida.').optional(),
  description: z.string().trim().min(2, 'A descrição deve ter pelo menos 2 caracteres.'),
  total_amount: z.number().positive('O valor total deve ser maior que zero.'),
  payment_method: PaymentMethodEnum,
  sale_date: z.string().optional(),
});

export type UpdateSaleInput = z.infer<typeof UpdateSaleSchema>;

export const PayInstallmentSchema = z.object({
  installment_id: z.string().uuid('ID de parcela inválido.'),
  paid_amount: z.number().positive('O valor pago deve ser maior que zero.'),
  payment_method: PaymentMethodEnum.optional(),
  notes: z.string().trim().optional(),
});

export type PayInstallmentInput = z.infer<typeof PayInstallmentSchema>;

export const UpdateInstallmentSchema = z.object({
  id: z.string().uuid('ID de parcela inválido.'),
  amount: z.number().positive('O valor da parcela deve ser maior que zero.'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.'),
  status: z.enum(['pending', 'paid', 'cancelled']).optional(),
  paid_amount: z.number().positive().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type UpdateInstallmentInput = z.infer<typeof UpdateInstallmentSchema>;
