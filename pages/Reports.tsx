
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

type ReportTab = 'pl' | 'cashflow' | 'sales' | 'expenses' | 'budget' | 'bankStatement';

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
  
  if (state.currencies.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('reports_title')} subtitle={t('reports_subtitle')} />
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center">
          <p className="text-lg text-gray-300">Por favor, configure al menos una moneda en la página de Configuración para poder generar informes.</p>
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
  ];

  const renderActiveReport = () => {
    const props = { startDate, endDate, reportingCurrency };
    switch (activeTab) {
      case 'pl': return <ProfitLossReport {...props} />;
      case 'cashflow': return <CashFlowReport {...props} />;
      case 'sales': return <SalesAnalysisReport {...props} />;
      case 'expenses': return <ExpenseReport {...props} />;
      case 'budget': return <BudgetVsActualReport {...props} />;
      case 'bankStatement': return <BankStatementReport startDate={startDate} endDate={endDate} accountId={selectedAccountId} />;
      default: return null;
    }
  }

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="print:hidden">
        <PageHeader title={t('reports_title')} subtitle={t('reports_subtitle')} />
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 print:hidden">
        <h3 className="text-xl font-semibold text-white mb-4">{t('reports_date_range')}</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-400 mb-1">{t('reports_start_date')}</label>
            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-400 mb-1">{t('reports_end_date')}</label>
            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {activeTab !== 'bankStatement' && (
            <div>
              <label htmlFor="reporting-currency" className="block text-sm font-medium text-gray-400 mb-1">{t('reports_reporting_currency')}</label>
              <select id="reporting-currency" value={reportingCurrency} onChange={e => setReportingCurrency(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {state.currencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
          )}
          {activeTab === 'bankStatement' && (
            <div>
                              <label htmlFor="account-select" className="block text-sm font-medium text-gray-400 mb-1">
                                Seleccionar Cuenta
                              </label>              <select
                id="account-select"
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {state.bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      
       <div className="print:hidden">
        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
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
    </div>
  );
};

export default Reports;
