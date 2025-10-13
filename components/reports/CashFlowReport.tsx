import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { AlertCircle } from 'lucide-react';
import { formatNumber } from '../../utils/formatting';

interface ReportProps {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
}

const CashFlowReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const { cashFlow, unconvertedCurrencies } = useMemo(() => {
    const cf: {
      initialBalance: number;
      inflows: Record<string, { name: string, amount: number }>;
      outflows: Record<string, { name: string, amount: number }>;
      totalInflows: number;
      totalOutflows: number;
    } = { initialBalance: 0, inflows: {}, outflows: {}, totalInflows: 0, totalOutflows: 0 };
    
    const unconverted = new Set<string>();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const getConversionRate = (fromCode: string, date: Date): number | null => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates
            .filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= date)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : null;
    }

    // 1. Calculate Initial Balance at the start of the period
    state.cashClosures.forEach(c => {
        if (new Date(c.date) < start) {
            const rate = getConversionRate(c.currencyCode, start);
            if (rate !== null) cf.initialBalance += c.finalBalance * rate;
            else if(c.currencyCode !== reportingCurrency) unconverted.add(c.currencyCode);
        }
    });
     state.transactions.forEach(tx => {
        if (new Date(tx.date) < start) {
            const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
            if (account) {
                 const rate = getConversionRate(account.currencyCode, start);
                 if (rate !== null) cf.initialBalance += tx.amount * rate;
                 else if(account.currencyCode !== reportingCurrency) unconverted.add(account.currencyCode);
            }
        }
    });

    // 2. Process transactions within the period
    const processFlow = (dateStr: string, currencyCode: string, amount: number, name: string, type: 'inflow' | 'outflow') => {
        const d = new Date(dateStr);
        if (d < start || d > end) return;
        
        const rate = getConversionRate(currencyCode, d);
        if (rate === null) {
            if (currencyCode !== reportingCurrency) unconverted.add(currencyCode);
            return;
        }
        const convertedAmount = Math.abs(amount) * rate;

        if (type === 'inflow') {
            if (!cf.inflows[name]) cf.inflows[name] = { name, amount: 0 };
            cf.inflows[name].amount += convertedAmount;
            cf.totalInflows += convertedAmount;
        } else {
            if (!cf.outflows[name]) cf.outflows[name] = { name, amount: 0 };
            cf.outflows[name].amount += convertedAmount;
            cf.totalOutflows += convertedAmount;
        }
    };
    
    // Inflows
    state.dailySales.forEach(s => processFlow(s.date, s.currencyCode, s.cash, t('reports_cash_flow_sales_cash'), 'inflow'));
    state.miscIncomes.forEach(i => processFlow(i.date, i.currencyCode, i.amount, state.incomeTypes.find(it => it.id === i.conceptId)?.name || 'Misc Income', 'inflow'));
    state.transactions.forEach(tx => {
        if(tx.amount > 0) {
            const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
            if(account) processFlow(tx.date, account.currencyCode, tx.amount, tx.description, 'inflow');
        }
    });

    // Outflows
    state.cashExpenses.forEach(e => processFlow(e.date, e.currencyCode, e.amount, state.expenseTypes.find(et => et.id === e.conceptId)?.name || 'Cash Expense', 'outflow'));
    state.transactions.forEach(tx => {
        if(tx.amount < 0) {
            const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
            if(account) processFlow(tx.date, account.currencyCode, tx.amount, tx.description, 'outflow');
        }
    });


    return { cashFlow: cf, unconvertedCurrencies: Array.from(unconverted) };
  }, [state, startDate, endDate, reportingCurrency, t]);

  const netCashFlow = cashFlow.totalInflows - cashFlow.totalOutflows;
  const finalBalance = cashFlow.initialBalance + netCashFlow;
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  return (
     <div className="space-y-6">
        {unconvertedCurrencies.length > 0 && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 rounded-lg flex items-center gap-3 print:hidden">
              <AlertCircle size={24} />
              <p>{t('reports_unconverted_warning')}: {unconvertedCurrencies.join(', ')}</p>
          </div>
        )}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-2xl font-bold text-indigo-400 mb-4">{t('reports_tab_cash_flow')} ({t('reports_consolidated_in')} {reportingCurrency})</h3>
          <table className="w-full text-lg">
            <tbody>
              <tr className="border-b-2 border-gray-600"><td className="py-2">{t('reports_cash_flow_initial')}</td><td className="text-right font-mono">{formatCurrency(cashFlow.initialBalance)}</td></tr>
              
              <tr className="border-b border-gray-700"><td className="font-bold py-2 text-green-400">{t('reports_cash_flow_inflows')}</td><td></td></tr>
              {Object.values(cashFlow.inflows).map((item, i) => (
                  <tr key={`in-${i}`}><td className="pl-4 py-1 text-sm">{item.name}</td><td className="text-right font-mono text-sm">{formatCurrency(item.amount)}</td></tr>
              ))}
              <tr className="bg-gray-700/50"><td className="font-bold py-2">{t('reports_cash_flow_total_inflows')}</td><td className="text-right font-bold font-mono">{formatCurrency(cashFlow.totalInflows)}</td></tr>

              <tr className="border-b border-gray-700"><td className="font-bold py-2 text-red-400">{t('reports_cash_flow_outflows')}</td><td></td></tr>
               {Object.values(cashFlow.outflows).map((item, i) => (
                  <tr key={`out-${i}`}><td className="pl-4 py-1 text-sm">{item.name}</td><td className="text-right font-mono text-sm">({formatCurrency(item.amount)})</td></tr>
              ))}
              <tr className="bg-gray-700/50"><td className="font-bold py-2">{t('reports_cash_flow_total_outflows')}</td><td className="text-right font-bold font-mono">({formatCurrency(cashFlow.totalOutflows)})</td></tr>

              <tr className="border-b-2 border-gray-600"><td className="py-2 font-bold">{t('reports_cash_flow_net')}</td><td className={`text-right font-bold font-mono ${netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netCashFlow)}</td></tr>
              <tr className="text-xl font-extrabold bg-indigo-900/50"><td className="py-3">{t('reports_cash_flow_final')}</td><td className="text-right font-mono">{formatCurrency(finalBalance)}</td></tr>
            </tbody>
          </table>
        </div>
     </div>
  );
};

export default CashFlowReport;