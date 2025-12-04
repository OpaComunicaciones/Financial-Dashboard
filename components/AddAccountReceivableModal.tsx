import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n/i18n';
import { AccountReceivable } from '../types';
import { useAppContext } from '../context/AppContext';

interface AddAccountReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ar: Omit<AccountReceivable, 'id' | 'status' | 'payments'>, loanDetails?: { source: 'cash' | 'bank'; bankAccountId?: string; }) => void;
  accountReceivable?: AccountReceivable | null;
}

const AddAccountReceivableModal: React.FC<AddAccountReceivableModalProps> = ({ isOpen, onClose, onSave, accountReceivable }) => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const [debtorId, setDebtorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [currencyCode, setCurrencyCode] = useState(state.currencies[0]?.code || 'USD');

  // State for employee loan details
  const [loanSource, setLoanSource] = useState<'cash' | 'bank' | ''>('');
  const [loanBankAccountId, setLoanBankAccountId] = useState('');

  const selectedDebtor = useMemo(() => state.debtors.find(d => d.id === debtorId), [debtorId, state.debtors]);
  const isEmployeeLoan = useMemo(() => selectedDebtor?.type === 'employee', [selectedDebtor]);

  useEffect(() => {
    if (accountReceivable) {
      setDebtorId(accountReceivable.debtorId);
      setDate(accountReceivable.date);
      setConcept(accountReceivable.concept);
      setAmount(accountReceivable.amount);
      setDueDate(accountReceivable.dueDate);
      setCurrencyCode(accountReceivable.currencyCode);
      // Loans are not editable, so reset loan fields
      setLoanSource('');
      setLoanBankAccountId('');
    } else {
      // Reset to default
      setDebtorId(state.debtors[0]?.id || '');
      setDate(new Date().toISOString().split('T')[0]);
      setConcept('');
      setAmount('');
      setDueDate(undefined);
      setCurrencyCode(state.currencies[0]?.code || 'USD');
      setLoanSource('');
      setLoanBankAccountId('');
    }
  }, [accountReceivable, isOpen, state.debtors, state.currencies]);

  useEffect(() => {
    // When currency changes, reset the selected bank account for the loan
    if (isEmployeeLoan) {
      setLoanBankAccountId('');
    }
  }, [currencyCode, isEmployeeLoan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorId || !concept.trim() || amount === '' || amount <= 0) return;

    let loanDetails: { source: 'cash' | 'bank'; bankAccountId?: string; } | undefined = undefined;
    if (isEmployeeLoan) {
      if (!loanSource) {
        alert("Por favor, seleccione el origen de los fondos para el préstamo.");
        return;
      }
      if (loanSource === 'bank' && !loanBankAccountId) {
        alert("Por favor, seleccione la cuenta bancaria para el préstamo.");
        return;
      }
      loanDetails = {
        source: loanSource,
        bankAccountId: loanSource === 'bank' ? loanBankAccountId : undefined,
      };
    }

    onSave({
      debtorId,
      date,
      concept: concept.trim(),
      amount: amount as number,
      dueDate,
      currencyCode,
    }, loanDetails);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">{accountReceivable ? t('ar_edit_ar') : t('ar_add_manual')}</h3>
        <form onSubmit={handleSubmit}>
          {/* Standard Fields */}
          <div className="mb-4">
            <label htmlFor="debtor" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_col_debtor')}</label>
            <select id="debtor" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={debtorId} onChange={(e) => setDebtorId(e.target.value)} required disabled={!!accountReceivable}>
              <option value="">{t('ar_select_debtor')}</option>
              {state.debtors.map(debtor => <option key={debtor.id} value={debtor.id}>{debtor.name}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_col_date')}</label>
            <input type="date" id="date" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label htmlFor="concept" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_col_concept')}</label>
            <input type="text" id="concept" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder={t('ar_concept_placeholder')} required />
          </div>
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_col_amount')}</label>
            <input type="number" id="amount" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} min="0.01" step="0.01" required disabled={!!accountReceivable} />
          </div>
          <div className="mb-4">
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_col_due_date')} (Opcional)</label>
            <input type="date" id="dueDate" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={dueDate || ''} onChange={(e) => setDueDate(e.target.value || undefined)} />
          </div>
          <div className="mb-4">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_col_currency')}</label>
            <select id="currency" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} required disabled={!!accountReceivable}>
              {state.currencies.map(currency => <option key={currency.code} value={currency.code}>{currency.code}</option>)}
            </select>
          </div>

          {/* Employee Loan Section */}
          {isEmployeeLoan && !accountReceivable && (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-indigo-500/30 my-4 space-y-4">
              <h4 className="text-lg font-semibold text-indigo-400">Origen del Préstamo</h4>
              <div className="mb-4">
                <label htmlFor="loanSource" className="block text-sm font-medium text-gray-300 mb-1">Fuente</label>
                <select id="loanSource" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={loanSource} onChange={(e) => setLoanSource(e.target.value as any)} required>
                  <option value="">Seleccione una fuente</option>
                  <option value="cash">Efectivo</option>
                  <option value="bank">Cuenta Bancaria</option>
                </select>
              </div>
              {loanSource === 'bank' && (
                <div className="mb-4">
                  <label htmlFor="loanBankAccountId" className="block text-sm font-medium text-gray-300 mb-1">Cuenta Bancaria</label>
                  <select key={currencyCode} id="loanBankAccountId" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" value={loanBankAccountId} onChange={(e) => setLoanBankAccountId(e.target.value)} required>
                    <option value="">Seleccione una cuenta</option>
                    {state.bankAccounts.filter(acc => acc.currencyCode === currencyCode).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">{t('ar_cancel')}</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">{t('ar_save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountReceivableModal;