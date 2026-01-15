import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, FileText, Users } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { AccountReceivable } from '../types';
import { formatNumber, getCurrencySymbol } from '../utils/formatting';
import AddAccountReceivableModal from '../components/AddAccountReceivableModal';
import RegisterIncomingPaymentModal from '../components/RegisterIncomingPaymentModal';
import DebtorManagementModal from '../components/DebtorManagementModal';
import Card from '../components/Card';
import * as XLSX from 'xlsx';

const statusStyles: Record<string, string> = {
  Paid: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  Pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  'Partially Paid': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
};

const AccountsReceivable: React.FC = () => {
  const { t } = useTranslation();
  const { state, addAccountReceivable, updateAccountReceivable, deleteAccountReceivable, deleteReceivablePayment } = useAppContext();

  const [isAddARModalOpen, setIsAddARModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDebtorManagementModalOpen, setIsDebtorManagementModalOpen] = useState(false);
  const [editingAR, setEditingAR] = useState<AccountReceivable | undefined>(undefined);
  const [expandedARId, setExpandedARId] = useState<string | null>(null);

  const [debtorFilter, setDebtorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const filteredARs = useMemo(() => {
    let result = [...state.accountsReceivable].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Date filter
    result = result.filter(ar => ar.date >= startDate && ar.date <= endDate);

    if (debtorFilter !== 'All') {
      result = result.filter(ar => ar.debtorId === debtorFilter);
    }
    if (statusFilter !== 'All') {
      result = result.filter(ar => ar.status === statusFilter);
    }
    return result;
  }, [state.accountsReceivable, debtorFilter, statusFilter, startDate, endDate]);

  const totalOutstandingByCurrency = useMemo(() => {
    return state.accountsReceivable
      .filter(ar => ar.status !== 'Paid')
      .reduce((acc, ar) => {
        const totalPaid = (ar.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const remaining = ar.amount - totalPaid;
        if (!acc[ar.currencyCode]) acc[ar.currencyCode] = 0;
        acc[ar.currencyCode] += remaining;
        return acc;
      }, {} as Record<string, number>);
  }, [state.accountsReceivable]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('ar_delete_ar_confirm', '¿Estás seguro de que deseas eliminar esta cuenta por cobrar?'))) {
      await deleteAccountReceivable(id);
    }
  };

  const handleDeletePayment = async (receivableId: string, paymentId: string) => {
    if (window.confirm(t('ar_delete_payment_confirm', '¿Estás seguro de que deseas eliminar este abono? El movimiento asociado desaparecerá también.'))) {
      await deleteReceivablePayment(receivableId, paymentId);
    }
  };

  const openEditModal = (ar: AccountReceivable) => {
    setEditingAR(ar);
    setIsAddARModalOpen(true);
  };

  const statusTranslation: Record<string, string> = {
    Pending: t('ar_status_pending'),
    Paid: t('ar_status_paid'),
    'Partially Paid': t('ar_status_partially_paid'),
  };

  const exportToExcel = () => {
    const data = filteredARs.map(ar => {
      const debtor = state.debtors.find(d => d.id === ar.debtorId);
      const totalPaid = (ar.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const remaining = ar.amount - totalPaid;

      return {
        [t('ar_col_debtor')]: debtor?.name || t('ar_unknown_debtor'),
        [t('ar_col_date')]: ar.date,
        [t('ar_col_concept')]: ar.concept,
        [t('ar_col_amount')]: ar.amount,
        [t('ar_col_currency')]: ar.currencyCode,
        [t('ar_col_balance')]: remaining,
        [t('ar_col_status')]: statusTranslation[ar.status]
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accounts Receivable");
    XLSX.writeFile(wb, "Accounts_Receivable_Report.xlsx");
  };

  return (
    <div className='grow space-y-6'>
      <PageHeader
        title={t('ar_title')}
        subtitle={t('ar_subtitle')}
      />

      <div className='space-y-6'>
        {/* Summary Row */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {Object.entries(totalOutstandingByCurrency).map(([currency, amount]) => (
              <Card key={currency} title={`${t('ar_outstanding_balance')} (${currency})`} icon={<FileText className="text-indigo-500" />}>
                <div className='text-2xl font-bold text-indigo-600 dark:text-indigo-400'>
                  {formatNumber(amount, { style: 'currency', currencySymbol: getCurrencySymbol(currency) })}
                </div>
              </Card>
            ))}
            {Object.keys(totalOutstandingByCurrency).length === 0 && (
              <Card title={t('ar_outstanding_balance')} icon={<FileText className="text-gray-400" />}>
                <div className='text-gray-500 italic'>{t('ar_no_debt')}</div>
              </Card>
            )}
          </div>

          <Card
            title={t('ar_debtors_title')}
            icon={<Users className="text-emerald-500" />}
            className="flex flex-col justify-between"
          >
            <div className='flex justify-between items-center'>
              <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                {state.debtors.length}
              </div>
              <button
                onClick={() => setIsDebtorManagementModalOpen(true)}
                className="px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
              >
                {t('sidebar_configuration')}
              </button>
            </div>
          </Card>
        </div>

        {/* Filter Panel */}
        <div className='bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm'>
          <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6'>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>{t('reports_date_range')}</label>
                <div className='flex items-center gap-2'>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                  <span className='text-gray-400'>-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>{t('ar_col_debtor')}</label>
                <select
                  value={debtorFilter}
                  onChange={(e) => setDebtorFilter(e.target.value)}
                  className="block px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="All">{t('ar_all_debtors')}</option>
                  {state.debtors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>{t('ar_col_status')}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="All">{t('ar_all_statuses')}</option>
                  <option value="Pending">{t('ar_status_pending')}</option>
                  <option value="Partially Paid">{t('ar_status_partially_paid')}</option>
                  <option value="Paid">{t('ar_status_paid')}</option>
                </select>
              </div>
            </div>

            <div className='flex items-center gap-2 mt-auto'>
              <button
                onClick={exportToExcel}
                className='flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all'
              >
                <FileText size={18} />
                Excel
              </button>
              <button
                onClick={() => setIsAddARModalOpen(true)}
                className='flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all'
              >
                <Plus size={18} />
                {t('ar_add_manual')}
              </button>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className='flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all'
              >
                <Plus size={18} />
                {t('ar_register_payment')}
              </button>
            </div>
          </div>
        </div>

        {/* List Panel */}
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden'>
          <div className='p-6 border-b border-gray-100 dark:border-gray-700'>
            <h3 className='font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm'>{t('ar_list_title')}</h3>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-left'>
              <thead>
                <tr className='bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 uppercase tracking-wider'>
                  <th className='px-6 py-4'>{t('ar_col_debtor')}</th>
                  <th className='px-6 py-4'>{t('ar_col_date')}</th>
                  <th className='px-6 py-4'>{t('ar_col_concept')}</th>
                  <th className='px-6 py-4'>{t('ar_col_amount')}</th>
                  <th className='px-6 py-4'>{t('ar_col_status')}</th>
                  <th className='px-6 py-4 text-center'>{t('ar_col_actions')}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-700'>
                {filteredARs.map(ar => {
                  const debtor = state.debtors.find(d => d.id === ar.debtorId);
                  const totalPaid = (ar.payments || []).reduce((sum, p) => sum + p.amount, 0);
                  const remaining = ar.amount - totalPaid;
                  const isExpanded = expandedARId === ar.id;

                  return (
                    <React.Fragment key={ar.id}>
                      <tr
                        className='hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer'
                        onClick={() => setExpandedARId(isExpanded ? null : ar.id)}
                      >
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-2'>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className='font-medium text-gray-900 dark:text-white'>{debtor?.name || t('ar_unknown_debtor')}</span>
                          </div>
                        </td>
                        <td className='px-6 py-4 text-sm text-gray-600 dark:text-gray-400'>{ar.date}</td>
                        <td className='px-6 py-4 text-sm text-gray-600 dark:text-gray-400'>{ar.concept}</td>
                        <td className='px-6 py-4 text-sm font-mono'>
                          <div className='font-semibold text-gray-900 dark:text-white'>
                            {formatNumber(ar.amount, { style: 'currency', currencySymbol: getCurrencySymbol(ar.currencyCode) })}
                          </div>
                          {ar.status === 'Partially Paid' && (
                            <div className='text-xs text-blue-600 dark:text-blue-400'>
                              {t('ar_outstanding_balance')} {formatNumber(remaining, { style: 'currency', currencySymbol: getCurrencySymbol(ar.currencyCode) })}
                            </div>
                          )}
                        </td>
                        <td className='px-6 py-4'>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[ar.status] || ''}`}>
                            {statusTranslation[ar.status]}
                          </span>
                        </td>
                        <td className='px-6 py-4' onClick={e => e.stopPropagation()}>
                          <div className='flex items-center justify-center gap-2'>
                            <button onClick={() => openEditModal(ar)} className='p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors'><Pencil size={18} /></button>
                            <button onClick={() => handleDelete(ar.id)} className='p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors'><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-900/40">
                          <td colSpan={6} className="px-12 py-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('ar_payments_history')}</h4>
                              {(!ar.payments || ar.payments.length === 0) ? (
                                <p className="text-sm text-gray-500 italic">{t('ar_no_payments')}</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {ar.payments.map((payment) => (
                                    <div key={payment.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNumber(payment.amount, { style: 'currency', currencySymbol: getCurrencySymbol(ar.currencyCode) })}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{payment.paymentDate} • {payment.method === 'cash' ? t('daily_cash_title') : t('banks_title')}</p>
                                      </div>
                                      <button
                                        onClick={() => handleDeletePayment(ar.id, payment.id)}
                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 transition-colors"
                                        title={t('ar_delete_payment_tooltip')}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredARs.length === 0 && (
                  <tr>
                    <td colSpan={6} className='px-6 py-12 text-center text-gray-400 italic font-medium'>
                      {t('ar_no_receivables')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddAccountReceivableModal
        isOpen={isAddARModalOpen}
        onClose={() => { setIsAddARModalOpen(false); setEditingAR(undefined); }}
        onSave={async (ar, loanDetails) => {
          if (editingAR) {
            await updateAccountReceivable({ ...editingAR, ...ar });
          } else {
            await addAccountReceivable(ar, loanDetails);
          }
        }}
        accountReceivable={editingAR}
      />

      <RegisterIncomingPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      <DebtorManagementModal
        isOpen={isDebtorManagementModalOpen}
        onClose={() => setIsDebtorManagementModalOpen(false)}
      />
    </div>
  );
};

export default AccountsReceivable;