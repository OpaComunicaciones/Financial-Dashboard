
import React, { useState } from 'react';
import { useTranslation } from '../i18n/i18n';
import { CashExpense } from '../types';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AddCashExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<CashExpense, 'id' | 'date' | 'currencyCode'>) => void;
}

const AddCashExpenseModal: React.FC<AddCashExpenseModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  
  const [formData, setFormData] = useState({
    supplier: '',
    detail: '',
    conceptId: state.expenseTypes[0]?.id || '',
    invoiceNumber: '',
    amount: '',
    isNonDeductible: false,
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
        setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.conceptId) {
        alert("Please select a concept.");
        return;
    }
    onSave({
      ...formData,
      amount: parseFloat(formData.amount) || 0,
    });
    // Reset form for next use
    setFormData({
      supplier: '',
      detail: '',
      conceptId: state.expenseTypes[0]?.id || '',
      invoiceNumber: '',
      amount: '',
      isNonDeductible: false,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('daily_cash_add_expense_modal_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-300">{t('daily_cash_col_supplier')}</label>
              <input type="text" name="supplier" id="supplier" value={formData.supplier} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
             <div>
              <label htmlFor="conceptId" className="block text-sm font-medium text-gray-300">{t('daily_cash_col_concept')}</label>
              <select name="conceptId" id="conceptId" value={formData.conceptId} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                 {state.expenseTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                 ))}
              </select>
            </div>
             <div>
              <label htmlFor="detail" className="block text-sm font-medium text-gray-300">{t('daily_cash_col_detail')}</label>
              <input type="text" name="detail" id="detail" value={formData.detail} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-300">{t('daily_cash_col_invoice')}</label>
                    <input type="text" name="invoiceNumber" id="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                </div>
                 <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">{t('daily_cash_col_amount')}</label>
                    <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleChange} required step="0.01" className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                </div>
            </div>

            <div>
                <label htmlFor="isNonDeductible" className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <input type="checkbox" name="isNonDeductible" id="isNonDeductible" checked={formData.isNonDeductible} onChange={handleChange} className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                    <span>{t('banks_col_non_deductible')}</span>
                </label>
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

export default AddCashExpenseModal;