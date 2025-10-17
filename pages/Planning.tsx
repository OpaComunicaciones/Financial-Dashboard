
import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { ConfigItem } from '../types';
import { Copy } from 'lucide-react';

type BudgetTableProps = {
  title: string;
  categories: ConfigItem[];
  categoryType: 'income' | 'expense';
  selectedYear: number;
};

const BudgetTable: React.FC<BudgetTableProps> = ({ title, categories, categoryType, selectedYear }) => {
  const { t, language } = useTranslation();
  const { state, setBudgetRecord, setYearlyBudgetForCategory } = useAppContext();

  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => 
    new Date(0, i).toLocaleString(language, { month: 'short' })
  ), [language]);

  const handleBudgetChange = (month: number, categoryId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setBudgetRecord({
      year: selectedYear,
      month,
      categoryId,
      categoryType,
      amount
    });
  };

  const handleApplyToYear = (categoryId: string) => {
    const januaryBudget = state.budgetRecords.find(b => b.year === selectedYear && b.month === 1 && b.categoryId === categoryId);
    const amount = januaryBudget?.amount || 0;
    if (window.confirm(`${t('planning_apply_confirm')} ${amount.toFixed(2)}`)) {
        setYearlyBudgetForCategory({ year: selectedYear, categoryId, categoryType, amount });
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300 border-collapse">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
            <tr>
              <th className="sticky left-0 bg-gray-700 px-4 py-3 border border-gray-600 z-10">{t('planning_category')}</th>
              {monthNames.map(month => (
                <th key={month} className="px-4 py-3 border border-gray-600 text-center">{month}</th>
              ))}
              <th className="px-4 py-3 border border-gray-600 text-center">{t('planning_actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {categories.map(category => (
              <tr key={category.id} className="hover:bg-gray-700/50">
                <td className="sticky left-0 bg-gray-800 hover:bg-gray-700/50 px-4 py-2 font-medium border border-gray-600">{category.name}</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const budget = state.budgetRecords.find(b => b.year === selectedYear && b.month === month && b.categoryId === category.id);
                  return (
                    <td key={month} className="px-1 py-1 border border-gray-600">
                      <input 
                        type="number"
                        defaultValue={budget?.amount || ''}
                        onBlur={e => handleBudgetChange(month, category.id, e.target.value)}
                        className="w-24 bg-gray-600 rounded p-1 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 border border-gray-600 text-center">
                    <button 
                        onClick={() => handleApplyToYear(category.id)} 
                        title={t('planning_apply_all_year')}
                        className="p-2 text-gray-400 hover:text-indigo-400"
                    >
                        <Copy size={16}/>
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Planning: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useAppContext();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  return (
    <div className="space-y-8">
      <PageHeader title={t('planning_title')} subtitle={t('planning_subtitle')} />
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center gap-4">
          <label htmlFor="year-select" className="text-lg font-medium text-gray-300">{t('planning_year_select')}</label>
          <select 
            id="year-select" 
            value={selectedYear} 
            onChange={e => setSelectedYear(parseInt(e.target.value))} 
            className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <BudgetTable 
        title={t('planning_income_budget')}
        categories={state.incomeTypes.filter(c => c.isPlannable)}
        categoryType="income"
        selectedYear={selectedYear}
      />
      <BudgetTable 
        title={t('planning_expense_budget')}
        categories={state.expenseTypes.filter(c => c.isPlannable)}
        categoryType="expense"
        selectedYear={selectedYear}
      />
    </div>
  );
};

export default Planning;
