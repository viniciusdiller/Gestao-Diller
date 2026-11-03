export interface ReservaCalculada {
  num_diarias: number;
  subtotal_diarias: number;
  taxa_limpeza: number;
  valor_total: number;
  taxa_plataforma: number;
  lucro_liquido_reserva: number;
}

/**
 * Calcula a quantidade de noites/diárias entre check-in e check-out
 */
export function calculateNights(checkinStr: string, checkoutStr: string): number {
  if (!checkinStr || !checkoutStr) return 0;
  const d1 = new Date(checkinStr + 'T12:00:00Z');
  const d2 = new Date(checkoutStr + 'T12:00:00Z');
  const diffMs = d2.getTime() - d1.getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcula os totais financeiros de uma reserva:
 * - Subtotal: noites * valor_diaria
 * - Total Cobrado: subtotal + taxa_limpeza
 * - Lucro Líquido da Reserva: Total - taxa_plataforma
 */
export function calculateReservaTotals(params: {
  checkin: string;
  checkout: string;
  valorDiaria: number;
  taxaLimpeza?: number;
  taxaPlataforma?: number;
}): ReservaCalculada {
  const num_diarias = calculateNights(params.checkin, params.checkout);
  const valorDiaria = Math.max(0, params.valorDiaria || 0);
  const taxa_limpeza = Math.max(0, params.taxaLimpeza || 0);
  const taxa_plataforma = Math.max(0, params.taxaPlataforma || 0);

  const subtotal_diarias = Math.round(num_diarias * valorDiaria * 100) / 100;
  const valor_total = Math.round((subtotal_diarias + taxa_limpeza) * 100) / 100;
  const lucro_liquido_reserva = Math.round((valor_total - taxa_plataforma) * 100) / 100;

  return {
    num_diarias,
    subtotal_diarias,
    taxa_limpeza,
    valor_total,
    taxa_plataforma,
    lucro_liquido_reserva,
  };
}

export interface ReservaItem {
  id: string;
  data_checkin: string;
  data_checkout: string;
  status: string;
  hospede_nome?: string;
  hospede_telefone?: string;
}

/**
 * Verifica se a Casa de Itaúna está livre ou ocupada na data de referência (padrão: hoje)
 */
export function checkVacancyStatus(reservas: ReservaItem[], targetDateStr: string) {
  // Uma reserva ocupa a casa se: status ativo E checkin <= targetDate < checkout
  const activeReservation = reservas.find((r) => {
    if (r.status === 'cancelada') return false;
    return r.data_checkin <= targetDateStr && targetDateStr < r.data_checkout;
  });

  if (activeReservation) {
    return {
      isOccupied: true,
      statusLabel: 'Ocupada Hoje',
      reservation: activeReservation,
    };
  }

  // Verifica se há check-in hoje
  const checkinToday = reservas.find(
    (r) => r.status !== 'cancelada' && r.data_checkin === targetDateStr
  );

  return {
    isOccupied: false,
    statusLabel: checkinToday ? 'Check-in Hoje' : 'Livre Hoje',
    checkinToday,
  };
}

/**
 * Calcula Lucro Líquido Real do Mês:
 * Faturamento Bruto (reservas confirmadas/em andamento/concluídas do mês)
 * - Comissões de Plataforma
 * - Total de Despesas do Mês
 */
export function calculateMonthlyProfit(params: {
  reservas: Array<{
    valor_total: number;
    taxa_plataforma: number;
    status: string;
    data_checkin: string;
  }>;
  despesas: Array<{
    valor: number;
    data_despesa: string;
  }>;
  monthPrefix: string; // Ex: '2026-11'
}) {
  const monthReservas = params.reservas.filter((r) => {
    return r.status !== 'cancelada' && r.data_checkin.startsWith(params.monthPrefix);
  });

  const faturamentoBruto = monthReservas.reduce(
    (acc, r) => acc + Number(r.valor_total || 0),
    0
  );

  const totalComissoes = monthReservas.reduce(
    (acc, r) => acc + Number(r.taxa_plataforma || 0),
    0
  );

  const monthDespesas = params.despesas.filter((d) =>
    d.data_despesa.startsWith(params.monthPrefix)
  );

  const totalDespesas = monthDespesas.reduce(
    (acc, d) => acc + Number(d.valor || 0),
    0
  );

  const lucroLiquidoReal =
    Math.round((faturamentoBruto - totalComissoes - totalDespesas) * 100) / 100;

  return {
    faturamentoBruto: Math.round(faturamentoBruto * 100) / 100,
    totalComissoes: Math.round(totalComissoes * 100) / 100,
    totalDespesas: Math.round(totalDespesas * 100) / 100,
    lucroLiquidoReal,
    reservasCount: monthReservas.length,
    despesasCount: monthDespesas.length,
  };
}

/**
 * Detecta conflito de datas de reservas no calendário
 */
export function hasDateConflict(
  existingReservas: Array<{ id: string; data_checkin: string; data_checkout: string; status: string }>,
  newCheckin: string,
  newCheckout: string,
  ignoreReservaId?: string
): boolean {
  return existingReservas.some((r) => {
    if (r.id === ignoreReservaId) return false;
    if (r.status === 'cancelada') return false;

    // Duas reservas colidem se: checkin1 < checkout2 AND checkout1 > checkin2
    return newCheckin < r.data_checkout && newCheckout > r.data_checkin;
  });
}
