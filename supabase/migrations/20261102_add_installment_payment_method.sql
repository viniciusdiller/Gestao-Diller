-- Migration: Add payment_method to installments table
-- Allows recording how each installment was paid (pix, dinheiro, cartao_debito, cartao_credito, etc.)

ALTER TABLE public.installments 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.installments 
DROP CONSTRAINT IF EXISTS installments_payment_method_check;

ALTER TABLE public.installments 
ADD CONSTRAINT installments_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'fiado'));

-- Notifica o PostgREST para recarregar o cache do schema imediatamente
NOTIFY pgrst, 'reload schema';

