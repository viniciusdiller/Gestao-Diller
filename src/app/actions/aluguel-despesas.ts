'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  CreateDespesaSchema,
  CreateDespesaInput,
  UpdateDespesaSchema,
  UpdateDespesaInput,
} from '@/lib/validations/aluguel';

export interface GetDespesasParams {
  month?: string; // AAAA-MM
  categoria?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getDespesasAction(params?: GetDespesasParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'Não autenticado',
      despesas: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
    };
  }

  const page = Math.max(1, params?.page || 1);
  const pageSize = params?.pageSize ? Math.max(1, params.pageSize) : undefined;
  const search = params?.search?.trim();

  let query = supabase
    .from('aluguel_despesas')
    .select(
      `
      id,
      reserva_id,
      categoria,
      descricao,
      valor,
      data_despesa,
      created_at,
      updated_at
    `,
      { count: 'exact' }
    )
    .eq('user_id', user.id);

  if (params?.categoria && params.categoria !== 'all') {
    query = query.eq('categoria', params.categoria);
  }

  if (search) {
    query = query.ilike('descricao', `%${search}%`);
  }

  if (params?.month) {
    const startOfMonth = `${params.month}-01`;
    const nextMonthYear = parseInt(params.month.split('-')[0], 10);
    const nextMonthMonth = parseInt(params.month.split('-')[1], 10);
    const endOfMonthDate = new Date(nextMonthYear, nextMonthMonth, 0);
    const endOfMonth = endOfMonthDate.toISOString().slice(0, 10);

    query = query
      .gte('data_despesa', startOfMonth)
      .lte('data_despesa', endOfMonth);
  }

  query = query.order('data_despesa', { ascending: false });

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
      despesas: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: page,
    };
  }

  const totalCount = count ?? (data?.length || 0);
  const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

  return {
    success: true,
    despesas: data || [],
    totalCount,
    totalPages,
    currentPage: page,
  };
}

export async function createDespesaAction(rawInput: CreateDespesaInput) {
  const parsed = CreateDespesaSchema.safeParse(rawInput);
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

  const { reserva_id, categoria, descricao, valor, data_despesa } = parsed.data;

  const { data, error } = await supabase
    .from('aluguel_despesas')
    .insert({
      user_id: user.id,
      reserva_id: reserva_id || null,
      categoria,
      descricao,
      valor,
      data_despesa,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao cadastrar despesa: ' + error.message };
  }

  revalidatePath('/itauna/despesas');
  revalidatePath('/itauna');
  return { success: true, despesa: data };
}

export async function updateDespesaAction(rawInput: UpdateDespesaInput) {
  const parsed = UpdateDespesaSchema.safeParse(rawInput);
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

  const { id, reserva_id, categoria, descricao, valor, data_despesa } = parsed.data;

  const { data, error } = await supabase
    .from('aluguel_despesas')
    .update({
      reserva_id: reserva_id || null,
      categoria,
      descricao,
      valor,
      data_despesa,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao atualizar despesa: ' + error.message };
  }

  revalidatePath('/itauna/despesas');
  revalidatePath('/itauna');
  return { success: true, despesa: data };
}

export async function deleteDespesaAction(despesaId: string) {
  if (!despesaId) {
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
    .from('aluguel_despesas')
    .delete()
    .eq('id', despesaId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'Erro ao excluir despesa: ' + error.message };
  }

  revalidatePath('/itauna/despesas');
  revalidatePath('/itauna');
  return { success: true };
}

