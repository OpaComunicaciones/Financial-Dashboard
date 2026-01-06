import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { AlertCircle, FileText, FileDown } from 'lucide-react';
import { formatNumber } from '../../utils/formatting';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return rates.length > 0 ? rates[0].rate : null;
    }

    // 1. Calculate Initial Balances
    state.cashClosures.forEach(c => {
      const d = new Date(c.date);
      if (d < start) {
        const rate = getConversionRate(c.currencyCode, d);
        if (rate !== null) cf.initialCashBalance += c.finalBalance * rate;
        else if (c.currencyCode !== reportingCurrency) unconverted.add(c.currencyCode);
      }
    });
    state.transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d < start) {
        const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
        if (account) {
          const rate = getConversionRate(account.currencyCode, d);
          if (rate !== null) cf.initialBankBalance += tx.amount * rate;
          else if (account.currencyCode !== reportingCurrency) unconverted.add(account.currencyCode);
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
    // Cash Inflows are from daily cash sales and misc cash incomes.
    state.dailySales.forEach(s => {
      if (s.cash > 0) processFlow(new Date(s.date), s.currencyCode, s.cash, t('reports_cash_flow_sales_cash'), 'cashIn');
    });
    state.miscIncomes.forEach(i => {
      let conceptName = state.incomeTypes.find(it => it.id === i.conceptId)?.name || 'Misc Income';
      if (conceptName === 'Surplus') conceptName = t('special_concept_surplus');
      processFlow(new Date(i.date), i.currencyCode, i.amount, conceptName, 'cashIn');
    });

    // Bank Inflows are all positive bank transactions (which includes card/transfer sales).
    state.transactions.forEach(tx => {
      if (tx.amount > 0) {
        const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
        const conceptName = state.incomeTypes.find(it => it.id === tx.conceptId)?.name || tx.description;
        if (account) processFlow(new Date(tx.date), account.currencyCode, tx.amount, conceptName, 'bankIn');
      }
    });

    // --- OUTFLOWS ---
    // Cash Outflows are all cash expenses.
    state.cashExpenses.forEach(e => {
      let conceptName = state.expenseTypes.find(et => et.id === e.conceptId)?.name || 'Cash Expense';
      if (conceptName === 'Shortage') conceptName = t('special_concept_shortage');
      processFlow(new Date(e.date), e.currencyCode, e.amount, conceptName, 'cashOut');
    });

    // Bank Outflows are all negative bank transactions.
    state.transactions.forEach(tx => {
      if (tx.amount < 0) {
        const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
        const conceptName = state.expenseTypes.find(et => et.id === tx.conceptId)?.name || tx.description;
        if (account) processFlow(new Date(tx.date), account.currencyCode, tx.amount, conceptName, 'bankOut');
      }
    });

    return { cashFlow: cf, unconvertedCurrencies: Array.from(unconverted) };
  }, [state, startDate, endDate, reportingCurrency, t]);

  const totalInflows = cashFlow.totalCashInflows + cashFlow.totalBankInflows;
  const totalOutflows = cashFlow.totalCashOutflows + cashFlow.totalBankOutflows;
  const netCashFlow = totalInflows - totalOutflows;
  const initialBalance = cashFlow.initialCashBalance + cashFlow.initialBankBalance;
  const finalBalance = initialBalance + netCashFlow;
  const currencySymbol = state.currencies.find(c => c.code === reportingCurrency)?.symbol || '$';

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const reportTitle = t('reports_tab_cash_flow');
    const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    doc.setFontSize(11);
    doc.text(currencyInfo, 14, 30);
    doc.text(`${startDate} - ${endDate}`, 14, 36);

    const head = [['Descripción', 'Monto']];
    const body = [];

    // Initial Balance
    body.push([{ content: t('reports_cash_flow_initial'), styles: { fontStyle: 'bold' } }, { content: formatCurrency(initialBalance), styles: { fontStyle: 'bold' } }]);
    body.push([`  ${t('sidebar_daily_cash')}`, formatCurrency(cashFlow.initialCashBalance)]);
    body.push([`  ${t('sidebar_banks')}`, formatCurrency(cashFlow.initialBankBalance)]);

    // Inflows
    body.push([{ content: t('reports_cash_flow_inflows'), styles: { fontStyle: 'bold', fillColor: [22, 163, 74] } }, '']);
    body.push([`  ${t('sidebar_daily_cash')}`, formatCurrency(cashFlow.totalCashInflows)]);
    Object.values(cashFlow.cashInflows).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => body.push([`    ${item.name}`, formatCurrency(item.amount)]));
    body.push([`  ${t('sidebar_banks')}`, formatCurrency(cashFlow.totalBankInflows)]);
    Object.values(cashFlow.bankInflows).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => body.push([`    ${item.name}`, formatCurrency(item.amount)]));
    body.push([{ content: t('reports_cash_flow_total_inflows'), styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalInflows), styles: { fontStyle: 'bold' } }]);

    // Outflows
    body.push([{ content: t('reports_cash_flow_outflows'), styles: { fontStyle: 'bold', fillColor: [220, 38, 38] } }, '']);
    body.push([`  ${t('sidebar_daily_cash')}`, `(${formatCurrency(cashFlow.totalCashOutflows)})`]);
    Object.values(cashFlow.cashOutflows).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => body.push([`    ${item.name}`, `(${formatCurrency(item.amount)})`]));
    body.push([`  ${t('sidebar_banks')}`, `(${formatCurrency(cashFlow.totalBankOutflows)})`]);
    Object.values(cashFlow.bankOutflows).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => body.push([`    ${item.name}`, `(${formatCurrency(item.amount)})`]));
    body.push([{ content: t('reports_cash_flow_total_outflows'), styles: { fontStyle: 'bold' } }, { content: `(${formatCurrency(totalOutflows)})`, styles: { fontStyle: 'bold' } }]);

    // Totals
    body.push([{ content: t('reports_cash_flow_net'), styles: { fontStyle: 'bold' } }, { content: formatCurrency(netCashFlow), styles: { fontStyle: 'bold' } }]);
    body.push([{ content: t('reports_cash_flow_final'), styles: { fontStyle: 'bold' } }, { content: formatCurrency(finalBalance), styles: { fontStyle: 'bold' } }]);


    autoTable(doc, {
      startY: 40,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: function (data) {
        if (data.section === 'body') {
          // Make main section headers bold
          const boldHeaders = [t('reports_cash_flow_inflows'), t('reports_cash_flow_outflows')];
          const raw = data.cell.raw as any;
          if (typeof raw === 'object' && raw.content && boldHeaders.includes(raw.content)) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`Cash_Flow_Report_${startDate}_to_${endDate}.pdf`);
  };

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const reportTitle = t('reports_tab_cash_flow');
    const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

    const data = [
      [reportTitle, null],
      [currencyInfo, null],
      [null, null], // Spacer

      // Initial Balance
      [t('reports_cash_flow_initial'), initialBalance],
      ['  Saldo Inicial de Caja', cashFlow.initialCashBalance],
      ['  Saldo Inicial de Bancos', cashFlow.initialBankBalance],
      [null, null], // Spacer

      // Inflows
      [t('reports_cash_flow_inflows'), null],
      ['  Caja', cashFlow.totalCashInflows],
      ...Object.values(cashFlow.cashInflows).sort((a, b) => a.name.localeCompare(b.name)).map(item => [`    ${item.name}`, item.amount]),
      ['  Bancos', cashFlow.totalBankInflows],
      ...Object.values(cashFlow.bankInflows).sort((a, b) => a.name.localeCompare(b.name)).map(item => [`    ${item.name}`, item.amount]),
      [t('reports_cash_flow_total_inflows'), totalInflows],
      [null, null], // Spacer

      // Outflows
      [t('reports_cash_flow_outflows'), null],
      ['  Caja', cashFlow.totalCashOutflows],
      ...Object.values(cashFlow.cashOutflows).sort((a, b) => a.name.localeCompare(b.name)).map(item => [`    ${item.name}`, item.amount]),
      ['  Bancos', cashFlow.totalBankOutflows],
      ...Object.values(cashFlow.bankOutflows).sort((a, b) => a.name.localeCompare(b.name)).map(item => [`    ${item.name}`, item.amount]),
      [t('reports_cash_flow_total_outflows'), totalOutflows],
      [null, null], // Spacer

      // Totals
      [t('reports_cash_flow_net'), netCashFlow],
      [t('reports_cash_flow_final'), finalBalance],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Styling
    ws['!cols'] = [{ wch: 50 }, { wch: 20 }];
    const currencyFormat = `${currencySymbol} #,##0.00;(${currencySymbol} #,##0.00)`;

    for (let i = 0; i < data.length; i++) {
      if (typeof data[i][1] === 'number') {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 1 });
        if (ws[cellRef]) ws[cellRef].z = currencyFormat;
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, reportTitle);
    XLSX.writeFile(wb, `Cash_Flow_Report_${startDate}_to_${endDate}.xlsx`);
  };

  const renderRows = (group: Record<string, { name: string, amount: number }>) => {
    return Object.values(group).sort((a, b) => a.name.localeCompare(b.name)).map((item, i) => (
      <tr key={`${item.name}-${i}`}><td className="pl-8 py-1 text-sm">{item.name}</td><td className="text-right font-mono text-sm">{formatCurrency(item.amount)}</td></tr>
    ));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 print:hidden">
        <button onClick={handleExportXLSX} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2">
          <FileText size={18} /> {t('reports_export_excel')}
        </button>
        <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2">
          <FileDown size={18} /> {t('reports_export_pdf')}
        </button>
      </div>

      {unconvertedCurrencies.length > 0 && (
        <div className="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg flex items-center gap-3 print:hidden">
          <AlertCircle size={24} />
          <p>{t('reports_unconverted_warning')}: {unconvertedCurrencies.join(', ')}</p>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">{t('reports_tab_cash_flow')} ({t('reports_consolidated_in')} {reportingCurrency})</h3>
        <table className="w-full text-lg">
          <tbody className="text-gray-900 dark:text-gray-100">
            {/* Initial Balance */}
            <tr className="border-b-2 border-gray-200 dark:border-gray-600">
              <td className="py-2 font-bold">{t('reports_cash_flow_initial')}</td>
              <td className="text-right font-bold font-mono">{formatCurrency(initialBalance)}</td>
            </tr>
            <tr><td className="pl-8 py-1 text-sm text-gray-600 dark:text-gray-400">Saldo Inicial de Caja</td><td className="text-right font-mono text-sm">{formatCurrency(cashFlow.initialCashBalance)}</td></tr>
            <tr><td className="pl-8 pb-2 text-sm text-gray-600 dark:text-gray-400">Saldo Inicial de Bancos</td><td className="text-right font-mono text-sm">{formatCurrency(cashFlow.initialBankBalance)}</td></tr>

            {/* Inflows */}
            <tr className="border-b border-gray-100 dark:border-gray-700"><td className="font-bold py-2 text-green-600 dark:text-green-400">{t('reports_cash_flow_inflows')}</td><td></td></tr>
            <tr><td className="pl-4 py-1 font-semibold">Caja</td><td className="text-right font-mono font-semibold">{formatCurrency(cashFlow.totalCashInflows)}</td></tr>
            {renderRows(cashFlow.cashInflows)}
            <tr><td className="pl-4 py-1 font-semibold">Bancos</td><td className="text-right font-mono font-semibold">{formatCurrency(cashFlow.totalBankInflows)}</td></tr>
            {renderRows(cashFlow.bankInflows)}
            <tr className="bg-gray-50 dark:bg-gray-700/50"><td className="font-bold py-2">{t('reports_cash_flow_total_inflows')}</td><td className="text-right font-bold font-mono">{formatCurrency(totalInflows)}</td></tr>

            {/* Outflows */}
            <tr className="border-b border-gray-100 dark:border-gray-700"><td className="font-bold py-2 text-red-600 dark:text-red-400">{t('reports_cash_flow_outflows')}</td><td></td></tr>
            <tr><td className="pl-4 py-1 font-semibold">Caja</td><td className="text-right font-mono font-semibold">({formatCurrency(cashFlow.totalCashOutflows)})</td></tr>
            {renderRows(cashFlow.cashOutflows)}
            <tr><td className="pl-4 py-1 font-semibold">Bancos</td><td className="text-right font-mono font-semibold">({formatCurrency(cashFlow.totalBankOutflows)})</td></tr>
            {renderRows(cashFlow.bankOutflows)}
            <tr className="bg-gray-50 dark:bg-gray-700/50"><td className="font-bold py-2">{t('reports_cash_flow_total_outflows')}</td><td className="text-right font-bold font-mono">({formatCurrency(totalOutflows)})</td></tr>

            {/* Totals */}
            <tr className="border-b-2 border-gray-200 dark:border-gray-600"><td className="py-2 font-bold">{t('reports_cash_flow_net')}</td><td className={`text-right font-bold font-mono ${netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(netCashFlow)}</td></tr>
            <tr className="text-xl font-extrabold bg-indigo-50 dark:bg-indigo-900/40"><td className="py-3 px-2">{t('reports_cash_flow_final')}</td><td className="text-right font-mono px-2">{formatCurrency(finalBalance)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashFlowReport;