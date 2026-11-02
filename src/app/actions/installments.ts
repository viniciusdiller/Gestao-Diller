'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PayInstallmentSchema, PayInstallmentInput } from '@/lib/validations';

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
