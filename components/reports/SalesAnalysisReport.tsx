import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import Card from '../Card';
import { Users, FileText, FileDown } from 'lucide-react';
import { formatNumber } from '../../utils/formatting';
import * as XLSX from 'xlsx';

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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return rates.length > 0 ? rates[0].rate : 0; // Return 0 if no rate found
    }

    const salesByDay: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const salesByPayment: { [key: string]: number } = { [t('daily_sales_cash')]: 0, [t('daily_sales_card')]: 0, [t('daily_sales_transfer')]: 0 };
    let totalSales = 0;
    let totalCustomers = 0;

    state.dailySales.forEach(sale => {
      const dateParts = sale.date.split('-').map(Number);
      const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
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
    const dayNames = Array.from({ length: 7 }, (_, i) => new Date(2000, 0, i + 3).toLocaleDateString(language, { weekday: 'long' })); // Mon, Tue...
    const salesByDayChart = [
      { name: dayNames[0], sales: salesByDay[1] }, // Mon
      { name: dayNames[1], sales: salesByDay[2] }, // Tue
      { name: dayNames[2], sales: salesByDay[3] }, // Wed
      { name: dayNames[3], sales: salesByDay[4] }, // Thu
      { name: dayNames[4], sales: salesByDay[5] }, // Fri
      { name: dayNames[5], sales: salesByDay[6] }, // Sat
      { name: dayNames[6], sales: salesByDay[0] }, // Sun
    ];

    const salesByPaymentChart = Object.entries(salesByPayment).map(([name, value]) => ({ name, value }));

    const averageTicket = totalCustomers > 0 ? totalSales / totalCustomers : 0;

    return { salesByDayChart, salesByPaymentChart, averageTicket };
  }, [state, startDate, endDate, reportingCurrency, language, t]);

  const COLORS = ['#6366F1', '#3B82F6', '#8B5CF6'];
  const currencySymbol = state.currencies.find(c => c.code === reportingCurrency)?.symbol || '$';

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  const handleExportPDF = () => window.print();

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Sales by Day
    const dayData = [
      [t('reports_sales_by_day')],
      [null],
      [t('reports_sales_avg_ticket'), salesData.averageTicket],
      [null],
      ['Día', 'Ventas'],
      ...salesData.salesByDayChart.map(item => [item.name, item.sales])
    ];
    const wsDay = XLSX.utils.aoa_to_sheet(dayData);
    wsDay['!cols'] = [{ wch: 20 }, { wch: 15 }];
    if (wsDay['B3']) wsDay['B3'].z = `${currencySymbol} #,##0.00`;
    for (let i = 5; i < dayData.length; i++) {
      if (wsDay[`B${i + 1}`]) wsDay[`B${i + 1}`].z = `${currencySymbol} #,##0.00`;
    }
    XLSX.utils.book_append_sheet(wb, wsDay, t('reports_sales_by_day'));

    // Sheet 2: Sales by Payment
    const paymentData = [
      [t('reports_sales_by_payment')],
      [null],
      ['Método de Pago', 'Valor'],
      ...salesData.salesByPaymentChart.map(item => [item.name, item.value])
    ];
    const wsPayment = XLSX.utils.aoa_to_sheet(paymentData);
    wsPayment['!cols'] = [{ wch: 20 }, { wch: 15 }];
    for (let i = 3; i < paymentData.length; i++) {
      if (wsPayment[`B${i + 1}`]) wsPayment[`B${i + 1}`].z = `${currencySymbol} #,##0.00`;
    }
    XLSX.utils.book_append_sheet(wb, wsPayment, t('reports_sales_by_payment'));

    XLSX.writeFile(wb, `Sales_Analysis_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 print:hidden">
        <button onClick={handleExportXLSX} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm transition-colors transition-shadow">
          <FileText size={18} /> {t('reports_export_excel')}
        </button>
        <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-sm transition-colors transition-shadow">
          <FileDown size={18} /> {t('reports_export_pdf')}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('reports_sales_by_day')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData.salesByDayChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-600" />
              <XAxis dataKey="name" stroke="currentColor" className="text-gray-500 dark:text-gray-400" tick={{ fontSize: 12 }} />
              <YAxis stroke="currentColor" className="text-gray-500 dark:text-gray-400" tickFormatter={(value) => formatNumber(value as number)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  color: '#1A202C'
                }}
                itemStyle={{ color: '#1A202C' }}
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                formatter={(value: number) => [formatCurrency(value), t('dashboard_sales_chart_actual')]}
              />
              <Bar dataKey="sales" fill="#6366F1" radius={[4, 4, 0, 0]} name={t('dashboard_sales_chart_actual')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('reports_sales_by_payment')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={salesData.salesByPaymentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={{ fontSize: 12, fill: 'currentColor', className: 'text-gray-700 dark:text-gray-300' }}>
                {salesData.salesByPaymentChart.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  color: '#1A202C'
                }}
                itemStyle={{ color: '#1A202C' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2">
          <Card title={t('reports_sales_avg_ticket')} value={formatCurrency(salesData.averageTicket)} icon={<Users className="text-indigo-500" />} />
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysisReport;