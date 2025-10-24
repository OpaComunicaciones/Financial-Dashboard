import React, { useState, useMemo } from 'react';
import { DollarSign, ShoppingCart, Users, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import { getFinancialInsights } from '../services/geminiService';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { formatNumber } from '../utils/formatting';
import DateRangeSelector from '../components/DateRangeSelector';

const Dashboard: React.FC = () => {
  const { t, language } = useTranslation();
  const { state } = useAppContext();
  const [aiInsights, setAiInsights] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date(),
  });

  const dashboardData = useMemo(() => {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const salesInRange = state.dailySales.filter(s => {
        const saleDate = new Date(s.date + 'T00:00:00');
        return saleDate >= from && saleDate <= to;
    });
    const revenueInRange = salesInRange.reduce((sum, s) => sum + s.cash + s.card + s.transfer, 0);
    const customersInRange = salesInRange.reduce((sum, s) => sum + s.customers, 0);
    
    const expensesByCategory: Record<string, number> = {};
    state.cashExpenses.forEach(e => {
        const expenseDate = new Date(e.date + 'T00:00:00');
        if (expenseDate >= from && expenseDate <= to) {
            const categoryName = state.expenseTypes.find(c => c.id === e.conceptId)?.name || 'Uncategorized';
            expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + e.amount;
        }
    });
    state.transactions.forEach(t => {
        const txDate = new Date(t.date + 'T00:00:00');
        if (t.type === 'expense' && txDate >= from && txDate <= to) {
            const categoryName = state.expenseTypes.find(c => c.id === t.conceptId)?.name || 'Uncategorized';
            expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + Math.abs(t.amount);
        }
    });

    const topExpense = Object.entries(expensesByCategory).reduce((max, entry) => entry[1] > max.amount ? { category: entry[0], amount: entry[1] } : max, { category: 'N/A', amount: 0 });

    const totalExpensesInRange = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);

    const totalPendingInvoices = state.invoices
      .filter(inv => inv.status === 'Pending' || inv.status === 'Overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);

    // --- Sales Chart Data from filtered sales ---
    const salesByDate: { [date: string]: number } = {};
    salesInRange.forEach(sale => {
        const total = sale.cash + sale.card + sale.transfer;
        salesByDate[sale.date] = (salesByDate[sale.date] || 0) + total;
    });

    const salesChartData = Object.entries(salesByDate)
        .map(([date, total]) => ({
            date: date,
            name: new Date(date + 'T00:00:00').toLocaleDateString(language, { day: 'numeric', month: 'short' }),
            sales: total,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const latestClosure = [...state.cashClosures].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return {
      revenueInRange,
      customersInRange,
      totalExpensesInRange,
      totalPendingInvoices,
      salesChartData,
      aiFinancialData: {
        sales: revenueInRange,
        expenses: totalExpensesInRange,
        profitMargin: revenueInRange > 0 ? ((revenueInRange - totalExpensesInRange) / revenueInRange) * 100 : 0,
        topExpense: topExpense,
        cashBalance: latestClosure?.finalBalance || 0,
        accountsPayable: totalPendingInvoices,
      }
    };
  }, [state, language, dateRange]);

  const handleGetInsights = async () => {
    setIsLoading(true);
    setAiInsights('');
    const insights = await getFinancialInsights(dashboardData.aiFinancialData, language, state.geminiApiKey || '');
    setAiInsights(insights);
    setIsLoading(false);
  };

  const formattedInsights = aiInsights.split('\n').map((line, index) => {
    if (line.startsWith('- **')) {
      return <p key={index} className="mt-2" dangerouslySetInnerHTML={{ __html: line.replace(/- \*\*\*(.*?):\*\*\*/, '<strong>$1:</strong>')}} />;
    }
    if (line.startsWith('**')) {
      return <h4 key={index} className="text-lg font-semibold text-indigo-400 mt-4">{line.replace(/\*\*/g, '')}</h4>;
    }
    return <p key={index}>{line.replace(/- /,'')}</p>;
  });

  const currencySymbol = state.currencies[0]?.symbol || '$';
  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <PageHeader title={t('dashboard_title')} subtitle={t('dashboard_subtitle')} />
        <DateRangeSelector onDateRangeChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Ingresos del Período" value={formatCurrency(dashboardData.revenueInRange)} icon={<DollarSign />} />
        <Card title="Egresos del Período" value={formatCurrency(dashboardData.totalExpensesInRange)} icon={<ShoppingCart />} />
        <Card title="Clientes del Período" value={formatNumber(dashboardData.customersInRange)} icon={<Users />} />
        <Card title="Facturas por Pagar" value={formatCurrency(dashboardData.totalPendingInvoices)} icon={<AlertTriangle />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-white">Ventas del Período</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.salesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="name" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" tickFormatter={(value) => formatNumber(value as number)} />
              <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="sales" fill="#6366F1" name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
           <h3 className="text-xl font-semibold text-white">{t('dashboard_ai_title')}</h3>
           <p className="text-gray-400 text-sm mb-4">Análisis y recomendaciones basadas en los datos del período seleccionado.</p>
           <button 
             onClick={handleGetInsights}
             disabled={isLoading}
             className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
           >
             {isLoading ? t('dashboard_ai_button_loading') : t('dashboard_ai_button')}
           </button>
           {isLoading && <div className="text-center mt-4 text-gray-400">{t('dashboard_ai_loading')}</div>}
           {aiInsights && (
              <div className={`mt-4 p-4 bg-gray-900 rounded-lg text-sm space-y-2 ${aiInsights.includes('Error') ? 'text-red-400' : 'text-gray-300'}`}>
                 {aiInsights.includes('Error') ? aiInsights : formattedInsights}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;