
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Coins, Receipt, Landmark, DollarSign, FileText, ClipboardList } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';

const Sidebar: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();

  const navItems = [
    { path: '/dashboard', label: t('sidebar_dashboard'), icon: LayoutDashboard },
    { path: '/daily-cash', label: t('sidebar_daily_cash'), icon: Coins },
    { path: '/daily-sales', label: t('sidebar_daily_sales'), icon: DollarSign },
    { path: '/accounts-payable', label: t('sidebar_accounts_payable'), icon: Receipt },
    { path: '/banks', label: t('sidebar_banks'), icon: Landmark },
    { path: '/reports', label: t('sidebar_reports'), icon: FileText },
    { path: '/planning', label: t('sidebar_planning'), icon: ClipboardList },
    { path: '/configuration', label: t('sidebar_configuration'), icon: Settings },
  ];
  
  const linkClasses = "flex items-center px-4 py-3 text-gray-300 rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-gray-700 text-white shadow-md";
  
  return (
    <aside className="w-64 bg-gray-800 p-4 flex flex-col border-r border-gray-700 print:hidden">
      <div className="flex items-center mb-8">
         <div className="bg-indigo-500 p-2 rounded-lg mr-3">
          <DollarSign className="text-white" size={24} />
         </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">RestoFin</h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : 'hover:bg-gray-700 hover:text-white'}`}
          >
            <item.icon className="mr-3" size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setLanguage('es')}
            aria-pressed={language === 'es'}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'es' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            ES
          </button>
          <button
            onClick={() => setLanguage('en')}
            aria-pressed={language === 'en'}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            EN
          </button>
        </div>
        <div className="text-center text-gray-500 text-xs">
          <p>&copy; {new Date().getFullYear()} RestoFin Inc.</p>
          <p>{t('sidebar_footer_subtitle')}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
