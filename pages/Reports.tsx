
import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import ProfitLossReport from '../components/reports/ProfitLossReport';
import CashFlowReport from '../components/reports/CashFlowReport';
import SalesAnalysisReport from '../components/reports/SalesAnalysisReport';
import ExpenseReport from '../components/reports/ExpenseReport';
import BudgetVsActualReport from '../components/reports/BudgetVsActualReport';
import BankStatementReport from '../components/reports/BankStatementReport';

import CashReport from '../components/reports/CashReport';
import AccountsPayableReport from '../components/reports/AccountsPayableReport';
import { InvoiceStatus } from '../types';

type ReportTab = 'pl' | 'cashflow' | 'sales' | 'expenses' | 'budget' | 'bankStatement' | 'cash' | 'ap';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<ReportTab>('pl');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [reportingCurrency, setReportingCurrency] = useState(state.currencies[0]?.code || '');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(state.bankAccounts[0]?.id || '');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'All'>('All');

  const uniqueSuppliers = React.useMemo(() => {
    const supplierSet = new Set(state.invoices.map(inv => inv.supplier));
    return Array.from(supplierSet).sort();
  }, [state.invoices]);

  if (state.currencies.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('reports_title')} subtitle={t('reports_subtitle')} />
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center shadow-sm">
          <p className="text-lg text-gray-600 dark:text-gray-300">Por favor, configure al menos una moneda en la página de Configuración para poder generar informes.</p>
        </div>
      </div>
    );
  }


  const tabs: { id: ReportTab, label: string }[] = [
    { id: 'pl', label: t('reports_tab_pl') },
    { id: 'cashflow', label: t('reports_tab_cash_flow') },
    { id: 'sales', label: t('reports_tab_sales') },
    { id: 'expenses', label: 'Control de Egresos' },
    { id: 'budget', label: t('reports_tab_budget') },
    { id: 'bankStatement', label: 'Informe de Bancos' },
    { id: 'cash', label: t('reports_tab_cash') },
    { id: 'ap', label: t('reports_tab_ap') },
  ];

  const renderActiveReport = () => {
    const props = { startDate, endDate, reportingCurrency };
    switch (activeTab) {
      case 'pl': return <ProfitLossReport {...props} />;
      case 'cashflow': return <CashFlowReport {...props} />;
      case 'sales': return <SalesAnalysisReport {...props} />;
      case 'expenses': return <ExpenseReport {...props} />;
      case 'budget': return <BudgetVsActualReport {...props} />;
      case 'bankStatement': return <BankStatementReport startDate={startDate} endDate={endDate} accountId={selectedAccountId} conceptId={selectedConceptId} />;
      case 'cash': return <CashReport startDate={startDate} endDate={endDate} reportingCurrency={reportingCurrency} conceptId={selectedConceptId} />;
      case 'ap': return <AccountsPayableReport startDate={startDate} endDate={endDate} supplier={selectedSupplier} conceptId={selectedConceptId} status={selectedStatus} />;
      default: return null;
    }
  }

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="print:hidden">
        <PageHeader title={t('reports_title')} subtitle={t('reports_subtitle')} />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm print:hidden">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('reports_date_range')}</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports_start_date')}</label>
            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports_end_date')}</label>
            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          </div>
          {activeTab !== 'bankStatement' && (
            <div>
              <label htmlFor="reporting-currency" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports_reporting_currency')}</label>
              <select id="reporting-currency" value={reportingCurrency} onChange={e => setReportingCurrency(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
                {state.currencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
          )}
          {activeTab === 'bankStatement' && (
            <div>
              <label htmlFor="account-select" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Seleccionar Cuenta
              </label>              <select
                id="account-select"
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {state.bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
          )}
          {(activeTab === 'bankStatement' || activeTab === 'cash' || activeTab === 'ap') && (
            <div>
              <label htmlFor="concept-filter" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('daily_cash_col_concept')}</label>
              <select
                id="concept-filter"
                value={selectedConceptId}
                onChange={(e) => setSelectedConceptId(e.target.value)}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[200px]"
              >
                <option value="all">{t('accounts_payable_filter_all_concepts')}</option>
                <optgroup label={t('reports_income_header')}>
                  {state.incomeTypes.filter(it => it.isIncome).map(it => (
                    <option key={it.id} value={it.id}>{it.name}</option>
                  ))}
                </optgroup>
                <optgroup label={t('reports_expenses_header')}>
                  {state.expenseTypes.filter(et => et.isExpense).map(et => (
                    <option key={et.id} value={et.id}>{et.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}
          {activeTab === 'ap' && (
            <>
              <div>
                <label htmlFor="supplier-select" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('accounts_payable_col_supplier')}</label>
                <select
                  id="supplier-select"
                  value={selectedSupplier}
                  onChange={e => setSelectedSupplier(e.target.value)}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[150px]"
                >
                  <option value="All">{t('accounts_payable_filter_all_suppliers')}</option>
                  {uniqueSuppliers.map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="status-select" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('accounts_payable_col_status')}</label>
                <select
                  id="status-select"
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as InvoiceStatus | 'All')}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                  <option value="All">{t('accounts_payable_filter_all')}</option>
                  <option value="Pending">{t('accounts_payable_status_pending')}</option>
                  <option value="Partially Paid">{t('accounts_payable_status_partially_paid')}</option>
                  <option value="Paid">{t('accounts_payable_status_paid')}</option>
                  <option value="Overdue">{t('accounts_payable_status_overdue')}</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="print:hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div>
        {renderActiveReport()}
      </div>
    </div >
  );
};

export default Reports;
