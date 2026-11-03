'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  SaleSchema,
  SaleInput,
  UpdateSaleSchema,
  UpdateSaleInput,
} from '@/lib/validations';
import {
  calculateSettlement,
  distributeFIFOAbatement,
  roundToCents,
} from '@/lib/services/caderneta-calculator';

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

  const {
    client_id,
    description,
    items,
    total_amount,
    paid_amount_now = 0,
    payment_method,
    sale_date,
    installments,
  } = parsed.data;

  // Monta a descrição com base nos itens caso não tenha sido passada manualmente
  const finalDescription =
    description && description.trim().length >= 2
      ? description.trim()
      : items && items.length > 0
      ? items.map((it) => `${it.quantity}x ${it.name}`).join(', ')
      : 'Venda de Semijoias';

  // 1. Busca dívidas pendentes anteriores da cliente para calcular conta corrente
  const { data: pendingInstallments } = await supabase
    .from('installments')
    .select('id, amount, due_date, created_at')
    .eq('client_id', client_id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true });

  const previousDebt = (pendingInstallments || []).reduce(
    (acc, i) => acc + Number(i.amount),
    0
  );

  const settlement = calculateSettlement({
    previousDebt,
    saleTotal: total_amount,
    paidAmountNow: paid_amount_now,
  });

  const saleStatus = settlement.newSaleRemaining === 0 ? 'completed' : 'pending';

  // 2. Insere a venda com controle de valor pago e restante
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      user_id: user.id,
      client_id,
      description: finalDescription,
      total_amount,
      paid_amount_now: settlement.newSalePaid,
      remaining_amount: settlement.newSaleRemaining,
      payment_method,
      status: saleStatus,
      sale_date: sale_date || new Date().toISOString(),
    })
    .select()
    .single();

  if (saleErr || !sale) {
    return { success: false, error: 'Erro ao registrar venda: ' + saleErr?.message };
  }

  // 3. Insere itens da venda na tabela relacional sale_items
  if (items && items.length > 0) {
    const itemsToInsert = items.map((it) => ({
      sale_id: sale.id,
      user_id: user.id,
      name: it.name.trim(),
      quantity: Math.max(1, Number(it.quantity) || 1),
      unit_price: Number(it.unit_price),
      total_price: roundToCents(
        Math.max(1, Number(it.quantity) || 1) * Number(it.unit_price)
      ),
    }));

    const { error: itemsErr } = await supabase.from('sale_items').insert(itemsToInsert);
    if (itemsErr) {
      console.error('Aviso ao registrar itens da venda:', itemsErr.message);
    }
  }

  // 4. Se foram passadas parcelas tradicionais explícitas (ex: testes legados)
  if (installments && installments.length > 1) {
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

    await supabase.from('installments').insert(installmentsToInsert);
  } else if (settlement.newSaleRemaining > 0) {
    // Caso padrão de caderneta: saldo restante vira débito em aberto
    const dueDateStr = sale_date
      ? sale_date.split('T')[0]
      : new Date().toISOString().split('T')[0];

    await supabase.from('installments').insert({
      user_id: user.id,
      sale_id: sale.id,
      client_id,
      installment_number: 1,
      total_installments: 1,
      amount: settlement.newSaleRemaining,
      due_date: dueDateStr,
      status: 'pending',
      notes: 'Saldo em aberto da venda',
    });
  }

  // 5. Se o cliente pagou a mais que o novo pedido, quita dívidas anteriores (FIFO)
  if (
    settlement.surplusForPreviousDebt > 0 &&
    pendingInstallments &&
    pendingInstallments.length > 0
  ) {
    const plan = distributeFIFOAbatement(
      pendingInstallments.map((p) => ({ id: p.id, amount: Number(p.amount) })),
      settlement.surplusForPreviousDebt
    );

    for (const op of plan.operations) {
      if (op.action === 'full') {
        await supabase
          .from('installments')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            paid_amount: op.originalAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', op.installmentId)
          .eq('user_id', user.id);
      } else if (op.action === 'partial') {
        await supabase
          .from('installments')
          .update({
            amount: op.newRemainingAmount,
            paid_amount: roundToCents(op.originalAmount - op.newRemainingAmount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', op.installmentId)
          .eq('user_id', user.id);
      }
    }
  }

  revalidatePath('/vendas');
  revalidatePath('/cobrancas');
  revalidatePath('/clientes');
  revalidatePath('/');
  return { success: true, sale, settlement };
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

export interface SalesPaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  paymentMethod?: string;
}

export async function getSalesAction(params?: SalesPaginationParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: 'Não autenticado',
      sales: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
    };
  }

  const page = Math.max(1, params?.page || 1);
  const pageSize = params?.pageSize ? Math.max(1, params.pageSize) : undefined;
  const search = params?.search?.trim();
  const paymentMethod = params?.paymentMethod?.trim();

  let query = supabase
    .from('sales')
    .select(
      `
      id,
      description,
      total_amount,
      paid_amount_now,
      remaining_amount,
      payment_method,
      status,
      sale_date,
      clients (
        id,
        name,
        phone
      ),
      sale_items (
        id,
        name,
        quantity,
        unit_price,
        total_price
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', user.id);

  if (paymentMethod && paymentMethod !== 'all') {
    query = query.eq('payment_method', paymentMethod);
  }

  if (search) {
    query = query.ilike('description', `%${search}%`);
  }

  query = query.order('sale_date', { ascending: false });

  if (pageSize) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data: sales, count, error } = await query;

  if (error) {
    return {
      success: false,
      error: error.message,
      sales: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
    };
  }

  const totalCount = count ?? (sales?.length || 0);
  const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

  return {
    success: true,
    sales: sales || [],
    totalCount,
    totalPages,
    currentPage: page,
  };
}
