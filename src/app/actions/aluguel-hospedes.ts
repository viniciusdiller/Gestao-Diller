'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  CreateHospedeSchema,
  CreateHospedeInput,
  UpdateHospedeSchema,
  UpdateHospedeInput,
} from '@/lib/validations/aluguel';

export async function getHospedesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado', hospedes: [] };
  }

  // Busca hóspedes com agregação de reservas
  const { data: hospedes, error } = await supabase
    .from('aluguel_hospedes')
    .select(`
      id,
      nome,
      telefone,
      notas_observacoes,
      created_at,
      updated_at,
      aluguel_reservas (
        id,
        valor_total,
        status,
        data_checkin,
        data_checkout
      )
    `)
    .eq('user_id', user.id)
    .order('nome', { ascending: true });

  if (error) {
    return { success: false, error: error.message, hospedes: [] };
  }

  // Processa contagem de estadias e total gasto
  const formatted = (hospedes || []).map((h) => {
    const reservasValidas = (h.aluguel_reservas || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.status !== 'cancelada'
    );
    const totalEstadias = reservasValidas.length;
    const totalGasto = reservasValidas.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (acc: number, r: any) => acc + Number(r.valor_total || 0),
      0
    );

    return {
      id: h.id,
      nome: h.nome,
      telefone: h.telefone,
      notas_observacoes: h.notas_observacoes,
      totalEstadias,
      totalGasto,
      created_at: h.created_at,
    };
  });

  return { success: true, hospedes: formatted };
}

export async function createHospedeAction(rawInput: CreateHospedeInput) {
  const parsed = CreateHospedeSchema.safeParse(rawInput);
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

  const { nome, telefone, notas_observacoes } = parsed.data;

  const { data, error } = await supabase
    .from('aluguel_hospedes')
    .insert({
      user_id: user.id,
      nome,
      telefone: telefone || null,
      notas_observacoes: notas_observacoes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao cadastrar hóspede: ' + error.message };
  }

  revalidatePath('/itauna/hospedes');
  revalidatePath('/itauna/reservas');
  revalidatePath('/itauna');
  return { success: true, hospede: data };
}

export async function updateHospedeAction(rawInput: UpdateHospedeInput) {
  const parsed = UpdateHospedeSchema.safeParse(rawInput);
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

  const { id, nome, telefone, notas_observacoes } = parsed.data;

  const { data, error } = await supabase
    .from('aluguel_hospedes')
    .update({
      nome,
      telefone: telefone || null,
      notas_observacoes: notas_observacoes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao atualizar hóspede: ' + error.message };
  }

  revalidatePath('/itauna/hospedes');
  revalidatePath('/itauna/reservas');
  revalidatePath('/itauna');
  return { success: true, hospede: data };
}

export async function deleteHospedeAction(hospedeId: string) {
  if (!hospedeId) {
    return { success: false, error: 'ID inválido.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  // Verifica se há reservas ativas
  const { count } = await supabase
    .from('aluguel_reservas')
    .select('*', { count: 'exact', head: true })
    .eq('hospede_id', hospedeId)
    .eq('user_id', user.id);

  if (count && count > 0) {
    return {
      success: false,
      error: `Não é possível excluir este hóspede pois existem ${count} reserva(s) associada(s) a ele.`,
    };
  }

  const { error } = await supabase
    .from('aluguel_hospedes')
    .delete()
    .eq('id', hospedeId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao excluir hóspede: ' + error.message };
  }

  revalidatePath('/itauna/hospedes');
  revalidatePath('/itauna/reservas');
  revalidatePath('/itauna');
  return { success: true };
}
