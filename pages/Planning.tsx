
import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { ConfigItem } from '../types';
import { Copy } from 'lucide-react';

import { formatNumber } from '../utils/formatting';

const EditableBudgetCell: React.FC<{
  value: number;
  onSave: (newValue: string) => void;
}> = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value.toString());

  const handleSave = () => {
    onSave(currentValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setCurrentValue(value.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="number"
        value={currentValue}
        onChange={e => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-24 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-1 text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        placeholder="0.00"
        autoFocus
      />
    );
  }

  return (
    <div
      className="w-24 h-8 flex items-center justify-center rounded p-1 text-center cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      onClick={() => setIsEditing(true)}
    >
      {formatNumber(value, { forceDecimals: true })}
    </div>
  );
};

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
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300 border-collapse">
          <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="sticky left-0 bg-gray-100 dark:bg-gray-700 px-4 py-3 border border-gray-200 dark:border-gray-600 z-10">{t('planning_category')}</th>
              {monthNames.map(month => (
                <th key={month} className="px-4 py-3 border border-gray-200 dark:border-gray-600 text-center">{month}</th>
              ))}
              <th className="px-4 py-3 border border-gray-200 dark:border-gray-600 text-center">{t('planning_actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {categories.map(category => (
              <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-4 py-2 font-medium border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">{category.name}</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const budget = state.budgetRecords.find(b => b.year === selectedYear && b.month === month && b.categoryId === category.id);
                  return (
                    <td key={month} className="px-1 py-1 border border-gray-200 dark:border-gray-600">
                      <EditableBudgetCell
                        value={budget?.amount || 0}
                        onSave={(newValue) => handleBudgetChange(month, category.id, newValue)}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center">
                  <button
                    onClick={() => handleApplyToYear(category.id)}
                    title={t('planning_apply_all_year')}
                    className="p-2 text-gray-400 hover:text-indigo-400"
                  >
                    <Copy size={16} />
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

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4">
          <label htmlFor="year-select" className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('planning_year_select')}</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
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
