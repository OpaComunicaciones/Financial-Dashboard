import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatNumber } from '../../utils/formatting';

interface ReportProps {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
}

const ExpenseReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const expenseData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const getConversionRate = (fromCode: string): number => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates
            .filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= end)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : 0;
    }

    const expensesByCategory: Record<string, { name: string, value: number }> = {};
    let totalExpenses = 0;
    
    state.cashExpenses.forEach(expense => {
      const d = new Date(expense.date);
      if (d >= start && d <= end) {
        const rate = getConversionRate(expense.currencyCode);
        const convertedAmount = expense.amount * rate;
        const category = state.expenseTypes.find(c => c.id === expense.conceptId) || { id: 'unknown', name: 'Unknown' };

        if (!expensesByCategory[category.id]) {
            expensesByCategory[category.id] = { name: category.name, value: 0 };
        }
        expensesByCategory[category.id].value += convertedAmount;
        totalExpenses += convertedAmount;
      }
    });

    const expenseList = Object.values(expensesByCategory).sort((a,b) => b.value - a.value);

    return { expenseList, totalExpenses };
  }, [state, startDate, endDate, reportingCurrency]);

  const COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6'];
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">{t('reports_expenses_by_category')}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                    <Pie data={expenseData.expenseList} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                        {expenseData.expenseList.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">{t('reports_expenses_details')}</h3>
            <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">{t('planning_category')}</th>
                            <th scope="col" className="px-6 py-3 text-right">{t('daily_cash_col_amount')}</th>
                            <th scope="col" className="px-6 py-3 text-right">% of Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenseData.expenseList.map((item, index) => (
                            <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                                <td className="px-6 py-4 text-right font-mono">{formatCurrency(item.value)}</td>
                                <td className="px-6 py-4 text-right font-mono">
                                    {formatNumber((item.value / expenseData.totalExpenses) * 100)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default ExpenseReport;