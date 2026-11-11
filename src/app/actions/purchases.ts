'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  PurchaseSchema,
  PurchaseInput,
  UpdatePurchaseSchema,
  UpdatePurchaseInput,
} from '@/lib/validations';

export interface PurchaseRow {
  id: string;
  user_id: string;
  factory_name: string;
  total_amount: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPurchaseAction(rawInput: PurchaseInput) {
  const parsed = PurchaseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados de compra inválidos.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      user_id: user.id,
      factory_name: parsed.data.factory_name.trim(),
      total_amount: parsed.data.total_amount,
      purchase_date: parsed.data.purchase_date,
      notes: parsed.data.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao registrar compra: ' + error.message };
  }

  revalidatePath('/compras');
  revalidatePath('/');
  return { success: true, purchase: data as PurchaseRow };
}

export async function updatePurchaseAction(rawInput: UpdatePurchaseInput) {
  const parsed = UpdatePurchaseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados de atualização inválidos.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { data, error } = await supabase
    .from('purchases')
    .update({
      factory_name: parsed.data.factory_name.trim(),
      total_amount: parsed.data.total_amount,
      purchase_date: parsed.data.purchase_date,
      notes: parsed.data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao atualizar compra: ' + error.message };
  }

  revalidatePath('/compras');
  revalidatePath('/');
  return { success: true, purchase: data as PurchaseRow };
}

export async function deletePurchaseAction(id: string) {
  if (!id) {
    return { success: false, error: 'ID de compra não informado.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao excluir compra: ' + error.message };
  }

  revalidatePath('/compras');
  revalidatePath('/');
  return { success: true };
}

export async function getPurchasesAction(params?: {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão não identificada.', purchases: [], total: 0, totalPages: 0 };
  }

  let query = supabase
    .from('purchases')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id);

  if (params?.search && params.search.trim()) {
    query = query.ilike('factory_name', `%${params.search.trim()}%`);
  }

  if (params?.startDate) {
    query = query.gte('purchase_date', params.startDate);
  }

  if (params?.endDate) {
    query = query.lte('purchase_date', params.endDate);
  }

  query = query
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    return { success: false, error: error.message, purchases: [], total: 0, totalPages: 0 };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    purchases: (data || []) as PurchaseRow[],
    total,
    page,
    totalPages,
  };
}

export async function getPurchasesMetricsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      monthTotal: 0,
      monthCount: 0,
      allTimeTotal: 0,
      topFactory: null,
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const { data: allPurchases, error } = await supabase
    .from('purchases')
    .select('factory_name, total_amount, purchase_date')
    .eq('user_id', user.id);

  if (error || !allPurchases) {
    return {
      success: false,
      monthTotal: 0,
      monthCount: 0,
      allTimeTotal: 0,
      topFactory: null,
    };
  }

  let monthTotal = 0;
  let monthCount = 0;
  let allTimeTotal = 0;
  const factoryCounts: Record<string, { total: number; count: number }> = {};

  for (const p of allPurchases) {
    const amt = Number(p.total_amount) || 0;
    allTimeTotal += amt;

    const pDate = p.purchase_date;
    if (pDate >= startOfMonth && pDate <= endOfMonth) {
      monthTotal += amt;
      monthCount++;
    }

    if (!factoryCounts[p.factory_name]) {
      factoryCounts[p.factory_name] = { total: 0, count: 0 };
    }
    factoryCounts[p.factory_name].total += amt;
    factoryCounts[p.factory_name].count++;
  }

  // Identifica a fábrica mais comprada
  let topFactory: { name: string; total: number; count: number } | null = null;
  for (const [name, stats] of Object.entries(factoryCounts)) {
    if (!topFactory || stats.total > topFactory.total) {
      topFactory = { name, total: stats.total, count: stats.count };
    }
  }

  return {
    success: true,
    monthTotal: Math.round(monthTotal * 100) / 100,
    monthCount,
    allTimeTotal: Math.round(allTimeTotal * 100) / 100,
    topFactory,
  };
}

export async function getDistinctFactoriesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, factories: [] };
  }

  const { data, error } = await supabase
    .from('purchases')
    .select('factory_name')
    .eq('user_id', user.id);

  if (error || !data) {
    return { success: false, factories: [] };
  }

  const unique = Array.from(new Set(data.map((d) => d.factory_name).filter(Boolean))).sort();
  return { success: true, factories: unique };
}
