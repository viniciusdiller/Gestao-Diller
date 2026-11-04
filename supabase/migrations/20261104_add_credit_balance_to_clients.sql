-- Migration: Adiciona saldo credor / saldo extra na tabela clients
-- Permite que clientes tenham saldo positivo (crédito) quando pagam a mais ou adiantam valor.

ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (credit_balance >= 0);

-- Índice para consultas de clientes com saldo credor ativo
CREATE INDEX IF NOT EXISTS idx_clients_credit_balance ON public.clients(user_id, credit_balance);
