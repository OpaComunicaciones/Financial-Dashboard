import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatNumber } from '../../utils/formatting';
import { AlertTriangle } from 'lucide-react';

interface ReportProps {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
}

const ExpenseReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const [showOnlyNonDeductible, setShowOnlyNonDeductible] = useState(false);

  const expenseData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const getConversionRate = (fromCode: string, date: string): number => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates
            .filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= new Date(date))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : 0;
    }

    const allExpenses: any[] = [];

    // Process cash expenses
    state.cashExpenses.forEach(expense => {
      const d = new Date(expense.date);
      if (d >= start && d <= end) {
        allExpenses.push({
          ...expense,
          source: 'cash',
          detail: expense.detail,
          categoryName: state.expenseTypes.find(c => c.id === expense.conceptId)?.name || 'Unknown',
        });
      }
    });

    // Process bank expenses
    state.transactions.forEach(transaction => {
      const d = new Date(transaction.date);
      if (transaction.type === 'expense' && d >= start && d <= end) {
        const bankAccount = state.bankAccounts.find(b => b.id === transaction.bankAccountId);
        if (bankAccount) {
            allExpenses.push({
              ...transaction,
              source: 'bank',
              currencyCode: bankAccount.currencyCode,
              detail: transaction.description,
              categoryName: state.expenseTypes.find(c => c.id === transaction.conceptId)?.name || 'Unknown',
            });
        }
      }
    });

    const expensesWithConvertedAmounts = allExpenses.map(exp => {
        const rate = getConversionRate(exp.currencyCode, exp.date);
        return {
            ...exp,
            convertedAmount: (exp.source === 'bank' ? Math.abs(exp.amount) : exp.amount) * rate,
        };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const expensesByCategory: Record<string, { name: string, value: number }> = {};
    let totalExpenses = 0;

    expensesWithConvertedAmounts.forEach(exp => {
        if (!expensesByCategory[exp.categoryName]) {
            expensesByCategory[exp.categoryName] = { name: exp.categoryName, value: 0 };
        }
        expensesByCategory[exp.categoryName].value += exp.convertedAmount;
        totalExpenses += exp.convertedAmount;
    });

    const expenseList = Object.values(expensesByCategory).sort((a,b) => b.value - a.value);

    return { expenseList, totalExpenses, detailedExpenses: expensesWithConvertedAmounts };
  }, [state, startDate, endDate, reportingCurrency]);

  const filteredDetailedExpenses = useMemo(() => {
    if (showOnlyNonDeductible) {
      return expenseData.detailedExpenses.filter(exp => exp.isNonDeductible);
    }
    return expenseData.detailedExpenses;
  }, [expenseData.detailedExpenses, showOnlyNonDeductible]);

  const COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6'];
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/80 p-3 border border-gray-700 rounded-lg shadow-lg">
          <p className="label text-base font-semibold text-gray-200">{label}</p>
          <p className="intro" style={{ color: payload[0].color }}>
            <span className="font-medium">{`${payload[0].name}: `}</span>
            <span className="font-bold">{formatCurrency(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">{t('reports_expenses_by_category', 'Egresos por Categoría')}</h3>
            <ResponsiveContainer width="100%" height={30 + expenseData.expenseList.length * 40}>
                <BarChart
                    data={expenseData.expenseList}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis type="number" stroke="#9CA3AF" tickFormatter={formatCurrency} />
                    <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={150} interval={0} />
                    <Tooltip
                        cursor={{fill: 'rgba(113, 128, 150, 0.1)'}}
                        content={<CustomTooltip />}
                    />
                    <Bar dataKey="value" name={t('daily_cash_col_amount', 'Monto')}>
                        {expenseData.expenseList.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Desglose de Egresos</h3>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="non-deductible-filter"
                        checked={showOnlyNonDeductible}
                        onChange={(e) => setShowOnlyNonDeductible(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="non-deductible-filter" className="text-sm font-medium text-gray-300">
                        Mostrar solo no deducibles
                    </label>
                </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">{t('daily_sales_date', 'Fecha')}</th>
                            <th scope="col" className="px-6 py-3">{t('planning_category', 'Categoría')}</th>
                            <th scope="col" className="px-6 py-3">{t('daily_cash_col_detail', 'Detalle')}</th>
                            <th scope="col" className="px-6 py-3 text-right">{t('daily_cash_col_amount', 'Monto')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDetailedExpenses.map((expense, index) => (
                            <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap">{expense.date}</td>
                                <td className="px-6 py-4">{expense.categoryName}</td>
                                <td className="px-6 py-4">
                                    {expense.detail}
                                    {expense.isNonDeductible && (
                                        <span className='block text-xs text-yellow-400 flex items-center gap-1 mt-1'>
                                            <AlertTriangle size={12}/> {t('banks_col_non_deductible', 'No Deducible')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right font-mono">{formatCurrency(expense.convertedAmount)}</td>
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