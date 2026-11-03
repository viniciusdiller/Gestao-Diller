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
      taxa_plataforma_percentual,
      taxa_plataforma,
      tem_comissao_dani,
      taxa_dani_percentual,
      valor_comissao_dani,
      lucro_liquido_real,
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
    const [yStr, mStr] = params.month.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const lastDay = new Date(y, m, 0).getDate();
    const startOfMonth = `${params.month}-01`;
    const endOfMonth = `${params.month}-${String(lastDay).padStart(2, '0')}`;

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
    taxa_plataforma_percentual,
    taxa_plataforma,
    tem_comissao_dani,
    taxa_dani_percentual,
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
    taxaPlataformaPercentual: taxa_plataforma_percentual,
    taxaPlataforma: taxa_plataforma,
    temComissaoDani: tem_comissao_dani,
    taxaDaniPercentual: taxa_dani_percentual,
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
      taxa_limpeza: totals.taxa_limpeza,
      taxa_plataforma_percentual: totals.taxa_plataforma_percentual,
      taxa_plataforma: totals.taxa_plataforma,
      tem_comissao_dani: totals.tem_comissao_dani,
      taxa_dani_percentual: totals.taxa_dani_percentual,
      valor_comissao_dani: totals.valor_comissao_dani,
      lucro_liquido_real: totals.lucro_liquido_real,
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
  const taxaPlataformaPercentual =
    updates.taxa_plataforma_percentual !== undefined
      ? updates.taxa_plataforma_percentual
      : currentReserva.taxa_plataforma_percentual !== null
      ? Number(currentReserva.taxa_plataforma_percentual)
      : undefined;
  const taxaPlataforma =
    updates.taxa_plataforma !== undefined
      ? updates.taxa_plataforma
      : Number(currentReserva.taxa_plataforma);
  const temComissaoDani =
    updates.tem_comissao_dani !== undefined
      ? updates.tem_comissao_dani
      : Boolean(currentReserva.tem_comissao_dani);
  const taxaDaniPercentual =
    updates.taxa_dani_percentual !== undefined
      ? updates.taxa_dani_percentual
      : currentReserva.taxa_dani_percentual !== null
      ? Number(currentReserva.taxa_dani_percentual)
      : 20;

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
    taxaPlataformaPercentual,
    taxaPlataforma,
    temComissaoDani,
    taxaDaniPercentual,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    ...updates,
    num_diarias: totals.num_diarias,
    valor_total: totals.valor_total,
    taxa_limpeza: totals.taxa_limpeza,
    taxa_plataforma_percentual: totals.taxa_plataforma_percentual,
    taxa_plataforma: totals.taxa_plataforma,
    tem_comissao_dani: totals.tem_comissao_dani,
    taxa_dani_percentual: totals.taxa_dani_percentual,
    valor_comissao_dani: totals.valor_comissao_dani,
    lucro_liquido_real: totals.lucro_liquido_real,
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

