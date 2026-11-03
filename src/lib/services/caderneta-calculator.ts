export interface SaleItemPayload {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface SettlementParams {
  previousDebt: number;
  saleTotal: number;
  paidAmountNow: number;
}

export interface SettlementResult {
  totalDueWithSale: number;
  newSalePaid: number;
  newSaleRemaining: number;
  surplusForPreviousDebt: number;
  amountAbatedFromPrevious: number;
  finalOutstandingBalance: number;
  isFullySettled: boolean;
}

export interface PendingDebtItem {
  id: string;
  amount: number;
  due_date?: string;
  created_at?: string;
}

export interface DebtAbatementOperation {
  installmentId: string;
  action: 'full' | 'partial';
  originalAmount: number;
  amountPaid: number;
  newRemainingAmount: number;
}

export interface AbatementPlan {
  operations: DebtAbatementOperation[];
  totalAbated: number;
  remainingCashUnused: number;
  newTotalDebt: number;
}

/**
 * Arredonda valor para duas casas decimais com segurança contra floating point
 */
export function roundToCents(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Calcula o total de uma lista de itens de venda
 */
export function calculateSaleItemsTotal(items: SaleItemPayload[]): number {
  if (!items || items.length === 0) return 0;
  const rawSum = items.reduce((acc, item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, Number(item.unit_price) || 0);
    return acc + qty * unitPrice;
  }, 0);
  return roundToCents(rawSum);
}

/**
 * Calcula a conta corrente da venda:
 * Permite abater dívida anterior caso o cliente pague a mais que o novo pedido,
 * ou adiciona o saldo restante à caderneta se pagar a menos ou nada.
 */
export function calculateSettlement({
  previousDebt,
  saleTotal,
  paidAmountNow,
}: SettlementParams): SettlementResult {
  const prev = Math.max(0, roundToCents(previousDebt));
  const sale = Math.max(0, roundToCents(saleTotal));
  const paid = Math.max(0, roundToCents(paidAmountNow));

  const totalDueWithSale = roundToCents(prev + sale);

  if (paid >= sale) {
    const newSaleRemaining = 0;
    const surplus = roundToCents(paid - sale);
    const amountAbatedFromPrevious = Math.min(prev, surplus);
    const finalOutstandingBalance = roundToCents(Math.max(0, prev - surplus));

    return {
      totalDueWithSale,
      newSalePaid: sale,
      newSaleRemaining,
      surplusForPreviousDebt: surplus,
      amountAbatedFromPrevious,
      finalOutstandingBalance,
      isFullySettled: finalOutstandingBalance === 0,
    };
  }

  // Pagamento inferior ao valor do novo pedido (ou zero)
  const newSaleRemaining = roundToCents(sale - paid);
  const finalOutstandingBalance = roundToCents(prev + newSaleRemaining);

  return {
    totalDueWithSale,
    newSalePaid: paid,
    newSaleRemaining,
    surplusForPreviousDebt: 0,
    amountAbatedFromPrevious: 0,
    finalOutstandingBalance,
    isFullySettled: false,
  };
}

/**
 * Distribui um valor de abatimento entre débitos pendentes em ordem cronológica (FIFO)
 */
export function distributeFIFOAbatement(
  pendingDebts: PendingDebtItem[],
  paymentAmount: number
): AbatementPlan {
  let cashAvailable = Math.max(0, roundToCents(paymentAmount));
  const operations: DebtAbatementOperation[] = [];

  const totalOriginalDebt = pendingDebts.reduce(
    (acc, d) => acc + roundToCents(d.amount),
    0
  );

  for (const debt of pendingDebts) {
    if (cashAvailable <= 0) break;

    const debtAmount = roundToCents(debt.amount);
    if (debtAmount <= 0) continue;

    if (cashAvailable >= debtAmount) {
      operations.push({
        installmentId: debt.id,
        action: 'full',
        originalAmount: debtAmount,
        amountPaid: debtAmount,
        newRemainingAmount: 0,
      });
      cashAvailable = roundToCents(cashAvailable - debtAmount);
    } else {
      const remainingDebt = roundToCents(debtAmount - cashAvailable);
      operations.push({
        installmentId: debt.id,
        action: 'partial',
        originalAmount: debtAmount,
        amountPaid: cashAvailable,
        newRemainingAmount: remainingDebt,
      });
      cashAvailable = 0;
      break;
    }
  }

  const totalAbated = operations.reduce((acc, op) => acc + op.amountPaid, 0);
  const newTotalDebt = Math.max(0, roundToCents(totalOriginalDebt - totalAbated));

  return {
    operations,
    totalAbated: roundToCents(totalAbated),
    remainingCashUnused: cashAvailable,
    newTotalDebt,
  };
}
