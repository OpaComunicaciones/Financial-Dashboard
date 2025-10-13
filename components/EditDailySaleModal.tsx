
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/i18n';
import { DailySale, BankAccount, BankTransaction } from '../types';
import { X, DollarSign, CreditCard, Landmark, Users, Trash2, Plus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface EditDailySaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: DailySale, transfers: any[], cardSales: any[]) => void;
  sale: DailySale | null;
}

const EditDailySaleModal: React.FC<EditDailySaleModalProps> = ({ isOpen, onClose, onSave, sale }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const [formData, setFormData] = useState<DailySale | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [cardSales, setCardSales] = useState<any[]>([]);

  useEffect(() => {
    if (sale) {
      setFormData(sale);
      const { date, currencyCode } = sale;

      // Initialize card sales for all relevant terminals
      const relevantTerminals = state.bankAccounts.filter(ba => ba.currencyCode === currencyCode && ba.hasTerminal);
      const initialCardSales = relevantTerminals.map(terminal => {
        const existingTx = state.transactions.find(t => 
          t.date === date && 
          t.bankAccountId === terminal.id && 
          t.description.includes('Credit Card Sales')
        );
        return {
          id: existingTx?.id || `new_card_${terminal.id}`,
          bankAccountId: terminal.id,
          amount: existingTx ? existingTx.amount.toString() : '',
          date: date,
          currencyCode: currencyCode,
          description: `Credit Card Sales (${terminal.name}) for ${date}`
        };
      });
      setCardSales(initialCardSales);

      // Initialize transfers from existing transactions
      const relatedTransactions = state.transactions.filter(t => t.date === date && state.bankAccounts.find(ba => ba.id === t.bankAccountId)?.currencyCode === currencyCode);
      const existingTransfers = relatedTransactions
        .filter(t => t.description.includes('Bank Transfer Sales'))
        .map(t => ({ ...t, amount: t.amount.toString(), bankAccountId: t.bankAccountId }));
      setTransfers(existingTransfers);

    } else {
      setFormData(null);
      setTransfers([]);
      setCardSales([]);
    }
  }, [sale, state.transactions, state.bankAccounts]);

  if (!isOpen || !formData) return null;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: parseFloat(value) || 0 } : null);
  };

  const handleTransferChange = (id: string, field: string, value: string) => {
    setTransfers(transfers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleAddTransfer = () => {
    setTransfers([...transfers, { id: `new_transfer_${Date.now()}`, date: formData.date, currencyCode: formData.currencyCode, bankAccountId: '', amount: '' }]);
  };

  const handleRemoveTransfer = (id: string) => {
    setTransfers(transfers.filter(t => t.id !== id));
  };

  const handleCardSaleChange = (terminalId: string, value: string) => {
    setCardSales(cardSales.map(cs => 
      cs.bankAccountId === terminalId ? { ...cs, amount: value } : cs
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      const totalCard = cardSales.reduce((acc, cs) => acc + (parseFloat(cs.amount) || 0), 0);
      const totalTransfer = transfers.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
      const updatedSale = { ...formData, card: totalCard, transfer: totalTransfer };
      
      const finalTransfers = transfers.map(t => ({...t, accountId: t.bankAccountId}));

      onSave(updatedSale, finalTransfers, cardSales);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('daily_sales_edit_modal_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-gray-900/50 rounded-lg">
                <h4 className="text-lg font-bold text-indigo-400 mb-3">{formData.date} - {formData.currencyCode}</h4>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <DollarSign className="text-green-400" size={24}/>
                        <label htmlFor="cash" className="w-48 text-gray-300">{t('daily_sales_cash')}</label>
                        <input type="number" id="cash" name="cash" value={formData.cash} onChange={handleFormChange} step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0.00" />
                    </div>
                    <hr className="border-gray-700"/>
                    <h5 className="text-md font-semibold text-gray-200">{t('daily_sales_card')}</h5>
                    {cardSales.map(cardSale => {
                        const terminal = state.bankAccounts.find(ba => ba.id === cardSale.bankAccountId);
                        if (!terminal) return null;
                        return (
                            <div key={terminal.id} className="flex items-center gap-3 pl-4">
                                <CreditCard className="text-blue-400" size={20}/>
                                <label htmlFor={`card-${terminal.id}`} className="w-44 text-gray-300">{terminal.name}</label>
                                <input type="number" id={`card-${terminal.id}`} name={`card-${terminal.id}`} value={cardSale.amount} onChange={e => handleCardSaleChange(terminal.id, e.target.value)} step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0.00" />
                            </div>
                        );
                    })}
                    <hr className="border-gray-700"/>
                    <h5 className="text-md font-semibold text-gray-200">{t('daily_sales_transfer')}</h5>
                    {transfers.map((transfer) => (
                        <div key={transfer.id} className="flex items-center gap-3 pl-4">
                            <Landmark className="text-purple-400" size={20}/>
                            <select value={transfer.bankAccountId} onChange={e => handleTransferChange(transfer.id, 'bankAccountId', e.target.value)} className="w-44 bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                                <option value="">{t('daily_sales_select_bank')}</option>
                                {state.bankAccounts.filter(ba => ba.currencyCode === formData.currencyCode).map(ba => (
                                    <option key={ba.id} value={ba.id}>{ba.name}</option>
                                ))}
                            </select>
                            <input type="number" value={transfer.amount} onChange={e => handleTransferChange(transfer.id, 'amount', e.target.value)} step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0.00" />
                            <button type="button" onClick={() => handleRemoveTransfer(transfer.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                        </div>
                    ))}
                    <div className="pl-4">
                        <button type="button" onClick={handleAddTransfer} className="text-indigo-400 hover:text-indigo-300 font-semibold py-2 rounded-lg flex items-center gap-2">
                            <Plus size={18} /> {t('daily_sales_add_transfer_button')}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="text-gray-400" size={24}/>
                        <label htmlFor="customers" className="w-48 text-gray-300">{t('daily_sales_customers_served')}</label>
                        <input type="number" id="customers" name="customers" value={formData.customers} onChange={handleFormChange} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0" />
                    </div>
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

export default EditDailySaleModal;
