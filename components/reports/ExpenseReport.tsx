import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatNumber } from '../../utils/formatting';
import { AlertTriangle, FileText, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportProps {
    startDate: string;
    endDate: string;
    reportingCurrency: string;
}

const ExpenseReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency }) => {
    const { t } = useTranslation();
    const { state } = useAppContext();
    const [showOnlyNonDeductible, setShowOnlyNonDeductible] = useState(false);
    const [viewType, setViewType] = useState<'grouped' | 'detailed'>('grouped');

    const { reportData } = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const getConversionRate = (fromCode: string, date: string): number => {
            if (fromCode === reportingCurrency) return 1;
            const rates = state.exchangeRates
                .filter(r => r.fromCurrencyCode === fromCode && r.toCurrencyCode === reportingCurrency && new Date(r.date) <= new Date(date))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return rates.length > 0 ? rates[0].rate : 0;
        }

        // Part 1: Calculate Total Income (borrowed from P&L report)
        let totalIncome = 0;
        const processIncomeEntry = (dateStr: string, currencyCode: string, amount: number) => {
            const d = new Date(dateStr);
            if (d < start || d > end) return;
            const rate = getConversionRate(currencyCode, dateStr);
            if (rate === null) return;
            totalIncome += amount * rate;
        };

        state.dailySales.forEach(sale => {
            const totalSale = sale.cash + sale.card + sale.transfer;
            if (totalSale > 0) processIncomeEntry(sale.date, sale.currencyCode, totalSale);
        });

        state.miscIncomes.forEach(income => {
            const concept = state.incomeTypes.find(c => c.id === income.conceptId);
            if (concept && concept.isIncome && concept.name !== 'Ventas Directas' && concept.name !== 'Direct Sales') {
                processIncomeEntry(income.date, income.currencyCode, income.amount);
            }
        });

        state.transactions.forEach(tx => {
            if (tx.type === 'income' && tx.conceptId) {
                const concept = state.incomeTypes.find(c => c.id === tx.conceptId);
                const bankAccount = state.bankAccounts.find(b => b.id === tx.bankAccountId);
                if (concept && concept.isIncome && bankAccount && concept.name !== 'Ventas Directas' && concept.name !== 'Direct Sales') {
                    processIncomeEntry(tx.date, bankAccount.currencyCode, Math.abs(tx.amount));
                }
            }
        });

        // Part 2: Gather all expenses (Accrual Basis)
        const allExpenses: any[] = [];
        const processExpenseEntry = (expense: any, type: 'invoice' | 'cash' | 'bank') => {
            const d = new Date(expense.date);
            if (d < start || d > end) return;

            const concept = state.expenseTypes.find(c => c.id === expense.conceptId);
            if (!concept) return;

            const rate = getConversionRate(expense.currencyCode, expense.date);
            const convertedAmount = (type === 'bank' ? Math.abs(expense.amount) : expense.amount) * rate;

            allExpenses.push({
                id: expense.id,
                date: expense.date,
                categoryName: concept.name === 'Shortage' ? t('special_concept_shortage') : concept.name,
                conceptId: expense.conceptId,
                detail: type === 'bank' ? expense.description : expense.detail,
                amount: type === 'bank' ? Math.abs(expense.amount) : expense.amount,
                currencyCode: expense.currencyCode,
                isNonDeductible: expense.isNonDeductible || false,
                convertedAmount: convertedAmount,
            });
        };

        state.invoices.forEach(inv => processExpenseEntry(inv, 'invoice'));

        state.cashExpenses.forEach(exp => {
            // Only include if it's NOT a payment of an invoice tracked above
            if (!exp.isPayment) {
                processExpenseEntry(exp, 'cash');
            }
        });

        state.transactions.forEach(tx => {
            // Only include if it's an expense and NOT a payment of an invoice
            if (tx.type === 'expense' && !tx.isPayment && !tx.description.includes('Payment for invoice #')) {
                const bankAccount = state.bankAccounts.find(b => b.id === tx.bankAccountId);
                if (bankAccount) {
                    processExpenseEntry({ ...tx, currencyCode: bankAccount.currencyCode }, 'bank');
                }
            }
        });

        // Part 3: Filter and Group Data
        const filteredExpenses = showOnlyNonDeductible ? allExpenses.filter(exp => exp.isNonDeductible) : allExpenses;

        const chartData: Record<string, { name: string, value: number }> = {};
        filteredExpenses.forEach(exp => {
            if (!chartData[exp.categoryName]) {
                chartData[exp.categoryName] = { name: exp.categoryName, value: 0 };
            }
            chartData[exp.categoryName].value += exp.convertedAmount;
        });

        let tableData: any[] = [];
        if (viewType === 'grouped') {
            tableData = Object.values(chartData).sort((a, b) => b.value - a.value);
        } else {
            tableData = filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        const totalOfTableExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.convertedAmount, 0);

        return {
            reportData: {
                totalIncome,
                chartData: Object.values(chartData).sort((a, b) => b.value - a.value),
                tableData,
                totalOfTableExpenses
            }
        };
    }, [state, startDate, endDate, reportingCurrency, t, showOnlyNonDeductible, viewType]);

    const COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6'];
    const currencySymbol = state.currencies.find(c => c.code === reportingCurrency)?.symbol || '$';

    const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-900/90 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <p className="label text-base font-semibold text-gray-900 dark:text-gray-200">{label}</p>
                    <p className="intro" style={{ color: payload[0].color }}>
                        <span className="font-medium">{`${payload[0].name}: `}</span>
                        <span className="font-bold">{formatCurrency(payload[0].value)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const reportTitle = t('reports_tab_expenses');
        const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

        doc.setFontSize(18);
        doc.text(reportTitle, 14, 22);
        doc.setFontSize(11);
        doc.text(currencyInfo, 14, 30);
        doc.text(`${startDate} - ${endDate}`, 14, 36);

        const head = viewType === 'grouped'
            ? [[t('planning_category'), t('daily_cash_col_amount'), '% vs Ingresos']]
            : [[t('daily_sales_date'), t('planning_category'), t('daily_cash_col_detail'), t('daily_cash_col_amount'), '% vs Ingresos']];

        const body: any[] = reportData.tableData.map((item: any) => {
            const amount = viewType === 'grouped' ? item.value : item.convertedAmount;
            const percentage = reportData.totalIncome > 0 ? (amount / reportData.totalIncome * 100) : 0;
            if (viewType === 'grouped') {
                return [item.name, formatCurrency(amount), `${percentage.toFixed(2)}%`];
            } else {
                return [item.date, item.categoryName, item.detail, formatCurrency(amount), `${percentage.toFixed(2)}%`];
            }
        });

        // Add total row
        const totalPercentage = reportData.totalIncome > 0 ? (reportData.totalOfTableExpenses / reportData.totalIncome * 100) : 0;
        const totalRow = viewType === 'grouped'
            ? [{ content: t('daily_sales_total'), styles: { fontStyle: 'bold' } }, { content: formatCurrency(reportData.totalOfTableExpenses), styles: { fontStyle: 'bold' } }, { content: `${totalPercentage.toFixed(2)}%`, styles: { fontStyle: 'bold' } }]
            : [{ content: t('daily_sales_total'), colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(reportData.totalOfTableExpenses), styles: { fontStyle: 'bold' } }, { content: `${totalPercentage.toFixed(2)}%`, styles: { fontStyle: 'bold' } }];
        body.push(totalRow as any);

        autoTable(doc, {
            startY: 40,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [55, 65, 81] },
        });

        doc.save(`Expense_Report_${startDate}_to_${endDate}.pdf`);
    };

    const handleExportXLSX = () => {
        const wb = XLSX.utils.book_new();
        const reportTitle = t('reports_tab_expenses');
        const currencyInfo = `(${t('reports_consolidated_in')} ${reportingCurrency})`;

        const data: any[][] = [
            [reportTitle, null, null],
            [currencyInfo, null, null],
            [null, null, null], // Spacer
        ];

        // Define headers based on view
        const headers = viewType === 'grouped'
            ? [t('planning_category'), t('daily_cash_col_amount'), '% vs Ingresos']
            : [t('daily_sales_date'), t('planning_category'), t('daily_cash_col_detail'), t('daily_cash_col_amount'), '% vs Ingresos'];
        data.push(headers);

        // Add rows
        reportData.tableData.forEach((item: any) => {
            const amount = viewType === 'grouped' ? item.value : item.convertedAmount;
            const percentage = reportData.totalIncome > 0 ? (amount / reportData.totalIncome) : 0;
            if (viewType === 'grouped') {
                data.push([item.name, amount, percentage]);
            } else {
                data.push([item.date, item.categoryName, item.detail, amount, percentage]);
            }
        });

        // Add footer
        const totalPercentage = reportData.totalIncome > 0 ? (reportData.totalOfTableExpenses / reportData.totalIncome) : 0;
        if (viewType === 'grouped') {
            data.push([t('daily_sales_total'), reportData.totalOfTableExpenses, totalPercentage]);
        } else {
            data.push([null, null, t('daily_sales_total'), reportData.totalOfTableExpenses, totalPercentage]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);

        // Styling
        ws['!cols'] = viewType === 'grouped'
            ? [{ wch: 30 }, { wch: 15 }, { wch: 10 }]
            : [{ wch: 12 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 10 }];

        const currencyFormat = `${currencySymbol} #,##0.00`;
        const percentFormat = '0.00%';

        for (let i = 3; i < data.length; i++) {
            const amountCol = viewType === 'grouped' ? 1 : 3;
            const percentCol = viewType === 'grouped' ? 2 : 4;

            if (typeof data[i][amountCol] === 'number') {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: amountCol });
                if (ws[cellRef]) ws[cellRef].z = currencyFormat;
            }
            if (typeof data[i][percentCol] === 'number') {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: percentCol });
                if (ws[cellRef]) ws[cellRef].z = percentFormat;
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, reportTitle);
        XLSX.writeFile(wb, `Expense_Report_${startDate}_to_${endDate}.xlsx`);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-end gap-2 print:hidden">
                <button onClick={handleExportXLSX} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm transition-colors transition-shadow">
                    <FileText size={18} /> {t('reports_export_excel')}
                </button>
                <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-sm transition-colors transition-shadow">
                    <FileDown size={18} /> {t('reports_export_pdf')}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t('reports_expenses_by_category', 'Egresos por Categoría')}</h3>
                <ResponsiveContainer width="100%" height={30 + reportData.chartData.length * 40}>
                    <BarChart
                        data={reportData.chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-600" />
                        <XAxis type="number" stroke="currentColor" className="text-gray-500 dark:text-gray-400" tickFormatter={formatCurrency} />
                        <YAxis type="category" dataKey="name" stroke="currentColor" className="text-gray-500 dark:text-gray-400" width={150} interval={0} />
                        <Tooltip
                            cursor={{ fill: 'rgba(113, 128, 150, 0.1)' }}
                            content={<CustomTooltip />}
                        />
                        <Bar dataKey="value" name={t('daily_cash_col_amount', 'Monto')} radius={[0, 4, 4, 0]}>
                            {reportData.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Desglose de Egresos</h3>
                    <div className="flex flex-wrap items-center gap-4">
                        {/* View Type Toggle */}
                        <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                            <button
                                onClick={() => setViewType('grouped')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewType === 'grouped' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                Agrupado
                            </button>
                            <button
                                onClick={() => setViewType('detailed')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewType === 'detailed' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                Detallado
                            </button>
                        </div>
                        {/* Non-Deductible Filter */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="non-deductible-filter"
                                checked={showOnlyNonDeductible}
                                onChange={(e) => setShowOnlyNonDeductible(e.target.checked)}
                                className="h-4 w-4 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 shadow-sm"
                            />
                            <label htmlFor="non-deductible-filter" className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                                Mostrar solo no deducibles
                            </label>
                        </div>
                    </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                {viewType === 'grouped' ? (
                                    <th scope="col" className="px-6 py-3">{t('planning_category', 'Categoría')}</th>
                                ) : (
                                    <>
                                        <th scope="col" className="px-6 py-3">{t('daily_sales_date', 'Fecha')}</th>
                                        <th scope="col" className="px-6 py-3">{t('planning_category', 'Categoría')}</th>
                                        <th scope="col" className="px-6 py-3">{t('daily_cash_col_detail', 'Detalle')}</th>
                                    </>
                                )}
                                <th scope="col" className="px-6 py-3 text-right">{t('daily_cash_col_amount', 'Monto')}</th>
                                <th scope="col" className="px-6 py-3 text-right">% vs Ingresos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {reportData.tableData.map((item, index) => (
                                <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    {viewType === 'grouped' ? (
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{item.name}</td>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{item.date}</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{item.categoryName}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                {item.detail}
                                                {item.isNonDeductible && (
                                                    <span className='block text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-1'>
                                                        <AlertTriangle size={12} /> {t('banks_col_non_deductible', 'No Deducible')}
                                                    </span>
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-white">{formatCurrency(viewType === 'grouped' ? item.value : item.convertedAmount)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-gray-400">{(reportData.totalIncome > 0 ? ((viewType === 'grouped' ? item.value : item.convertedAmount) / reportData.totalIncome * 100) : 0).toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="text-sm font-bold uppercase bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                            <tr>
                                <td colSpan={viewType === 'grouped' ? 1 : 3} className="px-6 py-3 text-right">Total</td>
                                <td className="px-6 py-3 text-right font-mono">{formatCurrency(reportData.totalOfTableExpenses)}</td>
                                <td className="px-6 py-3 text-right font-mono">{(reportData.totalIncome > 0 ? (reportData.totalOfTableExpenses / reportData.totalIncome * 100) : 0).toFixed(2)}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpenseReport;