-- Migration: Adicionar quantidade de hóspedes na reserva
ALTER TABLE public.aluguel_reservas
ADD COLUMN IF NOT EXISTS num_hospedes INT NOT NULL DEFAULT 1;

NOTIFY pgrst, 'reload schema';
