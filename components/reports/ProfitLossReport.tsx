
import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { FileText, FileDown, AlertCircle } from 'lucide-react';
import { formatNumber } from '../../utils/formatting';
import { calculateNetSalesForDay } from '../../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportProps {
  startDate: string;
  endDate: string;
  reportingCurrency: string;
}

import * as XLSX from 'xlsx';

const ProfitLossReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const { consolidatedReport, unconvertedCurrencies } = useMemo(() => {
    const report: {
      incomes: Record<string, { name: string, amount: number }>,
      expenses: Record<string, { name: string, amount: number }>,
      totalIncome: number,
      totalExpenses: number,
      netProfit: number
    } = { incomes: {}, expenses: {}, totalIncome: 0, totalExpenses: 0, netProfit: 0 };
    
    const unconverted = new Set<string>();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const getConversionRate = (fromCode: string): number | null => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates
            .filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= end)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : null;
    }

    // 1. Calculate Net Sales using the utility function for each day
    let totalNetSales = 0;
    const uniqueDates = [...new Set(state.dailySales.filter(s => new Date(s.date) >= start && new Date(s.date) <= end).map(s => s.date))];
    
    uniqueDates.forEach(date => {
        const { taxableBase } = calculateNetSalesForDay(date, state);
        // We need to find the original currency for this day's sales to convert, this is a simplification
        // Assuming all sales for a day are in one currency or we convert based on the first entry.
        const saleForDay = state.dailySales.find(s => s.date === date);
        if (saleForDay) {
            const rate = getConversionRate(saleForDay.currencyCode);
            if (rate !== null) {
                totalNetSales += taxableBase * rate;
            } else {
                 if (saleForDay.currencyCode !== reportingCurrency) unconverted.add(saleForDay.currencyCode);
            }
        }
    });

    if (totalNetSales > 0) {
      const conceptId = 'direct_sales';
      const conceptName = t('daily_cash_direct_sales_concept');
      if (!report.incomes[conceptId]) report.incomes[conceptId] = { name: conceptName, amount: 0 };
      report.incomes[conceptId].amount += totalNetSales;
      report.totalIncome += totalNetSales;
    }

    const processEntry = (dateStr: string, currencyCode: string, amount: number, conceptId: string, conceptName: string, type: 'income' | 'expense') => {
        const d = new Date(dateStr);
        if (d < start || d > end) return;

        const rate = getConversionRate(currencyCode);
        if (rate === null) {
            if (currencyCode !== reportingCurrency) unconverted.add(currencyCode);
            return;
        }
        const convertedAmount = amount * rate;
        if (type === 'income') {
            if (!report.incomes[conceptId]) report.incomes[conceptId] = { name: conceptName, amount: 0 };
            report.incomes[conceptId].amount += convertedAmount;
            report.totalIncome += convertedAmount;
        } else {
            if (!report.expenses[conceptId]) report.expenses[conceptId] = { name: conceptName, amount: 0 };
            report.expenses[conceptId].amount += convertedAmount;
            report.totalExpenses += convertedAmount;
        }
    };
    
    // 2. Misc Incomes (excluding surplus, which is now accounted for in net sales)
    state.miscIncomes.forEach(income => {
        const concept = state.incomeTypes.find(c => c.id === income.conceptId);
        if (concept && concept.isIncome && concept.name !== 'Surplus') {
            processEntry(income.date, income.currencyCode, income.amount, income.conceptId, concept.name, 'income');
        }
    });

    // 3. Invoices (Accounts Payable) - Accrual Basis, excluding deductible expenses
    state.invoices.forEach(invoice => {
        const concept = state.expenseTypes.find(c => c.id === invoice.conceptId);
        if (concept && concept.isExpense && !concept.isDeductibleFromSales) {
            processEntry(invoice.date, invoice.currencyCode, invoice.amount, invoice.conceptId, concept.name, 'expense');
        }
    });

    // 4. Cash Expenses (Non-Invoice and not shortage)
    state.cashExpenses.forEach(expense => {
        if (!expense.invoiceNumber) {
            const concept = state.expenseTypes.find(c => c.id === expense.conceptId);
            if (concept && concept.isExpense && concept.name !== 'Shortage') {
                processEntry(expense.date, expense.currencyCode, expense.amount, expense.conceptId, concept.name, 'expense');
            }
        }
    });

    // 5. Bank Transactions (Expenses only and not shortage)
    state.transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.conceptId && !tx.description.includes('Payment for invoice #')) {
            const concept = state.expenseTypes.find(c => c.id === tx.conceptId);
            const bankAccount = state.bankAccounts.find(b => b.id === tx.bankAccountId);
            if (concept && concept.isExpense && bankAccount && concept.name !== 'Shortage') {
                processEntry(tx.date, bankAccount.currencyCode, Math.abs(tx.amount), tx.conceptId, concept.name, 'expense');
            }
        }
    });
      
    report.netProfit = report.totalIncome - report.totalExpenses;

    return { consolidatedReport: report, unconvertedCurrencies: Array.from(unconverted) };
  }, [state, startDate, endDate, reportingCurrency, t]);
  
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const reportTitle = `${t('reports_pl_statement')} (${startDate} - ${endDate})`;
    const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

    // --- DATA PREPARATION ---
    const data = [
      [reportTitle, null, null],
      [currencyInfo, null, null],
      [null, null, null], // Spacer
      [t('reports_income_header'), null, '%'],
    ];

    Object.values(consolidatedReport.incomes).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
      const percentage = consolidatedReport.totalIncome > 0 ? (item.amount / consolidatedReport.totalIncome) : 0;
      data.push([item.name, item.amount, percentage]);
    });
    data.push([t('reports_total_income'), consolidatedReport.totalIncome, 1]);
    data.push([null, null, null]); // Spacer

    data.push([t('reports_expenses_header'), null, '%']);
    Object.values(consolidatedReport.expenses).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
      const percentage = consolidatedReport.totalIncome > 0 ? (item.amount / consolidatedReport.totalIncome) : 0;
      data.push([item.name, item.amount, percentage]);
    });
    data.push([t('reports_total_expenses'), consolidatedReport.totalExpenses, consolidatedReport.totalIncome > 0 ? (consolidatedReport.totalExpenses / consolidatedReport.totalIncome) : 0]);
    data.push([null, null, null]); // Spacer

    data.push([t('reports_net_profit'), consolidatedReport.netProfit, consolidatedReport.totalIncome > 0 ? (consolidatedReport.netProfit / consolidatedReport.totalIncome) : 0]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // --- STYLING ---
    ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 10 }];
    const currencyFormat = `${currencySymbol} #,##0.00;(${currencySymbol} #,##0.00)`;
    const percentFormat = '0.00%';

    for (let i = 0; i < data.length; i++) {
        // Column B (Amount)
        if (typeof data[i][1] === 'number') {
            const cellRef = XLSX.utils.encode_cell({r: i, c: 1});
            if(ws[cellRef]) ws[cellRef].z = currencyFormat;
        }
        // Column C (Percentage)
        if (typeof data[i][2] === 'number') {
            const cellRef = XLSX.utils.encode_cell({r: i, c: 2});
            if(ws[cellRef]) ws[cellRef].z = percentFormat;
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, t('reports_tab_pl'));
    XLSX.writeFile(wb, `P&L_Report_${startDate}_to_${endDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const reportTitle = `${t('reports_pl_statement')} (${startDate} - ${endDate})`;
    const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    doc.setFontSize(11);
    doc.text(currencyInfo, 14, 30);

    const incomeBody = Object.values(consolidatedReport.incomes).sort((a, b) => a.name.localeCompare(b.name)).map(item => [
      item.name,
      formatCurrency(item.amount),
      `${(consolidatedReport.totalIncome > 0 ? (item.amount / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%`
    ]);
    incomeBody.push([
        { content: t('reports_total_income'), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(consolidatedReport.totalIncome), styles: { fontStyle: 'bold' } },
        { content: '100.00%', styles: { fontStyle: 'bold' } }
    ]);

    const expenseBody = Object.values(consolidatedReport.expenses).sort((a, b) => a.name.localeCompare(b.name)).map(item => [
      item.name,
      `(${formatCurrency(item.amount)})`,
      `(${(consolidatedReport.totalIncome > 0 ? (item.amount / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%)`
    ]);
    expenseBody.push([
        { content: t('reports_total_expenses'), styles: { fontStyle: 'bold' } },
        { content: `(${formatCurrency(consolidatedReport.totalExpenses)})`, styles: { fontStyle: 'bold' } },
        { content: `(${(consolidatedReport.totalIncome > 0 ? (consolidatedReport.totalExpenses / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%)`, styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: 40,
      head: [[t('reports_income_header'), 'Monto', '%']],
      body: incomeBody,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
    });

    autoTable(doc, {
      head: [[t('reports_expenses_header'), 'Monto', '%']],
      body: expenseBody,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
      didDrawPage: (data) => {
        // Add Net Profit at the end
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(t('reports_net_profit'), 14, data.cursor.y + 10);
        doc.text(formatCurrency(consolidatedReport.netProfit), 150, data.cursor.y + 10, { align: 'right' });
        doc.text(`${(consolidatedReport.totalIncome > 0 ? (consolidatedReport.netProfit / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%`, 200, data.cursor.y + 10, { align: 'right' });
      }
    });

    doc.save(`P&L_Report_${startDate}_to_${endDate}.pdf`);
  };
  const hasData = consolidatedReport.totalIncome > 0 || consolidatedReport.totalExpenses > 0;

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  return (
    <div id="report-content" className="space-y-8">
      <div className="text-center hidden print:block mb-4">
        <h1 className="text-2xl font-bold">RestoFin</h1>
        <h2 className="text-xl">{t('reports_pl_statement')} ({t('reports_consolidated_in')} {reportingCurrency})</h2>
        <p>{`${t('reports_date_range')}: ${startDate} - ${endDate}`}</p>
      </div>
      
      {unconvertedCurrencies.length > 0 && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 rounded-lg flex items-center gap-3 print:hidden">
              <AlertCircle size={24} />
              <p>{t('reports_unconverted_warning')}: {unconvertedCurrencies.join(', ')}</p>
          </div>
      )}
      
      <div className="flex justify-end gap-2 print:hidden">
          <button onClick={handleExportXLSX} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2">
            <FileText size={18} /> {t('reports_export_excel')}
          </button>
          <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2">
            <FileDown size={18} /> {t('reports_export_pdf')}
          </button>
        </div>

      {!hasData && (
        <div className="text-center py-10 bg-gray-800 rounded-lg"><p className="text-gray-400">{t('reports_no_data')}</p></div>
      )}
      
      {hasData && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 print:border-none print:p-0 print:bg-transparent">
            <h3 className="text-2xl font-bold text-indigo-400 mb-4 print:text-xl print:text-black">
              {t('reports_pl_statement')} ({t('reports_consolidated_in')} {reportingCurrency})
            </h3>
            <table className="w-full text-lg print:text-sm">
              <tbody>
                {/* Income Section */}
                <tr className="border-b-2 border-gray-600 print:border-black">
                  <td className="font-bold py-2 text-green-400 print:text-green-600">{t('reports_income_header')}</td>
                  <td className="text-right font-bold">Monto</td>
                  <td className="text-right font-bold">%</td>
                </tr>
                {Object.values(consolidatedReport.incomes).sort((a, b) => a.name.localeCompare(b.name)).map((item, index) => (
                  <tr key={`inc-${index}`} className="border-b border-gray-700 print:border-gray-300">
                    <td className="pl-4 py-2">{item.name}</td>
                    <td className="text-right font-mono">{formatCurrency(item.amount)}</td>
                    <td className="text-right font-mono text-sm">{(consolidatedReport.totalIncome > 0 ? (item.amount / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%</td>
                  </tr>
                ))}
                <tr className="bg-gray-700/50 print:bg-gray-200">
                  <td className="font-bold py-2">{t('reports_total_income')}</td>
                  <td className="text-right font-bold font-mono">{formatCurrency(consolidatedReport.totalIncome)}</td>
                  <td className="text-right font-bold font-mono text-sm">100.00%</td>
                </tr>

                {/* Expenses Section */}
                <tr className="border-b-2 border-gray-600 print:border-black mt-4">
                  <td className="font-bold py-2 text-red-400 print:text-red-600">{t('reports_expenses_header')}</td>
                  <td></td>
                  <td className="text-right font-bold">% vs Ing.</td>
                </tr>
                {Object.values(consolidatedReport.expenses).sort((a, b) => a.name.localeCompare(b.name)).map((item, index) => (
                  <tr key={`exp-${index}`} className="border-b border-gray-700 print:border-gray-300">
                    <td className="pl-4 py-2">{item.name}</td>
                    <td className="text-right font-mono">({formatCurrency(item.amount)})</td>
                    <td className="text-right font-mono text-sm">({(consolidatedReport.totalIncome > 0 ? (item.amount / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%)</td>
                  </tr>
                ))}
                <tr className="bg-gray-700/50 print:bg-gray-200">
                  <td className="font-bold py-2">{t('reports_total_expenses')}</td>
                  <td className="text-right font-bold font-mono">({formatCurrency(consolidatedReport.totalExpenses)})</td>
                  <td className="text-right font-bold font-mono text-sm">({(consolidatedReport.totalIncome > 0 ? (consolidatedReport.totalExpenses / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%)</td>
                </tr>

                {/* Net Profit Section */}
                <tr className={`text-xl font-extrabold ${consolidatedReport.netProfit >= 0 ? 'bg-green-900/50' : 'bg-red-900/50'} print:bg-gray-300`}>
                  <td className="py-3">{t('reports_net_profit')}</td>
                  <td className="text-right font-mono">{formatCurrency(consolidatedReport.netProfit)}</td>
                  <td className="text-right font-mono text-base">{(consolidatedReport.totalIncome > 0 ? (consolidatedReport.netProfit / consolidatedReport.totalIncome * 100) : 0).toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
      )}
    </div>
  );
};

export default ProfitLossReport;
