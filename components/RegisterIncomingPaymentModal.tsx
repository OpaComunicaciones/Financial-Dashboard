import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { Debtor, AccountReceivable, BankAccount } from '../types';
import { formatNumber } from '../utils/formatting';

interface RegisterIncomingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RegisterIncomingPaymentModal: React.FC<RegisterIncomingPaymentModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { state, receivePaymentForReceivables } = useAppContext();

  const [selectedDebtorId, setSelectedDebtorId] = useState('');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [commissionAmount, setCommissionAmount] = useState<number | ''>('');

  const [receivablesToApply, setReceivablesToApply] = useState<
    { ar: AccountReceivable; amountToApply: number; isSelected: boolean }[]
  >([]);

  const outstandingReceivablesForDebtor = useMemo(() => {
    return state.accountsReceivable.filter(
      (ar) => ar.debtorId === selectedDebtorId && ar.status !== 'Paid'
    );
  }, [state.accountsReceivable, selectedDebtorId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedDebtorId('');
      setAmountReceived('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('cash');
      setSelectedBankAccountId('');
      setCommissionAmount('');
      setReceivablesToApply([]);
    }
  }, [isOpen]);

  useEffect(() => {
    // When debtor changes, reset selected receivables
    setReceivablesToApply(
      outstandingReceivablesForDebtor.map((ar) => ({
        ar,
        amountToApply: 0, // Initially, don't apply anything
        isSelected: false,
      }))
    );
  }, [outstandingReceivablesForDebtor]);

  const handleToggleSelectAR = (arId: string) => {
    setReceivablesToApply((prev) =>
      prev.map((item) =>
        item.ar.id === arId ? { ...item, isSelected: !item.isSelected } : item
      )
    );
  };

  const handleAmountToApplyChange = (arId: string, value: number | '') => {
    setReceivablesToApply((prev) =>
      prev.map((item) => {
        if (item.ar.id === arId) {
          const remainingBalance = item.ar.amount - item.ar.payments.reduce((sum, p) => sum + p.amount, 0);
          return {
            ...item,
            amountToApply: value === '' ? 0 : Math.min(value, remainingBalance), // Cannot apply more than remaining
            isSelected: value > 0, // Automatically select if amount is entered
          };
        }
        return item;
      })
    );
  };

  const totalAmountApplied = useMemo(() => {
    return receivablesToApply.reduce((sum, item) => sum + item.amountToApply, 0);
  }, [receivablesToApply]);

  const remainingAmountToAllocate = useMemo(() => {
    const actualReceived = amountReceived === '' ? 0 : amountReceived;
    const commissions = commissionAmount === '' ? 0 : commissionAmount;
    return actualReceived - (totalAmountApplied - commissions); // Not entirely correct. Need to rethink this logic.
  }, [amountReceived, commissionAmount, totalAmountApplied]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtorId || amountReceived === '' || amountReceived <= 0) {
      alert(t('ar_payment_validation_amount', 'Debe seleccionar un deudor y un monto recibido válido.'));
      return;
    }
    if (paymentMethod === 'bank' && !selectedBankAccountId) {
        alert(t('ar_payment_validation_bank_account', 'Debe seleccionar una cuenta bancaria para pagos bancarios.'));
        return;
    }
    if (receivablesToApply.filter(item => item.isSelected).length === 0) {
        alert(t('ar_payment_validation_select_ars', 'Debe seleccionar al menos una cuenta por cobrar para aplicar el pago.'));
        return;
    }

    const finalReceivablesToApply = receivablesToApply
      .filter((item) => item.isSelected && item.amountToApply > 0)
      .map((item) => ({ id: item.ar.id, amountApplied: item.amountToApply }));

    if (finalReceivablesToApply.length === 0) {
        alert(t('ar_payment_validation_applied_amount', 'No se ha aplicado ningún monto a las cuentas por cobrar seleccionadas.'));
        return;
    }

    receivePaymentForReceivables({
      debtorId: selectedDebtorId,
      amountReceived: amountReceived as number,
      paymentDate,
      paymentMethod,
      bankAccountId: paymentMethod === 'bank' ? selectedBankAccountId : undefined,
      commissionAmount: commissionAmount === '' ? 0 : commissionAmount,
      receivablesToApply: finalReceivablesToApply,
    });

    onClose();
  };

  const getCurrencySymbol = (code: string) => {
    return state.currencies.find(c => c.code === code)?.symbol || '$';
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">{t('ar_register_payment', 'Registrar Pago Entrante')}</h3>
        <form onSubmit={handleSubmit}>
          {/* Payment Details */}
          <div className="mb-6 p-4 bg-gray-900 rounded-md border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-3">{t('ar_payment_details', 'Detalles del Pago Recibido')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="debtor" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_col_debtor', 'Deudor')}</label>
                <select
                  id="debtor"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedDebtorId}
                  onChange={(e) => setSelectedDebtorId(e.target.value)}
                  required
                >
                  <option value="">{t('ar_select_debtor', 'Seleccionar Deudor')}</option>
                  {state.debtors.map(debtor => (
                    <option key={debtor.id} value={debtor.id}>{debtor.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="amountReceived" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_amount_received', 'Monto Recibido Real')}</label>
                <input
                  type="number"
                  id="amountReceived"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value))}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_payment_date', 'Fecha de Pago')}</label>
                <input
                  type="date"
                  id="paymentDate"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_payment_method', 'Método de Pago')}</label>
                <select
                  id="paymentMethod"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                >
                  <option value="cash">{t('daily_cash_cash', 'Efectivo')}</option>
                  <option value="bank">{t('ar_payment_method_bank', 'Depósito Bancario')}</option>
                </select>
              </div>
              {paymentMethod === 'bank' && (
                <div>
                  <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-300 mb-1">{t('ar_bank_account', 'Cuenta Bancaria')}</label>
                  <select
                    id="bankAccount"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    required={paymentMethod === 'bank'}
                  >
                    <option value="">{t('ar_select_bank_account', 'Seleccionar Cuenta')}</option>
                    {state.bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>{account.name} ({account.currencyCode})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Receivables to Apply */}
          {selectedDebtorId && outstandingReceivablesForDebtor.length > 0 && (
            <div className="mb-6 p-4 bg-gray-900 rounded-md border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-3">{t('ar_receivables_to_apply', 'Cuentas por Cobrar Pendientes')}</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {receivablesToApply.map((item) => {
                  const balance = item.ar.amount - item.ar.payments.reduce((sum, p) => sum + p.amount, 0);
                  return (
                    <div key={item.ar.id} className="flex items-center gap-3 bg-gray-700 p-3 rounded-md">
                      <input
                        type="checkbox"
                        checked={item.isSelected}
                        onChange={() => handleToggleSelectAR(item.ar.id)}
                        className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-grow">
                        <p className="font-medium text-white">{item.ar.concept} ({item.ar.date})</p>
                        <p className="text-sm text-gray-400">
                          {t('ar_outstanding_balance', 'Saldo Pendiente:')} {formatNumber(balance, { style: 'currency', currencySymbol: getCurrencySymbol(item.ar.currencyCode) })}
                        </p>
                      </div>
                      <input
                        type="number"
                        value={item.amountToApply === 0 && !item.isSelected ? '' : item.amountToApply}
                        onChange={(e) => handleAmountToApplyChange(item.ar.id, parseFloat(e.target.value) || '')}
                        min="0"
                        step="0.01"
                        placeholder={t('ar_amount_to_apply', 'Monto a aplicar')}
                        className="w-32 px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-white"
                        disabled={!item.isSelected}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary and Commission */}
          <div className="mb-6 p-4 bg-gray-900 rounded-md border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-3">{t('ar_summary', 'Resumen')}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>{t('ar_total_applied_to_receivables', 'Total Aplicado a Cuentas por Cobrar:')}</span>
                <span className="font-semibold">{formatNumber(totalAmountApplied, { style: 'currency', currencySymbol: getCurrencySymbol(state.currencies[0]?.code || 'USD') })}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>{t('ar_total_received', 'Monto Recibido Real:')}</span>
                <span className="font-semibold">{formatNumber(amountReceived === '' ? 0 : amountReceived, { style: 'currency', currencySymbol: getCurrencySymbol(state.currencies[0]?.code || 'USD') })}</span>
              </div>
              <div className="flex justify-between text-red-400 font-bold border-t border-gray-700 pt-2">
                <span>{t('ar_commission_difference', 'Diferencia / Comisión:')}</span>
                <span className="font-bold">{formatNumber(totalAmountApplied - (amountReceived === '' ? 0 : amountReceived), { style: 'currency', currencySymbol: getCurrencySymbol(state.currencies[0]?.code || 'USD') })}</span>
              </div>
              {/* Manual Commission Adjustment */}
              <div className="flex items-center gap-3">
                <label htmlFor="commissionAmount" className="flex-grow block text-sm font-medium text-gray-300 mb-1">{t('ar_commission_amount_manual', 'Monto de Comisión (opcional):')}</label>
                <input
                  type="number"
                  id="commissionAmount"
                  className="w-32 px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(parseFloat(e.target.value) || '')}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-300"
            >
              {t('ar_cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-300"
            >
              {t('ar_register_payment_button', 'Registrar Pago')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterIncomingPaymentModal;