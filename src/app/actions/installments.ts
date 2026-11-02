'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  PayInstallmentSchema,
  PayInstallmentInput,
  UpdateInstallmentSchema,
  UpdateInstallmentInput,
} from '@/lib/validations';

export async function getInstallmentsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado', installments: [] };
  }

  const { data, error } = await supabase
    .from('installments')
    .select(`
      id,
      sale_id,
      client_id,
      installment_number,
      total_installments,
      amount,
      due_date,
      status,
      paid_at,
      paid_amount,
      payment_method,
      notes,
      clients (
        id,
        name,
        phone
      ),
      sales (
        id,
        description
      )
    `)
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  if (error) {
    return { success: false, error: error.message, installments: [] };
  }

  return { success: true, installments: data || [] };
}

export async function markInstallmentPaidAction(rawInput: PayInstallmentInput) {
  const parsed = PayInstallmentSchema.safeParse(rawInput);
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

  const { installment_id, paid_amount, payment_method, notes } = parsed.data;

  // 1. Atualiza a parcela
  const { data: updatedInstallment, error: updateErr } = await supabase
    .from('installments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount,
      payment_method: payment_method || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', installment_id)
    .eq('user_id', user.id)
    .select('sale_id')
    .single();

  if (updateErr || !updatedInstallment) {
    return { success: false, error: 'Erro ao registrar pagamento: ' + updateErr?.message };
  }

  // 2. Verifica se todas as parcelas dessa venda foram pagas
  const saleId = updatedInstallment.sale_id;
  const { data: remainingPending } = await supabase
    .from('installments')
    .select('id')
    .eq('sale_id', saleId)
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (!remainingPending || remainingPending.length === 0) {
    await supabase
      .from('sales')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', saleId)
      .eq('user_id', user.id);
  }

  revalidatePath('/cobrancas');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true };
}

export async function revertInstallmentPaymentAction(installmentId: string) {
  if (!installmentId) {
    return { success: false, error: 'ID de parcela inválido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // 1. Volta parcela para pending
  const { data: updatedInstallment, error: updateErr } = await supabase
    .from('installments')
    .update({
      status: 'pending',
      paid_at: null,
      paid_amount: null,
      payment_method: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', installmentId)
    .eq('user_id', user.id)
    .select('sale_id')
    .single();

  if (updateErr || !updatedInstallment) {
    return { success: false, error: 'Erro ao estornar parcela: ' + updateErr?.message };
  }

  // 2. Volta a venda para status pending
  const saleId = updatedInstallment.sale_id;
  if (saleId) {
    await supabase
      .from('sales')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', saleId)
      .eq('user_id', user.id);
  }

  revalidatePath('/cobrancas');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true };
}

export async function updateInstallmentAction(rawInput: UpdateInstallmentInput) {
  const parsed = UpdateInstallmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados inválidos para atualizar parcela.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { id, amount, due_date, status, paid_amount, notes } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    amount,
    due_date,
    updated_at: new Date().toISOString(),
  };

  if (status) payload.status = status;
  if (paid_amount !== undefined) payload.paid_amount = paid_amount;
  if (notes !== undefined) payload.notes = notes;

  const { data: updated, error } = await supabase
    .from('installments')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('sale_id')
    .single();

  if (error || !updated) {
    return { success: false, error: 'Erro ao atualizar parcela: ' + error?.message };
  }

  revalidatePath('/cobrancas');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true, installment: updated };
}

export async function deleteInstallmentAction(installmentId: string) {
  if (!installmentId) {
    return { success: false, error: 'ID de parcela inválido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { error } = await supabase
    .from('installments')
    .delete()
    .eq('id', installmentId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao excluir parcela: ' + error.message };
  }

  revalidatePath('/cobrancas');
  revalidatePath('/vendas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true };
}
