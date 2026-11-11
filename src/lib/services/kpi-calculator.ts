export interface SaleRecord {
  id: string;
  client_id: string;
  client_name?: string;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'pending' | 'cancelled';
  sale_date: string; // ISO string
}

export interface InstallmentRecord {
  id: string;
  sale_id: string;
  client_id: string;
  client_name?: string;
  client_phone?: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'cancelled';
}

export interface PurchaseRecord {
  id: string;
  factory_name: string;
  total_amount: number;
  purchase_date: string; // YYYY-MM-DD
}

export interface MonthlyChartData {
  monthKey: string; // YYYY-MM
  label: string; // ex: "Out/26"
  total: number;
}

export interface TopClientKPI {
  clientId: string;
  clientName: string;
  totalSpent: number;
  salesCount: number;
}

export interface FactoryPurchaseKPI {
  factoryName: string;
  totalSpent: number;
  purchasesCount: number;
}

export interface DashboardMetrics {
  monthRevenue: number;
  totalReceivable: number;
  totalOverdue: number;
  monthSalesCount: number;
  monthPurchases: number;
  allTimePurchases: number;
  netProfit: number;
  topClients: TopClientKPI[];
  factoryPurchases: FactoryPurchaseKPI[];
  overdueAlerts: InstallmentRecord[];
  dueSoonAlerts: InstallmentRecord[];
  monthlyHistory: MonthlyChartData[];
}

export function calculateDashboardMetrics(
  sales: SaleRecord[],
  installments: InstallmentRecord[],
  referenceDateInput: Date | string = new Date(),
  purchases: PurchaseRecord[] = []
): DashboardMetrics {
  const refDate =
    typeof referenceDateInput === 'string'
      ? new Date(referenceDateInput)
      : referenceDateInput;

  const currentYear = refDate.getUTCFullYear();
  const currentMonth = refDate.getUTCMonth(); // 0-11
  const todayStr = refDate.toISOString().slice(0, 10);

  // 7 dias à frente
  const sevenDaysLater = new Date(refDate);
  sevenDaysLater.setUTCDate(sevenDaysLater.getUTCDate() + 7);
  const sevenDaysLaterStr = sevenDaysLater.toISOString().slice(0, 10);

  // 1. Faturamento do mês (vendas do mês corrente não canceladas)
  let monthRevenue = 0;
  let monthSalesCount = 0;
  const clientSpentMonthMap = new Map<string, { name: string; total: number; count: number }>();

  for (const sale of sales) {
    if (sale.status === 'cancelled') continue;

    const saleDate = new Date(sale.sale_date);
    const isThisMonth =
      saleDate.getUTCFullYear() === currentYear &&
      saleDate.getUTCMonth() === currentMonth;

    if (isThisMonth) {
      monthRevenue += Number(sale.total_amount);
      monthSalesCount += 1;

      const cId = sale.client_id;
      const cName = sale.client_name || 'Cliente';
      const prev = clientSpentMonthMap.get(cId) || { name: cName, total: 0, count: 0 };
      prev.total += Number(sale.total_amount);
      prev.count += 1;
      clientSpentMonthMap.set(cId, prev);
    }
  }

  // 2. Parcelas a receber e atrasadas
  let totalReceivable = 0;
  let totalOverdue = 0;
  const overdueAlerts: InstallmentRecord[] = [];
  const dueSoonAlerts: InstallmentRecord[] = [];

  for (const inst of installments) {
    if (inst.status !== 'pending') continue;

    const amount = Number(inst.amount);
    totalReceivable += amount;

    if (inst.due_date < todayStr) {
      totalOverdue += amount;
      overdueAlerts.push(inst);
    } else if (inst.due_date >= todayStr && inst.due_date <= sevenDaysLaterStr) {
      dueSoonAlerts.push(inst);
    }
  }

  // Ordena alertas
  overdueAlerts.sort((a, b) => a.due_date.localeCompare(b.due_date));
  dueSoonAlerts.sort((a, b) => a.due_date.localeCompare(b.due_date));

  // 3. Top 3 Clientes do mês
  const topClients: TopClientKPI[] = Array.from(clientSpentMonthMap.entries())
    .map(([clientId, data]) => ({
      clientId,
      clientName: data.name,
      totalSpent: data.total,
      salesCount: data.count,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 3);

  // 4. Histórico dos últimos 6 meses
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyHistory: MonthlyChartData[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(currentYear, currentMonth - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = `${monthNames[m]}/${String(y).slice(2)}`;

    let total = 0;
    for (const sale of sales) {
      if (sale.status === 'cancelled') continue;
      const sDate = new Date(sale.sale_date);
      if (sDate.getUTCFullYear() === y && sDate.getUTCMonth() === m) {
        total += Number(sale.total_amount);
      }
    }

    monthlyHistory.push({ monthKey, label, total });
  }

  // 5. Total de compras (mês corrente e histórico por fábrica)
  let monthPurchases = 0;
  let allTimePurchases = 0;
  const factoryMap = new Map<string, { total: number; count: number }>();

  for (const p of purchases) {
    const amt = Number(p.total_amount) || 0;
    allTimePurchases += amt;

    const fName = (p.factory_name || 'Fornecedor').trim();
    const prev = factoryMap.get(fName) || { total: 0, count: 0 };
    prev.total += amt;
    prev.count += 1;
    factoryMap.set(fName, prev);

    const pDate = new Date(p.purchase_date + 'T00:00:00Z');
    if (
      pDate.getUTCFullYear() === currentYear &&
      pDate.getUTCMonth() === currentMonth
    ) {
      monthPurchases += amt;
    }
  }

  const factoryPurchases: FactoryPurchaseKPI[] = Array.from(factoryMap.entries())
    .map(([factoryName, data]) => ({
      factoryName,
      totalSpent: Math.round(data.total * 100) / 100,
      purchasesCount: data.count,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent || b.purchasesCount - a.purchasesCount);

  const netProfit = Math.round((monthRevenue - monthPurchases) * 100) / 100;

  return {
    monthRevenue,
    totalReceivable,
    totalOverdue,
    monthSalesCount,
    monthPurchases: Math.round(monthPurchases * 100) / 100,
    allTimePurchases: Math.round(allTimePurchases * 100) / 100,
    netProfit,
    topClients,
    factoryPurchases,
    overdueAlerts,
    dueSoonAlerts,
    monthlyHistory,
  };
}
