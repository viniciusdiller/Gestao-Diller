-- Migration: Purchases (Compras de Fábrica) Schema for Renata Diller / Gestão-Diller
-- Enables recording factory purchases with purchase_date, factory_name, total_amount, and notes.

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    factory_name TEXT NOT NULL CHECK (char_length(trim(factory_name)) > 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON public.purchases(user_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_factory_name ON public.purchases(user_id, factory_name);

-- Row Level Security (RLS)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own purchases" ON public.purchases;
CREATE POLICY "Users can manage own purchases" ON public.purchases
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
