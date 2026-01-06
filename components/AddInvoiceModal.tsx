import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18n';
import { Invoice } from '../types';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Omit<Invoice, 'id' | 'status'>) => void;
}

const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const getInitialFormData = () => ({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    invoiceNumber: '',
    conceptId: state.expenseTypes[0]?.id || '',
    amount: '',
    dueDate: '',
    currencyCode: state.currencies[0]?.code || ''
  });

  const [formData, setFormData] = useState(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
    }
  }, [isOpen, state.expenseTypes, state.currencies]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.conceptId) {
      alert('Please select a concept.');
      return;
    }
    onSave({
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      payments: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('accounts_payable_add_modal_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-300">{t('accounts_payable_add_modal_supplier')}</label>
              <input type="text" name="supplier" id="supplier" value={formData.supplier} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
            <div>
              <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-300">{t('accounts_payable_add_modal_invoice_number')}</label>
              <input type="text" name="invoiceNumber" id="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
          </div>
          <div>
            <label htmlFor="conceptId" className="block text-sm font-medium text-gray-300">{t('accounts_payable_add_modal_concept')}</label>
            <select name="conceptId" id="conceptId" value={formData.conceptId} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
              {state.expenseTypes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-300">{t('accounts_payable_add_modal_amount')}</label>
              <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleChange} required step="0.01" className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
            <div>
              <label htmlFor="currencyCode" className="block text-sm font-medium text-gray-300">{t('accounts_payable_add_modal_currency')}</label>
              <select name="currencyCode" id="currencyCode" value={formData.currencyCode} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                {state.currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-300">{t('accounts_payable_add_modal_date')}</label>
              <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300">{t('accounts_payable_add_modal_due_date')}</label>
              <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} onChange={handleChange} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
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

export default AddInvoiceModal;