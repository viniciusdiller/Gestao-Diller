'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  CreateReservaSchema,
  CreateReservaInput,
  UpdateReservaSchema,
  UpdateReservaInput,
} from '@/lib/validations/aluguel';
import {
  calculateReservaTotals,
  hasDateConflict,
} from '@/lib/services/aluguel-calculator';

export interface GetReservasParams {
  status?: string;
  origem?: string;
  hospedeId?: string;
  month?: string; // Formato AAAA-MM
}

export async function getReservasAction(params?: GetReservasParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado', reservas: [] };
  }

  let query = supabase
    .from('aluguel_reservas')
    .select(`
      id,
      hospede_id,
      data_checkin,
      data_checkout,
      num_diarias,
      valor_diaria,
      taxa_limpeza,
      taxa_plataforma,
      origem,
      valor_total,
      status,
      status_pagamento,
      valor_pago,
      observacoes,
      created_at,
      updated_at,
      aluguel_hospedes (
        id,
        nome,
        telefone
      )
    `)
    .eq('user_id', user.id);

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params?.origem && params.origem !== 'all') {
    query = query.eq('origem', params.origem);
  }

  if (params?.hospedeId) {
    query = query.eq('hospede_id', params.hospedeId);
  }

  if (params?.month) {
    // Filtra reservas que começam no mês ou cruzam o mês
    const startOfMonth = `${params.month}-01`;
    const nextMonthYear = parseInt(params.month.split('-')[0], 10);
    const nextMonthMonth = parseInt(params.month.split('-')[1], 10);
    const endOfMonthDate = new Date(nextMonthYear, nextMonthMonth, 0);
    const endOfMonth = endOfMonthDate.toISOString().slice(0, 10);

    query = query
      .lte('data_checkin', endOfMonth)
      .gte('data_checkout', startOfMonth);
  }

  query = query.order('data_checkin', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message, reservas: [] };
  }

  return { success: true, reservas: data || [] };
}

export async function createReservaAction(rawInput: CreateReservaInput) {
  const parsed = CreateReservaSchema.safeParse(rawInput);
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

  const {
    hospede_id,
    data_checkin,
    data_checkout,
    valor_diaria,
    taxa_limpeza,
    taxa_plataforma,
    origem,
    status,
    status_pagamento,
    valor_pago,
    observacoes,
  } = parsed.data;

  // 1. Verifica conflito de datas com reservas ativas existentes
  const { data: existingReservas } = await supabase
    .from('aluguel_reservas')
    .select('id, data_checkin, data_checkout, status')
    .eq('user_id', user.id)
    .neq('status', 'cancelada');

  if (
    existingReservas &&
    hasDateConflict(existingReservas, data_checkin, data_checkout)
  ) {
    return {
      success: false,
      error:
        'Conflito de datas: a Casa Itaúna já possui uma reserva confirmada para este período.',
    };
  }

  // 2. Calcula totais e diárias exatas
  const totals = calculateReservaTotals({
    checkin: data_checkin,
    checkout: data_checkout,
    valorDiaria: valor_diaria,
    taxaLimpeza: taxa_limpeza,
    taxaPlataforma: taxa_plataforma,
  });

  const { data: newReserva, error } = await supabase
    .from('aluguel_reservas')
    .insert({
      user_id: user.id,
      hospede_id,
      data_checkin,
      data_checkout,
      num_diarias: totals.num_diarias,
      valor_diaria,
      taxa_limpeza,
      taxa_plataforma,
      origem,
      valor_total: totals.valor_total,
      status,
      status_pagamento,
      valor_pago: status_pagamento === 'pago' ? totals.valor_total : valor_pago,
      observacoes: observacoes || null,
    })
    .select(`
      *,
      aluguel_hospedes (
        id,
        nome,
        telefone
      )
    `)
    .single();

  if (error) {
    return { success: false, error: 'Erro ao criar reserva: ' + error.message };
  }

  revalidatePath('/itauna/reservas');
  revalidatePath('/itauna/calendario');
  revalidatePath('/itauna');
  return { success: true, reserva: newReserva };
}

export async function updateReservaAction(rawInput: UpdateReservaInput) {
  const parsed = UpdateReservaSchema.safeParse(rawInput);
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

  const { id, ...updates } = parsed.data;

  // Busca dados atuais da reserva
  const { data: currentReserva, error: fetchErr } = await supabase
    .from('aluguel_reservas')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !currentReserva) {
    return { success: false, error: 'Reserva não encontrada.' };
  }

  const checkin = updates.data_checkin || currentReserva.data_checkin;
  const checkout = updates.data_checkout || currentReserva.data_checkout;
  const valorDiaria =
    updates.valor_diaria !== undefined
      ? updates.valor_diaria
      : Number(currentReserva.valor_diaria);
  const taxaLimpeza =
    updates.taxa_limpeza !== undefined
      ? updates.taxa_limpeza
      : Number(currentReserva.taxa_limpeza);
  const taxaPlataforma =
    updates.taxa_plataforma !== undefined
      ? updates.taxa_plataforma
      : Number(currentReserva.taxa_plataforma);

  // Se mudou datas ou status, checa conflito
  if (
    (updates.data_checkin || updates.data_checkout) &&
    updates.status !== 'cancelada'
  ) {
    const { data: existingReservas } = await supabase
      .from('aluguel_reservas')
      .select('id, data_checkin, data_checkout, status')
      .eq('user_id', user.id)
      .neq('status', 'cancelada');

    if (
      existingReservas &&
      hasDateConflict(existingReservas, checkin, checkout, id)
    ) {
      return {
        success: false,
        error:
          'Conflito de datas: outro hóspede já possui reserva neste período.',
      };
    }
  }

  // Recalcula totais
  const totals = calculateReservaTotals({
    checkin,
    checkout,
    valorDiaria,
    taxaLimpeza,
    taxaPlataforma,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    ...updates,
    num_diarias: totals.num_diarias,
    valor_total: totals.valor_total,
    updated_at: new Date().toISOString(),
  };

  if (updates.status_pagamento === 'pago') {
    payload.valor_pago = totals.valor_total;
  }

  const { data: updated, error } = await supabase
    .from('aluguel_reservas')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      aluguel_hospedes (
        id,
        nome,
        telefone
      )
    `)
    .single();

  if (error) {
    return { success: false, error: 'Erro ao atualizar reserva: ' + error.message };
  }

  revalidatePath('/itauna/reservas');
  revalidatePath('/itauna/calendario');
  revalidatePath('/itauna');
  return { success: true, reserva: updated };
}

export async function deleteReservaAction(reservaId: string) {
  if (!reservaId) {
    return { success: false, error: 'ID inválido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const { error } = await supabase
    .from('aluguel_reservas')
    .delete()
    .eq('id', reservaId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao excluir reserva: ' + error.message };
  }

  revalidatePath('/itauna/reservas');
  revalidatePath('/itauna/calendario');
  revalidatePath('/itauna');
  return { success: true };
}
