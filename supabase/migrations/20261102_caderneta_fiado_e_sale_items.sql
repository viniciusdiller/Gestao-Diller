-- Migration: Caderneta de Fiado e Tabela Relacional de Itens de Venda (sale_items)
-- Permite múltiplos itens por venda com quantidade e valor unitário, e controle de saldo devedor.

-- 1. TABELA DE ITENS DE VENDA (sale_items)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. COLUNAS ADICIONAIS NA TABELA DE VENDAS (sales)
ALTER TABLE public.sales
    ADD COLUMN IF NOT EXISTS paid_amount_now NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount_now >= 0),
    ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0);

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_user_id ON public.sale_items(user_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sale items" ON public.sale_items;
CREATE POLICY "Users can view own sale items" ON public.sale_items
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sale items" ON public.sale_items;
CREATE POLICY "Users can insert own sale items" ON public.sale_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sale items" ON public.sale_items;
CREATE POLICY "Users can update own sale items" ON public.sale_items
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sale items" ON public.sale_items;
CREATE POLICY "Users can delete own sale items" ON public.sale_items
    FOR DELETE USING (auth.uid() = user_id);
