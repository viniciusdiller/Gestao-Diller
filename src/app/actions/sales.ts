'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { SaleSchema, SaleInput } from '@/lib/validations';

export async function createSaleAction(rawInput: SaleInput) {
  const parsed = SaleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados da venda inválidos.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { client_id, description, total_amount, payment_method, sale_date, installments } =
    parsed.data;

  // 1. Insere a venda
  const isFiado = payment_method === 'fiado';
  const saleStatus = isFiado ? 'pending' : 'completed';

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
      client_id,
      description: description.trim(),
      total_amount,
      payment_method,
      status: saleStatus,
      sale_date: sale_date || new Date().toISOString(),
    })
    .select()
    .single();

  if (saleErr || !sale) {
    return { success: false, error: 'Erro ao registrar venda: ' + saleErr?.message };
  }

  // 2. Se houver parcelas (fiado ou parcelamento informado), cria na tabela installments
  if (installments && installments.length > 0) {
    const installmentsToInsert = installments.map((inst) => ({
      user_id: user.id,
      sale_id: sale.id,
      client_id,
      installment_number: inst.installment_number,
      total_installments: inst.total_installments,
      amount: inst.amount,
      due_date: inst.due_date,
      status: 'pending',
    }));

    const { error: instErr } = await supabase
      .from('installments')
      .insert(installmentsToInsert);

    if (instErr) {
      return {
        success: false,
        error: 'Venda criada, mas ocorreu um erro ao gerar parcelas: ' + instErr.message,
      };
    }
  }

  revalidatePath('/vendas');
  revalidatePath('/cobrancas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true, sale };
}

export async function getSalesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado', sales: [] };
  }

  const { data: sales, error } = await supabase
    .from('sales')
    .select(`
      id,
      description,
      total_amount,
      payment_method,
      status,
      sale_date,
      clients (
        id,
        name,
        phone
      )
    `)
    .eq('user_id', user.id)
    .order('sale_date', { ascending: false });

  if (error) {
    return { success: false, error: error.message, sales: [] };
  }

  return { success: true, sales: sales || [] };
}
