-- Migration: Make clients.phone optional and maintain data integrity
-- Renata Diller - Semijoias

ALTER TABLE public.clients ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_phone_check;

ALTER TABLE public.clients ADD CONSTRAINT clients_phone_check 
  CHECK (phone IS NULL OR char_length(trim(phone)) = 0 OR char_length(trim(phone)) >= 8);

-- Garantir que a coluna notes existe em installments para anotações de cobrança/baixa
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS notes TEXT;
