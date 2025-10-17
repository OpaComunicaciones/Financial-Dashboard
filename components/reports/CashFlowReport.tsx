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
    const cf = {
      initialCashBalance: 0,
      initialBankBalance: 0,
      cashInflows: {} as Record<string, { name: string, amount: number }>,
      bankInflows: {} as Record<string, { name: string, amount: number }>,
      cashOutflows: {} as Record<string, { name: string, amount: number }>,
      bankOutflows: {} as Record<string, { name: string, amount: number }>,
      totalCashInflows: 0,
      totalBankInflows: 0,
      totalCashOutflows: 0,
      totalBankOutflows: 0,
    };
    
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

    // 1. Calculate Initial Balances
    state.cashClosures.forEach(c => {
        if (new Date(c.date) < start) {
            const rate = getConversionRate(c.currencyCode, start);
            if (rate !== null) cf.initialCashBalance += c.finalBalance * rate;
            else if(c.currencyCode !== reportingCurrency) unconverted.add(c.currencyCode);
        }
    });
     state.transactions.forEach(tx => {
        if (new Date(tx.date) < start) {
            const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
            if (account) {
                 const rate = getConversionRate(account.currencyCode, start);
                 if (rate !== null) cf.initialBankBalance += tx.amount * rate;
                 else if(account.currencyCode !== reportingCurrency) unconverted.add(account.currencyCode);
            }
        }
    });

    // 2. Process transactions within the period
    const processFlow = (date: Date, currencyCode: string, amount: number, name: string, type: 'cashIn' | 'bankIn' | 'cashOut' | 'bankOut') => {
        if (date < start || date > end) return;
        
        const rate = getConversionRate(currencyCode, date);
        if (rate === null) {
            if (currencyCode !== reportingCurrency) unconverted.add(currencyCode);
            return;
        }
        const convertedAmount = Math.abs(amount) * rate;

        let targetGroup: Record<string, { name: string, amount: number }>;
        
        switch (type) {
            case 'cashIn':
                targetGroup = cf.cashInflows;
                cf.totalCashInflows += convertedAmount;
                break;
            case 'bankIn':
                targetGroup = cf.bankInflows;
                cf.totalBankInflows += convertedAmount;
                break;
            case 'cashOut':
                targetGroup = cf.cashOutflows;
                cf.totalCashOutflows += convertedAmount;
                break;
            case 'bankOut':
                targetGroup = cf.bankOutflows;
                cf.totalBankOutflows += convertedAmount;
                break;
        }

        if (!targetGroup[name]) targetGroup[name] = { name, amount: 0 };
        targetGroup[name].amount += convertedAmount;
    };
    
    // --- INFLOWS ---
    state.dailySales.forEach(s => {
        const d = new Date(s.date);
        if (s.cash > 0) processFlow(d, s.currencyCode, s.cash, t('reports_cash_flow_sales_cash'), 'cashIn');
        if (s.card > 0) processFlow(d, s.currencyCode, s.card, t('daily_sales_card'), 'bankIn');
        if (s.transfer > 0) processFlow(d, s.currencyCode, s.transfer, t('daily_sales_transfer'), 'bankIn');
    });
    state.miscIncomes.forEach(i => {
        let conceptName = state.incomeTypes.find(it => it.id === i.conceptId)?.name || 'Misc Income';
        if (conceptName === 'Surplus') conceptName = t('special_concept_surplus');
        processFlow(new Date(i.date), i.currencyCode, i.amount, conceptName, 'cashIn');
    });
    state.transactions.forEach(tx => {
        const isSaleTransaction = tx.description.includes('Sales');
        if(tx.amount > 0 && !isSaleTransaction) {
            const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
            if(account) processFlow(new Date(tx.date), account.currencyCode, tx.amount, tx.description, 'bankIn');
        }
    });

    // --- OUTFLOWS ---
    state.cashExpenses.forEach(e => {
        let conceptName = state.expenseTypes.find(et => et.id === e.conceptId)?.name || 'Cash Expense';
        if (conceptName === 'Shortage') conceptName = t('special_concept_shortage');
        processFlow(new Date(e.date), e.currencyCode, e.amount, conceptName, 'cashOut');
    });
    state.invoices.forEach(inv => {
        inv.payments?.forEach(p => {
            const conceptName = state.expenseTypes.find(et => et.id === inv.conceptId)?.name || 'Invoice Payment';
            const name = `${conceptName} - ${inv.supplier} #${inv.invoiceNumber}`;
            if (p.method === 'cash') {
                processFlow(new Date(p.paymentDate), inv.currencyCode, p.amount, name, 'cashOut');
            } else {
                processFlow(new Date(p.paymentDate), inv.currencyCode, p.amount, name, 'bankOut');
            }
        });
    });
    state.transactions.forEach(tx => {
        const isInvoicePayment = tx.description.includes('Payment for invoice #');
        if(tx.amount < 0 && !isInvoicePayment) {
            const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
            if(account) processFlow(new Date(tx.date), account.currencyCode, tx.amount, tx.description, 'bankOut');
        }
    });

    return { cashFlow: cf, unconvertedCurrencies: Array.from(unconverted) };
  }, [state, startDate, endDate, reportingCurrency, t]);

  const totalInflows = cashFlow.totalCashInflows + cashFlow.totalBankInflows;
  const totalOutflows = cashFlow.totalCashOutflows + cashFlow.totalBankOutflows;
  const netCashFlow = totalInflows - totalOutflows;
  const initialBalance = cashFlow.initialCashBalance + cashFlow.initialBankBalance;
  const finalBalance = initialBalance + netCashFlow;
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  const renderRows = (group: Record<string, { name: string, amount: number }>) => {
      return Object.values(group).map((item, i) => (
          <tr key={`${item.name}-${i}`}><td className="pl-8 py-1 text-sm">{item.name}</td><td className="text-right font-mono text-sm">{formatCurrency(item.amount)}</td></tr>
      ));
  }

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
              {/* Initial Balance */}
              <tr className="border-b-2 border-gray-600">
                <td className="py-2 font-bold">{t('reports_cash_flow_initial')}</td>
                <td className="text-right font-bold font-mono">{formatCurrency(initialBalance)}</td>
              </tr>
              <tr><td className="pl-8 py-1 text-sm">Saldo Inicial de Caja</td><td className="text-right font-mono text-sm">{formatCurrency(cashFlow.initialCashBalance)}</td></tr>
              <tr><td className="pl-8 pb-2 text-sm">Saldo Inicial de Bancos</td><td className="text-right font-mono text-sm">{formatCurrency(cashFlow.initialBankBalance)}</td></tr>

              {/* Inflows */}
              <tr className="border-b border-gray-700"><td className="font-bold py-2 text-green-400">{t('reports_cash_flow_inflows')}</td><td></td></tr>
              <tr><td className="pl-4 py-1 font-semibold">Caja</td><td className="text-right font-mono font-semibold">{formatCurrency(cashFlow.totalCashInflows)}</td></tr>
              {renderRows(cashFlow.cashInflows)}
              <tr><td className="pl-4 py-1 font-semibold">Bancos</td><td className="text-right font-mono font-semibold">{formatCurrency(cashFlow.totalBankInflows)}</td></tr>
              {renderRows(cashFlow.bankInflows)}
              <tr className="bg-gray-700/50"><td className="font-bold py-2">{t('reports_cash_flow_total_inflows')}</td><td className="text-right font-bold font-mono">{formatCurrency(totalInflows)}</td></tr>

              {/* Outflows */}
              <tr className="border-b border-gray-700"><td className="font-bold py-2 text-red-400">{t('reports_cash_flow_outflows')}</td><td></td></tr>
              <tr><td className="pl-4 py-1 font-semibold">Caja</td><td className="text-right font-mono font-semibold">({formatCurrency(cashFlow.totalCashOutflows)})</td></tr>
              {renderRows(cashFlow.cashOutflows)}
              <tr><td className="pl-4 py-1 font-semibold">Bancos</td><td className="text-right font-mono font-semibold">({formatCurrency(cashFlow.totalBankOutflows)})</td></tr>
              {renderRows(cashFlow.bankOutflows)}
              <tr className="bg-gray-700/50"><td className="font-bold py-2">{t('reports_cash_flow_total_outflows')}</td><td className="text-right font-bold font-mono">({formatCurrency(totalOutflows)})</td></tr>

              {/* Totals */}
              <tr className="border-b-2 border-gray-600"><td className="py-2 font-bold">{t('reports_cash_flow_net')}</td><td className={`text-right font-bold font-mono ${netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(netCashFlow)}</td></tr>
              <tr className="text-xl font-extrabold bg-indigo-900/50"><td className="py-3">{t('reports_cash_flow_final')}</td><td className="text-right font-mono">{formatCurrency(finalBalance)}</td></tr>
            </tbody>
          </table>
        </div>
     </div>
  );
};

export default CashFlowReport;