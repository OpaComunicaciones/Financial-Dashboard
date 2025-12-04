
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import DailyCash from './pages/DailyCash';
import AccountsPayable from './pages/AccountsPayable';
import AccountsReceivable from './pages/AccountsReceivable';
import Banks from './pages/Banks';
import DailySales from './pages/DailySales';
import Reports from './pages/Reports';
import Planning from './pages/Planning';
import { LanguageProvider } from './i18n/i18n';
import { AppProvider } from './context/AppContext';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppProvider>
        <HashRouter>
          <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/configuration" element={<Configuration />} />
                <Route path="/daily-cash" element={<DailyCash />} />
                <Route path="/accounts-payable" element={<AccountsPayable />} />
                <Route path="/accounts-receivable" element={<AccountsReceivable />} />
                <Route path="/banks" element={<Banks />} />
                <Route path="/daily-sales" element={<DailySales />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/planning" element={<Planning />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </AppProvider>
    </LanguageProvider>
  );
};

export default App;
