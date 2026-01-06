import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { Debtor, AccountReceivable, DebtorType, AccountReceivableStatus } from '../types';
import { Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { formatNumber } from '../utils/formatting';
import AddDebtorModal from '../components/AddDebtorModal'; // Will create this later
import AddAccountReceivableModal from '../components/AddAccountReceivableModal'; // Will create this later
import RegisterIncomingPaymentModal from '../components/RegisterIncomingPaymentModal'; // Will create this later


const AccountsReceivable: React.FC = () => {
  const { t } = useTranslation();
  const { state, addDebtor, updateDebtor, deleteDebtor, addAccountReceivable, updateAccountReceivable, deleteAccountReceivable } = useAppContext();

  const [isAddDebtorModalOpen, setIsAddDebtorModalOpen] = useState(false);
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);

  const [isAddARModalOpen, setIsAddARModalOpen] = useState(false);
  const [editingAR, setEditingAR] = useState<AccountReceivable | null>(null);

  const [isRegisterPaymentModalOpen, setIsRegisterPaymentModalOpen] = useState(false);

  const [filterDebtorId, setFilterDebtorId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<AccountReceivableStatus | 'all'>('all');

  const filteredARs = useMemo(() => {
    let ars = state.accountsReceivable;
    if (filterDebtorId !== 'all') {
      ars = ars.filter(ar => ar.debtorId === filterDebtorId);
    }
    if (filterStatus !== 'all') {
      ars = ars.filter(ar => ar.status === filterStatus);
    }
    return ars.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.accountsReceivable, filterDebtorId, filterStatus]);

  const getDebtorName = (id: string) => {
    return state.debtors.find(d => d.id === id)?.name || 'Desconocido';
  };

  const getCurrencySymbol = (code: string) => {
    return state.currencies.find(c => c.code === code)?.symbol || '$';
  };

  const getDebtorTypeLabel = (type: DebtorType) => {
    switch (type) {
      case 'delivery_platform': return t('ar_debtor_type_platform', 'Plataforma de Delivery');
      case 'customer': return t('ar_debtor_type_customer', 'Cliente Directo');
      case 'employee': return t('ar_debtor_type_employee', 'Empleado');
      default: return '';
    }
  };

  const getARStatusLabel = (status: AccountReceivableStatus) => {
    switch (status) {
      case 'Pending': return t('ar_status_pending', 'Pendiente');
      case 'Paid': return t('ar_status_paid', 'Pagada');
      case 'Partially Paid': return t('ar_status_partially_paid', 'Pago Parcial');
      default: return '';
    }
  };

  const statusStyles: Record<AccountReceivableStatus, string> = {
    Paid: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    Pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    'Partially Paid': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t('ar_title', 'Cuentas por Cobrar')} subtitle={t('ar_subtitle', 'Gestión de dinero pendiente de recibir.')} />

      {/* Debtors Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('ar_debtors_title', 'Gestión de Deudores')}</h3>
          <button onClick={() => setIsAddDebtorModalOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center gap-2">
            <Plus size={18} /> {t('ar_add_debtor', 'Añadir Deudor')}
          </button>
        </div>
        <ul className="space-y-2 mb-4">
          {state.debtors.map(debtor => (
            <li key={debtor.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-100 dark:border-gray-600">
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">{debtor.name}</span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                  {getDebtorTypeLabel(debtor.type)}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingDebtor(debtor); setIsAddDebtorModalOpen(true); }} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                <button onClick={() => { if (window.confirm(t('ar_delete_debtor_confirm', '¿Está seguro de eliminar este deudor? Se eliminarán todas sus cuentas por cobrar asociadas.'))) deleteDebtor(debtor.id); }} className="text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
        {state.debtors.length === 0 && <p className="text-gray-500">{t('ar_no_debtors', 'No hay deudores registrados.')}</p>}
      </div>

      {/* Accounts Receivable List */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('ar_list_title', 'Cuentas por Cobrar Pendientes')}</h3>
          <div className="flex gap-2">
            <button onClick={() => setIsAddARModalOpen(true)} className="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors duration-300 flex items-center gap-2">
              <Plus size={18} /> {t('ar_add_manual', 'Añadir Manual')}
            </button>
            <button onClick={() => setIsRegisterPaymentModalOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center gap-2">
              <CheckCircle size={18} /> {t('ar_register_payment', 'Registrar Pago Entrante')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label htmlFor="filterDebtor" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('ar_filter_by_debtor', 'Filtrar por Deudor')}</label>
            <select
              id="filterDebtor"
              className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
              value={filterDebtorId}
              onChange={(e) => setFilterDebtorId(e.target.value)}
            >
              <option value="all">{t('ar_all_debtors', 'Todos los Deudores')}</option>
              {state.debtors.map(debtor => (
                <option key={debtor.id} value={debtor.id}>{debtor.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{t('ar_filter_by_status', 'Filtrar por Estado')}</label>
            <select
              id="filterStatus"
              className="block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AccountReceivableStatus | 'all')}
            >
              <option value="all">{t('ar_all_statuses', 'Todos los Estados')}</option>
              <option value="Pending">{t('ar_status_pending', 'Pendiente')}</option>
              <option value="Partially Paid">{t('ar_status_partially_paid', 'Pago Parcial')}</option>
              <option value="Paid">{t('ar_status_paid', 'Pagada')}</option>
            </select>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-300">
            <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">{t('ar_col_debtor', 'Deudor')}</th>
                <th scope="col" className="px-6 py-3">{t('ar_col_date', 'Fecha')}</th>
                <th scope="col" className="px-6 py-3">{t('ar_col_concept', 'Concepto')}</th>
                <th scope="col" className="px-6 py-3">{t('ar_col_amount', 'Monto Original')}</th>
                <th scope="col" className="px-6 py-3">{t('ar_col_balance', 'Saldo Pendiente')}</th>
                <th scope="col" className="px-6 py-3">{t('ar_col_due_date', 'Fecha Venc.')}</th>
                <th scope="col" className="px-6 py-3">{t('ar_col_status', 'Estado')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('ar_col_actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredARs.map(ar => {
                const totalPaid = ar.payments.reduce((sum, p) => sum + p.amount, 0);
                const balance = ar.amount - totalPaid;
                return (
                  <tr key={ar.id} className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{getDebtorName(ar.debtorId)}</td>
                    <td className="px-6 py-4">{ar.date}</td>
                    <td className="px-6 py-4">{ar.concept}</td>
                    <td className="px-6 py-4">{formatNumber(ar.amount, { style: 'currency', currencySymbol: getCurrencySymbol(ar.currencyCode) })}</td>
                    <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-300">{formatNumber(balance, { style: 'currency', currencySymbol: getCurrencySymbol(ar.currencyCode) })}</td>
                    <td className="px-6 py-4">{ar.dueDate || t('ar_no_due_date', 'N/A')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[ar.status]}`}>
                        {getARStatusLabel(ar.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {ar.status !== 'Paid' && (
                          <button onClick={() => { setEditingAR(ar); setIsAddARModalOpen(true); }} className="text-gray-400 hover:text-indigo-600 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><Edit size={16} /></button>
                        )}
                        <button onClick={() => { if (window.confirm(t('ar_delete_ar_confirm', '¿Está seguro de eliminar esta cuenta por cobrar?'))) deleteAccountReceivable(ar.id); }} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredARs.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">{t('ar_no_ar_found', 'No hay cuentas por cobrar pendientes con los filtros actuales.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddDebtorModal
        isOpen={isAddDebtorModalOpen}
        onClose={() => { setIsAddDebtorModalOpen(false); setEditingDebtor(null); }}
        onSave={(debtor) => { if (editingDebtor) updateDebtor(debtor); else addDebtor(debtor); }}
        debtor={editingDebtor}
      />
      <AddAccountReceivableModal
        isOpen={isAddARModalOpen}
        onClose={() => { setIsAddARModalOpen(false); setEditingAR(null); }}
        onSave={async (arData, loanDetails) => {
          if (editingAR) {
            await updateAccountReceivable({ ...editingAR, ...arData } as AccountReceivable);
          } else {
            await addAccountReceivable(arData, loanDetails);
          }
        }}
        accountReceivable={editingAR}
      />
      <RegisterIncomingPaymentModal
        isOpen={isRegisterPaymentModalOpen}
        onClose={() => setIsRegisterPaymentModalOpen(false)}
      />
    </div>
  );
};

export default AccountsReceivable;