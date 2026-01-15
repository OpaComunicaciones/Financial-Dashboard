import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { Plus, FileText, CheckCircle, Edit, Trash2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { Invoice, InvoicePayment, InvoiceStatus } from '../types';
import AddInvoiceModal from '../components/AddInvoiceModal';
import EditInvoiceModal from '../components/EditInvoiceModal';
import PayInvoiceModal from '../components/PayInvoiceModal';
import Card from '../components/Card';
import { formatNumber, getCurrencySymbol } from '../utils/formatting';
import TaxDeclarationPanel from '../components/TaxDeclarationPanel';
import * as XLSX from 'xlsx';

const statusStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  Pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  Overdue: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  'Partially Paid': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
};

type FilterStatus = InvoiceStatus | 'All';

const AccountsPayable: React.FC = () => {
  const { t } = useTranslation();
  const { state, addInvoice, updateInvoice, deleteInvoice, payInvoice, deleteInvoicePayment } = useAppContext();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [conceptFilter, setConceptFilter] = useState<string>('All');
  const [supplierFilter, setSupplierFilter] = useState<string>('All');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

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

  const handleDeletePayment = async (invoiceId: string, paymentId: string) => {
    if (window.confirm(t('accounts_payable_delete_payment_confirm', '¿Estás seguro de que deseas eliminar este abono? El movimiento asociado desaparecerá también.'))) {
      await deleteInvoicePayment(invoiceId, paymentId);
    }
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

  const uniqueSuppliers = useMemo(() => {
    const supplierSet = new Set(state.invoices.map(inv => inv.supplier));
    return Array.from(supplierSet).sort();
  }, [state.invoices]);

  const filteredInvoices = useMemo(() => {
    let invoices = state.invoices.map(inv => ({ ...inv, status: getInvoiceStatus(inv) }));

    // Status filter
    if (filter !== 'All') {
      invoices = invoices.filter(invoice => invoice.status === filter);
    }

    // Date range filter
    if (startDate && endDate) {
      invoices = invoices.filter(invoice => invoice.date >= startDate && invoice.date <= endDate);
    }

    // Concept filter
    if (conceptFilter !== 'All') {
      invoices = invoices.filter(invoice => invoice.conceptId === conceptFilter);
    }

    // Supplier filter
    if (supplierFilter !== 'All') {
      invoices = invoices.filter(invoice => invoice.supplier === supplierFilter);
    }

    return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.invoices, filter, startDate, endDate, conceptFilter, supplierFilter]);

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

  const getConceptName = (conceptId: string) => {
    return state.expenseTypes.find(c => c.id === conceptId)?.name || conceptId;
  }

  const exportToExcel = () => {
    const data = filteredInvoices.map(inv => ({
      [t('accounts_payable_col_supplier')]: inv.supplier,
      [t('accounts_payable_col_invoice')]: inv.invoiceNumber,
      [t('accounts_payable_col_date')]: inv.date,
      [t('accounts_payable_col_concept')]: getConceptName(inv.conceptId),
      [t('accounts_payable_col_amount')]: inv.amount,
      [t('accounts_payable_col_currency')]: inv.currencyCode,
      [t('accounts_payable_col_due_date')]: inv.dueDate,
      [t('accounts_payable_col_status')]: statusTranslation[inv.status]
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accounts Payable");
    XLSX.writeFile(wb, "Accounts_Payable_Report.xlsx");
  };

  return (
    <div className='grow space-y-6'>
      <PageHeader
        title={t('accounts_payable_title')}
        subtitle={t('accounts_payable_subtitle')}
      />

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Object.entries(pendingDebtByCurrency).map(([currency, amount]) => (
          <Card key={currency} title={`${t('accounts_payable_total_debt')} (${currency})`}>
            <div className='text-2xl font-bold text-indigo-600 dark:text-indigo-400'>
              {formatNumber(amount, { style: 'currency', currencySymbol: getCurrencySymbol(currency) })}
            </div>
          </Card>
        ))}
        {Object.keys(pendingDebtByCurrency).length === 0 && (
          <Card title={t('accounts_payable_total_debt')}>
            <div className='text-gray-500 italic'>{t('accounts_payable_no_debt')}</div>
          </Card>
        )}
      </div>

      {/* Filter and Reports Panel */}
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
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>{t('accounts_payable_col_status')}</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterStatus)}
                className="block px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="All">{t('accounts_payable_filter_all')}</option>
                <option value="Pending">{t('accounts_payable_status_pending')}</option>
                <option value="Partially Paid">{t('accounts_payable_status_partially_paid')}</option>
                <option value="Paid">{t('accounts_payable_status_paid')}</option>
                <option value="Overdue">{t('accounts_payable_status_overdue')}</option>
              </select>
            </div>

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>{t('daily_cash_col_concept')}</label>
              <select
                value={conceptFilter}
                onChange={(e) => setConceptFilter(e.target.value)}
                className="block px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="All">{t('accounts_payable_filter_all_concepts')}</option>
                {state.expenseTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>{t('accounts_payable_col_supplier')}</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="block px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="All">{t('accounts_payable_filter_all_suppliers')}</option>
                {uniqueSuppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex items-center gap-2 mt-auto'>
            <button
              onClick={exportToExcel}
              className='flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors'
            >
              <FileText size={18} />
              Excel
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className='flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors'
            >
              <Plus size={18} />
              {t('accounts_payable_add_button')}
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse'>
            <thead>
              <tr className='bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700'>
                <th scope="col" className="px-6 py-3">{t('accounts_payable_col_supplier')}</th>
                <th scope="col" className="px-6 py-3">{t('accounts_payable_col_issue_date', 'Fecha Emisión')}</th>
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
                const isExpanded = expandedInvoiceId === invoice.id;
                return (
                  <React.Fragment key={invoice.id}>
                    <tr className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice.id)}>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <div className='flex items-center gap-2'>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {invoice.supplier}
                        </div>
                        <span className='text-xs text-gray-500 dark:text-gray-400 font-normal ml-6'>#{invoice.invoiceNumber}</span>
                      </td>
                      <td className="px-6 py-4">{invoice.date}</td>
                      <td className="px-6 py-4">{getConceptName(invoice.conceptId)}</td>
                      <td className="px-6 py-4 font-mono">
                        <div>{formatNumber(invoice.amount, { style: 'currency', currencySymbol: getCurrencySymbol(invoice.currencyCode) })}</div>
                        {invoice.status === 'Partially Paid' && (
                          <div className='text-xs text-blue-600 dark:text-blue-400 font-semibold'>{t('accounts_payable_remaining_balance')}: {formatNumber(remaining, { style: 'currency', currencySymbol: getCurrencySymbol(invoice.currencyCode) })}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">{invoice.dueDate}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[invoice.status]}`}>
                          {statusTranslation[invoice.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className='flex items-center justify-center gap-2'>
                          {invoice.status !== 'Paid' && (
                            <button onClick={() => openPayModal(invoice)} className="font-semibold text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex items-center gap-1 p-2 rounded-lg bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
                              <CheckCircle size={16} /> {t('accounts_payable_action_pay')}
                            </button>
                          )}
                          <button onClick={() => openEditModal(invoice)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(invoice.id)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-gray-900/40">
                        <td colSpan={7} className="px-12 py-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('accounts_payable_payments_history', 'Historial de Pagos')}</h4>
                            {(!invoice.payments || invoice.payments.length === 0) ? (
                              <p className="text-sm text-gray-500 italic">{t('accounts_payable_no_payments', 'No hay pagos registrados para esta factura.')}</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invoice.payments.map((payment) => (
                                  <div key={payment.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatNumber(payment.amount, { style: 'currency', currencySymbol: getCurrencySymbol(invoice.currencyCode) })}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{payment.paymentDate} • {payment.method === 'cash' ? t('daily_cash_title') : t('banks_title')}</p>
                                    </div>
                                    <button
                                      onClick={() => handleDeletePayment(invoice.id, payment.id)}
                                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 transition-colors"
                                      title={t('accounts_payable_delete_payment_tooltip', 'Eliminar abono')}
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
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center text-gray-400 italic'>
                    {t('accounts_payable_no_invoices')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddInvoiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAdd}
      />

      <EditInvoiceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        invoice={selectedInvoice}
        onSave={handleEdit}
      />

      <PayInvoiceModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        invoice={selectedInvoice}
        onConfirm={handlePay}
      />
    </div>
  );
};

export default AccountsPayable;
