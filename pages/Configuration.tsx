import React, { useState, useRef, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { Plus, Trash2, Edit, Upload, Download, Save, X, Settings2, Landmark, LineChart, Repeat } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { ConfigItem, Currency, Denomination, BankAccount, IPCRecord, ExchangeRate, ExpenseType, IncomeType, Tax, TaxPaymentFrequency } from '../types';


type ConfigCategory = 'paymentMethods';

const IncomeTypeManagement: React.FC = () => {
  const { t } = useTranslation();
  const { state, addIncomeType, updateIncomeType, deleteConfigItem } = useAppContext();
  const [newItem, setNewItem] = useState({ name: '', isIncome: true, isPlannable: true });
  const [editingItem, setEditingItem] = useState<IncomeType | null>(null);

  const handleAdd = () => {
    if (newItem.name.trim()) {
      addIncomeType(newItem.name.trim(), newItem.isIncome, newItem.isPlannable);
      setNewItem({ name: '', isIncome: true, isPlannable: true });
    }
  };

  const handleUpdate = () => {
    if (editingItem && editingItem.name.trim()) {
      updateIncomeType(editingItem.id, editingItem.name.trim(), editingItem.isIncome, editingItem.isPlannable || false);
      setEditingItem(null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteConfigItem('incomeTypes', id);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">{t('configuration_income_types')}</h3>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          placeholder={`${t('configuration_new')} ${t('configuration_income_types').slice(0, -1)}...`}
          className="flex-grow bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center justify-center gap-2 bg-gray-700 px-3 rounded-md">
            <label className="text-sm text-gray-300" htmlFor="isIncome">{t('configuration_expense_is_for_pl')}</label>
            <input type="checkbox" id="isIncome" checked={newItem.isIncome} onChange={(e) => setNewItem({ ...newItem, isIncome: e.target.checked })} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
        </div>
        <div className="flex items-center justify-center gap-2 bg-gray-700 px-3 rounded-md">
            <label className="text-sm text-gray-300" htmlFor="isPlannable">{t('configuration_is_plannable', 'Is Plannable?')}</label>
            <input type="checkbox" id="isPlannable" checked={newItem.isPlannable} onChange={(e) => setNewItem({ ...newItem, isPlannable: e.target.checked })} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
        </div>
        <button onClick={handleAdd} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center">
          <Plus size={18} className="mr-1" /> {t('configuration_add_button')}
        </button>
      </div>
      <ul className="space-y-2">
        {state.incomeTypes.map(item => (
          <li key={item.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
            {editingItem?.id === item.id ? (
              <div className="flex-grow flex items-center gap-2">
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="flex-grow bg-gray-600 border border-gray-500 rounded-md py-1 px-2"
                  autoFocus
                />
                 <div className="flex items-center gap-1">
                    <label htmlFor="isIncomeEdit" className="text-xs">{t('configuration_income_pl_badge')}</label>
                    <input id="isIncomeEdit" type="checkbox" checked={editingItem.isIncome} onChange={(e) => setEditingItem({ ...editingItem, isIncome: e.target.checked })} className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
                 </div>
                 <div className="flex items-center gap-1">
                    <label htmlFor="isPlannableEdit" className="text-xs">{t('configuration_is_plannable', 'Plannable')}</label>
                    <input id="isPlannableEdit" type="checkbox" checked={editingItem.isPlannable} onChange={(e) => setEditingItem({ ...editingItem, isPlannable: e.target.checked })} className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
                 </div>
                <button onClick={handleUpdate} className="text-green-400 hover:text-green-300"><Save size={18} /></button>
                <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span>{item.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.isIncome ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-300'}`}>
                    {item.isIncome ? t('configuration_income_pl_badge') : t('configuration_income_non_pl_badge')}
                  </span>
                  {item.isPlannable && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-300`}>
                      {t('configuration_is_plannable_badge', 'Plannable')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingItem(item)} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ConfigSection: React.FC<{ 
  title: string; 
  items: ConfigItem[]; 
  onAdd: (name: string) => void; 
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string) => void;
}> = ({ title, items, onAdd, onDelete, onUpdate }) => {
  const { t } = useTranslation();
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };
  
  const handleEditStart = (item: ConfigItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleEditSave = () => {
    if (editingId && editingName.trim()) {
      onUpdate(editingId, editingName.trim());
      handleEditCancel();
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`${t('configuration_new')} ${title.slice(0, -1)}...`}
          className="flex-grow bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={handleAdd} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center">
          <Plus size={18} className="mr-1" /> {t('configuration_add_button')}
        </button>
      </div>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
            {editingId === item.id ? (
              <div className="flex-grow flex items-center gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-grow bg-gray-600 border border-gray-500 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button onClick={handleEditSave} className="text-green-400 hover:text-green-300"><Save size={18} /></button>
                <button onClick={handleEditCancel} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
            ) : (
              <>
                <span>{item.name}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleEditStart(item)} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ExpenseTypeManagement: React.FC = () => {
  const { t } = useTranslation();
  const { state, addExpenseType, updateExpenseType, deleteConfigItem } = useAppContext();
  const [newItem, setNewItem] = useState({ name: '', isExpense: true, isPlannable: true, isDeductibleFromSales: false });
  const [editingItem, setEditingItem] = useState<ExpenseType | null>(null);

  const handleAdd = () => {
    if (newItem.name.trim()) {
      addExpenseType(newItem.name.trim(), newItem.isExpense, newItem.isPlannable, newItem.isDeductibleFromSales);
      setNewItem({ name: '', isExpense: true, isPlannable: true, isDeductibleFromSales: false });
    }
  };

  const handleUpdate = () => {
    if (editingItem && editingItem.name.trim()) {
      updateExpenseType(editingItem.id, editingItem.name.trim(), editingItem.isExpense, editingItem.isPlannable || false, editingItem.isDeductibleFromSales || false);
      setEditingItem(null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteConfigItem('expenseTypes', id);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">{t('configuration_expense_types')}</h3>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          placeholder={`${t('configuration_new')} ${t('configuration_expense_types').slice(0, -1)}...`}
          className="flex-grow bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center justify-center gap-2 bg-gray-700 px-3 rounded-md">
            <label className="text-sm text-gray-300" htmlFor="isExpense">{t('configuration_expense_is_for_pl')}</label>
            <input type="checkbox" id="isExpense" checked={newItem.isExpense} onChange={(e) => setNewItem({ ...newItem, isExpense: e.target.checked })} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
        </div>
        <div className="flex items-center justify-center gap-2 bg-gray-700 px-3 rounded-md">
            <label className="text-sm text-gray-300" htmlFor="isExpensePlannable">{t('configuration_is_plannable', 'Is Plannable?')}</label>
            <input type="checkbox" id="isExpensePlannable" checked={newItem.isPlannable} onChange={(e) => setNewItem({ ...newItem, isPlannable: e.target.checked })} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
        </div>
        <div className="flex items-center justify-center gap-2 bg-gray-700 px-3 rounded-md">
            <label className="text-sm text-gray-300" htmlFor="isDeductible">{t('configuration_is_deductible_from_sales', 'Deduct from Sales?')}</label>
            <input type="checkbox" id="isDeductible" checked={newItem.isDeductibleFromSales} onChange={(e) => setNewItem({ ...newItem, isDeductibleFromSales: e.target.checked })} className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
        </div>
        <button onClick={handleAdd} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center">
          <Plus size={18} className="mr-1" /> {t('configuration_add_button')}
        </button>
      </div>
      <ul className="space-y-2">
        {state.expenseTypes.map(item => (
          <li key={item.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
            {editingItem?.id === item.id ? (
              <div className="flex-grow flex items-center gap-2">
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="flex-grow bg-gray-600 border border-gray-500 rounded-md py-1 px-2"
                  autoFocus
                />
                 <div className="flex items-center gap-1">
                    <label htmlFor="isExpenseEdit" className="text-xs">{t('configuration_expense_pl_badge')}</label>
                    <input id="isExpenseEdit" type="checkbox" checked={editingItem.isExpense} onChange={(e) => setEditingItem({ ...editingItem, isExpense: e.target.checked })} className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
                 </div>
                 <div className="flex items-center gap-1">
                    <label htmlFor="isExpensePlannableEdit" className="text-xs">{t('configuration_is_plannable', 'Plannable')}</label>
                    <input id="isExpensePlannableEdit" type="checkbox" checked={editingItem.isPlannable} onChange={(e) => setEditingItem({ ...editingItem, isPlannable: e.target.checked })} className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
                 </div>
                 <div className="flex items-center gap-1">
                    <label htmlFor="isDeductibleEdit" className="text-xs">{t('configuration_is_deductible_from_sales_short', 'Deduct?')}</label>
                    <input id="isDeductibleEdit" type="checkbox" checked={!!editingItem.isDeductibleFromSales} onChange={(e) => setEditingItem({ ...editingItem, isDeductibleFromSales: e.target.checked })} className="form-checkbox h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500" />
                 </div>
                <button onClick={handleUpdate} className="text-green-400 hover:text-green-300"><Save size={18} /></button>
                <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span>{item.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.isExpense ? 'bg-red-500/30 text-red-300' : 'bg-gray-500/30 text-gray-300'}`}>
                    {item.isExpense ? t('configuration_expense_pl_badge') : t('configuration_expense_non_pl_badge')}
                  </span>
                  {item.isPlannable && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-300`}>
                      {t('configuration_is_plannable_badge', 'Plannable')}
                    </span>
                  )}
                  {item.isDeductibleFromSales && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/30 text-yellow-300`}>
                      {t('configuration_is_deductible_from_sales_badge', 'Deductible from Sales')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingItem(item)} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};


const DataManagement: React.FC = () => {
  const { t } = useTranslation();
  const { exportData, importData, isLoading, resetDatabase } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (window.confirm(t('configuration_import_confirm'))) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
              importData(text);
            }
          };
          reader.readAsText(file);
      }
      event.target.value = '';
    }
  };

  const handleResetDatabase = async () => {
    await resetDatabase();
    setIsResetModalOpen(false);
  };
  
  const buttonClasses = "font-semibold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">{t('configuration_data_management', 'Gestión de Datos')}</h3>
        {isLoading && <p className="text-sm text-gray-400 mb-4">{t('configuration_loading_data')}</p>}
        <div className="flex flex-col md:flex-row gap-4">
            <button onClick={exportData} disabled={isLoading} className={`${buttonClasses} bg-green-600 text-white hover:bg-green-700`}>
              <Download size={18} /> {t('configuration_export_button')}
            </button>
            <button onClick={handleImportClick} disabled={isLoading} className={`${buttonClasses} bg-blue-600 text-white hover:bg-blue-700`}>
              <Upload size={18} /> {t('configuration_import_button')}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-gray-800 p-6 rounded-xl border border-red-500/50">
        <h3 className="text-xl font-semibold text-red-400 mb-2">Zona Peligrosa</h3>
        <p className="text-gray-400 mb-4">Estas acciones son destructivas y no se pueden deshacer.</p>
        <button onClick={() => setIsResetModalOpen(true)} disabled={isLoading} className={`${buttonClasses} bg-red-600 text-white hover:bg-red-700`}>
            <Trash2 size={18} /> Reiniciar la aplicación
        </button>
      </div>

      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center">
            <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md border border-red-500/50">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900">
                        <Trash2 className="h-6 w-6 text-red-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mt-4">Borrar todos los datos</h3>
                    <p className="text-gray-400 mt-2">Estás a punto de borrar permanentemente TODOS los datos de la aplicación, incluyendo configuraciones, ventas, y transacciones. Esta acción no se puede deshacer. ¿Estás absolutamente seguro?</p>
                </div>
                <div className="flex justify-center gap-4 mt-8">
                    <button onClick={() => setIsResetModalOpen(false)} className="bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-gray-700">
                        Cancelar
                    </button>
                    <button onClick={handleResetDatabase} className="bg-red-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-700">
                        Sí, borrar todo
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const BankAccountManagement: React.FC = () => {
  const { t } = useTranslation();
  const { state, addBankAccount, updateBankAccount, deleteBankAccount } = useAppContext();
  
  const [newAccount, setNewAccount] = useState({ name: '', currencyCode: state.currencies[0]?.code || '', hasTerminal: false });
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const handleAdd = () => {
    if (newAccount.name && newAccount.currencyCode) {
      addBankAccount(newAccount);
      setNewAccount({ name: '', currencyCode: state.currencies[0]?.code || '', hasTerminal: false });
    }
  };
  
  const handleUpdate = () => {
    if (editingAccount) {
      updateBankAccount(editingAccount);
      setEditingAccount(null);
    }
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm(t('configuration_bank_account_delete_confirm'))) {
      deleteBankAccount(id);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Landmark className="text-indigo-400" size={24} />
        <h3 className="text-xl font-bold text-white">{t('configuration_bank_accounts_title')}</h3>
      </div>
      <div className="space-y-2 mb-4">
        {state.bankAccounts.map(account => (
          <div key={account.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
            {editingAccount?.id === account.id ? (
              <div className="flex-grow flex items-center gap-2">
                <input type="text" value={editingAccount.name} onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })} className="w-1/2 bg-gray-600 p-1 rounded" />
                <select value={editingAccount.currencyCode} onChange={e => setEditingAccount({ ...editingAccount, currencyCode: e.target.value })} className="w-1/3 bg-gray-600 p-1 rounded">
                  {state.currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input type="checkbox" checked={editingAccount.hasTerminal} onChange={e => setEditingAccount({ ...editingAccount, hasTerminal: e.target.checked })} id={`terminal-edit-${account.id}`} />
                  <label htmlFor={`terminal-edit-${account.id}`} className="text-xs">{t('configuration_bank_account_has_terminal')}</label>
                </div>
                <button onClick={handleUpdate} className="text-green-400 hover:text-green-300"><Save size={18} /></button>
                <button onClick={() => setEditingAccount(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{account.name} <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded-full">{account.currencyCode}</span></span>
                  {account.hasTerminal && <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">{t('configuration_bank_account_terminal_badge')}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingAccount(account)} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(account.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 bg-gray-900/50 rounded-md">
        <input type="text" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} className="md:col-span-2 bg-gray-700 p-2 rounded" placeholder={t('configuration_bank_account_name')} />
        <select value={newAccount.currencyCode} onChange={e => setNewAccount({ ...newAccount, currencyCode: e.target.value })} className="bg-gray-700 p-2 rounded">
          {state.currencies.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={newAccount.hasTerminal} onChange={e => setNewAccount({ ...newAccount, hasTerminal: e.target.checked })} id="terminal-new" />
          <label htmlFor="terminal-new">{t('configuration_bank_account_has_terminal')}</label>
        </div>
        <button onClick={handleAdd} className="md:col-span-3 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center"><Plus size={18} /></button>
      </div>
    </div>
  );
};

const CurrencyManagement: React.FC = () => {
  const { t } = useTranslation();
  const { state, addCurrency, updateCurrency, deleteCurrency, addDenomination, deleteDenomination } = useAppContext();
  
  const [newCurrency, setNewCurrency] = useState({ name: '', code: '', symbol: '' });
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>(state.currencies[0]?.id || '');
  const [newDenomination, setNewDenomination] = useState({ value: '', type: 'bill' as 'bill' | 'coin' });

  const handleAddCurrency = () => {
    if (newCurrency.name && newCurrency.code && newCurrency.symbol) {
      addCurrency(newCurrency);
      setNewCurrency({ name: '', code: '', symbol: '' });
    }
  };

  const handleUpdateCurrency = () => {
    if (editingCurrency) {
      updateCurrency(editingCurrency);
      setEditingCurrency(null);
    }
  };

  const handleDeleteCurrency = (id: string) => {
    if (window.confirm(t('configuration_currency_delete_confirm'))) {
      deleteCurrency(id);
    }
  };

  const handleAddDenomination = () => {
    const value = parseFloat(newDenomination.value);
    if (!isNaN(value) && value > 0 && selectedCurrencyId) {
      addDenomination({
        currencyId: selectedCurrencyId,
        value: value,
        type: newDenomination.type,
      });
      setNewDenomination({ value: '', type: 'bill' });
    }
  };

  const currentDenominations = useMemo(() => {
    return state.denominations
      .filter(d => d.currencyId === selectedCurrencyId)
      .sort((a, b) => b.value - a.value);
  }, [selectedCurrencyId, state.denominations]);

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="text-indigo-400" size={24} />
        <h3 className="text-xl font-bold text-white">{t('configuration_currency_title')}</h3>
      </div>

      {/* --- CURRENCY MANAGEMENT --- */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-300 mb-3">{t('configuration_currency_list')}</h4>
        <div className="space-y-2">
          {state.currencies.map(currency => (
            <div key={currency.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
              {editingCurrency?.id === currency.id ? (
                 <div className="flex-grow flex items-center gap-2">
                    <input type="text" value={editingCurrency.name} onChange={e => setEditingCurrency({...editingCurrency, name: e.target.value})} className="w-1/3 bg-gray-600 p-1 rounded" placeholder={t('configuration_currency_name')} />
                    <input type="text" value={editingCurrency.code} onChange={e => setEditingCurrency({...editingCurrency, code: e.target.value})} className="w-1/4 bg-gray-600 p-1 rounded" placeholder={t('configuration_currency_code')} />
                    <input type="text" value={editingCurrency.symbol} onChange={e => setEditingCurrency({...editingCurrency, symbol: e.target.value})} className="w-1/6 bg-gray-600 p-1 rounded" placeholder={t('configuration_currency_symbol')} />
                    <button onClick={handleUpdateCurrency} className="text-green-400 hover:text-green-300"><Save size={18} /></button>
                    <button onClick={() => setEditingCurrency(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                 </div>
              ) : (
                <>
                  <span className="font-bold">{currency.name} ({currency.code}) - {currency.symbol}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCurrency(currency)} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteCurrency(currency.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4 p-3 bg-gray-900/50 rounded-md">
            <input type="text" value={newCurrency.name} onChange={e => setNewCurrency({...newCurrency, name: e.target.value})} className="w-1/3 bg-gray-700 p-2 rounded" placeholder={t('configuration_currency_name')} />
            <input type="text" value={newCurrency.code} onChange={e => setNewCurrency({...newCurrency, code: e.target.value})} className="w-1/4 bg-gray-700 p-2 rounded" placeholder={t('configuration_currency_code')} />
            <input type="text" value={newCurrency.symbol} onChange={e => setNewCurrency({...newCurrency, symbol: e.target.value})} className="w-1/6 bg-gray-700 p-2 rounded" placeholder={t('configuration_currency_symbol')} />
            <button onClick={handleAddCurrency} className="flex-grow bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center"><Plus size={18} /> </button>
        </div>
      </div>
      
      {/* --- DENOMINATION MANAGEMENT --- */}
      <div>
         <h4 className="text-lg font-semibold text-gray-300 mb-3">{t('configuration_denomination_title')}</h4>
         <div className="flex items-center gap-4 mb-4">
            <label htmlFor="currency-select" className="font-medium text-gray-300">{t('configuration_denomination_select')}</label>
            <select id="currency-select" value={selectedCurrencyId} onChange={e => setSelectedCurrencyId(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {state.currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
         </div>
         <div className="flex gap-2 mb-4 p-3 bg-gray-900/50 rounded-md">
            <input type="number" value={newDenomination.value} onChange={e => setNewDenomination({...newDenomination, value: e.target.value})} placeholder={t('configuration_denomination_value')} className="w-1/3 bg-gray-700 p-2 rounded" />
            <select value={newDenomination.type} onChange={e => setNewDenomination({...newDenomination, type: e.target.value as any})} className="w-1/3 bg-gray-700 p-2 rounded">
              <option value="bill">{t('daily_cash_bills')}</option>
              <option value="coin">{t('daily_cash_coins')}</option>
            </select>
            <button onClick={handleAddDenomination} className="flex-grow bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center"><Plus size={18} /></button>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {currentDenominations.map(d => (
              <div key={d.id} className="relative bg-gray-700 p-2 rounded-md text-center group">
                 <span>{d.type === 'bill' ? t('daily_cash_bills_short') : t('daily_cash_coins_short')}: {d.value}</span>
                 <button onClick={() => deleteDenomination(d.id)} className="absolute top-0 right-0 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                 </button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const TaxManagement: React.FC = () => {
  const { t } = useTranslation();
  const { state, addTax, updateTax, deleteTax } = useAppContext();
  const [newItem, setNewItem] = useState({ name: '', percentage: '' as any as number, authority: '', paymentFrequency: 'monthly' as TaxPaymentFrequency });
  const [editingItem, setEditingItem] = useState<Tax | null>(null);

  const paymentFrequencyOptions: { value: TaxPaymentFrequency; label: string }[] = [
    { value: 'monthly', label: t('tax_frequency_monthly', 'Mensual') },
    { value: 'bimonthly', label: t('tax_frequency_bimonthly', 'Bimestral') },
    { value: 'quarterly', label: t('tax_frequency_quarterly', 'Trimestral') },
    { value: 'semiannual', label: t('tax_frequency_semiannual', 'Semestral') },
    { value: 'annual', label: t('tax_frequency_annual', 'Anual') },
  ];

  const handleAdd = () => {
    if (newItem.name.trim() && newItem.percentage > 0 && newItem.authority.trim()) {
      addTax(newItem);
      setNewItem({ name: '', percentage: '' as any as number, authority: '', paymentFrequency: 'monthly' });
    }
  };

  const handleUpdate = () => {
    if (editingItem && editingItem.name.trim() && editingItem.percentage > 0 && editingItem.authority.trim()) {
      updateTax(editingItem);
      setEditingItem(null);
    }
  };

  const getFrequencyLabel = (frequency: TaxPaymentFrequency) => {
    return paymentFrequencyOptions.find(opt => opt.value === frequency)?.label || frequency;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">{t('tax_management_title', 'Gestión de Impuestos')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4 p-2 bg-gray-900/50 rounded-md">
        <input
          type="text"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          placeholder={t('tax_management_name_placeholder', 'Nombre del Impuesto (ej. IVA)')}
          className="md:col-span-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3"
        />
        <input
          type="number"
          value={newItem.percentage}
          onChange={(e) => setNewItem({ ...newItem, percentage: parseFloat(e.target.value) || 0 })}
          placeholder={t('tax_management_percentage_placeholder', 'Porcentaje (%)')}
          className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3"
        />
        <select
          value={newItem.paymentFrequency}
          onChange={(e) => setNewItem({ ...newItem, paymentFrequency: e.target.value as TaxPaymentFrequency })}
          className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3"
        >
          {paymentFrequencyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <input
          type="text"
          value={newItem.authority}
          onChange={(e) => setNewItem({ ...newItem, authority: e.target.value })}
          placeholder={t('tax_management_authority_placeholder', 'Autoridad (ej. DIAN)')}
          className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3"
        />
        <button onClick={handleAdd} className="md:col-span-4 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center">
          <Plus size={18} className="mr-1" /> {t('tax_management_add_button', 'Añadir Impuesto')}
        </button>
      </div>
      <ul className="space-y-2">
        {state.taxes.map(item => (
          <li key={item.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
            {editingItem?.id === item.id ? (
              <div className="flex-grow flex items-center gap-2">
                <input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="flex-grow bg-gray-600 p-1 rounded" />
                <input type="number" value={editingItem.percentage} onChange={(e) => setEditingItem({ ...editingItem, percentage: parseFloat(e.target.value) || 0 })} className="w-20 bg-gray-600 p-1 rounded" />
                <select 
                  value={editingItem.paymentFrequency} 
                  onChange={(e) => setEditingItem({ ...editingItem, paymentFrequency: e.target.value as TaxPaymentFrequency })} 
                  className="w-28 bg-gray-600 p-1 rounded"
                >
                  {paymentFrequencyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <input type="text" value={editingItem.authority} onChange={(e) => setEditingItem({ ...editingItem, authority: e.target.value })} className="flex-grow bg-gray-600 p-1 rounded" />
                <button onClick={handleUpdate} className="text-green-400 hover:text-green-300"><Save size={18} /></button>
                <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-sm text-gray-400">({item.percentage}%)</span>
                  <span className="text-sm text-gray-400">({getFrequencyLabel(item.paymentFrequency)})</span>
                  <span className="text-sm text-indigo-400">{item.authority}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingItem(item)} className="text-gray-400 hover:text-white"><Edit size={16} /></button>
                  <button onClick={() => deleteTax(item.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}


const ApiManagement: React.FC = () => {
  const { t } = useTranslation();
  const { state, setGeminiApiKey } = useAppContext();
  const [apiKey, setApiKey] = useState(state.geminiApiKey || '');

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    alert(t('api_management_save_success', 'API Key saved successfully!'));
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-4">{t('api_management_title', 'API Key Management')}</h3>
      <p className="text-gray-400 text-sm mb-4">{t('api_management_subtitle', 'Store your Gemini API Key to enable AI-powered features.')}</p>
      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t('api_management_placeholder', 'Enter your API Key')}
          className="flex-grow bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 flex items-center">
          <Save size={18} className="mr-1" /> {t('configuration_save_button', 'Save')}
        </button>
      </div>
      {state.geminiApiKey && (
        <p className="text-xs text-gray-500 mt-2">{t('api_management_key_saved', 'An API Key is currently saved.')}</p>
      )}
    </div>
  );
};

const FinancialSettings: React.FC = () => {
  const { t } = useTranslation();
  const { state, setIPCRecord, addExchangeRate, deleteExchangeRate } = useAppContext();
  const [newIPC, setNewIPC] = useState({ year: new Date().getFullYear(), percentage: ''});

  const [newRate, setNewRate] = useState<Omit<ExchangeRate, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    fromCurrencyCode: state.currencies[1]?.code || '',
    toCurrencyCode: state.currencies[0]?.code || '',
    rate: '' as any,
  });

  const handleRateAdd = () => {
    if(newRate.fromCurrencyCode && newRate.toCurrencyCode && newRate.rate > 0) {
      if(newRate.fromCurrencyCode === newRate.toCurrencyCode) {
        alert(t('configuration_exchange_rate_error_same'));
        return;
      }
      addExchangeRate(newRate);
      setNewRate({
        date: new Date().toISOString().split('T')[0],
        fromCurrencyCode: state.currencies[1]?.code || '',
        toCurrencyCode: state.currencies[0]?.code || '',
        rate: '' as any,
      });
    }
  }

  const handleIPCAdd = () => {
    const percentage = parseFloat(newIPC.percentage);
    if (!isNaN(percentage)) {
      setIPCRecord({ year: newIPC.year, percentage });
      setNewIPC({ year: new Date().getFullYear(), percentage: ''});
    }
  };

  const sortedExchangeRates = useMemo(() => 
    [...state.exchangeRates].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [state.exchangeRates]);

  return (
    <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
       <div className="flex items-center gap-3 mb-6">
        <LineChart className="text-indigo-400" size={24} />
        <h3 className="text-2xl font-bold text-white">{t('configuration_planning_title')}</h3>
      </div>
      
       {/* Exchange Rate Management */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
            <Repeat className="text-gray-400" size={20} />
            <h4 className="text-lg font-semibold text-gray-300">{t('configuration_exchange_rate_title')}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4 p-3 bg-gray-900/50 rounded-md">
          <input type="date" value={newRate.date} onChange={e => setNewRate({...newRate, date: e.target.value})} className="bg-gray-700 p-2 rounded" />
          <select value={newRate.fromCurrencyCode} onChange={e => setNewRate({...newRate, fromCurrencyCode: e.target.value})} className="bg-gray-700 p-2 rounded">
            {state.currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
          <select value={newRate.toCurrencyCode} onChange={e => setNewRate({...newRate, toCurrencyCode: e.target.value})} className="bg-gray-700 p-2 rounded">
            {state.currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
          <input type="number" value={newRate.rate} onChange={e => setNewRate({...newRate, rate: parseFloat(e.target.value)})} className="bg-gray-700 p-2 rounded" placeholder={t('configuration_exchange_rate_rate')} step="0.0001" />
          <button onClick={handleRateAdd} className="lg:col-span-4 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"><Plus size={18} /> {t('configuration_exchange_rate_add')}</button>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {sortedExchangeRates.map(rate => (
            <div key={rate.id} className="flex justify-between items-center bg-gray-700 p-2 rounded-md text-sm">
              <span className="font-mono text-xs">{rate.date}</span>
              <span className="font-bold">1 {rate.fromCurrencyCode} = {rate.rate} {rate.toCurrencyCode}</span>
              <button onClick={() => deleteExchangeRate(rate.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* IPC Management */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-300 mb-3">{t('configuration_ipc_title')}</h4>
        <div className="flex gap-2 mb-4 p-3 bg-gray-900/50 rounded-md">
          <input type="number" value={newIPC.year} onChange={e => setNewIPC({...newIPC, year: parseInt(e.target.value)})} className="w-1/3 bg-gray-700 p-2 rounded" placeholder={t('configuration_ipc_year')} />
          <input type="number" value={newIPC.percentage} onChange={e => setNewIPC({...newIPC, percentage: e.target.value})} className="w-1/3 bg-gray-700 p-2 rounded" placeholder={t('configuration_ipc_percentage')} step="0.01" />
          <button onClick={handleIPCAdd} className="flex-grow bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center justify-center"><Plus size={18} /></button>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {state.ipcRecords.map(record => (
            <div key={record.year} className="flex justify-between bg-gray-700 p-2 rounded-md text-sm">
              <span className="font-bold">{t('configuration_ipc_year')} {record.year}:</span>
              <span>{record.percentage.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const Configuration: React.FC = () => {
  const { t } = useTranslation();
  const { state, addConfigItem, deleteConfigItem, updateConfigItem } = useAppContext();

  const handleAddItem = (category: ConfigCategory, name: string) => {
    addConfigItem(category, name);
  };

  const handleDeleteItem = (category: ConfigCategory | 'expenseTypes', id: string) => {
    if(window.confirm('Are you sure you want to delete this item?')) {
      deleteConfigItem(category, id);
    }
  };

  const handleUpdateItem = (category: ConfigCategory, id: string, name: string) => {
    updateConfigItem(category, id, name);
  };


  return (
    <div className="space-y-8">
      <PageHeader title={t('configuration_title')} subtitle={t('configuration_subtitle')} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataManagement />
        <BankAccountManagement />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrencyManagement />
        <div>
          <FinancialSettings />
          <div className="mt-6">
            <ApiManagement />
          </div>
        </div>
      </div>
      <TaxManagement />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IncomeTypeManagement />
        <ExpenseTypeManagement />
        <ConfigSection 
          title={t('configuration_payment_methods')} 
          items={state.paymentMethods}
          onAdd={(name) => handleAddItem('paymentMethods', name)}
          onDelete={(id) => handleDeleteItem('paymentMethods', id)}
          onUpdate={(id, name) => handleUpdateItem('paymentMethods', id, name)}
        />
      </div>
    </div>
  );
};

export default Configuration;