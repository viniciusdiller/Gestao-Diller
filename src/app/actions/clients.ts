'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ClientSchema, ClientInput } from '@/lib/validations';
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

  const cleanPhone = sanitizePhoneForWhatsApp(parsed.data.phone);

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

export async function getClientsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado', clients: [] };
  }

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    return { success: false, error: error.message, clients: [] };
  }

  return { success: true, clients: clients || [] };
}

export async function getClientDetailsAction(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado' };
  }

  // 1. Busca dados do cliente
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('user_id', user.id)
    .single();

  if (clientErr || !client) {
    return { success: false, error: 'Cliente não encontrada.' };
  }

  // 2. Busca histórico de vendas
  const { data: sales } = await supabase
    .from('sales')
    .select('*')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .order('sale_date', { ascending: false });

  // 3. Busca parcelas do cliente
  const { data: installments } = await supabase
    .from('installments')
    .select('*')
    .eq('client_id', clientId)
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  // Métricas acumuladas do perfil
  const validSales = (sales || []).filter((s) => s.status !== 'cancelled');
  const totalSpent = validSales.reduce((acc, s) => acc + Number(s.total_amount), 0);

  // Meio de pagamento mais frequente
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

  // Saldo devedor pendente
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
