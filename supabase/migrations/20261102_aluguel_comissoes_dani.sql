-- Migration: Adicionar campos de comissao em percentual e comissao da Dani
-- aluguel_reservas: taxa_plataforma_percentual, tem_comissao_dani, taxa_dani_percentual, valor_comissao_dani, lucro_liquido_real

ALTER TABLE public.aluguel_reservas
ADD COLUMN IF NOT EXISTS taxa_plataforma_percentual NUMERIC(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tem_comissao_dani BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS taxa_dani_percentual NUMERIC(5, 2) NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS valor_comissao_dani NUMERIC(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lucro_liquido_real NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Atualizar taxa_limpeza default para 180.00
ALTER TABLE public.aluguel_reservas
ALTER COLUMN taxa_limpeza SET DEFAULT 180.00;

NOTIFY pgrst, 'reload schema';
