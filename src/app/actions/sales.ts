'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  SaleSchema,
  SaleInput,
  UpdateSaleSchema,
  UpdateSaleInput,
} from '@/lib/validations';

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

export async function updateSaleAction(rawInput: UpdateSaleInput) {
  const parsed = UpdateSaleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados inválidos para atualizar venda.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { id, description, total_amount, payment_method, sale_date, client_id } = parsed.data;

  // Atualiza a venda
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    description: description.trim(),
    total_amount,
    payment_method,
    updated_at: new Date().toISOString(),
  };

  if (sale_date) {
    updatePayload.sale_date = sale_date;
  }
  if (client_id) {
    updatePayload.client_id = client_id;
  }

  const { data: updatedSale, error } = await supabase
    .from('sales')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !updatedSale) {
    return { success: false, error: 'Erro ao atualizar venda: ' + error?.message };
  }

  // Se o cliente mudou, atualiza também nas parcelas associadas
  if (client_id) {
    await supabase
      .from('installments')
      .update({ client_id, updated_at: new Date().toISOString() })
      .eq('sale_id', id)
      .eq('user_id', user.id);
  }

  revalidatePath('/vendas');
  revalidatePath('/cobrancas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true, sale: updatedSale };
}

export async function deleteSaleAction(saleId: string) {
  if (!saleId) {
    return { success: false, error: 'ID de venda inválido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao excluir venda: ' + error.message };
  }

  revalidatePath('/vendas');
  revalidatePath('/cobrancas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true };
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
