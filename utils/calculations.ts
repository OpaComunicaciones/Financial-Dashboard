import { AppState } from '../types';

export const calculateNetSalesForDay = (date: string, state: AppState): { totalRevenueBeforeTax: number, netRevenueAfterTax: number, taxableBase: number } => {
  const { dailySales, cashClosures, invoices, expenseTypes, taxes } = state;

  // 1. Gross Sales for the day (sum of all sales channels before any deductions or tax consideration)
  const grossSales = dailySales
    .filter(sale => sale.date === date)
    .reduce((sum, sale) => sum + sale.cash + sale.card + sale.transfer + (sale.platform || 0), 0);

  // 2. Deductible Expenses for the day
  const deductibleExpenseTypeIds = new Set(expenseTypes.filter(et => et.isDeductibleFromSales).map(et => et.id));

  const deductibleInvoices = invoices
    .filter(invoice => invoice.date === date && deductibleExpenseTypeIds.has(invoice.conceptId))
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const deductibleCash = state.cashExpenses
    .filter(exp => exp.date === date && deductibleExpenseTypeIds.has(exp.conceptId))
    .reduce((sum, exp) => sum + exp.amount, 0);

  const deductibleExpenses = deductibleInvoices + deductibleCash;

  // 3. Surplus for the day (cash closing difference that increases revenue)
  const surplus = cashClosures
    .filter(closure => closure.date === date && closure.difference > 0)
    .reduce((sum, closure) => sum + closure.difference, 0);

  // 4. Total revenue that includes tax and deductions (what was actually collected/generated before backing out tax)
  // Surplus should ADD to revenue, Deductible Expenses sould SUBTRACT
  const totalRevenueBeforeTax = grossSales - deductibleExpenses + surplus;

  // 5. The actual base amount on which tax is calculated (revenue *excluding* the tax itself)
  const tax = taxes[0]; // Assuming the first tax is the general one
  const taxableBase = tax ? totalRevenueBeforeTax / (1 + tax.percentage / 100) : totalRevenueBeforeTax;

  // 6. Net Revenue After Tax (this is essentially the taxableBase value)
  const netRevenueAfterTax = taxableBase;

  return { totalRevenueBeforeTax, netRevenueAfterTax, taxableBase };
};
