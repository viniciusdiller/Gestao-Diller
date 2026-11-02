'use server';

import { createClient } from '@/lib/supabase/server';
import {
  calculateDashboardMetrics,
  SaleRecord,
  InstallmentRecord,
} from '@/lib/services/kpi-calculator';

export async function getDashboardDataAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado' };
  }

  // 1. Vendas
  const { data: salesRaw } = await supabase
    .from('sales')
    .select(`
      id,
      client_id,
      total_amount,
      payment_method,
      status,
      sale_date,
      clients (
        name
      )
    `)
    .eq('user_id', user.id);

  // 2. Parcelas
  const { data: installmentsRaw } = await supabase
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
      clients (
        name,
        phone
      )
    `)
    .eq('user_id', user.id);

  // Mapeia para formatos tipados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sales: SaleRecord[] = (salesRaw || []).map((s: any) => ({
    id: s.id,
    client_id: s.client_id,
    client_name: s.clients?.name,
    total_amount: Number(s.total_amount),
    payment_method: s.payment_method,
    status: s.status,
    sale_date: s.sale_date,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const installments: InstallmentRecord[] = (installmentsRaw || []).map((i: any) => ({
    id: i.id,
    sale_id: i.sale_id,
    client_id: i.client_id,
    client_name: i.clients?.name,
    client_phone: i.clients?.phone,
    installment_number: i.installment_number,
    total_installments: i.total_installments,
    amount: Number(i.amount),
    due_date: i.due_date,
    status: i.status,
  }));

  const metrics = calculateDashboardMetrics(sales, installments, new Date());

  return {
    success: true,
    metrics,
  };
}
