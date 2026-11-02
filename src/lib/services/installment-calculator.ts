export interface InstallmentItem {
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
}

export interface GenerateInstallmentsOptions {
  totalAmount: number;
  numInstallments: number;
  firstDueDate: string; // YYYY-MM-DD
  intervalType?: 'monthly' | 'biweekly' | 'weekly' | 'custom_days';
  customIntervalDays?: number;
}

export function generateInstallments(
  options: GenerateInstallmentsOptions
): InstallmentItem[] {
  const {
    totalAmount,
    numInstallments,
    firstDueDate,
    intervalType = 'monthly',
    customIntervalDays = 30,
  } = options;

  if (numInstallments <= 0 || !Number.isInteger(numInstallments)) {
    throw new Error('O número de parcelas deve ser um inteiro positivo.');
  }

  if (totalAmount <= 0) {
    throw new Error('O valor total deve ser maior que zero.');
  }

  const baseCentavos = Math.floor((totalAmount * 100) / numInstallments);
  const totalCentavos = Math.round(totalAmount * 100);
  const remainderCentavos = totalCentavos - baseCentavos * numInstallments;

  const [yearStr, monthStr, dayStr] = firstDueDate.split('-');
  const startYear = parseInt(yearStr, 10);
  const startMonth = parseInt(monthStr, 10) - 1; // 0-indexed
  const startDay = parseInt(dayStr, 10);

  const installments: InstallmentItem[] = [];

  for (let i = 0; i < numInstallments; i++) {
    let amountCentavos = baseCentavos;
    if (i === numInstallments - 1) {
      amountCentavos += remainderCentavos;
    }

    let dueDateStr: string;

    if (intervalType === 'monthly') {
      const targetMonth = startMonth + i;
      const targetYear = startYear + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;

      // Trata meses com menos dias (ex: 31 de janeiro -> 28 de fevereiro)
      const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
      const actualDay = Math.min(startDay, lastDayOfTargetMonth);

      const d = new Date(Date.UTC(targetYear, normalizedMonth, actualDay));
      dueDateStr = d.toISOString().slice(0, 10);
    } else {
      let daysToAdd = 0;
      if (intervalType === 'weekly') {
        daysToAdd = i * 7;
      } else if (intervalType === 'biweekly') {
        daysToAdd = i * 14;
      } else {
        daysToAdd = i * (customIntervalDays || 30);
      }

      const d = new Date(Date.UTC(startYear, startMonth, startDay + daysToAdd));
      dueDateStr = d.toISOString().slice(0, 10);
    }

    installments.push({
      installment_number: i + 1,
      total_installments: numInstallments,
      amount: amountCentavos / 100,
      due_date: dueDateStr,
    });
  }

  return installments;
}
