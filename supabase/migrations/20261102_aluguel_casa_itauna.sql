-- Migration: Modulo Casa Itauna (Gestao Diller)
-- Prefixado estritamente com aluguel_ para isolamento total do banco
-- Tabelas: aluguel_hospedes, aluguel_reservas, aluguel_despesas

-- 1. HOSPEDES (CRM)
CREATE TABLE IF NOT EXISTS public.aluguel_hospedes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    telefone TEXT,
    notas_observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. RESERVAS (Locacao, Tarifas Dinamicas e Comissoes)
CREATE TABLE IF NOT EXISTS public.aluguel_reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hospede_id UUID NOT NULL REFERENCES public.aluguel_hospedes(id) ON DELETE RESTRICT,
    data_checkin DATE NOT NULL,
    data_checkout DATE NOT NULL CHECK (data_checkout > data_checkin),
    num_diarias INTEGER NOT NULL CHECK (num_diarias > 0),
    valor_diaria NUMERIC(10, 2) NOT NULL CHECK (valor_diaria >= 0),
    taxa_limpeza NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (taxa_limpeza >= 0),
    taxa_plataforma NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (taxa_plataforma >= 0),
    origem TEXT NOT NULL DEFAULT 'direto' CHECK (origem IN ('airbnb', 'booking', 'instagram', 'direto', 'outros')),
    valor_total NUMERIC(10, 2) NOT NULL CHECK (valor_total >= 0),
    status TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'em_andamento', 'concluida', 'cancelada')),
    status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'parcial', 'pago')),
    valor_pago NUMERIC(10, 2) NOT NULL DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. DESPESAS OPERACIONAIS
CREATE TABLE IF NOT EXISTS public.aluguel_despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reserva_id UUID REFERENCES public.aluguel_reservas(id) ON DELETE SET NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('agua', 'energia', 'internet', 'faxina', 'manutencao', 'reparos', 'outros')),
    descricao TEXT NOT NULL CHECK (char_length(trim(descricao)) > 0),
    valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
    data_despesa DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. INDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_aluguel_hospedes_user_id ON public.aluguel_hospedes(user_id);
CREATE INDEX IF NOT EXISTS idx_aluguel_reservas_user_id ON public.aluguel_reservas(user_id);
CREATE INDEX IF NOT EXISTS idx_aluguel_reservas_dates ON public.aluguel_reservas(data_checkin, data_checkout);
CREATE INDEX IF NOT EXISTS idx_aluguel_reservas_hospede ON public.aluguel_reservas(hospede_id);
CREATE INDEX IF NOT EXISTS idx_aluguel_despesas_user_id ON public.aluguel_despesas(user_id);
CREATE INDEX IF NOT EXISTS idx_aluguel_despesas_date ON public.aluguel_despesas(data_despesa);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.aluguel_hospedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aluguel_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aluguel_despesas ENABLE ROW LEVEL SECURITY;

-- Politicas aluguel_hospedes
DROP POLICY IF EXISTS "aluguel_hospedes_select" ON public.aluguel_hospedes;
CREATE POLICY "aluguel_hospedes_select" ON public.aluguel_hospedes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_hospedes_insert" ON public.aluguel_hospedes;
CREATE POLICY "aluguel_hospedes_insert" ON public.aluguel_hospedes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_hospedes_update" ON public.aluguel_hospedes;
CREATE POLICY "aluguel_hospedes_update" ON public.aluguel_hospedes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_hospedes_delete" ON public.aluguel_hospedes;
CREATE POLICY "aluguel_hospedes_delete" ON public.aluguel_hospedes FOR DELETE USING (auth.uid() = user_id);

-- Politicas aluguel_reservas
DROP POLICY IF EXISTS "aluguel_reservas_select" ON public.aluguel_reservas;
CREATE POLICY "aluguel_reservas_select" ON public.aluguel_reservas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_reservas_insert" ON public.aluguel_reservas;
CREATE POLICY "aluguel_reservas_insert" ON public.aluguel_reservas FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_reservas_update" ON public.aluguel_reservas;
CREATE POLICY "aluguel_reservas_update" ON public.aluguel_reservas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_reservas_delete" ON public.aluguel_reservas;
CREATE POLICY "aluguel_reservas_delete" ON public.aluguel_reservas FOR DELETE USING (auth.uid() = user_id);

-- Politicas aluguel_despesas
DROP POLICY IF EXISTS "aluguel_despesas_select" ON public.aluguel_despesas;
CREATE POLICY "aluguel_despesas_select" ON public.aluguel_despesas FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_despesas_insert" ON public.aluguel_despesas;
CREATE POLICY "aluguel_despesas_insert" ON public.aluguel_despesas FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_despesas_update" ON public.aluguel_despesas;
CREATE POLICY "aluguel_despesas_update" ON public.aluguel_despesas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "aluguel_despesas_delete" ON public.aluguel_despesas;
CREATE POLICY "aluguel_despesas_delete" ON public.aluguel_despesas FOR DELETE USING (auth.uid() = user_id);

-- Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
