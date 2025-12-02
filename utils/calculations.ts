import { AppState } from '../types';

export const calculateNetSalesForDay = (date: string, state: AppState): number => {
  const { dailySales, cashClosures, invoices, expenseTypes, taxes } = state;

  // 1. Gross Sales for the day
  const grossSales = dailySales
    .filter(sale => sale.date === date)
    .reduce((sum, sale) => sum + sale.cash + sale.card + sale.transfer, 0);

  // 2. Deductible Expenses for the day
  const deductibleExpenseTypeIds = new Set(expenseTypes.filter(et => et.isDeductibleFromSales).map(et => et.id));
  const deductibleExpenses = invoices
    .filter(invoice => invoice.date === date && deductibleExpenseTypeIds.has(invoice.conceptId))
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  // 3. Surplus for the day
  const surplus = cashClosures
    .filter(closure => closure.date === date && closure.difference > 0)
    .reduce((sum, closure) => sum + closure.difference, 0);

  // 4. Adjusted Sales (before tax)
  const adjustedSales = grossSales - deductibleExpenses - surplus;

  // 5. Apply tax adjustment
  const tax = taxes[0]; // Assuming the first tax is the general one
  const netSales = tax ? adjustedSales / (1 + tax.percentage / 100) : adjustedSales;
  
  return netSales;
};
