import { z } from 'zod';

export const AluguelOrigemEnum = z.enum([
  'airbnb',
  'booking',
  'instagram',
  'direto',
  'outros',
]);
export type AluguelOrigem = z.infer<typeof AluguelOrigemEnum>;

export const AluguelStatusEnum = z.enum([
  'confirmada',
  'em_andamento',
  'concluida',
  'cancelada',
]);
export type AluguelStatus = z.infer<typeof AluguelStatusEnum>;

export const AluguelStatusPagamentoEnum = z.enum([
  'pendente',
  'parcial',
  'pago',
]);
export type AluguelStatusPagamento = z.infer<typeof AluguelStatusPagamentoEnum>;

export const AluguelCategoriaDespesaEnum = z.enum([
  'agua',
  'energia',
  'internet',
  'faxina',
  'manutencao',
  'reparos',
  'outros',
]);
export type AluguelCategoriaDespesa = z.infer<typeof AluguelCategoriaDespesaEnum>;

// Schema: Hóspede
export const CreateHospedeSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
  telefone: z.string().trim().optional().nullable(),
  notas_observacoes: z.string().trim().optional().nullable(),
});
export type CreateHospedeInput = z.infer<typeof CreateHospedeSchema>;

export const UpdateHospedeSchema = CreateHospedeSchema.extend({
  id: z.string().uuid('ID inválido.'),
});
export type UpdateHospedeInput = z.infer<typeof UpdateHospedeSchema>;

// Schema: Reserva
export const CreateReservaSchema = z.object({
  hospede_id: z.string().uuid('Hóspede inválido.'),
  data_checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de check-in inválida (AAAA-MM-DD).'),
  data_checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de check-out inválida (AAAA-MM-DD).'),
  valor_diaria: z.number().min(0, 'Valor da diária não pode ser negativo.'),
  taxa_limpeza: z.number().min(0, 'Taxa de limpeza não pode ser negativa.').default(180),
  taxa_plataforma_percentual: z.number().min(0).max(100, 'Taxa da plataforma não pode ultrapassar 100%.').default(0),
  taxa_plataforma: z.number().min(0, 'Taxa da plataforma não pode ser negativa.').default(0).optional(),
  tem_comissao_dani: z.boolean().default(false),
  taxa_dani_percentual: z.number().min(0).max(100, 'Comissão da Dani não pode ultrapassar 100%.').default(20),
  valor_comissao_dani: z.number().min(0).default(0).optional(),
  lucro_liquido_real: z.number().default(0).optional(),
  origem: AluguelOrigemEnum.default('direto'),
  status: AluguelStatusEnum.default('confirmada'),
  status_pagamento: AluguelStatusPagamentoEnum.default('pendente'),
  valor_pago: z.number().min(0).default(0),
  observacoes: z.string().trim().optional().nullable(),
}).refine((data) => data.data_checkout > data.data_checkin, {
  message: 'Data de check-out deve ser posterior à data de check-in.',
  path: ['data_checkout'],
});
export type CreateReservaInput = z.input<typeof CreateReservaSchema>;
export type CreateReservaOutput = z.infer<typeof CreateReservaSchema>;

export const UpdateReservaSchema = z.object({
  id: z.string().uuid('ID da reserva inválido.'),
  hospede_id: z.string().uuid('Hóspede inválido.').optional(),
  data_checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valor_diaria: z.number().min(0).optional(),
  taxa_limpeza: z.number().min(0).optional(),
  taxa_plataforma_percentual: z.number().min(0).max(100).optional(),
  taxa_plataforma: z.number().min(0).optional(),
  tem_comissao_dani: z.boolean().optional(),
  taxa_dani_percentual: z.number().min(0).max(100).optional(),
  valor_comissao_dani: z.number().min(0).optional(),
  lucro_liquido_real: z.number().optional(),
  origem: AluguelOrigemEnum.optional(),
  status: AluguelStatusEnum.optional(),
  status_pagamento: AluguelStatusPagamentoEnum.optional(),
  valor_pago: z.number().min(0).optional(),
  observacoes: z.string().trim().optional().nullable(),
}).refine(
  (data) => {
    if (data.data_checkin && data.data_checkout) {
      return data.data_checkout > data.data_checkin;
    }
    return true;
  },
  {
    message: 'Data de check-out deve ser posterior à data de check-in.',
    path: ['data_checkout'],
  }
);
export type UpdateReservaInput = z.infer<typeof UpdateReservaSchema>;

// Schema: Despesa
export const CreateDespesaSchema = z.object({
  reserva_id: z.string().uuid().optional().nullable(),
  categoria: AluguelCategoriaDespesaEnum,
  descricao: z.string().trim().min(2, 'Descrição deve ter pelo menos 2 caracteres.'),
  valor: z.number().positive('Valor da despesa deve ser maior que zero.'),
  data_despesa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (AAAA-MM-DD).'),
});
export type CreateDespesaInput = z.infer<typeof CreateDespesaSchema>;

export const UpdateDespesaSchema = CreateDespesaSchema.extend({
  id: z.string().uuid('ID inválido.'),
});
export type UpdateDespesaInput = z.infer<typeof UpdateDespesaSchema>;

