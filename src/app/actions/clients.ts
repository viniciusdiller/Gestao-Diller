'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  ClientSchema,
  ClientInput,
  UpdateClientSchema,
  UpdateClientInput,
} from '@/lib/validations';
import { sanitizePhoneForWhatsApp } from '@/lib/services/whatsapp';

export async function createClientAction(rawInput: ClientInput) {
  const parsed = ClientSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados inválidos.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const cleanPhone = parsed.data.phone?.trim()
    ? sanitizePhoneForWhatsApp(parsed.data.phone)
    : null;

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      name: parsed.data.name.trim(),
      phone: cleanPhone,
      notes: parsed.data.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao cadastrar cliente: ' + error.message };
  }

  revalidatePath('/clientes');
  revalidatePath('/vendas');
  revalidatePath('/');
  return { success: true, client: data };
}

export async function updateClientAction(rawInput: UpdateClientInput) {
  const parsed = UpdateClientSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados inválidos para atualização.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const cleanPhone = parsed.data.phone?.trim()
    ? sanitizePhoneForWhatsApp(parsed.data.phone)
    : null;

  const { data, error } = await supabase
    .from('clients')
    .update({
      name: parsed.data.name.trim(),
      phone: cleanPhone,
      notes: parsed.data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao atualizar cliente: ' + error.message };
  }

  revalidatePath('/clientes');
  revalidatePath('/vendas');
  revalidatePath('/cobrancas');
  revalidatePath('/');
  return { success: true, client: data };
}

export async function deleteClientAction(clientId: string) {
  if (!clientId) {
    return { success: false, error: 'ID de cliente inválido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao excluir cliente: ' + error.message };
  }

  revalidatePath('/clientes');
  revalidatePath('/vendas');
  revalidatePath('/cobrancas');
  revalidatePath('/');
  return { success: true };
}

export interface ClientsPaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getClientsAction(params?: ClientsPaginationParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado', clients: [], totalCount: 0, totalPages: 1, currentPage: 1 };
  }

  const page = Math.max(1, params?.page || 1);
  const pageSize = params?.pageSize ? Math.max(1, params.pageSize) : undefined;
  const search = params?.search?.trim();

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  query = query.order('name', { ascending: true });

  if (pageSize) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data: clients, count, error } = await query;

  if (error) {
    return { success: false, error: error.message, clients: [], totalCount: 0, totalPages: 1, currentPage: 1 };
  }

  const totalCount = count ?? (clients?.length || 0);
  const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

  return {
    success: true,
    clients: clients || [],
    totalCount,
    totalPages,
    currentPage: page,
  };
}

export async function getClientDetailsAction(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado' };
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('user_id', user.id)
    .single();

  if (clientErr || !client) {
    return { success: false, error: 'Cliente não encontrada.' };
  }

  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .order('sale_date', { ascending: false });

  const { data: installments } = await supabase
    .from('installments')
    .select('*')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  const validSales = (sales || []).filter((s) => s.status !== 'cancelled');
  const totalSpent = validSales.reduce((acc, s) => acc + Number(s.total_amount), 0);

  const methodCounts: Record<string, number> = {};
  validSales.forEach((s) => {
    methodCounts[s.payment_method] = (methodCounts[s.payment_method] || 0) + 1;
  });
  let mostFrequentPaymentMethod = 'Nenhum';
  let maxCount = 0;
  for (const [method, count] of Object.entries(methodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentPaymentMethod = method;
    }
  }

  const pendingInstallments = (installments || []).filter((i) => i.status === 'pending');
  const outstandingBalance = pendingInstallments.reduce((acc, i) => acc + Number(i.amount), 0);

  return {
    success: true,
    client,
    sales: sales || [],
    installments: installments || [],
    totalSpent,
    mostFrequentPaymentMethod,
    outstandingBalance,
    salesCount: validSales.length,
  };
}
