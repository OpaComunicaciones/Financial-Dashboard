import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { formatNumber } from '../../utils/formatting';

interface ReportProps {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
}

const BudgetVsActualReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const comparisonData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const getConversionRate = (fromCode: string): number => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates.filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= end).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : 0;
    }
    
    // Calculate actuals
    const actuals: Record<'income' | 'expense', Record<string, number>> = { income: {}, expense: {} };
    
    state.dailySales.forEach(s => {
        const d = new Date(s.date);
        if (d >= start && d <= end) {
            const rate = getConversionRate(s.currencyCode);
            const total = (s.cash + s.card + s.transfer) * rate;
            const incomeCat = state.incomeTypes.find(i => i.name.toLowerCase().includes('sales')); // Heuristic
            if(incomeCat) {
                actuals.income[incomeCat.id] = (actuals.income[incomeCat.id] || 0) + total;
            }
        }
    });
    state.miscIncomes.forEach(i => {
         const d = new Date(i.date);
        if (d >= start && d <= end) {
            const rate = getConversionRate(i.currencyCode);
            actuals.income[i.conceptId] = (actuals.income[i.conceptId] || 0) + (i.amount * rate);
        }
    });
     state.cashExpenses.forEach(e => {
        const d = new Date(e.date);
        if (d >= start && d <= end) {
            const rate = getConversionRate(e.currencyCode);
            actuals.expense[e.conceptId] = (actuals.expense[e.conceptId] || 0) + (e.amount * rate);
        }
    });
    
    // Calculate budget for the period
    const budget: Record<'income' | 'expense', Record<string, number>> = { income: {}, expense: {} };
    state.budgetRecords.forEach(b => {
        const budgetDate = new Date(b.year, b.month - 1, 15); // Use mid-month to be safe
        if (budgetDate >= start && budgetDate <= end) {
            budget[b.categoryType][b.categoryId] = (budget[b.categoryType][b.categoryId] || 0) + b.amount;
        }
    });
    
    const allIncomeKeys = new Set([...Object.keys(budget.income), ...Object.keys(actuals.income)]);
    const allExpenseKeys = new Set([...Object.keys(budget.expense), ...Object.keys(actuals.expense)]);

    const incomeRows = Array.from(allIncomeKeys).map(id => {
        const category = state.incomeTypes.find(c => c.id === id);
        const budgeted = budget.income[id] || 0;
        const actual = actuals.income[id] || 0;
        const variance = actual - budgeted;
        return { name: category?.name || 'Unknown', budgeted, actual, variance };
    });
    const expenseRows = Array.from(allExpenseKeys).map(id => {
        const category = state.expenseTypes.find(c => c.id === id);
        const budgeted = budget.expense[id] || 0;
        const actual = actuals.expense[id] || 0;
        const variance = budgeted - actual; // Favorable if actual is less
        return { name: category?.name || 'Unknown', budgeted, actual, variance };
    });

    return { incomeRows, expenseRows };

  }, [state, startDate, endDate, reportingCurrency]);
  
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';
  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  const renderRow = (row: {name: string, budgeted: number, actual: number, variance: number}) => {
    const isFavorable = row.variance >= 0;
    const varianceColor = isFavorable ? 'text-green-400' : 'text-red-400';
    const variancePercent = row.budgeted !== 0 ? formatNumber((row.variance / row.budgeted) * 100) : 'N/A';
    
    return (
        <tr key={row.name} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
            <td className="px-6 py-4 font-medium text-white">{row.name}</td>
            <td className="px-6 py-4 text-right font-mono">{formatCurrency(row.budgeted)}</td>
            <td className="px-6 py-4 text-right font-mono">{formatCurrency(row.actual)}</td>
            <td className={`px-6 py-4 text-right font-mono ${varianceColor}`}>{formatCurrency(row.variance)}</td>
            <td className={`px-6 py-4 text-right font-mono ${varianceColor}`}>{variancePercent}%</td>
        </tr>
    );
  }

  return (
     <div className="space-y-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-2xl font-bold text-indigo-400 p-6">{t('reports_tab_budget')} ({t('reports_consolidated_in')} {reportingCurrency})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
                {/* Income Section */}
                <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr><th colSpan={5} className="px-6 py-3 text-green-400 font-bold text-lg">{t('reports_income_header')}</th></tr>
                    <tr>
                        <th scope="col" className="px-6 py-3">{t('planning_category')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_budgeted')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_actual')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_val')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_pct')}</th>
                    </tr>
                </thead>
                <tbody>{comparisonData.incomeRows.map(row => renderRow(row))}</tbody>
                {/* Expense Section */}
                 <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr><th colSpan={5} className="px-6 py-3 text-red-400 font-bold text-lg">{t('reports_expenses_header')}</th></tr>
                     <tr>
                        <th scope="col" className="px-6 py-3">{t('planning_category')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_budgeted')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_actual')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_val')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_pct')}</th>
                    </tr>
                </thead>
                <tbody>{comparisonData.expenseRows.map(row => renderRow(row))}</tbody>
            </table>
          </div>
        </div>
     </div>
  );
};

export default BudgetVsActualReport;