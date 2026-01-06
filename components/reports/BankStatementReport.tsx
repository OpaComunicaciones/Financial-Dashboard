import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { formatNumber } from '../../utils/formatting';
import { FileText, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportProps {
  startDate: string;
  endDate: string;
  accountId: string;
  conceptId?: string; // Add concept filter prop
}

const BankStatementReport: React.FC<ReportProps> = ({ startDate, endDate, accountId, conceptId = 'all' }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const reportData = useMemo(() => {
    if (!accountId) return null;

    const account = state.bankAccounts.find(acc => acc.id === accountId);
    if (!account) return null;

    const currency = state.currencies.find(c => c.code === account.currencyCode);
    const currencySymbol = currency?.symbol || '$';

    const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

    // 1. Calculate Initial Balance
    const initialBalance = state.transactions.reduce((acc, tx) => {
      if (tx.bankAccountId === accountId && tx.date < startDate) {
        return acc + tx.amount;
      }
      return acc;
    }, 0);

    // 2. Get transactions within the date range, filtered by concept if needed, sorted chronologically
    const transactionsInRange = state.transactions
      .filter(tx =>
        tx.bankAccountId === accountId &&
        tx.date >= startDate &&
        tx.date <= endDate &&
        (conceptId === 'all' || tx.conceptId === conceptId)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Create a detailed report row for each transaction with a running balance
    let runningBalance = initialBalance;
    const reportRows = transactionsInRange.map(tx => {
      runningBalance += tx.amount;
      const conceptName = tx.conceptId
        ? (state.incomeTypes.find(c => c.id === tx.conceptId)?.name || state.expenseTypes.find(c => c.id === tx.conceptId)?.name || tx.description)
        : tx.description;

      return {
        date: tx.date,
        concept: conceptName,
        description: tx.description,
        income: tx.amount > 0 ? tx.amount : 0,
        expense: tx.amount < 0 ? Math.abs(tx.amount) : 0,
        balance: runningBalance,
      };
    });

    // 4. Calculate totals
    const totalIncome = reportRows.reduce((sum, row) => sum + row.income, 0);
    const totalExpense = reportRows.reduce((sum, row) => sum + row.expense, 0);

    return {
      account,
      formatCurrency,
      initialBalance,
      reportRows,
      totalIncome,
      totalExpense,
      finalBalance: runningBalance
    };

  }, [state, startDate, endDate, accountId]);

  const handleExportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    const { account, formatCurrency, initialBalance, reportRows, totalIncome, totalExpense, finalBalance } = reportData;

    const reportTitle = `Estado de Cuenta Detallado - ${account.name}`;
    const dateInfo = `${startDate} - ${endDate}`;

    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    doc.setFontSize(11);
    doc.text(dateInfo, 14, 30);

    const head = [[t('banks_col_date'), t('daily_cash_col_concept'), t('banks_add_modal_desc'), t('banks_add_modal_deposit'), t('banks_add_modal_withdrawal'), t('reports_cash_flow_final')]];

    const body = reportRows.map(row => [
      row.date,
      row.concept,
      row.description,
      row.income > 0 ? formatCurrency(row.income) : '-',
      row.expense > 0 ? formatCurrency(row.expense) : '-',
      formatCurrency(row.balance)
    ]);

    autoTable(doc, {
      startY: 40,
      head: head,
      body: [
        [{ content: 'Saldo Inicial', colSpan: 5, styles: { fontStyle: 'bold' } }, { content: formatCurrency(initialBalance), styles: { fontStyle: 'bold', halign: 'right' } }],
        ...body
      ],
      foot: [[
        { content: 'Totales', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalIncome), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totalExpense), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(finalBalance), styles: { fontStyle: 'bold', halign: 'right' } }
      ]],
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] },
      footStyles: { fillColor: [55, 65, 81] },
      columnStyles: {
        2: { cellWidth: 'auto' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      },
    });

    doc.save(`Bank_Statement_Detailed_${account.name}_${startDate}_to_${endDate}${conceptId !== 'all' ? '_filtered' : ''}.pdf`);
  };

  const handleExportXLSX = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    const reportTitle = `Estado de Cuenta Detallado - ${reportData.account.name}`;
    const dateInfo = `${startDate} - ${endDate}`;

    const headers = [t('banks_col_date'), t('daily_cash_col_concept'), t('banks_add_modal_desc'), t('banks_add_modal_deposit'), t('banks_add_modal_withdrawal'), t('reports_cash_flow_final')];

    const data = reportData.reportRows.map(row => [
      row.date,
      row.concept,
      row.description,
      row.income > 0 ? row.income : null,
      row.expense > 0 ? row.expense : null,
      row.balance
    ]);

    const finalData = [
      [reportTitle],
      [dateInfo],
      [null],
      ['Saldo Inicial', null, null, null, null, reportData.initialBalance],
      headers,
      ...data,
      ['Totales', null, null, reportData.totalIncome, reportData.totalExpense, reportData.finalBalance]
    ];

    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // Styling
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const currencyFormat = `${reportData.account.currencyCode} #,##0.00`;

    for (let i = 3; i < finalData.length; i++) {
      for (let j = 3; j < 6; j++) { // Adjusted loop for new column indices
        if (typeof finalData[i][j] === 'number') {
          const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
          if (ws[cellRef]) ws[cellRef].z = currencyFormat;
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta');
    XLSX.writeFile(wb, `Bank_Statement_Detailed_${reportData.account.name}_${startDate}_to_${endDate}${conceptId !== 'all' ? '_filtered' : ''}.xlsx`);
  };

  if (!reportData) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
        <p className="text-gray-500 dark:text-gray-400">Por favor, selecciona una cuenta para ver el estado de cuenta.</p>
      </div>
    );
  }

  const { account, formatCurrency, initialBalance, reportRows, totalIncome, totalExpense, finalBalance } = reportData;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Extracto Detallado de Cuenta</h3>
          <p className="text-lg text-indigo-600 dark:text-indigo-400 font-semibold">{account.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{`${startDate} - ${endDate}`}</p>
        </div>
        <div className="flex justify-end gap-2 print:hidden w-full md:w-auto">
          <button onClick={handleExportXLSX} className="flex-1 md:flex-none justify-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm transition-colors transition-shadow">
            <FileText size={18} /> Exportar a Excel
          </button>
          <button onClick={handleExportPDF} className="flex-1 md:flex-none justify-center bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-sm transition-colors transition-shadow">
            <FileDown size={18} /> Exportar a PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 backdrop-blur-sm">
            <tr>
              <th scope="col" className="px-6 py-3">{t('banks_col_date')}</th>
              <th scope="col" className="px-6 py-3">{t('daily_cash_col_concept')}</th>
              <th scope="col" className="px-6 py-3">{t('banks_add_modal_desc')}</th>
              <th scope="col" className="px-6 py-3 text-right">{t('banks_add_modal_deposit')}</th>
              <th scope="col" className="px-6 py-3 text-right">{t('banks_add_modal_withdrawal')}</th>
              <th scope="col" className="px-6 py-3 text-right">{t('reports_cash_flow_final')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
            <tr className="bg-gray-50/50 dark:bg-gray-900/40">
              <td colSpan={5} className="px-6 py-4 font-semibold text-gray-900 dark:text-white">Saldo Inicial</td>
              <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(initialBalance)}</td>
            </tr>
            {reportRows.map((row, index) => (
              <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{row.date}</td>
                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{row.concept}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{row.description}</td>
                <td className="px-6 py-4 text-right font-mono text-green-600 dark:text-green-400">{row.income > 0 ? formatCurrency(row.income) : '-'}</td>
                <td className="px-6 py-4 text-right font-mono text-red-600 dark:text-red-400">{row.expense > 0 ? formatCurrency(row.expense) : '-'}</td>
                <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-white font-medium">{formatCurrency(row.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-xs font-bold uppercase bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
            <tr>
              <td colSpan={3} className="px-6 py-3">Totales</td>
              <td className="px-6 py-3 text-right font-mono">{formatCurrency(totalIncome)}</td>
              <td className="px-6 py-3 text-right font-mono">{formatCurrency(totalExpense)}</td>
              <td className="px-6 py-3 text-right font-mono">{formatCurrency(finalBalance)}</td>
            </tr>
          </tfoot>
        </table>
        {reportRows.length === 0 && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
            No hay transacciones en el período seleccionado.
          </div>
        )}
      </div>
    </div>
  );
};

export default BankStatementReport;
