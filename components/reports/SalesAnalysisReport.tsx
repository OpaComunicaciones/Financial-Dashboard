import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import Card from '../Card';
import { Users } from 'lucide-react';
import { formatNumber } from '../../utils/formatting';

interface ReportProps {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
}

const SalesAnalysisReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
  const { t, language } = useTranslation();
  const { state } = useAppContext();

  const salesData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const getConversionRate = (fromCode: string): number => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates
            .filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= end)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : 0; // Return 0 if no rate found
    }

    const salesByDay: { [key: number]: number } = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    const salesByPayment: { [key: string]: number } = { [t('daily_sales_cash')]: 0, [t('daily_sales_card')]: 0, [t('daily_sales_transfer')]: 0 };
    let totalSales = 0;
    let totalCustomers = 0;

    state.dailySales.forEach(sale => {
      const d = new Date(sale.date);
      // JS getDay() is Sun=0, Mon=1...
      // To make week start on Monday for display, we'll adjust later.
      if (d >= start && d <= end) {
        const rate = getConversionRate(sale.currencyCode);
        const convertedCash = sale.cash * rate;
        const convertedCard = sale.card * rate;
        const convertedTransfer = sale.transfer * rate;

        const dayOfWeek = d.getDay();
        salesByDay[dayOfWeek] += convertedCash + convertedCard + convertedTransfer;
        
        salesByPayment[t('daily_sales_cash')] += convertedCash;
        salesByPayment[t('daily_sales_card')] += convertedCard;
        salesByPayment[t('daily_sales_transfer')] += convertedTransfer;
        
        totalSales += convertedCash + convertedCard + convertedTransfer;
        totalCustomers += sale.customers;
      }
    });
    
    // Order days starting from Monday for the chart
    const dayNames = Array.from({length: 7}, (_, i) => new Date(2000, 0, i+3).toLocaleDateString(language, {weekday: 'long'})); // Mon, Tue...
    const salesByDayChart = [
        { name: dayNames[0], sales: salesByDay[1] }, // Mon
        { name: dayNames[1], sales: salesByDay[2] }, // Tue
        { name: dayNames[2], sales: salesByDay[3] }, // Wed
        { name: dayNames[3], sales: salesByDay[4] }, // Thu
        { name: dayNames[4], sales: salesByDay[5] }, // Fri
        { name: dayNames[5], sales: salesByDay[6] }, // Sat
        { name: dayNames[6], sales: salesByDay[0] }, // Sun
    ];

    const salesByPaymentChart = Object.entries(salesByPayment).map(([name, value]) => ({name, value}));

    const averageTicket = totalCustomers > 0 ? totalSales / totalCustomers : 0;

    return { salesByDayChart, salesByPaymentChart, averageTicket };
  }, [state, startDate, endDate, reportingCurrency, language, t]);

  const COLORS = ['#6366F1', '#3B82F6', '#8B5CF6'];
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">{t('reports_sales_by_day')}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData.salesByDayChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="name" stroke="#A0AEC0" tick={{fontSize: 12}} />
                    <YAxis stroke="#A0AEC0" tickFormatter={(value) => formatNumber(value as number)} />
                    <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="sales" fill="#6366F1" name={t('dashboard_sales_chart_actual')} />
                </BarChart>
            </ResponsiveContainer>
        </div>
         <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">{t('reports_sales_by_payment')}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={salesData.salesByPaymentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {salesData.salesByPaymentChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2">
             <Card title={t('reports_sales_avg_ticket')} value={formatCurrency(salesData.averageTicket)} icon={<Users />} />
        </div>
    </div>
  );
};

export default SalesAnalysisReport;