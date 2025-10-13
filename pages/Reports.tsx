
import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import ProfitLossReport from '../components/reports/ProfitLossReport';
import CashFlowReport from '../components/reports/CashFlowReport';
import SalesAnalysisReport from '../components/reports/SalesAnalysisReport';
import ExpenseReport from '../components/reports/ExpenseReport';
import BudgetVsActualReport from '../components/reports/BudgetVsActualReport';

type ReportTab = 'pl' | 'cashflow' | 'sales' | 'expenses' | 'budget';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<ReportTab>('pl');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [reportingCurrency, setReportingCurrency] = useState(state.currencies[0]?.code || 'USD');
  
  const tabs: { id: ReportTab, label: string }[] = [
    { id: 'pl', label: t('reports_tab_pl') },
    { id: 'cashflow', label: t('reports_tab_cash_flow') },
    { id: 'sales', label: t('reports_tab_sales') },
    { id: 'expenses', label: 'Control de Egresos' },
    { id: 'budget', label: t('reports_tab_budget') },
  ];

  const renderActiveReport = () => {
    const props = { startDate, endDate, reportingCurrency };
    switch (activeTab) {
      case 'pl': return <ProfitLossReport {...props} />;
      case 'cashflow': return <CashFlowReport {...props} />;
      case 'sales': return <SalesAnalysisReport {...props} />;
      case 'expenses': return <ExpenseReport {...props} />;
      case 'budget': return <BudgetVsActualReport {...props} />;
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
           <div>
            <label htmlFor="reporting-currency" className="block text-sm font-medium text-gray-400 mb-1">{t('reports_reporting_currency')}</label>
            <select id="reporting-currency" value={reportingCurrency} onChange={e => setReportingCurrency(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {state.currencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
          </div>
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
