import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n/i18n';
import { Invoice, InvoicePayment } from '../types';
import { X, DollarSign, Landmark } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => void;
  invoice: Invoice | null;
}

const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({ isOpen, onClose, onConfirm, invoice }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');

  const remainingBalance = useMemo(() => {
      if (!invoice) return 0;
      const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      return invoice.amount - totalPaid;
  }, [invoice]);

  useEffect(() => {
    if (invoice) {
      const defaultAccount = state.bankAccounts.find(acc => acc.currencyCode === invoice.currencyCode);
      setAccountId(defaultAccount?.id);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setIsPartial(false);
      setPartialAmount('');
    }
  }, [invoice, state.bankAccounts]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'bank' && !accountId) {
        alert(t('accounts_payable_pay_modal_no_accounts'));
        return;
    }

    const paymentAmount = isPartial ? parseFloat(partialAmount) || 0 : remainingBalance;

    if (paymentAmount <= 0) {
        alert(t('accounts_payable_error_zero_payment'));
        return;
    }
    if (paymentAmount > remainingBalance + 0.001) { // Add tolerance for float issues
        alert(t('accounts_payable_error_overpayment'));
        return;
    }

    onConfirm(invoice.id, { 
        method: paymentMethod, 
        accountId, 
        paymentDate, 
        amount: paymentAmount 
    });
    onClose();
  };

  const bankAccountsForCurrency = state.bankAccounts.filter(acc => acc.currencyCode === invoice.currencyCode);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{t('accounts_payable_pay_modal_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className='mb-4 p-3 bg-gray-900/50 rounded-lg'>
            <p className='text-sm text-gray-400'>{invoice.supplier} - #{invoice.invoiceNumber}</p>
            <p className='text-2xl font-bold'>{t('accounts_payable_remaining_balance')}: {state.currencies.find(c=>c.code === invoice.currencyCode)?.symbol}{remainingBalance.toFixed(2)}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-300">{t('accounts_payable_pay_modal_payment_date')}</label>
                <input type="date" name="paymentDate" id="paymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">{t('accounts_payable_pay_modal_payment_method')}</label>
                <div className="mt-2 flex rounded-md shadow-sm">
                    <button type="button" onClick={() => setPaymentMethod('cash')} className={`relative inline-flex items-center justify-center w-1/2 px-4 py-2 rounded-l-md border border-gray-600 text-sm font-medium ${paymentMethod === 'cash' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        <DollarSign size={16} className='mr-2'/> {t('daily_sales_cash')}
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('bank')} className={`-ml-px relative inline-flex items-center justify-center w-1/2 px-4 py-2 rounded-r-md border border-gray-600 text-sm font-medium ${paymentMethod === 'bank' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        <Landmark size={16} className='mr-2'/> {t('sidebar_banks')}
                    </button>
                </div>
            </div>

            {paymentMethod === 'bank' && (
                <div>
                    <label htmlFor="accountId" className="block text-sm font-medium text-gray-300">{t('accounts_payable_pay_modal_select_account')}</label>
                    <select name="accountId" id="accountId" value={accountId} onChange={e => setAccountId(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                        {bankAccountsForCurrency.length > 0 ? (
                            bankAccountsForCurrency.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currencyCode})</option>
                            ))
                        ) : (
                            <option disabled>{t('accounts_payable_pay_modal_no_accounts')}</option>
                        )}
                    </select>
                </div>
            )}

            <div className="flex items-center gap-3 bg-gray-700/50 p-3 rounded-md">
                <input id="isPartial" type="checkbox" checked={isPartial} onChange={e => setIsPartial(e.target.checked)} className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="isPartial" className="text-sm font-medium text-gray-300">{t('accounts_payable_pay_modal_partial_payment')}</label>
            </div>

            {isPartial && (
                 <div>
                    <label htmlFor="partialAmount" className="block text-sm font-medium text-gray-300">{t('accounts_payable_pay_modal_partial_amount')}</label>
                    <input type="number" name="partialAmount" id="partialAmount" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} required step="0.01" className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                </div>
            )}

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700">
              {t('configuration_cancel_button')}
            </button>
            <button type="submit" className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">
              {t('accounts_payable_pay_modal_confirm_button')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayInvoiceModal;
