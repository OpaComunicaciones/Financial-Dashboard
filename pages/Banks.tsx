
import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { Plus, Landmark, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import { BankTransaction } from '../types';
import { formatNumber } from '../utils/formatting';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, FileDown } from 'lucide-react';

const Banks: React.FC = () => {
  const { t } = useTranslation();
  const { state, addBankTransaction, updateBankTransaction, deleteBankTransaction } = useAppContext();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(state.bankAccounts[0]?.id || null);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [selectedConceptId, setSelectedConceptId] = useState<string>('all');

  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    state.bankAccounts.forEach(acc => balances.set(acc.id, 0));
    state.transactions.forEach(tx => {
      balances.set(tx.bankAccountId, (balances.get(tx.bankAccountId) || 0) + tx.amount);
    });
    return balances;
  }, [state.bankAccounts, state.transactions]);

  const getCurrencySymbol = (code: string) => {
    return state.currencies.find(c => c.code === code)?.symbol || '$';
  }

  const { currencyTotals, accountsByCurrency } = useMemo(() => {
    const totals: { [key: string]: number } = {};
    const accountsBy: { [key: string]: any[] } = {};

    state.bankAccounts.forEach(account => {
      const balance = accountBalances.get(account.id) || 0;
      if (totals[account.currencyCode]) {
        totals[account.currencyCode] += balance;
        accountsBy[account.currencyCode].push(account);
      } else {
        totals[account.currencyCode] = balance;
        accountsBy[account.currencyCode] = [account];
      }
    });

    return {
      currencyTotals: Object.entries(totals).map(([code, total]) => ({
        currencyCode: code,
        total,
        symbol: getCurrencySymbol(code),
      })),
      accountsByCurrency: accountsBy,
    };
  }, [state.bankAccounts, accountBalances]);

  const filteredTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    return [...state.transactions]
      .filter(tx =>
        tx.bankAccountId === selectedAccountId &&
        tx.date >= startDate &&
        tx.date <= endDate &&
        (selectedConceptId === 'all' || tx.conceptId === selectedConceptId)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, selectedAccountId, startDate, endDate, selectedConceptId]);

  const handleAdd = async (transaction: Omit<BankTransaction, 'id'>) => {
    addBankTransaction(transaction);
    setIsAddModalOpen(false);
  };

  const handleEdit = async (transaction: BankTransaction) => {
    await updateBankTransaction(transaction);
    setIsEditModalOpen(false);
  };

  const openEditModal = (tx: BankTransaction) => {
    setEditingTransaction(tx);
    setIsEditModalOpen(true);
  }

  const handleDelete = async (id: string) => {
    if (window.confirm(t('banks_delete_confirm'))) {
      await deleteBankTransaction(id);
    }
  }

  const getConceptName = (tx: BankTransaction) => {
    if (!tx.type || !tx.conceptId) return '-';
    const list = tx.type === 'income' ? state.incomeTypes : state.expenseTypes;
    return list.find(c => c.id === tx.conceptId)?.name || '-';
  }

  const handleExportXLSX = () => {
    const selectedAccount = state.bankAccounts.find(a => a.id === selectedAccountId);
    if (!selectedAccount) return;

    const wb = XLSX.utils.book_new();
    const data: any[][] = [
      [`${t('banks_title')} - ${selectedAccount.name}`, null],
      [`${startDate} - ${endDate}`, null],
      [null, null],
      [t('banks_col_date'), t('daily_cash_col_concept'), t('banks_add_modal_desc'), t('banks_add_modal_amount')]
    ];

    filteredTransactions.forEach(tx => {
      data.push([tx.date, getConceptName(tx), tx.description, tx.amount]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 }];

    const symbol = getCurrencySymbol(selectedAccount.currencyCode);
    const currencyFormat = `${symbol} #,##0.00;(${symbol} #,##0.00)`;

    for (let i = 4; i < data.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: 3 });
      if (ws[cellRef]) ws[cellRef].z = currencyFormat;
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `Bank_Statement_${selectedAccount.name}_${startDate}_to_${endDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const selectedAccount = state.bankAccounts.find(a => a.id === selectedAccountId);
    if (!selectedAccount) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${t('banks_title')} - ${selectedAccount.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`${startDate} - ${endDate}`, 14, 30);

    const head = [[t('banks_col_date'), t('daily_cash_col_concept'), t('banks_add_modal_desc'), t('banks_add_modal_amount')]];
    const body = filteredTransactions.map(tx => [
      tx.date,
      getConceptName(tx),
      tx.description,
      formatNumber(tx.amount, { style: 'currency', currencySymbol: getCurrencySymbol(selectedAccount.currencyCode) })
    ]);

    autoTable(doc, {
      startY: 40,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [55, 65, 81] },
      columnStyles: { 3: { halign: 'right' } }
    });

    doc.save(`Bank_Statement_${selectedAccount.name}_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <div className="space-y-8">
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAdd}
      />
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEdit}
        transaction={editingTransaction}
      />

      <div className="flex justify-between items-center">
        <PageHeader title={t('banks_title')} subtitle={t('banks_subtitle')} />
        <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center gap-2">
          <Plus size={18} />
          {t('banks_add_button')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {state.bankAccounts.map(account => {
          const currencySymbol = getCurrencySymbol(account.currencyCode);
          const isActive = selectedAccountId === account.id;
          return (
            <div
              key={account.id}
              onClick={() => setSelectedAccountId(account.id)}
              className={`p-6 rounded-xl border transition-all duration-300 cursor-pointer shadow-sm dark:shadow-none ${isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-200 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className={`text-lg font-semibold ${isActive ? 'text-indigo-900 dark:text-white' : 'text-gray-700 dark:text-white'}`}>{account.name}</h3>
                <Landmark className={isActive ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'} />
              </div>
              <p className={`text-3xl font-extrabold my-2 font-mono ${isActive ? 'text-indigo-600 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                {formatNumber(accountBalances.get(account.id) || 0, { style: 'currency', currencySymbol })}
              </p>
              <p className={`text-sm ${isActive ? 'text-indigo-500 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>{account.currencyCode}</p>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('banks_transactions_title')}</h3>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none mb-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('reports_start_date')}</label>
                <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('reports_end_date')}</label>
                <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label htmlFor="concept-filter" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{t('daily_cash_col_concept')}</label>
                <select
                  id="concept-filter"
                  value={selectedConceptId}
                  onChange={(e) => setSelectedConceptId(e.target.value)}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                >
                  <option value="all">{t('accounts_payable_filter_all_concepts')}</option>
                  <optgroup label={t('reports_income_header')} className="bg-white dark:bg-gray-800">
                    {state.incomeTypes.filter(it => it.isIncome).map(it => (
                      <option key={it.id} value={it.id}>{it.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label={t('reports_expenses_header')} className="bg-white dark:bg-gray-800">
                    {state.expenseTypes.filter(et => et.isExpense).map(et => (
                      <option key={et.id} value={et.id}>{et.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportXLSX}
                className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                disabled={filteredTransactions.length === 0}
              >
                <FileText size={18} /> {t('reports_export_excel')}
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                disabled={filteredTransactions.length === 0}
              >
                <FileDown size={18} /> {t('reports_export_pdf')}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
              <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3">{t('banks_col_date')}</th>
                  <th scope="col" className="px-6 py-3">{t('daily_cash_col_concept')}</th>
                  <th scope="col" className="px-6 py-3">{t('banks_add_modal_desc')}</th>
                  <th scope="col" className="px-6 py-3 text-right">{t('banks_add_modal_amount')}</th>
                  <th scope="col" className="px-6 py-3 text-center">{t('accounts_payable_col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => {
                  const account = state.bankAccounts.find(a => a.id === tx.bankAccountId);
                  const currencySymbol = account ? getCurrencySymbol(account.currencyCode) : '$';
                  return (
                    <tr key={tx.id} className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">{tx.date}</td>
                      <td className="px-6 py-4">{getConceptName(tx)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {tx.description}
                        {tx.isNonDeductible &&
                          <span className='block text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1'><AlertTriangle size={12} /> {t('banks_col_non_deductible')}</span>
                        }
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-semibold ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatNumber(tx.amount, { style: 'currency', currencySymbol })}
                      </td>
                      <td className="px-6 py-4">
                        <div className='flex items-center justify-center gap-2'>
                          <button onClick={() => openEditModal(tx)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(tx.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">{t('banks_no_transactions_in_range')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banks;
