
import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { Download, Plus, Trash2, Save, Pencil, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import AddCashExpenseModal from '../components/AddCashExpenseModal';
import AddMiscIncomeModal from '../components/AddMiscIncomeModal';
import EditMiscIncomeModal from '../components/EditMiscIncomeModal';
import EditCashExpenseModal from '../components/EditCashExpenseModal';
import { CashExpense, MiscIncome } from '../types';
import { formatNumber } from '../utils/formatting';

const DailyCash: React.FC = () => {
  const { t } = useTranslation();
  const { state, setSharedDate, addCashExpense, updateCashExpense, deleteCashExpense, saveCashClosure, addMiscIncome, updateMiscIncome, deleteMiscIncome } = useAppContext();
  const { sharedDate } = state;

  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(state.currencies[0]?.code || '');
  
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [isEditIncomeModalOpen, setIsEditIncomeModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<CashExpense | null>(null);
  const [selectedIncome, setSelectedIncome] = useState<MiscIncome | null>(null);

  const selectedCurrency = useMemo(() => {
    return state.currencies.find(c => c.code === selectedCurrencyCode);
  }, [selectedCurrencyCode, state.currencies]);

  const currencyDenominations = useMemo(() => {
    if (!selectedCurrency) return { bills: [], coins: [] };
    const all = state.denominations.filter(d => d.currencyId === selectedCurrency.id);
    return {
      bills: all.filter(d => d.type === 'bill').sort((a,b) => b.value - a.value),
      coins: all.filter(d => d.type === 'coin').sort((a,b) => b.value - a.value),
    }
  }, [selectedCurrency, state.denominations]);

  const formatCurrency = (value: number) => formatNumber(value, { style: 'currency', currencySymbol: selectedCurrency?.symbol || '$' });

  const { salesIncome, miscIncomes, dailyExpenses, initialBalance, totalMiscIncome, incomeBreakdown, expenseBreakdown } = useMemo(() => {
    const todaysSales = state.dailySales.filter(s => s.date === sharedDate && s.currencyCode === selectedCurrencyCode);
    const salesTotal = todaysSales.reduce((sum, s) => sum + s.cash, 0);
    const currentMiscIncomes = state.miscIncomes.filter(i => i.date === sharedDate && i.currencyCode === selectedCurrencyCode);
    const currentDailyExpenses = state.cashExpenses.filter(e => e.date === sharedDate && e.currencyCode === selectedCurrencyCode);

    const yesterday = new Date(sharedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayClosure = state.cashClosures.find(c => c.date === yesterdayStr && c.currencyCode === selectedCurrencyCode);
    
    const currentTotalMiscIncome = currentMiscIncomes.reduce((sum, income) => sum + income.amount, 0);

    const incomeB: { [key: string]: number } = {};
    if (salesTotal > 0) {
      incomeB[t('daily_cash_direct_sales_concept')] = salesTotal;
    }
    currentMiscIncomes.forEach(income => {
      const conceptName = state.incomeTypes.find(i => i.id === income.conceptId)?.name || income.conceptId;
      incomeB[conceptName] = (incomeB[conceptName] || 0) + income.amount;
    });

    const expenseB: { [key: string]: number } = {};
    currentDailyExpenses.forEach(expense => {
      const conceptName = state.expenseTypes.find(e => e.id === expense.conceptId)?.name || expense.conceptId;
      expenseB[conceptName] = (expenseB[conceptName] || 0) + expense.amount;
    });


    return {
      salesIncome: salesTotal,
      miscIncomes: currentMiscIncomes,
      dailyExpenses: currentDailyExpenses,
      initialBalance: yesterdayClosure?.finalBalance || 0,
      totalMiscIncome: currentTotalMiscIncome,
      incomeBreakdown: incomeB,
      expenseBreakdown: expenseB
    };
  }, [state, sharedDate, selectedCurrencyCode, t]);
  
  const totalIncome = salesIncome + totalMiscIncome;

  useEffect(() => {
    // Reset counts when date or currency changes, then load saved counts if they exist.
    const todaysClosure = state.cashClosures.find(c => c.date === sharedDate && c.currencyCode === selectedCurrencyCode);
    setCounts(todaysClosure?.counts || {});
  }, [sharedDate, selectedCurrencyCode, state.cashClosures]);

  const totalExpenses = useMemo(() => {
    return dailyExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  }, [dailyExpenses]);
  
  const saldoTotalCaja = initialBalance + totalIncome - totalExpenses;
  
  const physicalCashTotal = Object.entries(counts).reduce((acc, [denomValue, count]) => {
    return acc + parseFloat(denomValue) * (Number(count) || 0);
  }, 0);

  const difference = physicalCashTotal - saldoTotalCaja;
  
  let differenceStatus: { text: string, color: string };
  if (Math.abs(difference) < 0.01) {
    differenceStatus = { text: t('daily_cash_status_balanced'), color: 'bg-green-500' };
  } else if (difference > 0) {
    differenceStatus = { text: t('daily_cash_status_surplus'), color: 'bg-blue-500' };
  } else {
    differenceStatus = { text: t('daily_cash_status_shortage'), color: 'bg-red-500' };
  }

  const handleCountChange = (denom: number, value: string) => {
    const count = parseInt(value, 10);
    setCounts(prev => ({ ...prev, [denom.toString()]: isNaN(count) ? 0 : count }));
  };

  const handleAddExpense = (expense: Omit<CashExpense, 'id' | 'date' | 'currencyCode'>) => {
    addCashExpense({ ...expense, date: sharedDate, currencyCode: selectedCurrencyCode });
    setIsExpenseModalOpen(false);
  };

  const handleUpdateExpense = (expense: CashExpense) => {
    updateCashExpense(expense);
    setIsEditExpenseModalOpen(false);
    setSelectedExpense(null);
  };
  
  const handleDeleteExpense = (id: string) => {
    if (window.confirm(t('daily_cash_delete_expense_confirm'))) {
      deleteCashExpense(id);
    }
  };
  
  const handleAddIncome = (income: Omit<MiscIncome, 'id' | 'date' | 'currencyCode'>) => {
    addMiscIncome({ ...income, date: sharedDate, currencyCode: selectedCurrencyCode });
    setIsIncomeModalOpen(false);
  };

  const handleUpdateIncome = (income: MiscIncome) => {
    updateMiscIncome(income);
    setIsEditIncomeModalOpen(false);
    setSelectedIncome(null);
  };

  const handleDeleteIncome = (id: string) => {
    if (window.confirm(t('daily_cash_delete_income_confirm'))) {
      deleteMiscIncome(id);
    }
  };
  
  const handleSaveClosure = () => {
    saveCashClosure({
      date: sharedDate,
      currencyCode: selectedCurrencyCode,
      initialBalance,
      totalIncome,
      totalExpenses,
      expectedBalance: saldoTotalCaja,
      finalBalance: physicalCashTotal,
      difference,
      counts
    });
    alert(t('daily_cash_save_success'));
  };

  const getExpenseConceptName = (conceptId: string) => {
    return state.expenseTypes.find(e => e.id === conceptId)?.name || conceptId;
  };
  
  const getIncomeConceptName = (conceptId: string) => {
    return state.incomeTypes.find(i => i.id === conceptId)?.name || conceptId;
  };

  return (
    <div className="space-y-8">
      <AddCashExpenseModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleAddExpense}
      />
      <EditCashExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        onSave={handleUpdateExpense}
        expense={selectedExpense}
      />
      <AddMiscIncomeModal 
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={handleAddIncome}
      />
      <EditMiscIncomeModal
        isOpen={isEditIncomeModalOpen}
        onClose={() => {
          setIsEditIncomeModalOpen(false);
          setSelectedIncome(null);
        }}
        onSave={handleUpdateIncome}
        income={selectedIncome}
      />
      <div className="flex justify-between items-center">
        <PageHeader title={t('daily_cash_title')} subtitle={t('daily_cash_subtitle')} />
        <button className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors duration-300 flex items-center gap-2">
            <Download size={18} />
            {t('daily_cash_export_button')}
        </button>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <label htmlFor="cash-date" className="block text-sm font-medium text-gray-400 mb-1">{t('daily_cash_select_date')}</label>
          <input
              id="cash-date"
              type="date"
              value={sharedDate}
              onChange={(e) => setSharedDate(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="currency-select" className="block text-sm font-medium text-gray-400 mb-1">{t('configuration_currency_title')}</label>
          <select id="currency-select" value={selectedCurrencyCode} onChange={e => setSelectedCurrencyCode(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {state.currencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
        </div>
      </div>
      
      {/* --- Other Incomes Section --- */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">{t('daily_cash_misc_income_title')} ({selectedCurrencyCode})</h3>
            <button onClick={() => setIsIncomeModalOpen(true)} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2">
                <Plus size={18} /> {t('daily_cash_add_income_button')}
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr>
                        <th scope="col" className="px-6 py-3">{t('daily_cash_col_income_concept')}</th>
                        <th scope="col" className="px-6 py-3">{t('daily_cash_col_income_detail')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('daily_cash_col_amount')}</th>
                        <th scope="col" className="px-6 py-3 text-center">{t('daily_cash_col_actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {miscIncomes.map(income => (
                        <tr key={income.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="px-6 py-4 font-medium text-white">{getIncomeConceptName(income.conceptId)}</td>
                            <td className="px-6 py-4">{income.detail}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCurrency(income.amount)}</td>
                            <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                <button onClick={() => { setSelectedIncome(income); setIsEditIncomeModalOpen(true); }} className="text-gray-400 hover:text-blue-400">
                                    <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDeleteIncome(income.id)} className="text-gray-400 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {miscIncomes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-500">{t('daily_cash_no_income')}</td>
                      </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
      
      {/* --- Expenses Section --- */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">{t('daily_cash_expenses_title')} ({selectedCurrencyCode})</h3>
            <button onClick={() => setIsExpenseModalOpen(true)} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors duration-300 flex items-center gap-2">
                <Plus size={18} /> {t('daily_cash_add_expense_button')}
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                    <tr>
                        <th scope="col" className="px-6 py-3">{t('daily_cash_col_supplier')}</th>
                        <th scope="col" className="px-6 py-3">{t('daily_cash_col_concept')}</th>
                        <th scope="col" className="px-6 py-3">{t('daily_cash_col_detail')}</th>
                        <th scope="col" className="px-6 py-3">{t('daily_cash_col_invoice')}</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('daily_cash_col_amount')}</th>
                        <th scope="col" className="px-6 py-3 text-center">{t('daily_cash_col_actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {dailyExpenses.map(expense => (
                        <tr key={expense.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="px-6 py-4 font-medium text-white">{expense.supplier}</td>
                            <td className="px-6 py-4">{getExpenseConceptName(expense.conceptId)}</td>
                            <td className="px-6 py-4">
                                {expense.detail}
                                {expense.isNonDeductible && 
                                    <span className='block text-xs text-yellow-400 flex items-center gap-1'><AlertTriangle size={12}/> {t('banks_col_non_deductible')}</span>
                                }
                            </td>
                            <td className="px-6 py-4">{expense.invoiceNumber}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCurrency(expense.amount)}</td>
                            <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                <button onClick={() => { setSelectedExpense(expense); setIsEditExpenseModalOpen(true); }} className="text-gray-400 hover:text-blue-400">
                                    <Pencil size={16} />
                                </button>
                                <button onClick={() => handleDeleteExpense(expense.id)} className="text-gray-400 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {dailyExpenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-gray-500">{t('daily_cash_no_expenses')}</td>
                      </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">{t('daily_cash_summary_title')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg"><span className="text-gray-400">{t('daily_cash_initial_balance')}</span> <span className="font-mono text-white">{formatCurrency(initialBalance)}</span></div>
              
              <div className="flex justify-between items-center text-lg"><span className="text-gray-400">{t('daily_cash_total_income')}</span> <span className="font-mono text-green-400">+ {formatCurrency(totalIncome)}</span></div>
              {Object.entries(incomeBreakdown).map(([concept, amount]) => (
                <div key={concept} className="flex justify-between items-center text-sm pl-4">
                    <span className="text-gray-500">{concept}</span>
                    <span className="font-mono text-green-500">{formatCurrency(amount)}</span>
                </div>
              ))}

              <div className="flex justify-between items-center text-lg"><span className="text-gray-400">{t('daily_cash_total_expenses')}</span> <span className="font-mono text-red-400">- {formatCurrency(totalExpenses)}</span></div>
               {Object.entries(expenseBreakdown).map(([concept, amount]) => (
                <div key={concept} className="flex justify-between items-center text-sm pl-4">
                    <span className="text-gray-500">{concept}</span>
                    <span className="font-mono text-red-500">{formatCurrency(amount)}</span>
                </div>
              ))}

              <hr className="border-gray-600 my-2" />
              <div className="flex justify-between items-center text-xl font-bold"><span className="text-white">{t('daily_cash_expected_balance')}</span> <span className="font-mono text-indigo-400">{formatCurrency(saldoTotalCaja)}</span></div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
             <h3 className="text-xl font-semibold text-white mb-4">{t('daily_cash_physical_count_title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
               <div>
                  <h4 className="text-lg font-medium text-gray-300 mb-2">{t('daily_cash_bills')}</h4>
                   {currencyDenominations.bills.map(denom => (
                    <div key={denom.id} className="grid grid-cols-3 items-center gap-2 mb-2">
                      <label className="text-gray-400">{selectedCurrency?.symbol}{formatNumber(denom.value)}</label>
                      <input type="number" value={counts[denom.value.toString()] || ''} onChange={e => handleCountChange(denom.value, e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md p-1 text-center" min="0" />
                      <span className="text-right font-mono text-white">{formatCurrency(denom.value * (counts[denom.value.toString()] || 0))}</span>
                    </div>
                  ))}
               </div>
               <div>
                  <h4 className="text-lg font-medium text-gray-300 mb-2">{t('daily_cash_coins')}</h4>
                   {currencyDenominations.coins.map(denom => (
                    <div key={denom.id} className="grid grid-cols-3 items-center gap-2 mb-2">
                      <label className="text-gray-400">{selectedCurrency?.symbol}{formatNumber(denom.value)}</label>
                      <input type="number" value={counts[denom.value.toString()] || ''} onChange={e => handleCountChange(denom.value, e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md p-1 text-center" min="0" />
                      <span className="text-right font-mono text-white">{formatCurrency(denom.value * (counts[denom.value.toString()] || 0))}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-semibold text-white mb-4">{t('daily_cash_reconciliation_title')}</h3>
            <div className="w-full space-y-4">
                <div className="p-3 bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-400">{t('daily_cash_expected')}</p>
                    <p className="text-2xl font-bold font-mono text-indigo-400">{formatCurrency(saldoTotalCaja)}</p>
                </div>
                <div className="p-3 bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-400">{t('daily_cash_counted')}</p>
                    <p className="text-2xl font-bold font-mono text-white">{formatCurrency(physicalCashTotal)}</p>
                </div>
                 <div className="p-3 bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-400">{t('daily_cash_difference')}</p>
                    <p className={`text-2xl font-bold font-mono ${difference >= 0.01 ? 'text-green-400' : difference <= -0.01 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(difference)}</p>
                </div>
            </div>
            <div className={`mt-6 px-6 py-3 rounded-full text-white font-bold text-lg ${differenceStatus.color} w-full`}>
                {differenceStatus.text}
            </div>
            <button onClick={handleSaveClosure} className="mt-4 w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center gap-2">
                <Save size={18} /> {t('daily_cash_save_button')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default DailyCash;
