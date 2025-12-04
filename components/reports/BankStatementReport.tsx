import React, { useMemo } from 'react';
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
}

const BankStatementReport: React.FC<ReportProps> = ({ startDate, endDate, accountId }) => {
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

    // 2. Get transactions within the date range, sorted chronologically
    const transactionsInRange = state.transactions
      .filter(tx => tx.bankAccountId === accountId && tx.date >= startDate && tx.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Create a detailed report row for each transaction with a running balance
    let runningBalance = initialBalance;
    const reportRows = transactionsInRange.map(tx => {
      runningBalance += tx.amount;
      return {
        date: tx.date,
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

    const head = [['Fecha', 'Descripción', 'Depósito', 'Retiro', 'Saldo']];
    
    const body = reportRows.map(row => [
      row.date,
      row.description,
      row.income > 0 ? formatCurrency(row.income) : '-',
      row.expense > 0 ? formatCurrency(row.expense) : '-',
      formatCurrency(row.balance)
    ]);

    autoTable(doc, {
      startY: 40,
      head: head,
      body: [
        [{ content: 'Saldo Inicial', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: formatCurrency(initialBalance), styles: { fontStyle: 'bold', halign: 'right' } }],
        ...body
      ],
      foot: [[ 
        { content: 'Totales', colSpan: 2, styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totalIncome), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totalExpense), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(finalBalance), styles: { fontStyle: 'bold', halign: 'right' } }
      ]],
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] },
      footStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 
        1: { cellWidth: 'auto' },
        2: { halign: 'right' }, 
        3: { halign: 'right' }, 
        4: { halign: 'right' } 
      },
    });

    doc.save(`Bank_Statement_Detailed_${account.name}.pdf`);
  };

  const handleExportXLSX = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    const reportTitle = `Estado de Cuenta Detallado - ${reportData.account.name}`;
    const dateInfo = `${startDate} - ${endDate}`;

    const headers = ['Fecha', 'Descripción', 'Depósito', 'Retiro', 'Saldo'];
    
    const data = reportData.reportRows.map(row => [
      row.date,
      row.description,
      row.income > 0 ? row.income : null,
      row.expense > 0 ? row.expense : null,
      row.balance
    ]);

    const finalData = [
      [reportTitle],
      [dateInfo],
      [null],
      ['Saldo Inicial', null, null, null, reportData.initialBalance],
      headers,
      ...data,
      ['Totales', null, reportData.totalIncome, reportData.totalExpense, reportData.finalBalance]
    ];

    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // Styling
    ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const currencyFormat = `${reportData.account.currencyCode} #,##0.00`;

    for(let i = 3; i < finalData.length; i++) {
      for (let j = 2; j < 5; j++) {
        if (typeof finalData[i][j] === 'number') {
          const cellRef = XLSX.utils.encode_cell({r: i, c: j});
          if(ws[cellRef]) ws[cellRef].z = currencyFormat;
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta');
    XLSX.writeFile(wb, `Bank_Statement_Detailed_${reportData.account.name}.xlsx`);
  };

  if (!reportData) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
        <p className="text-gray-400">Por favor, selecciona una cuenta para ver el estado de cuenta.</p>
      </div>
    );
  }

  const { account, formatCurrency, initialBalance, reportRows, totalIncome, totalExpense, finalBalance } = reportData;

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-white">Extracto Detallado de Cuenta</h3>
          <p className="text-lg text-indigo-400 font-semibold">{account.name}</p>
          <p className="text-sm text-gray-400">{`${startDate} - ${endDate}`}</p>
        </div>
        <div className="flex justify-end gap-2 print:hidden">
          <button onClick={handleExportXLSX} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2">
            <FileText size={18} /> Exportar a Excel
          </button>
          <button onClick={handleExportPDF} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2">
            <FileDown size={18} /> Exportar a PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3">Fecha</th>
                    <th scope="col" className="px-6 py-3">Descripción</th>
                    <th scope="col" className="px-6 py-3 text-right">Depósito</th>
                    <th scope="col" className="px-6 py-3 text-right">Retiro</th>
                    <th scope="col" className="px-6 py-3 text-right">Saldo</th>
                </tr>
            </thead>
            <tbody>
                <tr className="bg-gray-800 border-b border-gray-700">
                    <td colSpan={4} className="px-6 py-4 font-semibold text-white">Saldo Inicial</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{formatCurrency(initialBalance)}</td>
                </tr>
                {reportRows.map((row, index) => (
                    <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                        <td className="px-6 py-4">{row.description}</td>
                        <td className="px-6 py-4 text-right font-mono text-green-400">{row.income > 0 ? formatCurrency(row.income) : '-'}</td>
                        <td className="px-6 py-4 text-right font-mono text-red-400">{row.expense > 0 ? formatCurrency(row.expense) : '-'}</td>
                        <td className="px-6 py-4 text-right font-mono">{formatCurrency(row.balance)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="text-xs text-white uppercase bg-gray-700 font-bold">
                <tr>
                    <td colSpan={2} className="px-6 py-3">Totales</td>
                    <td className="px-6 py-3 text-right font-mono">{formatCurrency(totalIncome)}</td>
                    <td className="px-6 py-3 text-right font-mono">{formatCurrency(totalExpense)}</td>
                    <td className="px-6 py-3 text-right font-mono">{formatCurrency(finalBalance)}</td>
                </tr>
            </tfoot>
        </table>
        {reportRows.length === 0 && (
            <div className="text-center py-10 text-gray-500">
                No hay transacciones en el período seleccionado.
            </div>
        )}
      </div>
    </div>
  );
};

export default BankStatementReport;
