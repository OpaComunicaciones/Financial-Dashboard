import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { Invoice, InvoicePayment, InvoiceStatus } from '../types';
import AddInvoiceModal from '../components/AddInvoiceModal';
import EditInvoiceModal from '../components/EditInvoiceModal';
import PayInvoiceModal from '../components/PayInvoiceModal';
import Card from '../components/Card';
import { formatNumber } from '../utils/formatting';
import TaxDeclarationPanel from '../components/TaxDeclarationPanel';

const statusStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-green-500/20 text-green-400',
  Pending: 'bg-yellow-500/20 text-yellow-400',
  Overdue: 'bg-red-500/20 text-red-400',
  'Partially Paid': 'bg-blue-500/20 text-blue-400',
};

type FilterStatus = InvoiceStatus | 'All';

const AccountsPayable: React.FC = () => {
  const { t } = useTranslation();
  const { state, addInvoice, updateInvoice, deleteInvoice, payInvoice } = useAppContext();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('All');
  
  const statusTranslation: Record<InvoiceStatus, string> = {
    Pending: t('accounts_payable_status_pending'),
    Paid: t('accounts_payable_status_paid'),
    Overdue: t('accounts_payable_status_overdue'),
    'Partially Paid': t('accounts_payable_status_partially_paid'),
  };

  const handleAdd = (invoice: Omit<Invoice, 'id' | 'status' | 'payments'>) => {
    addInvoice(invoice);
    setIsAddModalOpen(false);
  };

  const handleEdit = (invoice: Invoice) => {
    updateInvoice(invoice);
    setIsEditModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('accounts_payable_delete_confirm'))) {
      deleteInvoice(id);
    }
  };

  const handlePay = (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => {
    payInvoice(invoiceId, payment);
    setIsPayModalOpen(false);
  };

  const openEditModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditModalOpen(true);
  };

  const openPayModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPayModalOpen(true);
  };

  const getInvoiceStatus = (invoice: Invoice): InvoiceStatus => {
      const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid >= invoice.amount - 0.001) return 'Paid'; // Tolerance for float issues
      if (totalPaid > 0) return 'Partially Paid';
      if (new Date(invoice.dueDate) < new Date()) return 'Overdue';
      return 'Pending';
  }

  const filteredInvoices = useMemo(() => {
    let invoices = state.invoices.map(inv => ({...inv, status: getInvoiceStatus(inv)}));
    if (filter !== 'All') {
      invoices = invoices.filter(invoice => invoice.status === filter);
    }
    return invoices.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.invoices, filter]);
  
  const pendingDebtByCurrency = useMemo(() => {
    return state.invoices
      .filter(inv => getInvoiceStatus(inv) !== 'Paid')
      .reduce((acc, inv) => {
        const totalPaid = (inv.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const remaining = inv.amount - totalPaid;
        if (!acc[inv.currencyCode]) {
          acc[inv.currencyCode] = 0;
        }
        acc[inv.currencyCode] += remaining;
        return acc;
      }, {} as Record<string, number>);
  }, [state.invoices]);

  const getCurrencySymbol = (code: string) => {
    return state.currencies.find(c => c.code === code)?.symbol || '$';
  }

  const getConceptName = (conceptId: string) => {
      return state.expenseTypes.find(c => c.id === conceptId)?.name || conceptId;
  }

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: t('accounts_payable_filter_all'), value: 'All' },
    { label: t('accounts_payable_status_pending'), value: 'Pending' },
    { label: t('accounts_payable_status_partially_paid'), value: 'Partially Paid' },
    { label: t('accounts_payable_status_paid'), value: 'Paid' },
    { label: t('accounts_payable_status_overdue'), value: 'Overdue' },
  ];

  return (
    <div className="space-y-8">
      <AddInvoiceModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleAdd} 
      />
      <EditInvoiceModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEdit}
        invoice={selectedInvoice}
      />
      <PayInvoiceModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handlePay}
        invoice={selectedInvoice}
      />

      <div className="flex justify-between items-center">
        <PageHeader title={t('accounts_payable_title')} subtitle={t('accounts_payable_subtitle')} />
        <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center gap-2">
            <Plus size={18} />
            {t('accounts_payable_add_button')}
        </button>
      </div>

      <TaxDeclarationPanel />
      
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">{t('accounts_payable_debt_by_currency')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Object.entries(pendingDebtByCurrency).map(([code, total]) => (
            <Card 
              key={code}
              title={`${t('accounts_payable_total_debt')} (${code})`} 
              value={formatNumber(total, { style: 'currency', currencySymbol: getCurrencySymbol(code) })}
              icon={<AlertTriangle />} 
            />
          ))}
          {Object.keys(pendingDebtByCurrency).length === 0 && (
            <p className="text-gray-400">{t('accounts_payable_no_debt')}</p>
          )}
        </div>
      </div>


      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-4 flex items-center gap-2 border-b border-gray-700 overflow-x-auto">
          {filterButtons.map(({ label, value }) => (
             <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${filter === value ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
             >
                {label}
             </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">{t('accounts_payable_col_supplier')}</th>
                <th scope="col" className="px-6 py-3">{t('daily_cash_col_concept')}</th>
                <th scope="col" className="px-6 py-3">{t('accounts_payable_col_amount')}</th>
                <th scope="col" className="px-6 py-3">{t('accounts_payable_col_due_date')}</th>
                <th scope="col" className="px-6 py-3">{t('accounts_payable_col_status')}</th>
                <th scope="col" className="px-6 py-3 text-center">{t('accounts_payable_col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                  const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
                  const remaining = invoice.amount - totalPaid;
                  return (
                    <tr key={invoice.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-white">{invoice.supplier}<br/><span className='text-xs text-gray-400'>#{invoice.invoiceNumber}</span></td>
                      <td className="px-6 py-4">{getConceptName(invoice.conceptId)}</td>
                      <td className="px-6 py-4 font-mono">
                        <div>{formatNumber(invoice.amount, { style: 'currency', currencySymbol: getCurrencySymbol(invoice.currencyCode) })}</div>
                        {invoice.status === 'Partially Paid' && (
                            <div className='text-xs text-blue-400'>{t('accounts_payable_remaining_balance')}: {formatNumber(remaining, { style: 'currency', currencySymbol: getCurrencySymbol(invoice.currencyCode) })}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">{invoice.dueDate}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[invoice.status]}`}>
                          {statusTranslation[invoice.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className='flex items-center justify-center gap-2'>
                            {invoice.status !== 'Paid' && (
                                <button onClick={() => openPayModal(invoice)} className="font-medium text-green-400 hover:text-green-300 flex items-center gap-1 p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20">
                                    <CheckCircle size={16} /> {t('accounts_payable_action_pay')}
                                </button>
                            )}
                            <button onClick={() => openEditModal(invoice)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(invoice.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
              })}
               {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">{t('accounts_payable_no_invoices')}</td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountsPayable;