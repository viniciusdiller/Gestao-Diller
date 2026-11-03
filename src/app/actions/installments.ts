'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  PayInstallmentSchema,
  PayInstallmentInput,
  UpdateInstallmentSchema,
  UpdateInstallmentInput,
} from '@/lib/validations';

export interface InstallmentsPaginationParams {
  page?: number;
  pageSize?: number;
  status?: string;
  clientId?: string;
}

export async function getInstallmentsAction(params?: InstallmentsPaginationParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'Não autenticado',
      installments: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
    };
  }

  const page = Math.max(1, params?.page || 1);
  const pageSize = params?.pageSize ? Math.max(1, params.pageSize) : undefined;

  let query = supabase
    .from('installments')
    .select(
      `
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
    `,
      { count: 'exact' }
    )
    .eq('user_id', user.id);

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params?.clientId) {
    query = query.eq('client_id', params.clientId);
  }

  query = query.order('due_date', { ascending: true });

  if (pageSize) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data, count, error } = await query;

  if (error) {
    return {
      success: false,
      error: error.message,
      installments: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
    };
  }

  const totalCount = count ?? (data?.length || 0);
  const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

  return {
    success: true,
    installments: data || [],
    totalCount,
    totalPages,
    currentPage: page,
  };
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

  // Busca dados atuais da parcela
  const { data: currentInst, error: fetchErr } = await supabase
    .from('installments')
    .select('amount, sale_id')
    .eq('id', installment_id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !currentInst) {
    return { success: false, error: 'Parcela ou débito não encontrado.' };
  }

  const currentAmount = Number(currentInst.amount);
  const isPartial = paid_amount < currentAmount;

  if (isPartial) {
    // Abatimento parcial: abate o valor e mantém a parcela em aberto com saldo reduzido
    const newRemaining = Math.round((currentAmount - paid_amount) * 100) / 100;
    const { error: partialErr } = await supabase
      .from('installments')
      .update({
        amount: newRemaining,
        paid_amount,
        payment_method: payment_method || null,
        notes: notes ? `${notes} (Abatimento parcial)` : 'Abatimento parcial',
        updated_at: new Date().toISOString(),
      })
      .eq('id', installment_id)
      .eq('user_id', user.id);

    if (partialErr) {
      return {
        success: false,
        error: 'Erro ao registrar abatimento parcial: ' + partialErr.message,
      };
    }
  } else {
    // Quitação integral da parcela
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

    // 2. Verifica se todas as parcelas dessa venda foram quitadas
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
