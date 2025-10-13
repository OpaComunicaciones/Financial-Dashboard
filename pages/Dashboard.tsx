import React, { useState, useMemo } from 'react';
import { DollarSign, ShoppingCart, Users, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import { getFinancialInsights } from '../services/geminiService';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { formatNumber } from '../utils/formatting';

const Dashboard: React.FC = () => {
  const { t, language } = useTranslation();
  const { state } = useAppContext();
  const [aiInsights, setAiInsights] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dashboardData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // --- Today's Metrics ---
    const todaysSales = state.dailySales.filter(s => s.date === todayStr);
    const todaysRevenue = todaysSales.reduce((sum, s) => sum + s.cash + s.card + s.transfer, 0);
    const todaysCustomers = todaysSales.reduce((sum, s) => sum + s.customers, 0);
    const todaysCashExpenses = state.cashExpenses
      .filter(e => e.date === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    // --- Overall Metrics ---
    const totalPendingInvoices = state.invoices
      .filter(inv => inv.status === 'Pending' || inv.status === 'Overdue')
      .reduce((sum, inv) => sum + inv.amount, 0);

    // --- Weekly Sales Chart Data ---
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    const monthlyIncomeBudget = state.budgetRecords
      .filter(b => b.year === currentYear && b.month === currentMonth && b.categoryType === 'income')
      .reduce((sum, b) => sum + b.amount, 0);
      
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const projectedDailySales = monthlyIncomeBudget > 0 ? monthlyIncomeBudget / daysInMonth : 0;


    const weeklySalesData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString(language, { weekday: 'short' });
      
      const sales = state.dailySales.filter(s => s.date === dateStr);
      const totalSale = sales.reduce((sum, s) => sum + s.cash + s.card + s.transfer, 0);
      
      weeklySalesData.push({
        name: dayOfWeek,
        sales: totalSale,
        projection: projectedDailySales,
      });
    }

    // --- AI Financial Data ---
    const topExpenseCategory = state.cashExpenses
      .filter(e => e.date === todayStr)
      .reduce((acc, expense) => {
          acc[expense.conceptId] = (acc[expense.conceptId] || 0) + expense.amount;
          return acc;
      }, {} as Record<string, number>);

    const topExpenseId = Object.keys(topExpenseCategory).reduce((a, b) => topExpenseCategory[a] > topExpenseCategory[b] ? a : b, '');
    const topExpense = state.expenseTypes.find(e => e.id === topExpenseId);

    const latestClosure = [...state.cashClosures].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];


    return {
      todaysRevenue,
      todaysCustomers,
      todaysExpenses: todaysCashExpenses,
      totalPendingInvoices,
      weeklySalesData,
      aiFinancialData: {
        sales: todaysRevenue,
        expenses: todaysCashExpenses,
        profitMargin: todaysRevenue > 0 ? ((todaysRevenue - todaysCashExpenses) / todaysRevenue) * 100 : 0,
        topExpense: { 
            category: topExpense?.name || 'N/A', 
            amount: topExpenseCategory[topExpenseId] || 0 
        },
        cashBalance: latestClosure?.finalBalance || 0,
        accountsPayable: totalPendingInvoices,
      }
    };
  }, [state, language]);

  const handleGetInsights = async () => {
    setIsLoading(true);
    setAiInsights('');
    const insights = await getFinancialInsights(dashboardData.aiFinancialData, language);
    setAiInsights(insights);
    setIsLoading(false);
  };

  const formattedInsights = aiInsights.split('\n').map((line, index) => {
    if (line.startsWith('- **')) {
      return <p key={index} className="mt-2" dangerouslySetInnerHTML={{ __html: line.replace(/- \*\*(.*?):\*\*/, '<strong>$1:</strong>')}} />;
    }
    if (line.startsWith('**')) {
      return <h4 key={index} className="text-lg font-semibold text-indigo-400 mt-4">{line.replace(/\*\*/g, '')}</h4>;
    }
    return <p key={index}>{line.replace(/- /,'')}</p>;
  });

  // TODO: This should be dynamic based on a user setting
  const currencySymbol = '$';
  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  return (
    <div className="space-y-8">
      <PageHeader title={t('dashboard_title')} subtitle={t('dashboard_subtitle')} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title={t('dashboard_card_revenue')} value={formatCurrency(dashboardData.todaysRevenue)} icon={<DollarSign />} />
        <Card title={t('dashboard_card_expenses')} value={formatCurrency(dashboardData.todaysExpenses)} icon={<ShoppingCart />} />
        <Card title={t('dashboard_card_customers')} value={formatNumber(dashboardData.todaysCustomers)} icon={<Users />} />
        <Card title={t('dashboard_card_invoices')} value={formatCurrency(dashboardData.totalPendingInvoices)} icon={<AlertTriangle />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-white">{t('dashboard_sales_chart_title')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.weeklySalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="name" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" tickFormatter={(value) => formatNumber(value as number)} />
              <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="sales" fill="#6366F1" name={t('dashboard_sales_chart_actual')} />
              <Bar dataKey="projection" fill="#4A5568" name={t('dashboard_sales_chart_projected')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
           <h3 className="text-xl font-semibold text-white mb-4">{t('dashboard_ai_title')}</h3>
           <p className="text-gray-400 text-sm mb-4">{t('dashboard_ai_subtitle')}</p>
           <button 
             onClick={handleGetInsights}
             disabled={isLoading}
             className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
           >
             {isLoading ? t('dashboard_ai_button_loading') : t('dashboard_ai_button')}
           </button>
           {isLoading && <div className="text-center mt-4 text-gray-400">{t('dashboard_ai_loading')}</div>}
           {aiInsights && (
              <div className="mt-4 p-4 bg-gray-900 rounded-lg text-gray-300 text-sm space-y-2">
                 {formattedInsights}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;