
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
    conceptId?: string;
}

const CashReport: React.FC<ReportProps> = ({ startDate, endDate, reportingCurrency, conceptId = 'all' }) => {
    const { t } = useTranslation();
    const { state } = useAppContext();

    const reportData = useMemo(() => {
        if (!reportingCurrency) return null;

        const currency = state.currencies.find(c => c.code === reportingCurrency);
        const currencySymbol = currency?.symbol || '$';

        const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol });

        // 1. Calculate Initial Balance
        // We need to sum up all cash movements before startDate
        const initialSales = state.dailySales.reduce((acc, sale) => {
            if (sale.currencyCode === reportingCurrency && sale.date < startDate) {
                return acc + sale.cash;
            }
            return acc;
        }, 0);

        const initialMiscIncomes = state.miscIncomes.reduce((acc, inc) => {
            if (inc.currencyCode === reportingCurrency && inc.date < startDate) {
                return acc + inc.amount;
            }
            return acc;
        }, 0);

        const initialExpenses = state.cashExpenses.reduce((acc, exp) => {
            if (exp.currencyCode === reportingCurrency && exp.date < startDate) {
                return acc + exp.amount;
            }
            return acc;
        }, 0);

        const initialBalance = initialSales + initialMiscIncomes - initialExpenses;

        // 2. Get movements within the date range, filtered by concept if needed

        // --- Sales ---
        // Note: Sales usually don't have a conceptId in the record, but they belong to "Direct Sales"
        // We need to find the concept ID for "Direct Sales" if we want to filter it.
        const directSalesConcept = state.incomeTypes.find(it => it.name === 'Ventas Directas' || it.name === t('daily_cash_direct_sales_concept'));
        const salesMovements = state.dailySales
            .filter(sale =>
                sale.currencyCode === reportingCurrency &&
                sale.date >= startDate &&
                sale.date <= endDate &&
                (conceptId === 'all' || (directSalesConcept && directSalesConcept.id === conceptId))
            )
            .map(sale => ({
                date: sale.date,
                concept: t('daily_cash_direct_sales_concept'),
                description: `${t('daily_cash_direct_sales_concept')} (${sale.date})`,
                income: sale.cash,
                expense: 0,
                conceptId: directSalesConcept?.id
            }));

        // --- Misc Incomes ---
        const miscIncomeMovements = state.miscIncomes
            .filter(inc =>
                inc.currencyCode === reportingCurrency &&
                inc.date >= startDate &&
                inc.date <= endDate &&
                (conceptId === 'all' || inc.conceptId === conceptId)
            )
            .map(inc => ({
                date: inc.date,
                concept: state.incomeTypes.find(it => it.id === inc.conceptId)?.name || inc.conceptId,
                description: inc.detail,
                income: inc.amount,
                expense: 0,
                conceptId: inc.conceptId
            }));

        // --- Cash Expenses ---
        const expenseMovements = state.cashExpenses
            .filter(exp =>
                exp.currencyCode === reportingCurrency &&
                exp.date >= startDate &&
                exp.date <= endDate &&
                (conceptId === 'all' || exp.conceptId === conceptId)
            )
            .map(exp => ({
                date: exp.date,
                concept: state.expenseTypes.find(et => et.id === exp.conceptId)?.name || exp.conceptId,
                description: `${exp.supplier ? exp.supplier + ': ' : ''}${exp.detail}`,
                income: 0,
                expense: exp.amount,
                conceptId: exp.conceptId
            }));

        // 3. Combine and Sort chronologically
        const allMovements = [...salesMovements, ...miscIncomeMovements, ...expenseMovements]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 4. Calculate running balance
        let runningBalance = initialBalance;
        const reportRows = allMovements.map(move => {
            runningBalance += (move.income - move.expense);
            return {
                ...move,
                balance: runningBalance
            };
        });

        // 5. Calculate totals
        const totalIncome = reportRows.reduce((sum, row) => sum + row.income, 0);
        const totalExpense = reportRows.reduce((sum, row) => sum + row.expense, 0);

        return {
            currencySymbol,
            formatCurrency,
            initialBalance,
            reportRows,
            totalIncome,
            totalExpense,
            finalBalance: runningBalance
        };

    }, [state, startDate, endDate, reportingCurrency, conceptId, t]);

    const handleExportPDF = () => {
        if (!reportData) return;
        const doc = new jsPDF();
        const { formatCurrency, initialBalance, reportRows, totalIncome, totalExpense, finalBalance } = reportData;

        const reportTitle = `${t('reports_tab_cash')} - ${reportingCurrency}`;
        const dateInfo = `${startDate} - ${endDate}`;

        doc.setFontSize(11);
        doc.text(`${t('reports_consolidated_in')} ${reportingCurrency}`, 14, 30);
        doc.setFontSize(18);
        doc.text(reportTitle, 14, 22);
        doc.setFontSize(11);
        doc.text(dateInfo, 14, 36);

        const head = [[t('banks_col_date'), t('daily_cash_col_concept'), t('daily_cash_col_detail'), t('banks_add_modal_deposit'), t('banks_add_modal_withdrawal'), t('reports_cash_flow_final')]];

        const body = reportRows.map(row => [
            row.date,
            row.concept,
            row.description,
            row.income > 0 ? formatCurrency(row.income) : '-',
            row.expense > 0 ? formatCurrency(row.expense) : '-',
            formatCurrency(row.balance)
        ]);

        autoTable(doc, {
            startY: 42,
            head: head,
            body: [
                [{ content: t('daily_cash_initial_balance'), colSpan: 5, styles: { fontStyle: 'bold' } }, { content: formatCurrency(initialBalance), styles: { fontStyle: 'bold', halign: 'right' } }],
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

        const filename = `Cash_Statement_${reportingCurrency}_${startDate}_to_${endDate}${conceptId !== 'all' ? '_filtered' : ''}.pdf`;
        doc.save(filename);
    };

    const handleExportXLSX = () => {
        if (!reportData) return;

        const wb = XLSX.utils.book_new();
        const reportTitle = `${t('reports_tab_cash')} - ${reportingCurrency}`;
        const dateInfo = `${startDate} - ${endDate}`;

        const headers = [t('banks_col_date'), t('daily_cash_col_concept'), t('daily_cash_col_detail'), t('banks_add_modal_deposit'), t('banks_add_modal_withdrawal'), t('reports_cash_flow_final')];

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
            [`${t('reports_consolidated_in')} ${reportingCurrency}`],
            [dateInfo],
            [null],
            [t('daily_cash_initial_balance'), null, null, null, null, reportData.initialBalance],
            headers,
            ...data,
            ['Totales', null, null, reportData.totalIncome, reportData.totalExpense, reportData.finalBalance]
        ];

        const ws = XLSX.utils.aoa_to_sheet(finalData);

        // Styling
        ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        const currencyFormat = `${reportingCurrency} #,##0.00`;

        for (let i = 4; i < finalData.length; i++) {
            for (let j = 3; j < 6; j++) {
                if (typeof finalData[i][j] === 'number') {
                    const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
                    if (ws[cellRef]) ws[cellRef].z = currencyFormat;
                }
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Informe de Efectivo');
        const filename = `Cash_Statement_${reportingCurrency}_${startDate}_to_${endDate}${conceptId !== 'all' ? '_filtered' : ''}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    if (!reportData) {
        return (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
                <p className="text-gray-500 dark:text-gray-400">Seleccionando datos...</p>
            </div>
        );
    }

    const { formatCurrency, initialBalance, reportRows, totalIncome, totalExpense, finalBalance } = reportData;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('reports_cash_report')}</h3>
                    <p className="text-lg text-indigo-600 dark:text-indigo-400 font-semibold">{reportingCurrency}</p>
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
                            <th scope="col" className="px-6 py-3">{t('daily_cash_col_detail')}</th>
                            <th scope="col" className="px-6 py-3 text-right">{t('banks_add_modal_deposit')}</th>
                            <th scope="col" className="px-6 py-3 text-right">{t('banks_add_modal_withdrawal')}</th>
                            <th scope="col" className="px-6 py-3 text-right">{t('reports_cash_flow_final')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                        <tr className="bg-gray-50/50 dark:bg-gray-900/40 font-bold border-b-2 border-gray-200 dark:border-gray-600">
                            <td colSpan={5} className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{t('daily_cash_initial_balance')}</td>
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

export default CashReport;
