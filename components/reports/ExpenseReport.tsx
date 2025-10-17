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
  const [viewType, setViewType] = useState<'grouped' | 'detailed'>('grouped');

  const { reportData } = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const getConversionRate = (fromCode: string, date: string): number => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates
            .filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= new Date(date))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : 0;
    }

    // Part 1: Calculate Total Income (borrowed from P&L report)
    let totalIncome = 0;
    const processIncomeEntry = (dateStr: string, currencyCode: string, amount: number) => {
        const d = new Date(dateStr);
        if (d < start || d > end) return;
        const rate = getConversionRate(currencyCode, dateStr);
        if (rate === null) return;
        totalIncome += amount * rate;
    };

    state.dailySales.forEach(sale => {
      const totalSale = sale.cash + sale.card + sale.transfer;
      if (totalSale > 0) processIncomeEntry(sale.date, sale.currencyCode, totalSale);
    });

    state.miscIncomes.forEach(income => {
        const concept = state.incomeTypes.find(c => c.id === income.conceptId);
        if (concept && concept.isIncome && concept.name !== 'Ventas Directas' && concept.name !== 'Direct Sales') {
            processIncomeEntry(income.date, income.currencyCode, income.amount);
        }
    });

    state.transactions.forEach(tx => {
        if (tx.type === 'income' && tx.conceptId) {
            const concept = state.incomeTypes.find(c => c.id === tx.conceptId);
            const bankAccount = state.bankAccounts.find(b => b.id === tx.bankAccountId);
            if (concept && concept.isIncome && bankAccount && concept.name !== 'Ventas Directas' && concept.name !== 'Direct Sales') {
                processIncomeEntry(tx.date, bankAccount.currencyCode, Math.abs(tx.amount));
            }
        }
    });

    // Part 2: Gather all expenses (Accrual Basis)
    const allExpenses: any[] = [];
    const processExpenseEntry = (expense: any, type: 'invoice' | 'cash' | 'bank') => {
        const d = new Date(expense.date);
        if (d < start || d > end) return;

        const concept = state.expenseTypes.find(c => c.id === expense.conceptId);
        if (!concept) return;

        const rate = getConversionRate(expense.currencyCode, expense.date);
        const convertedAmount = (type === 'bank' ? Math.abs(expense.amount) : expense.amount) * rate;

        allExpenses.push({
            id: expense.id,
            date: expense.date,
            categoryName: concept.name === 'Shortage' ? t('special_concept_shortage') : concept.name,
            conceptId: expense.conceptId,
            detail: type === 'bank' ? expense.description : expense.detail,
            amount: type === 'bank' ? Math.abs(expense.amount) : expense.amount,
            currencyCode: expense.currencyCode,
            isNonDeductible: expense.isNonDeductible || false,
            convertedAmount: convertedAmount,
        });
    };

    state.invoices.forEach(inv => processExpenseEntry(inv, 'invoice'));
    state.cashExpenses.forEach(exp => !exp.invoiceNumber && processExpenseEntry(exp, 'cash'));
    state.transactions.forEach(tx => {
        if (tx.type === 'expense' && !tx.description.includes('Payment for invoice #')) {
            const bankAccount = state.bankAccounts.find(b => b.id === tx.bankAccountId);
            if (bankAccount) {
                processExpenseEntry({ ...tx, currencyCode: bankAccount.currencyCode }, 'bank');
            }
        }
    });

    // Part 3: Filter and Group Data
    const filteredExpenses = showOnlyNonDeductible ? allExpenses.filter(exp => exp.isNonDeductible) : allExpenses;

    const chartData: Record<string, { name: string, value: number }> = {};
    filteredExpenses.forEach(exp => {
        if (!chartData[exp.categoryName]) {
            chartData[exp.categoryName] = { name: exp.categoryName, value: 0 };
        }
        chartData[exp.categoryName].value += exp.convertedAmount;
    });

    let tableData: any[] = [];
    if (viewType === 'grouped') {
        tableData = Object.values(chartData).sort((a, b) => b.value - a.value);
    } else {
        tableData = filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const totalOfTableExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.convertedAmount, 0);
    
    return { reportData: { 
        totalIncome, 
        chartData: Object.values(chartData).sort((a,b) => b.value - a.value), 
        tableData, 
        totalOfTableExpenses 
    }};
  }, [state, startDate, endDate, reportingCurrency, t, showOnlyNonDeductible, viewType]);

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
            <ResponsiveContainer width="100%" height={30 + reportData.chartData.length * 40}>
                <BarChart
                    data={reportData.chartData}
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
                        {reportData.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Desglose de Egresos</h3>
                <div className="flex items-center gap-4">
                    {/* View Type Toggle */}
                    <div className="flex items-center p-1 bg-gray-900 rounded-lg">
                        <button 
                            onClick={() => setViewType('grouped')} 
                            className={`px-3 py-1 text-sm font-medium rounded-md ${viewType === 'grouped' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                            Agrupado
                        </button>
                        <button 
                            onClick={() => setViewType('detailed')} 
                            className={`px-3 py-1 text-sm font-medium rounded-md ${viewType === 'detailed' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                            Detallado
                        </button>
                    </div>
                    {/* Non-Deductible Filter */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="non-deductible-filter"
                            checked={showOnlyNonDeductible}
                            onChange={(e) => setShowOnlyNonDeductible(e.target.checked)}
                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="non-deductible-filter" className="text-sm font-medium text-gray-300">
                            Mostrar solo no deducibles
                        </label>
                    </div>
                </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                        <tr>
                            {viewType === 'grouped' ? (
                                <th scope="col" className="px-6 py-3">{t('planning_category', 'Categoría')}</th>
                            ) : (
                                <>
                                    <th scope="col" className="px-6 py-3">{t('daily_sales_date', 'Fecha')}</th>
                                    <th scope="col" className="px-6 py-3">{t('planning_category', 'Categoría')}</th>
                                    <th scope="col" className="px-6 py-3">{t('daily_cash_col_detail', 'Detalle')}</th>
                                </>
                            )}
                            <th scope="col" className="px-6 py-3 text-right">{t('daily_cash_col_amount', 'Monto')}</th>
                            <th scope="col" className="px-6 py-3 text-right">% vs Ingresos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.tableData.map((item, index) => (
                            <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                {viewType === 'grouped' ? (
                                    <td className="px-6 py-4">{item.name}</td>
                                ) : (
                                    <>
                                        <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                                        <td className="px-6 py-4">{item.categoryName}</td>
                                        <td className="px-6 py-4">
                                            {item.detail}
                                            {item.isNonDeductible && (
                                                <span className='block text-xs text-yellow-400 flex items-center gap-1 mt-1'>
                                                    <AlertTriangle size={12}/> {t('banks_col_non_deductible', 'No Deducible')}
                                                </span>
                                            )}
                                        </td>
                                    </>
                                )}
                                <td className="px-6 py-4 text-right font-mono">{formatCurrency(viewType === 'grouped' ? item.value : item.convertedAmount)}</td>
                                <td className="px-6 py-4 text-right font-mono">{(reportData.totalIncome > 0 ? ((viewType === 'grouped' ? item.value : item.convertedAmount) / reportData.totalIncome * 100) : 0).toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="text-sm text-white uppercase bg-gray-700 font-bold">
                        <tr>
                            <td colSpan={viewType === 'grouped' ? 1 : 3} className="px-6 py-3 text-right">Total</td>
                            <td className="px-6 py-3 text-right font-mono">{formatCurrency(reportData.totalOfTableExpenses)}</td>
                            <td className="px-6 py-3 text-right font-mono">{(reportData.totalIncome > 0 ? (reportData.totalOfTableExpenses / reportData.totalIncome * 100) : 0).toFixed(2)}%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>
  );
};

export default ExpenseReport;