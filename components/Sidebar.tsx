
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Coins, Receipt, Landmark, DollarSign, FileText, ClipboardList, TrendingUp, Sun, Moon } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';

const Sidebar: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { state, toggleTheme } = useAppContext();

  const navItems = [
    { path: '/dashboard', label: t('sidebar_dashboard'), icon: LayoutDashboard },
    { path: '/daily-cash', label: t('sidebar_daily_cash'), icon: Coins },
    { path: '/daily-sales', label: t('sidebar_daily_sales'), icon: DollarSign },
    { path: '/accounts-payable', label: t('sidebar_accounts_payable'), icon: Receipt },
    { path: '/accounts-receivable', label: t('sidebar_accounts_receivable', 'Cuentas por Cobrar'), icon: TrendingUp },
    { path: '/banks', label: t('sidebar_banks'), icon: Landmark },
    { path: '/reports', label: t('sidebar_reports'), icon: FileText },
    { path: '/planning', label: t('sidebar_planning'), icon: ClipboardList },
    { path: '/configuration', label: t('sidebar_configuration'), icon: Settings },
  ];

  const linkClasses = "flex items-center px-4 py-3 text-gray-500 dark:text-gray-300 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm dark:shadow-md";

  return (
    <aside className="w-64 bg-gray-50 dark:bg-gray-800 p-4 flex flex-col border-r border-gray-200 dark:border-gray-700 print:hidden transition-colors duration-300">
      <div className="flex items-center mb-8">
        <div className="bg-indigo-500 p-2 rounded-lg mr-3">
          <DollarSign className="text-white" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">RestoFin</h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : 'hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-white'}`}
          >
            <item.icon className="mr-3" size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="flex justify-center mb-6">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300"
          >
            {state.theme === 'dark' ? (
              <><Sun size={18} className="text-yellow-400" /> <span className="text-sm font-medium">{t('theme_toggle_light')}</span></>
            ) : (
              <><Moon size={18} className="text-indigo-600" /> <span className="text-sm font-medium">{t('theme_toggle_dark')}</span></>
            )}
          </button>
        </div>
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setLanguage('es')}
            aria-pressed={language === 'es'}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'es' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            ES
          </button>
          <button
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            EN
          </button>
        </div>
        <div className="text-center text-gray-500 text-xs">
          <p>&copy; {new Date().getFullYear()} RestoFin Inc.</p>
          <p>{t('sidebar_footer_subtitle')}</p>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">Developed by Marketing Gastronómico</p>
            <img src="/images/MG_logo_2024_FO.png" alt="Marketing Gastronómico Logo" className="w-1/2 mx-auto mt-2" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
