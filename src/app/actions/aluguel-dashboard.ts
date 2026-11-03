'use server';

import { createClient } from '@/lib/supabase/server';
import {
  checkVacancyStatus,
  calculateMonthlyProfit,
} from '@/lib/services/aluguel-calculator';

export async function getAluguelDashboardDataAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Não autenticado' };
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7); // AAAA-MM

  // 1. Busca todas as reservas ativas
  const { data: reservas, error: resErr } = await supabase
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
      aluguel_hospedes (
        id,
        nome,
        telefone
      )
    `)
    .eq('user_id', user.id)
    .order('data_checkin', { ascending: true });

  if (resErr) {
    return { success: false, error: resErr.message };
  }

  // 2. Busca despesas do ano/mês
  const { data: despesas, error: despErr } = await supabase
    .from('aluguel_despesas')
    .select('*')
    .eq('user_id', user.id);

  if (despErr) {
    return { success: false, error: despErr.message };
  }

  // 3. Status de Vacância Hoje
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedReservas = (reservas || []).map((r: any) => ({
    id: r.id,
    data_checkin: r.data_checkin,
    data_checkout: r.data_checkout,
    status: r.status,
    hospede_nome: r.aluguel_hospedes?.nome || 'Hóspede',
    hospede_telefone: r.aluguel_hospedes?.telefone,
    valor_total: Number(r.valor_total),
    taxa_plataforma: Number(r.taxa_plataforma),
  }));

  const vacancy = checkVacancyStatus(mappedReservas, todayStr);

  // 4. Lucro Líquido Real do Mês Corrente
  const monthlyMetrics = calculateMonthlyProfit({
    reservas: mappedReservas,
    despesas: (despesas || []).map((d) => ({
      valor: Number(d.valor),
      data_despesa: d.data_despesa,
    })),
    monthPrefix: currentMonthStr,
  });

  // 5. Próximos Check-ins (data_checkin >= hoje)
  const upcomingCheckins = (reservas || [])
    .filter((r) => r.status !== 'cancelada' && r.data_checkin >= todayStr)
    .slice(0, 3);

  // 6. Próximos Check-outs (data_checkout >= hoje)
  const upcomingCheckouts = (reservas || [])
    .filter((r) => r.status !== 'cancelada' && r.data_checkout >= todayStr)
    .sort((a, b) => a.data_checkout.localeCompare(b.data_checkout))
    .slice(0, 3);

  return {
    success: true,
    todayStr,
    currentMonthStr,
    vacancy,
    metrics: monthlyMetrics,
    upcomingCheckins,
    upcomingCheckouts,
    reservas: reservas || [],
    despesas: despesas || [],
  };
}
