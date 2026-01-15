import React, { useMemo } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAppContext } from '../../context/AppContext';
import { formatNumber } from '../../utils/formatting';
import { FileText, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceStatus } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    supplier: string;
    conceptId: string;
    status: InvoiceStatus | 'All';
}

const AccountsPayableReport: React.FC<ReportProps> = ({ startDate, endDate, supplier, conceptId, status }) => {
    const { t } = useTranslation();
    const { state } = useAppContext();

    const reportData = useMemo(() => {
        let filtered = state.invoices.map(inv => {
            const totalPaid = (inv.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const remaining = inv.amount - totalPaid;

            let calcStatus: InvoiceStatus = 'Pending';
            if (totalPaid >= inv.amount - 0.001) calcStatus = 'Paid';
            else if (totalPaid > 0) calcStatus = 'Partially Paid';
            else if (new Date(inv.dueDate) < new Date()) calcStatus = 'Overdue';

            return { ...inv, status: calcStatus, remaining, totalPaid };
        });

        // Apply filters
        if (startDate) filtered = filtered.filter(inv => inv.date >= startDate);
        if (endDate) filtered = filtered.filter(inv => inv.date <= endDate);
        if (supplier !== 'All') filtered = filtered.filter(inv => inv.supplier === supplier);
        if (conceptId !== 'All') filtered = filtered.filter(inv => inv.conceptId === conceptId);
        if (status !== 'All') filtered = filtered.filter(inv => inv.status === status);

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [state.invoices, startDate, endDate, supplier, conceptId, status]);

    const totals = useMemo(() => {
        return reportData.reduce((acc, inv) => {
            if (!acc[inv.currencyCode]) {
                acc[inv.currencyCode] = { amount: 0, paid: 0, remaining: 0 };
            }
            acc[inv.currencyCode].amount += inv.amount;
            acc[inv.currencyCode].paid += inv.totalPaid;
            acc[inv.currencyCode].remaining += inv.remaining;
            return acc;
        }, {} as Record<string, { amount: number; paid: number; remaining: number }>);
    }, [reportData]);

    const getCurrencySymbol = (code: string) => {
        return state.currencies.find(c => c.code === code)?.symbol || '$';
    };

    const getConceptName = (id: string) => {
        return state.expenseTypes.find(c => c.id === id)?.name || id;
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(t('reports_ap_report'), 14, 22);
        doc.setFontSize(11);
        doc.text(`${startDate} - ${endDate}`, 14, 30);

        const head = [[
            t('accounts_payable_col_supplier'),
            t('accounts_payable_col_issue_date'),
            t('daily_cash_col_concept'),
            t('accounts_payable_col_amount'),
            t('accounts_payable_remaining_balance'),
            t('accounts_payable_col_status')
        ]];

        const body = reportData.map(inv => [
            inv.supplier,
            inv.date,
            getConceptName(inv.conceptId),
            formatNumber(inv.amount, { style: 'currency', currencySymbol: getCurrencySymbol(inv.currencyCode) }),
            formatNumber(inv.remaining, { style: 'currency', currencySymbol: getCurrencySymbol(inv.currencyCode) }),
            t(`accounts_payable_status_${inv.status.toLowerCase().replace(' ', '_')}` as any)
        ]);

        autoTable(doc, {
            startY: 40,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [55, 65, 81] },
        });

        doc.save(`AP_Report_${startDate}_to_${endDate}.pdf`);
    };

    const handleExportXLSX = () => {
        const data = reportData.map(inv => ({
            [t('accounts_payable_col_supplier')]: inv.supplier,
            [t('accounts_payable_col_issue_date')]: inv.date,
            [t('daily_cash_col_concept')]: getConceptName(inv.conceptId),
            [t('accounts_payable_col_amount')]: inv.amount,
            [t('accounts_payable_remaining_balance')]: inv.remaining,
            'Moneda': inv.currencyCode,
            [t('accounts_payable_col_status')]: t(`accounts_payable_status_${inv.status.toLowerCase().replace(' ', '_')}` as any)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Accounts Payable');
        XLSX.writeFile(wb, `AP_Report_${startDate}_to_${endDate}.xlsx`);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('reports_ap_report')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{`${startDate} - ${endDate}`}</p>
                </div>
                <div className="flex justify-end gap-2 print:hidden w-full md:w-auto">
                    <button onClick={handleExportXLSX} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2">
                        <FileText size={18} /> Excel
                    </button>
                    <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2">
                        <FileDown size={18} /> PDF
                    </button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(totals).map(([currency, val]) => (
                    <div key={currency} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total {currency}</p>
                        <div className="mt-1 flex justify-between items-end">
                            <div>
                                <p className="text-xs text-gray-400">Total: {formatNumber(val.amount, { style: 'currency', currencySymbol: getCurrencySymbol(currency) })}</p>
                                <p className="text-xs text-green-500">Pagado: {formatNumber(val.paid, { style: 'currency', currencySymbol: getCurrencySymbol(currency) })}</p>
                            </div>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                {formatNumber(val.remaining, { style: 'currency', currencySymbol: getCurrencySymbol(currency) })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3">{t('accounts_payable_col_supplier')}</th>
                            <th className="px-6 py-3">{t('accounts_payable_col_issue_date')}</th>
                            <th className="px-6 py-3">{t('daily_cash_col_concept')}</th>
                            <th className="px-6 py-3 text-right">{t('accounts_payable_col_amount')}</th>
                            <th className="px-6 py-3 text-right">{t('accounts_payable_remaining_balance')}</th>
                            <th className="px-6 py-3 text-center">{t('accounts_payable_col_status')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                        {reportData.map((inv, idx) => (
                            <tr key={idx} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{inv.supplier}</td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{inv.date}</td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{getConceptName(inv.conceptId)}</td>
                                <td className="px-6 py-4 text-right font-mono">{formatNumber(inv.amount, { style: 'currency', currencySymbol: getCurrencySymbol(inv.currencyCode) })}</td>
                                <td className="px-6 py-4 text-right font-mono text-indigo-600 dark:text-indigo-400">{formatNumber(inv.remaining, { style: 'currency', currencySymbol: getCurrencySymbol(inv.currencyCode) })}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold 
                    ${inv.status === 'Paid' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                                            inv.status === 'Overdue' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                                                inv.status === 'Partially Paid' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                                                    'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'}`}
                                    >
                                        {t(`accounts_payable_status_${inv.status.toLowerCase().replace(' ', '_')}` as any)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {reportData.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                    No hay datos para los filtros seleccionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccountsPayableReport;
