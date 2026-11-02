-- Migration: Initial Schema for Renata Diller - Semijoias
-- Creates clients, sales, and installments with strict RLS and performance indexes

-- Enable uuid-ossp or pgcrypto if needed (gen_random_uuid is native in PG13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    phone TEXT NOT NULL CHECK (char_length(trim(phone)) >= 8),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'fiado')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
    sale_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INSTALLMENTS TABLE (Fiado & Parcelamento)
CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL CHECK (installment_number > 0),
    total_installments INTEGER NOT NULL CHECK (total_installments >= installment_number),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    paid_amount NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(user_id, name);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(user_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_installments_user_id ON public.installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_status_due ON public.installments(user_id, status, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_installments_sale_id ON public.installments(sale_id);
CREATE INDEX IF NOT EXISTS idx_installments_client_id ON public.installments(client_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR CLIENTS
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Users can view own clients" ON public.clients
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
CREATE POLICY "Users can insert own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
CREATE POLICY "Users can update own clients" ON public.clients
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "Users can delete own clients" ON public.clients
    FOR DELETE USING (auth.uid() = user_id);

-- POLICIES FOR SALES
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
CREATE POLICY "Users can view own sales" ON public.sales
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales;
CREATE POLICY "Users can insert own sales" ON public.sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sales" ON public.sales;
CREATE POLICY "Users can update own sales" ON public.sales
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sales" ON public.sales;
CREATE POLICY "Users can delete own sales" ON public.sales
    FOR DELETE USING (auth.uid() = user_id);

-- POLICIES FOR INSTALLMENTS
DROP POLICY IF EXISTS "Users can view own installments" ON public.installments;
CREATE POLICY "Users can view own installments" ON public.installments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own installments" ON public.installments;
CREATE POLICY "Users can insert own installments" ON public.installments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own installments" ON public.installments;
CREATE POLICY "Users can update own installments" ON public.installments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own installments" ON public.installments;
CREATE POLICY "Users can delete own installments" ON public.installments
    FOR DELETE USING (auth.uid() = user_id);
