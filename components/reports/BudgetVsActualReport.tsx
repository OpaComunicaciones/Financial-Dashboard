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
  reportingCurrency: string;
}

const BudgetVsActualReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const comparisonData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const getConversionRate = (fromCode: string): number => {
        if (fromCode === reportingCurrency) return 1;
        const rates = state.exchangeRates.filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= end).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return rates.length > 0 ? rates[0].rate : 0;
    }

    // Part 1: Calculate Actuals using P&L logic for consistency
    const actuals: { incomes: Record<string, number>, expenses: Record<string, number> } = { incomes: {}, expenses: {} };
    const processEntry = (dateStr: string, currencyCode: string, amount: number, conceptId: string, type: 'income' | 'expense') => {
        const d = new Date(dateStr);
        if (d < start || d > end) return;
        const rate = getConversionRate(currencyCode);
        const convertedAmount = amount * rate;

        if (type === 'income') {
            if (!actuals.incomes[conceptId]) actuals.incomes[conceptId] = 0;
            actuals.incomes[conceptId] += convertedAmount;
        } else {
            if (!actuals.expenses[conceptId]) actuals.expenses[conceptId] = 0;
            actuals.expenses[conceptId] += convertedAmount;
        }
    };

    // --- Actual Incomes ---
    // Find the primary, plannable sales category to assign all daily sales to.
    const primarySalesCategory = state.incomeTypes.find(c => c.isPlannable && c.isIncome);
    const salesConceptId = primarySalesCategory ? primarySalesCategory.id : 'unassigned_sales'; // Fallback key

    state.dailySales.forEach(sale => {
      const totalSale = sale.cash + sale.card + sale.transfer;
      if (totalSale > 0) processEntry(sale.date, sale.currencyCode, totalSale, salesConceptId, 'income');
    });
    state.miscIncomes.forEach(income => {
        const concept = state.incomeTypes.find(c => c.id === income.conceptId);
        if (concept && concept.isIncome) processEntry(income.date, income.currencyCode, income.amount, income.conceptId, 'income');
    });
    state.transactions.forEach(tx => {
        if (tx.type === 'income' && tx.conceptId) {
            const concept = state.incomeTypes.find(c => c.id === tx.conceptId);
            const bankAccount = state.bankAccounts.find(b => b.id === tx.bankAccountId);
            // We do NOT filter out sales here, because they are already being assigned to the primary sales concept ID.
            if (concept && concept.isIncome && bankAccount) processEntry(tx.date, bankAccount.currencyCode, Math.abs(tx.amount), tx.conceptId, 'income');
        }
    });

    // --- Actual Expenses (Accrual) ---
    state.invoices.forEach(invoice => {
        const concept = state.expenseTypes.find(c => c.id === invoice.conceptId);
        if (concept && concept.isExpense) processEntry(invoice.date, invoice.currencyCode, invoice.amount, invoice.conceptId, 'expense');
    });
    state.cashExpenses.forEach(expense => {
        if (!expense.invoiceNumber) {
            const concept = state.expenseTypes.find(c => c.id === expense.conceptId);
            if (concept && concept.isExpense) processEntry(expense.date, expense.currencyCode, expense.amount, expense.conceptId, 'expense');
        }
    });
    state.transactions.forEach(tx => {
        if (tx.type === 'expense' && tx.conceptId && !tx.description.includes('Payment for invoice #')) {
            const concept = state.expenseTypes.find(c => c.id === tx.conceptId);
            const bankAccount = state.bankAccounts.find(b => b.id === tx.bankAccountId);
            if (concept && concept.isExpense && bankAccount) processEntry(tx.date, bankAccount.currencyCode, Math.abs(tx.amount), tx.conceptId, 'expense');
        }
    });

    // Part 2: Calculate Budget for the period
    const budget: { incomes: Record<string, number>, expenses: Record<string, number> } = { incomes: {}, expenses: {} };
    state.budgetRecords.forEach(b => {
        const budgetDate = new Date(b.year, b.month - 1, 15);
        if (budgetDate >= start && budgetDate <= end) {
            const target = b.categoryType === 'income' ? budget.incomes : budget.expenses;
            target[b.categoryId] = (target[b.categoryId] || 0) + b.amount;
        }
    });
    
    // Part 3: Build rows from all categories that have a budget or an actual value
    const allIncomeKeys = new Set([...Object.keys(budget.incomes), ...Object.keys(actuals.incomes)]);
    const allExpenseKeys = new Set([...Object.keys(budget.expenses), ...Object.keys(actuals.expenses)]);

    const incomeRows = Array.from(allIncomeKeys).map(id => {
        const category = state.incomeTypes.find(c => c.id === id);
        if (!category || category.name === 'Surplus') return null;

        const budgeted = budget.incomes[id] || 0;
        const actual = actuals.incomes[id] || 0;
        const variance = actual - budgeted;
        return { name: category.name, budgeted, actual, variance };
    }).filter(Boolean) as { name: string, budgeted: number, actual: number, variance: number }[];

    const expenseRows = Array.from(allExpenseKeys).map(id => {
        const category = state.expenseTypes.find(c => c.id === id);
        if (!category || category.name === 'Shortage') return null;

        const budgeted = budget.expenses[id] || 0;
        const actual = actuals.expenses[id] || 0;
        const variance = budgeted - actual; // Favorable if actual is less
        return { name: category.name, budgeted, actual, variance };
    }).filter(Boolean) as { name: string, budgeted: number, actual: number, variance: number }[];

    const incomeTotals = incomeRows.reduce((acc, row) => {
        acc.budgeted += row.budgeted;
        acc.actual += row.actual;
        acc.variance += row.variance;
        return acc;
    }, { budgeted: 0, actual: 0, variance: 0 });

    const expenseTotals = expenseRows.reduce((acc, row) => {
        acc.budgeted += row.budgeted;
        acc.actual += row.actual;
        acc.variance += row.variance;
        return acc;
    }, { budgeted: 0, actual: 0, variance: 0 });

    return { incomeRows, expenseRows, incomeTotals, expenseTotals };

  }, [state, startDate, endDate, reportingCurrency, t]);
  
  const currencySymbol = state.currencies.find(c=>c.code === reportingCurrency)?.symbol || '$';
  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const reportTitle = t('reports_tab_budget');
    const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

    doc.setFontSize(18);
    doc.text(reportTitle, 14, 22);
    doc.setFontSize(11);
    doc.text(currencyInfo, 14, 30);
    doc.text(`${startDate} - ${endDate}`, 14, 36);

    const head = [[t('planning_category'), t('reports_budget_budgeted'), t('reports_budget_actual'), t('reports_budget_variance_val'), t('reports_budget_variance_pct')]];
    
    const incomeBody = comparisonData.incomeRows.map(row => {
      const variancePercent = row.budgeted !== 0 ? formatNumber((row.variance / row.budgeted) * 100) : 'N/A';
      return [row.name, formatCurrency(row.budgeted), formatCurrency(row.actual), formatCurrency(row.variance), `${variancePercent}%`];
    });
    incomeBody.push([
        { content: t('reports_total_income'), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(comparisonData.incomeTotals.budgeted), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(comparisonData.incomeTotals.actual), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(comparisonData.incomeTotals.variance), styles: { fontStyle: 'bold' } },
        { content: `${comparisonData.incomeTotals.budgeted > 0 ? formatNumber((comparisonData.incomeTotals.variance / comparisonData.incomeTotals.budgeted) * 100) : 'N/A'}%`, styles: { fontStyle: 'bold' } },
    ]);

    const expenseBody = comparisonData.expenseRows.map(row => {
      const variancePercent = row.budgeted !== 0 ? formatNumber((row.variance / row.budgeted) * 100) : 'N/A';
      return [row.name, formatCurrency(row.budgeted), formatCurrency(row.actual), formatCurrency(row.variance), `${variancePercent}%`];
    });
    expenseBody.push([
        { content: t('reports_total_expenses'), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(comparisonData.expenseTotals.budgeted), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(comparisonData.expenseTotals.actual), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(comparisonData.expenseTotals.variance), styles: { fontStyle: 'bold' } },
        { content: `${comparisonData.expenseTotals.budgeted > 0 ? formatNumber((comparisonData.expenseTotals.variance / comparisonData.expenseTotals.budgeted) * 100) : 'N/A'}%`, styles: { fontStyle: 'bold' } },
    ]);

    autoTable(doc, {
      startY: 40,
      head: [[{ content: t('reports_income_header'), colSpan: 5, styles: { halign: 'center', fillColor: [22, 163, 74] } }]],
      theme: 'grid',
    });

    autoTable(doc, {
      head: head,
      body: incomeBody,
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 
        1: { halign: 'right' }, 
        2: { halign: 'right' }, 
        3: { halign: 'right' }, 
        4: { halign: 'right' } 
      },
    });

    autoTable(doc, {
      head: [[{ content: t('reports_expenses_header'), colSpan: 5, styles: { halign: 'center', fillColor: [220, 38, 38] } }]],
      theme: 'grid',
    });

    autoTable(doc, {
      head: head,
      body: expenseBody,
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 
        1: { halign: 'right' }, 
        2: { halign: 'right' }, 
        3: { halign: 'right' }, 
        4: { halign: 'right' } 
      },
    });

    doc.save(`Budget_vs_Actual_${startDate}_to_${endDate}.pdf`);
  };

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const reportTitle = t('reports_tab_budget');
    const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

    const headers = [t('planning_category'), t('reports_budget_budgeted'), t('reports_budget_actual'), t('reports_budget_variance_val'), t('reports_budget_variance_pct')];

    const data = [
      [reportTitle, null, null],
      [currencyInfo, null, null],
      [null, null, null], // Spacer
      [t('reports_income_header'), null, null],
      headers,
    ];

    comparisonData.incomeRows.forEach(row => {
      const variancePercent = row.budgeted !== 0 ? (row.variance / row.budgeted) : 0;
      data.push([row.name, row.budgeted, row.actual, row.variance, variancePercent]);
    });
    const incomeTotalVariancePct = comparisonData.incomeTotals.budgeted > 0 ? (comparisonData.incomeTotals.variance / comparisonData.incomeTotals.budgeted) : 0;
    data.push([t('reports_total_income'), comparisonData.incomeTotals.budgeted, comparisonData.incomeTotals.actual, comparisonData.incomeTotals.variance, incomeTotalVariancePct]);

    data.push([null, null, null]); // Spacer
    data.push([t('reports_expenses_header'), null, null]);
    data.push(headers);

    comparisonData.expenseRows.forEach(row => {
      const variancePercent = row.budgeted !== 0 ? (row.variance / row.budgeted) : 0;
      data.push([row.name, row.budgeted, row.actual, row.variance, variancePercent]);
    });
    const expenseTotalVariancePct = comparisonData.expenseTotals.budgeted > 0 ? (comparisonData.expenseTotals.variance / comparisonData.expenseTotals.budgeted) : 0;
    data.push([t('reports_total_expenses'), comparisonData.expenseTotals.budgeted, comparisonData.expenseTotals.actual, comparisonData.expenseTotals.variance, expenseTotalVariancePct]);


    const ws = XLSX.utils.aoa_to_sheet(data);

    // Styling
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    const currencyFormat = `${currencySymbol} #,##0.00`;
    const percentFormat = '0.00%';

    for(let i = 4; i < data.length; i++) {
      if (i === 5 + comparisonData.incomeRows.length || i === 7 + comparisonData.incomeRows.length) continue; // Skip headers and spacer
      if (typeof data[i][1] === 'number') ws[XLSX.utils.encode_cell({r: i, c: 1})].z = currencyFormat;
      if (typeof data[i][2] === 'number') ws[XLSX.utils.encode_cell({r: i, c: 2})].z = currencyFormat;
      if (typeof data[i][3] === 'number') ws[XLSX.utils.encode_cell({r: i, c: 3})].z = currencyFormat;
      if (typeof data[i][4] === 'number') ws[XLSX.utils.encode_cell({r: i, c: 4})].z = percentFormat;
    }

    XLSX.utils.book_append_sheet(wb, ws, reportTitle);
    XLSX.writeFile(wb, `Budget_vs_Actual_${startDate}_to_${endDate}.xlsx`);
  };

  const renderRow = (row: {name: string, budgeted: number, actual: number, variance: number}) => {
    const isFavorable = row.variance >= 0;
    const varianceColor = isFavorable ? 'text-green-400' : 'text-red-400';
    const variancePercent = row.budgeted !== 0 ? formatNumber((row.variance / row.budgeted) * 100) : 'N/A';
    
    return (
        <tr key={row.name} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
            <td className="px-6 py-4 font-medium text-white">{row.name}</td>
            <td className="px-6 py-4 text-right font-mono">{formatCurrency(row.budgeted)}</td>
            <td className="px-6 py-4 text-right font-mono">{formatCurrency(row.actual)}</td>
            <td className={`px-6 py-4 text-right font-mono ${varianceColor}`}>{formatCurrency(row.variance)}</td>
            <td className={`px-6 py-4 text-right font-mono ${varianceColor}`}>{variancePercent}%</td>
        </tr>
    );
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
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <h3 className="text-2xl font-bold text-indigo-400 p-6">{t('reports_tab_budget')} ({t('reports_consolidated_in')} {reportingCurrency})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
                {/* Income Section */}
                <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr><th colSpan={5} className="px-6 py-3 text-green-400 font-bold text-lg">{t('reports_income_header')}</th></tr>
                    <tr>
                        <th scope="col" className="px-6 py-3">{t('planning_category')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_budgeted')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_actual')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_val')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_pct')}</th>
                    </tr>
                </thead>
                <tbody>
                    {comparisonData.incomeRows.map(row => renderRow(row))}
                    <tr className="bg-gray-900/50 font-bold border-t-2 border-gray-600">
                        <td className="px-6 py-3 text-right">{t('reports_total_income')}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(comparisonData.incomeTotals.budgeted)}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(comparisonData.incomeTotals.actual)}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(comparisonData.incomeTotals.variance)}</td>
                        <td className="px-6 py-3 text-right font-mono">
                            {comparisonData.incomeTotals.budgeted > 0 ? `${formatNumber((comparisonData.incomeTotals.variance / comparisonData.incomeTotals.budgeted) * 100)}%` : 'N/A'}
                        </td>
                    </tr>
                </tbody>
                {/* Expense Section */}
                 <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr><th colSpan={5} className="px-6 py-3 text-red-400 font-bold text-lg">{t('reports_expenses_header')}</th></tr>
                     <tr>
                        <th scope="col" className="px-6 py-3">{t('planning_category')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_budgeted')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_actual')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_val')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('reports_budget_variance_pct')}</th>
                    </tr>
                </thead>
                <tbody>
                    {comparisonData.expenseRows.map(row => renderRow(row))}
                    <tr className="bg-gray-900/50 font-bold border-t-2 border-gray-600">
                        <td className="px-6 py-3 text-right">{t('reports_total_expenses')}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(comparisonData.expenseTotals.budgeted)}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(comparisonData.expenseTotals.actual)}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatCurrency(comparisonData.expenseTotals.variance)}</td>
                        <td className="px-6 py-3 text-right font-mono">
                            {comparisonData.expenseTotals.budgeted > 0 ? `${formatNumber((comparisonData.expenseTotals.variance / comparisonData.expenseTotals.budgeted) * 100)}%` : 'N/A'}
                        </td>
                    </tr>
                </tbody>
            </table>
          </div>
        </div>
     </div>
  );
};

export default BudgetVsActualReport;