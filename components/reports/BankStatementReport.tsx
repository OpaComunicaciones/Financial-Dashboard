import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatNumber } from '../../utils/formatting';

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

    // 2. Get transactions within the date range
    const transactionsInRange = state.transactions
      .filter(tx => tx.bankAccountId === accountId && tx.date >= startDate && tx.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Group transactions by date and calculate daily summaries
    const dailySummaries: Record<string, { income: number, expense: number }> = {};
    transactionsInRange.forEach(tx => {
      if (!dailySummaries[tx.date]) {
        dailySummaries[tx.date] = { income: 0, expense: 0 };
      }
      if (tx.amount > 0) {
        dailySummaries[tx.date].income += tx.amount;
      } else {
        dailySummaries[tx.date].expense += Math.abs(tx.amount);
      }
    });

    // 4. Create chronological report with running balance
    let runningBalance = initialBalance;
    const reportRows = Object.entries(dailySummaries).map(([date, { income, expense }]) => {
      runningBalance += income - expense;
      return { date, income, expense, balance: runningBalance };
    });

    // 5. Calculate totals
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
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Informe de Bancos</h3>
        <p className="text-lg text-indigo-400 font-semibold">{account.name}</p>
        <p className="text-sm text-gray-400">{`${startDate} - ${endDate}`}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3">Fecha</th>
                    <th scope="col" className="px-6 py-3 text-right">Ingresos</th>
                    <th scope="col" className="px-6 py-3 text-right">Egresos</th>
                    <th scope="col" className="px-6 py-3 text-right">Saldo</th>
                </tr>
            </thead>
            <tbody>
                <tr className="bg-gray-800 border-b border-gray-700">
                    <td colSpan={3} className="px-6 py-4 font-semibold text-white">Saldo Inicial</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">{formatCurrency(initialBalance)}</td>
                </tr>
                {reportRows.map(row => (
                    <tr key={row.date} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">{row.date}</td>
                        <td className="px-6 py-4 text-right font-mono text-green-400">{row.income > 0 ? formatCurrency(row.income) : '-'}</td>
                        <td className="px-6 py-4 text-right font-mono text-red-400">{row.expense > 0 ? formatCurrency(row.expense) : '-'}</td>
                        <td className="px-6 py-4 text-right font-mono">{formatCurrency(row.balance)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="text-xs text-white uppercase bg-gray-700 font-bold">
                <tr>
                    <td className="px-6 py-3">Totales</td>
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
