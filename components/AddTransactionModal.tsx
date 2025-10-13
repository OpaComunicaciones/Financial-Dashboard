
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18n';
import { BankTransaction } from '../types';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<BankTransaction, 'id'>) => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [conceptId, setConceptId] = useState('');
  const [bankAccountId, setBankAccountId] = useState(state.bankAccounts[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNonDeductible, setIsNonDeductible] = useState(false);

  const conceptList = type === 'income' ? state.incomeTypes : state.expenseTypes;

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setType('income');
      setConceptId(state.incomeTypes[0]?.id || '');
      setBankAccountId(state.bankAccounts[0]?.id || '');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsNonDeductible(false);
    } else {
        setConceptId('');
    }
  }, [isOpen, state.incomeTypes, state.bankAccounts]);

  useEffect(() => {
    // Update conceptId when type changes
    setConceptId(conceptList[0]?.id || '');
  }, [type, conceptList]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankAccountId || !conceptId || !amount) {
        alert(t('banks_error_no_account')); // Re-using a generic error message
        return;
    }
    const finalAmount = parseFloat(amount) || 0;
    onSave({
      bankAccountId,
      date,
      description,
      amount: type === 'expense' ? -Math.abs(finalAmount) : Math.abs(finalAmount),
      type,
      conceptId,
      isNonDeductible,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('banks_add_modal_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300">{t('banks_add_modal_type')}</label>
                <div className="mt-2 flex rounded-md shadow-sm">
                    <button type="button" onClick={() => setType('income')} className={`relative inline-flex items-center justify-center w-1/2 px-4 py-2 rounded-l-md border border-gray-600 text-sm font-medium ${type === 'income' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {t('reports_income_header')} / {t('banks_add_modal_deposit')}
                    </button>
                    <button type="button" onClick={() => setType('expense')} className={`-ml-px relative inline-flex items-center justify-center w-1/2 px-4 py-2 rounded-r-md border border-gray-600 text-sm font-medium ${type === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {t('reports_expenses_header')} / {t('banks_add_modal_withdrawal')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="bankAccountId" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_account')}</label>
                    <select name="bankAccountId" id="bankAccountId" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                        {state.bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.currencyCode})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="conceptId" className="block text-sm font-medium text-gray-300">{t('daily_cash_col_concept')}</label>
                    <select name="conceptId" id="conceptId" value={conceptId} onChange={e => setConceptId(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                        {conceptList.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_desc')}</label>
                <input type="text" name="description" id="description" value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_amount')}</label>
                    <input type="number" name="amount" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required step="0.01" className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_date')}</label>
                    <input type="date" name="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-700/50 p-3 rounded-md">
                <input id="isNonDeductible" type="checkbox" checked={isNonDeductible} onChange={e => setIsNonDeductible(e.target.checked)} className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="isNonDeductible" className="text-sm font-medium text-gray-300">{t('banks_add_modal_non_deductible')}</label>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700">
                {t('configuration_cancel_button')}
                </button>
                <button type="submit" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700">
                {t('configuration_save_button')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
