
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18n';
import { BankTransaction } from '../types';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: BankTransaction) => void;
  transaction: BankTransaction | null;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ isOpen, onClose, onSave, transaction }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const [formData, setFormData] = useState<BankTransaction | null>(transaction);

  useEffect(() => {
    setFormData(transaction);
  }, [transaction]);

  const conceptList = formData?.type === 'income' ? state.incomeTypes : state.expenseTypes;

  if (!isOpen || !formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
        if (!prev) return null;
        if (type === 'checkbox') {
            return { ...prev, [name]: checked };
        }
        return { ...prev, [name]: value };
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setFormData(prev => {
        if (!prev) return null;
        const isExpense = prev.type === 'expense';
        return { ...prev, amount: isExpense ? -Math.abs(newAmount) : Math.abs(newAmount) };
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('banks_edit_modal_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="bankAccountId" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_account')}</label>
                    <select name="bankAccountId" id="bankAccountId" value={formData.bankAccountId} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                        {state.bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.currencyCode})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="conceptId" className="block text-sm font-medium text-gray-300">{t('daily_cash_col_concept')}</label>
                    <select name="conceptId" id="conceptId" value={formData.conceptId} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                        {conceptList.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_desc')}</label>
                <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_amount')}</label>
                    <input type="number" name="amount" id="amount" value={Math.abs(formData.amount)} onChange={handleAmountChange} required step="0.01" className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-300">{t('banks_add_modal_date')}</label>
                    <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-700/50 p-3 rounded-md">
                <input id="isNonDeductibleEdit" name="isNonDeductible" type="checkbox" checked={formData.isNonDeductible} onChange={handleChange} className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="isNonDeductibleEdit" className="text-sm font-medium text-gray-300">{t('banks_add_modal_non_deductible')}</label>
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

export default EditTransactionModal;
