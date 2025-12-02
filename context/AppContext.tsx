import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { AppState, ConfigItem, Invoice, InvoiceStatus, BankTransaction, DailySale, CashExpense, CashClosure, Currency, Denomination, MiscIncome, BankAccount, IPCRecord, ExchangeRate, BudgetRecord, ExpenseType, IncomeType, InvoicePayment } from '../types';

// --- INITIAL MOCK DATA ---
const initialData: AppState = {
  sharedDate: new Date().toISOString().split('T')[0],
  geminiApiKey: '',
  incomeTypes: [
    { id: '1', name: 'Dine-in Sales', isIncome: true, isPlannable: true },
    { id: '2', name: 'Takeout Sales', isIncome: true, isPlannable: true },
    { id: '3', name: 'Employee Debt Payment', isIncome: false, isPlannable: false },
  ].sort((a, b) => a.name.localeCompare(b.name)),
  expenseTypes: [
    { id: '1', name: 'Groceries', isExpense: true, isPlannable: true },
    { id: '2', name: 'Payroll', isExpense: true, isPlannable: true },
    { id: '3', name: 'Rent', isExpense: true, isPlannable: true },
    { id: '4', name: 'Asset Purchase', isExpense: false, isPlannable: false },
  ].sort((a, b) => a.name.localeCompare(b.name)),
  taxes: [],
  paymentMethods: [
    { id: '1', name: 'Cash' },
    { id: '2', name: 'Credit Card' },
  ],
  currencies: [
    { id: 'usd', name: 'US Dollar', code: 'USD', symbol: '$' },
    { id: 'ang', name: 'Netherlands Antillean Guilder', code: 'ANG', symbol: 'ƒ' },
  ],
  denominations: [
    // USD Denominations
    { id: 'usd-100', currencyId: 'usd', value: 100, type: 'bill' },
    { id: 'usd-50', currencyId: 'usd', value: 50, type: 'bill' },
    { id: 'usd-20', currencyId: 'usd', value: 20, type: 'bill' },
    { id: 'usd-10', currencyId: 'usd', value: 10, type: 'bill' },
    { id: 'usd-5', currencyId: 'usd', value: 5, type: 'bill' },
    { id: 'usd-1', currencyId: 'usd', value: 1, type: 'bill' },
    { id: 'usd-0.25', currencyId: 'usd', value: 0.25, type: 'coin' },
    { id: 'usd-0.10', currencyId: 'usd', value: 0.10, type: 'coin' },
    { id: 'usd-0.05', currencyId: 'usd', value: 0.05, type: 'coin' },
    // ANG Denominations
    { id: 'ang-100', currencyId: 'ang', value: 100, type: 'bill' },
    { id: 'ang-50', currencyId: 'ang', value: 50, type: 'bill' },
    { id: 'ang-25', currencyId: 'ang', value: 25, type: 'bill' },
    { id: 'ang-10', currencyId: 'ang', value: 10, type: 'bill' },
    { id: 'ang-5', currencyId: 'ang', value: 5, type: 'coin' },
    { id: 'ang-1', currencyId: 'ang', value: 1, type: 'coin' },
    { id: 'ang-0.25', currencyId: 'ang', value: 0.25, type: 'coin' },
  ],
  bankAccounts: [
    { id: '1', name: 'Main Account (USD)', currencyCode: 'USD'},
    { id: '2', name: 'Local Account (ANG)', currencyCode: 'ANG'},
  ],
  invoices: [],
  transactions: [],
  dailySales: [],
  miscIncomes: [],
  cashClosures: [],
  cashExpenses: [],
  ipcRecords: [],
  exchangeRates: [
    { id: '1', date: '2023-01-01', fromCurrencyCode: 'ANG', toCurrencyCode: 'USD', rate: 0.55 }
  ],
  budgetRecords: [],
  debtors: [],
  accountsReceivable: [],
};

type ConfigCategory = 'paymentMethods';

// --- CONTEXT DEFINITION ---
interface AppContextType {
  state: AppState;
  isLoading: boolean;
  setSharedDate: (date: string) => void;
  exportData: () => void;
  importData: (json: string) => void;
  resetDatabase: () => Promise<void>;
  setGeminiApiKey: (key: string) => void;
  // Config
  addConfigItem: (category: ConfigCategory, name: string) => void;
  updateConfigItem: (category: ConfigCategory, id: string, name: string) => void;
  deleteConfigItem: (category: ConfigCategory | 'expenseTypes' | 'incomeTypes', id: string) => void;
  addIncomeType: (name: string, isIncome: boolean, isPlannable: boolean) => void;
  updateIncomeType: (id: string, name: string, isIncome: boolean, isPlannable: boolean) => void;
  addExpenseType: (name: string, isExpense: boolean, isPlannable: boolean, isDeductibleFromSales?: boolean) => void;
  updateExpenseType: (id: string, name: string, isExpense: boolean, isPlannable: boolean, isDeductibleFromSales?: boolean) => void;
  // Taxes
  addTax: (tax: Omit<Tax, 'id'>) => void;
  updateTax: (tax: Tax) => void;
    deleteTax: (id: string) => void;
    generateTaxInvoice: (details: { taxId: string; periodLabel: string; amount: number; originalTaxableAmount: number; }) => void;
  // Currency
  addCurrency: (currency: Omit<Currency, 'id'>) => void;
  updateCurrency: (currency: Currency) => void;
  deleteCurrency: (id: string) => void;
  // Denomination
  addDenomination: (denomination: Omit<Denomination, 'id'>) => void;
  deleteDenomination: (id: string) => void;
  // Bank Accounts
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (account: BankAccount) => void;
  deleteBankAccount: (id: string) => void;
  // Exchange Rates
  addExchangeRate: (rate: Omit<ExchangeRate, 'id'>) => void;
  updateExchangeRate: (rate: ExchangeRate) => void;
  deleteExchangeRate: (id: string) => void;
  // Debtors
  addDebtor: (debtor: Omit<Debtor, 'id'>) => void;
  updateDebtor: (debtor: Debtor) => void;
  deleteDebtor: (id: string) => void;
  // Accounts Receivable
  addAccountReceivable: (ar: Omit<AccountReceivable, 'id' | 'status' | 'payments'>) => void;
  updateAccountReceivable: (ar: AccountReceivable) => void;
  receivePaymentForReceivables: (paymentDetails: {
    debtorId: string;
    amountReceived: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'bank';
    bankAccountId?: string;
    commissionAmount?: number;
    receivablesToApply: { id: string; amountApplied: number }[];
  }) => void;
  // Financials
  addInvoice: (invoice: Omit<Invoice, 'id' | 'status' | 'payments'>) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  payInvoice: (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => void;
  logDailySales: (sales: Omit<DailySale, 'id'>[], transfers: any[], cardSales: any[], platformSales: { debtorId: string; amount: number; currencyCode: string; }[]) => void;
  updateDailySale: (sale: DailySale, transfers: any[], cardSales: any[]) => void;
  deleteDailySale: (id: string) => void;
  addMiscIncome: (income: Omit<MiscIncome, 'id'>) => void;
  updateMiscIncome: (income: MiscIncome) => void;
  deleteMiscIncome: (id: string) => void;
  addCashExpense: (expense: Omit<CashExpense, 'id'>) => void;
  updateCashExpense: (expense: CashExpense) => void;
  deleteCashExpense: (id: string) => void;
  addBankTransaction: (transaction: Omit<BankTransaction, 'id'>) => void;
  updateBankTransaction: (transaction: BankTransaction) => void;
  deleteBankTransaction: (id: string) => void;
  saveCashClosure: (closure: CashClosure) => void;
  const receivePaymentForReceivables = (paymentDetails: {
    debtorId: string;
    amountReceived: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'bank';
    bankAccountId?: string;
    commissionAmount?: number;
    receivablesToApply: { id: string; amountApplied: number }[];
  }) => {
    const { debtorId, amountReceived, paymentDate, paymentMethod, bankAccountId, commissionAmount, receivablesToApply } = paymentDetails;

    let newAccountsReceivable = [...state.accountsReceivable];
    let newTransactions = [...state.transactions];
    let newCashClosures = [...state.cashClosures]; // Assuming cash closures can be updated for cash payments
    let newCashExpenses = [...state.cashExpenses];
    let newExpenseTypes = [...state.expenseTypes];

    let totalAppliedToReceivables = 0;

    // 1. Update each Account Receivable
    receivablesToApply.forEach(rToApply => {
      const arIndex = newAccountsReceivable.findIndex(ar => ar.id === rToApply.id);
      if (arIndex !== -1) {
        const ar = { ...newAccountsReceivable[arIndex] };
        const newPayment: ReceivablePayment = {
          id: Date.now().toString() + '_' + rToApply.id,
          paymentDate,
          amount: rToApply.amountApplied,
          method: paymentMethod,
          bankAccountId,
        };
        ar.payments = [...ar.payments, newPayment];

        const totalPaidForThisAR = ar.payments.reduce((sum, p) => sum + p.amount, 0);

        if (totalPaidForThisAR >= ar.amount) {
          ar.status = 'Paid';
        } else if (totalPaidForThisAR > 0) {
          ar.status = 'Partially Paid';
        } else {
          ar.status = 'Pending'; // Should not happen if amountApplied > 0
        }
        newAccountsReceivable[arIndex] = ar;
        totalAppliedToReceivables += rToApply.amountApplied;
      }
    });

    // 2. Register the incoming payment (deposit)
    if (amountReceived > 0) {
      if (paymentMethod === 'bank' && bankAccountId) {
        let arConcept = state.incomeTypes.find(it => it.name === 'Cuentas por Cobrar');
        let newIncomeTypes = [...state.incomeTypes];
        if (!arConcept) {
          arConcept = { id: `ar-income-${Date.now()}`, name: 'Cuentas por Cobrar', isIncome: true, isPlannable: false };
          newIncomeTypes.push(arConcept);
        }

        const newBankTransaction: BankTransaction = {
          id: Date.now().toString(),
          bankAccountId,
          date: paymentDate,
          description: `Pago de deudor (${state.debtors.find(d => d.id === debtorId)?.name})`,
          amount: amountReceived,
          type: 'income',
          conceptId: arConcept.id,
        };
        newTransactions.push(newBankTransaction);
        state.incomeTypes = newIncomeTypes; // Update income types in state
      } else if (paymentMethod === 'cash') {
        // For cash, we'd typically update a cash closure. This is more complex.
        // For now, we'll assume it affects the current day's cash, which will be reconciled in DailyCash.
        // Alternatively, it could be recorded as a MiscIncome or added to a temporary cash balance.
        // Given existing CashClosure, a simple way is to record as MiscIncome.
        let arConcept = state.incomeTypes.find(it => it.name === 'Cuentas por Cobrar');
        let newIncomeTypes = [...state.incomeTypes];
        if (!arConcept) {
          arConcept = { id: `ar-income-${Date.now()}`, name: 'Cuentas por Cobrar', isIncome: true, isPlannable: false };
          newIncomeTypes.push(arConcept);
        }
        const newMiscIncome: MiscIncome = {
            id: Date.now().toString(),
            date: paymentDate,
            currencyCode: newAccountsReceivable.find(ar => ar.debtorId === debtorId)?.currencyCode || state.currencies[0]?.code || 'USD', // Assumes a default currency
            conceptId: arConcept.id,
            detail: `Pago de deudor (${state.debtors.find(d => d.id === debtorId)?.name}) en efectivo`,
            amount: amountReceived,
        };
        state.miscIncomes = [...state.miscIncomes, newMiscIncome];
        state.incomeTypes = newIncomeTypes;
      }
    }

    // 3. Handle Commission Expense (if any)
    if (commissionAmount && commissionAmount > 0) {
      let commissionConcept = state.expenseTypes.find(et => et.name === 'Comisiones Plataformas');
      if (!commissionConcept) {
        commissionConcept = { id: `comm-exp-${Date.now()}`, name: 'Comisiones Plataformas', isExpense: true, isPlannable: false };
        newExpenseTypes.push(commissionConcept);
      }
      const newCommissionExpense: CashExpense = { // Could be CashExpense or BankTransaction depending on method.
                                                  // Assuming CashExpense for simplicity if not a bank transfer directly.
                                                  // For platforms, it's often deducted, so it's an 'expense'.
        id: Date.now().toString(),
        date: paymentDetails.paymentDate,
        currencyCode: newAccountsReceivable.find(ar => ar.debtorId === debtorId)?.currencyCode || state.currencies[0]?.code || 'USD',
        supplier: state.debtors.find(d => d.id === debtorId)?.name || 'Desconocido',
        detail: `Comisión por pago de ${state.debtors.find(d => d.id === debtorId)?.name}`,
        conceptId: commissionConcept.id,
        amount: commissionAmount,
      };
      newCashExpenses.push(newCommissionExpense);
      state.expenseTypes = newExpenseTypes;
    }

    const newState = {
      ...state,
      accountsReceivable: newAccountsReceivable,
      transactions: newTransactions,
      cashClosures: newCashClosures,
      cashExpenses: newCashExpenses,
    };
    updateStateAndDB(newState);
  };
}

const DB_NAME = 'RestoFinDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject("Error opening DB");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

const getDataFromDB = async (db: IDBDatabase): Promise<AppState | null> => {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('main');
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => resolve(null);
    });
};

const saveDataToDB = async (db: IDBDatabase, data: AppState) => {
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ id: 'main', data });
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Error saving data");
    });
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const dbInstance = await openDB();
        setDb(dbInstance);
        const storedState = await getDataFromDB(dbInstance);
        if (storedState) {
          // Sort arrays from stored state
          if (storedState.incomeTypes) {
            storedState.incomeTypes.sort((a, b) => a.name.localeCompare(b.name));
          }
          if (storedState.expenseTypes) {
            storedState.expenseTypes.sort((a, b) => a.name.localeCompare(b.name));
          }
          // Data migration for taxes: ensure paymentFrequency is set
          if (storedState.taxes) {
            storedState.taxes = storedState.taxes.map(tax => ({
              ...tax,
              paymentFrequency: tax.paymentFrequency || 'monthly' // Default to monthly if undefined
            }));
          }
          // Ensure new state fields exist
          const mergedState = { ...initialData, ...storedState };
          setState(mergedState);
        } else {
          // If no stored state, the initialData is already sorted
          setState(initialData);
        }
      } catch (error) {
        console.error("Failed to initialize IndexedDB", error);
      } finally {
        setIsLoading(false);
      }
    };
    initDB();
  }, []);

  const updateStateAndDB = useCallback((newState: AppState) => {
    setState(newState);
    if (db) {
      saveDataToDB(db, newState).catch(err => console.error(err));
    }
  }, [db]);

  const setSharedDate = (date: string) => {
    const newState = { ...state, sharedDate: date };
    updateStateAndDB(newState);
  };

  const setGeminiApiKey = (key: string) => {
    const newState = { ...state, geminiApiKey: key };
    updateStateAndDB(newState);
  };

  const exportData = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(state, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().split('T')[0];
    link.download = `restofin_backup_${date}.json`;
    link.click();
  };

  const importData = (json: string) => {
    try {
      const newState = JSON.parse(json);
      // Basic validation
      if (newState.incomeTypes && newState.expenseTypes && newState.invoices) {
        newState.incomeTypes.sort((a: IncomeType, b: IncomeType) => a.name.localeCompare(b.name));
        newState.expenseTypes.sort((a: ExpenseType, b: ExpenseType) => a.name.localeCompare(b.name));
        // Data migration for taxes: ensure paymentFrequency is set for imported data
        if (newState.taxes) {
          newState.taxes = newState.taxes.map((tax: Tax) => ({
            ...tax,
            paymentFrequency: tax.paymentFrequency || 'monthly' // Default to monthly if undefined
          }));
        }
        const mergedState = { ...initialData, ...newState };
        updateStateAndDB(mergedState);
        alert('Data imported successfully!');
      } else {
         throw new Error("Invalid data structure");
      }
    } catch (error) {
      console.error("Failed to import data:", error);
      alert('Failed to import data. The file might be corrupted or in the wrong format.');
    }
  };

  const addConfigItem = (category: ConfigCategory, name: string) => {
    const newItem: ConfigItem = { id: Date.now().toString(), name };
    const newState = { ...state, [category]: [...state[category], newItem] };
    updateStateAndDB(newState);
  };

  const updateConfigItem = (category: ConfigCategory, id: string, name: string) => {
    const newState = {
      ...state,
      [category]: state[category].map(item =>
        item.id === id ? { ...item, name } : item
      ),
    };
    updateStateAndDB(newState);
  };
  
  const deleteConfigItem = (category: ConfigCategory | 'expenseTypes' | 'incomeTypes', id: string) => {
    const newState = {
      ...state,
      [category]: (state[category] as any[]).filter(item => item.id !== id),
    };
    updateStateAndDB(newState);
  };

  const addIncomeType = (name: string, isIncome: boolean, isPlannable: boolean) => {
    const newItem: IncomeType = { id: Date.now().toString(), name, isIncome, isPlannable };
    const newState = { ...state, incomeTypes: [...state.incomeTypes, newItem].sort((a, b) => a.name.localeCompare(b.name)) };
    updateStateAndDB(newState);
  };

  const updateIncomeType = (id: string, name: string, isIncome: boolean, isPlannable: boolean) => {
    const newState = {
      ...state,
      incomeTypes: state.incomeTypes.map(item =>
        item.id === id ? { ...item, name, isIncome, isPlannable } : item
      ).sort((a, b) => a.name.localeCompare(b.name)),
    };
    updateStateAndDB(newState);
  };

  const addExpenseType = (name: string, isExpense: boolean, isPlannable: boolean, isDeductibleFromSales?: boolean) => {
    const newItem: ExpenseType = { id: Date.now().toString(), name, isExpense, isPlannable, isDeductibleFromSales: isDeductibleFromSales || false };
    const newState = { ...state, expenseTypes: [...state.expenseTypes, newItem].sort((a, b) => a.name.localeCompare(b.name)) };
    updateStateAndDB(newState);
  };

  const updateExpenseType = (id: string, name: string, isExpense: boolean, isPlannable: boolean, isDeductibleFromSales?: boolean) => {
    const newState = {
      ...state,
      expenseTypes: state.expenseTypes.map(item =>
        item.id === id ? { ...item, name, isExpense, isPlannable, isDeductibleFromSales: isDeductibleFromSales || false } : item
      ).sort((a, b) => a.name.localeCompare(b.name)),
    };
    updateStateAndDB(newState);
  };

  // Tax Functions
  const addTax = (tax: Omit<Tax, 'id'>) => {
    const newTax: Tax = { ...tax, id: Date.now().toString() };
    const newState = { ...state, taxes: [...state.taxes, newTax] };
    updateStateAndDB(newState);
  };

  const updateTax = (updatedTax: Tax) => {
    const newState = {
      ...state,
      taxes: state.taxes.map(tax => tax.id === updatedTax.id ? updatedTax : tax),
    };
    updateStateAndDB(newState);
  };

  const deleteTax = (id: string) => {
    const newState = { 
      ...state, 
      taxes: state.taxes.filter(tax => tax.id !== id),
    };
    updateStateAndDB(newState);
  };


  // Currency Functions
  const addCurrency = (currency: Omit<Currency, 'id'>) => {
    const newCurrency: Currency = { ...currency, id: Date.now().toString() };
    const newState = { ...state, currencies: [...state.currencies, newCurrency] };
    updateStateAndDB(newState);
  };
  
  const updateCurrency = (currency: Currency) => {
    const newState = {
      ...state,
      currencies: state.currencies.map(c => c.id === currency.id ? currency : c)
    };
    updateStateAndDB(newState);
  };

  const deleteCurrency = (id: string) => {
    const newState = {
      ...state,
      currencies: state.currencies.filter(c => c.id !== id),
      denominations: state.denominations.filter(d => d.currencyId !== id),
    };
    updateStateAndDB(newState);
  };

  // Denomination Functions
  const addDenomination = (denomination: Omit<Denomination, 'id'>) => {
    const newDenomination: Denomination = { ...denomination, id: Date.now().toString() };
    const newState = { ...state, denominations: [...state.denominations, newDenomination] };
    updateStateAndDB(newState);
  };

  const deleteDenomination = (id: string) => {
    const newState = { ...state, denominations: state.denominations.filter(d => d.id !== id) };
    updateStateAndDB(newState);
  };

  // Bank Account Functions
  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
    const newAccount: BankAccount = { ...account, id: Date.now().toString() };
    const newState = { ...state, bankAccounts: [...state.bankAccounts, newAccount] };
    updateStateAndDB(newState);
  };

  const updateBankAccount = (account: BankAccount) => {
    const newState = {
      ...state,
      bankAccounts: state.bankAccounts.map(a => a.id === account.id ? account : a)
    };
    updateStateAndDB(newState);
  };

  const deleteBankAccount = (id: string) => {
    const newState = {
      ...state,
      bankAccounts: state.bankAccounts.filter(a => a.id !== id),
      transactions: state.transactions.filter(t => t.bankAccountId !== id),
    };
    updateStateAndDB(newState);
  };

  // Exchange Rate Functions
  const addExchangeRate = (rate: Omit<ExchangeRate, 'id'>) => {
    const newRate = { ...rate, id: Date.now().toString() };
    const newState = { ...state, exchangeRates: [...state.exchangeRates, newRate] };
    updateStateAndDB(newState);
  };

  const updateExchangeRate = (rate: ExchangeRate) => {
    const newState = {
      ...state,
      exchangeRates: state.exchangeRates.map(r => r.id === rate.id ? rate : r)
    };
    updateStateAndDB(newState);
  };

  const deleteExchangeRate = (id: string) => {
    const newState = {
      ...state,
      exchangeRates: state.exchangeRates.filter(r => r.id !== id)
    };
    updateStateAndDB(newState);
  };

  // Debtor Functions
  const addDebtor = (debtor: Omit<Debtor, 'id'>) => {
    const newDebtor: Debtor = { ...debtor, id: Date.now().toString() };
    const newState = { ...state, debtors: [...state.debtors, newDebtor] };
    updateStateAndDB(newState);
  };

  const updateDebtor = (updatedDebtor: Debtor) => {
    const newState = {
      ...state,
      debtors: state.debtors.map(d => d.id === updatedDebtor.id ? updatedDebtor : d),
    };
    updateStateAndDB(newState);
  };

  const deleteDebtor = (id: string) => {
    const newState = {
      ...state,
      debtors: state.debtors.filter(d => d.id !== id),
      accountsReceivable: state.accountsReceivable.filter(ar => ar.debtorId !== id), // Also delete associated receivables
    };
    updateStateAndDB(newState);
  };

  // Account Receivable Functions
  const addAccountReceivable = (ar: Omit<AccountReceivable, 'id' | 'status' | 'payments'>) => {
    const newAR: AccountReceivable = {
      ...ar,
      id: Date.now().toString(),
      status: 'Pending',
      payments: [],
    };
    const newState = { ...state, accountsReceivable: [...state.accountsReceivable, newAR] };
    updateStateAndDB(newState);
  };

  const updateAccountReceivable = (updatedAR: AccountReceivable) => {
    const newState = {
      ...state,
      accountsReceivable: state.accountsReceivable.map(ar => ar.id === updatedAR.id ? updatedAR : ar),
    };
    updateStateAndDB(newState);
  };
  
  const addInvoice = (invoice: Omit<Invoice, 'id' | 'status' | 'payments'>) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: Date.now().toString(),
      status: new Date(invoice.dueDate) < new Date() ? 'Overdue' : 'Pending',
      payments: [],
    };
    const newState = { ...state, invoices: [...state.invoices, newInvoice] };
    updateStateAndDB(newState);
  };

  const updateInvoice = (updatedInvoice: Invoice) => {
    const newState = {
        ...state,
        invoices: state.invoices.map(inv => 
            inv.id === updatedInvoice.id ? updatedInvoice : inv
        ),
    };
    updateStateAndDB(newState);
  };

  const deleteInvoice = (id: string) => {
    const newState = {
        ...state,
        invoices: state.invoices.filter(inv => inv.id !== id),
    };
    updateStateAndDB(newState);
  };

  const payInvoice = (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => {
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    let newCashExpense: CashExpense | null = null;
    let newBankTransaction: BankTransaction | null = null;

    if (payment.method === 'cash') {
        newCashExpense = {
            id: Date.now().toString(),
            date: payment.paymentDate,
            currencyCode: invoice.currencyCode,
            supplier: invoice.supplier,
            detail: `Payment for invoice #${invoice.invoiceNumber}`,
            conceptId: invoice.conceptId,
            invoiceNumber: invoice.invoiceNumber,
            amount: payment.amount,
        };
    } else if (payment.method === 'bank' && payment.accountId) {
        newBankTransaction = {
            id: Date.now().toString(),
            bankAccountId: payment.accountId,
            date: payment.paymentDate,
            description: `Payment for invoice #${invoice.invoiceNumber} from ${invoice.supplier}`,
            amount: -Math.abs(payment.amount),
            type: 'expense',
            conceptId: invoice.conceptId,
        };
    }

    const updatedInvoices = state.invoices.map(inv => {
        if (inv.id === invoiceId) {
            const newPayments = [...(inv.payments || []), { ...payment, id: Date.now().toString() }];
            const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
            
            let newStatus: InvoiceStatus = 'Partially Paid';
            if (totalPaid >= inv.amount) {
                newStatus = 'Paid';
            }

            return { ...inv, payments: newPayments, status: newStatus };
        }
        return inv;
    });

    const newState: AppState = {
        ...state,
        invoices: updatedInvoices,
        cashExpenses: newCashExpense ? [...state.cashExpenses, newCashExpense] : state.cashExpenses,
        transactions: newBankTransaction ? [...state.transactions, newBankTransaction] : state.transactions,
    };

    updateStateAndDB(newState);
  };

  const logDailySales = (salesData: Omit<DailySale, 'id'>[], transfers: any[], cardSales: any[], platformSales: { debtorId: string; amount: number; currencyCode: string; }[]) => {
    const newSalesWithIds: DailySale[] = salesData.map(sale => ({ 
        ...sale, 
        id: `${sale.date}-${sale.currencyCode}-${Date.now()}`
    }));

    let newTransactions: BankTransaction[] = [...state.transactions];
    let newAccountsReceivable: AccountReceivable[] = [...state.accountsReceivable];
    const { sharedDate } = state;

    let ventasDirectasConcept = state.incomeTypes.find(it => it.name === 'Ventas Directas');
    let incomeTypes = [...state.incomeTypes];
    if (!ventasDirectasConcept) {
        ventasDirectasConcept = { id: `ventas-directas_${Date.now()}`, name: 'Ventas Directas', isIncome: true, isPlannable: false };
        incomeTypes.push(ventasDirectasConcept);
    }
    const ventasDirectasConceptId = ventasDirectasConcept.id;

    cardSales.forEach(cs => {
        const terminal = state.bankAccounts.find(ba => ba.id === cs.accountId);
        const amount = parseFloat(cs.amount);
        if (terminal && amount > 0) {
            newTransactions.push({
                id: Date.now().toString() + `_card_${cs.accountId}`,
                bankAccountId: cs.accountId,
                date: sharedDate,
                description: `Credit Card Sales (${terminal.name}) for ${sharedDate}`,
                amount: amount,
                type: 'income',
                conceptId: ventasDirectasConceptId,
            });
        }
    });

    transfers.forEach(transfer => {
        const amount = parseFloat(transfer.amount);
        if (transfer.accountId && amount > 0) {
            newTransactions.push({
                id: Date.now().toString() + `_transfer_${transfer.id}`,
                bankAccountId: transfer.accountId,
                date: sharedDate,
                description: `Bank Transfer Sales for ${sharedDate}`,
                amount: amount,
                type: 'income',
                conceptId: ventasDirectasConceptId,
            });
        }
    });
    
    // Process platform sales
    platformSales.forEach(ps => {
      const amount = parseFloat(ps.amount);
      if (ps.debtorId && amount > 0) {
        const newAR: AccountReceivable = {
          id: Date.now().toString(),
          debtorId: ps.debtorId,
          date: sharedDate,
          concept: `Venta a ${state.debtors.find(d => d.id === ps.debtorId)?.name} (${sharedDate})`,
          amount: amount,
          currencyCode: ps.currencyCode,
          status: 'Pending',
          payments: [],
        };
        newAccountsReceivable.push(newAR);
      }
    });

    const newState = {
      ...state,
      incomeTypes,
      dailySales: [...state.dailySales, ...newSalesWithIds],
      transactions: newTransactions,
      accountsReceivable: newAccountsReceivable,
    }
    updateStateAndDB(newState);
  };

  const generateTaxInvoice = (details: { taxId: string; periodLabel: string; amount: number; originalTaxableAmount: number; }) => {
    const { taxId, periodLabel, amount, originalTaxableAmount } = details;
    const tax = state.taxes.find(t => t.id === taxId);

    if (!tax || amount <= 0) return;

    let taxConcept = state.expenseTypes.find(et => et.name === 'Pago de Impuestos');
    let expenseTypes = [...state.expenseTypes];
    if (!taxConcept) {
        taxConcept = { id: `tax-payment_${Date.now()}`, name: 'Pago de Impuestos', isExpense: true, isPlannable: false };
        expenseTypes.push(taxConcept);
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      supplier: tax.authority,
      invoiceNumber: `TAX-${tax.name.toUpperCase()}-${periodLabel}`,
      conceptId: taxConcept.id,
      amount: amount,
      dueDate: new Date().toISOString().split('T')[0], // Or calculate a proper due date
      status: 'Pending',
      payments: [],
      currencyCode: state.currencies[0]?.code || '', // This assumes the tax is paid in the base currency.
      taxInfo: { taxId, periodLabel, originalTaxableAmount },
    };

    const newState = {
      ...state,
      expenseTypes,
      invoices: [...state.invoices, newInvoice],
    };
    updateStateAndDB(newState);
  };

  const updateDailySale = (updatedSale: DailySale, transfers: any[], cardSales: any[]) => {
    let ventasDirectasConcept = state.incomeTypes.find(it => it.name === 'Ventas Directas');
    let incomeTypes = [...state.incomeTypes];
    if (!ventasDirectasConcept) {
        ventasDirectasConcept = { id: `ventas-directas_${Date.now()}`, name: 'Ventas Directas', isIncome: true };
        incomeTypes.push(ventasDirectasConcept);
    }
    const ventasDirectasConceptId = ventasDirectasConcept.id;

    // Get all transactions that are NOT sales-related for the specific day and currency
    const saleCurrency = updatedSale.currencyCode;
    const otherTransactions = state.transactions.filter(t => {
        const account = state.bankAccounts.find(ba => ba.id === t.bankAccountId);
        
        const isOldSaleTransaction = t.description.includes('Credit Card Sales') || t.description.includes('Bank Transfer Sales');
        const isNewSaleTransaction = t.conceptId === ventasDirectasConceptId;
        
        const isSameDaySale = t.date === updatedSale.date && account?.currencyCode === saleCurrency && (isOldSaleTransaction || isNewSaleTransaction);
        
        return !isSameDaySale;
    });

    const updatedSaleTransactions: BankTransaction[] = [];

    // Reconcile Card Sales
    cardSales.forEach(cs => {
        const amount = parseFloat(cs.amount);
        const terminal = state.bankAccounts.find(ba => ba.id === cs.bankAccountId);
        if (terminal && amount > 0) {
            updatedSaleTransactions.push({
                id: cs.id.startsWith('new') ? `${Date.now()}_card_${cs.bankAccountId}` : cs.id,
                bankAccountId: cs.bankAccountId,
                date: updatedSale.date,
                description: `Credit Card Sales (${terminal.name}) for ${updatedSale.date}`,
                amount: amount,
                type: 'income',
                conceptId: ventasDirectasConceptId,
            });
        }
    });

    // Reconcile Transfers
    transfers.forEach(t => {
        const amount = parseFloat(t.amount);
        if (t.accountId && amount > 0) {
            updatedSaleTransactions.push({
                id: t.id.startsWith('new') ? `${Date.now()}_transfer_${t.accountId}` : t.id,
                bankAccountId: t.accountId,
                date: updatedSale.date,
                description: `Bank Transfer Sales for ${updatedSale.date}`,
                amount: amount,
                type: 'income',
                conceptId: ventasDirectasConceptId,
            });
        }
    });

    const newState = {
      ...state,
      incomeTypes,
      dailySales: state.dailySales.map(sale => 
        sale.id === updatedSale.id ? updatedSale : sale
      ),
      transactions: [...otherTransactions, ...updatedSaleTransactions],
    };
    updateStateAndDB(newState);
  };

  const deleteDailySale = (id: string) => {
    const newState = {
      ...state,
      dailySales: state.dailySales.filter(sale => sale.id !== id),
    };
    updateStateAndDB(newState);
  };
  
  const addMiscIncome = (income: Omit<MiscIncome, 'id'>) => {
    const newIncome: MiscIncome = { ...income, id: Date.now().toString() };
    const newState = { ...state, miscIncomes: [...state.miscIncomes, newIncome] };
    updateStateAndDB(newState);
  };

  const updateMiscIncome = (updatedIncome: MiscIncome) => {
    const newState = {
      ...state,
      miscIncomes: state.miscIncomes.map(inc => 
        inc.id === updatedIncome.id ? updatedIncome : inc
      ),
    };
    updateStateAndDB(newState);
  };

  const deleteMiscIncome = (id: string) => {
    const newState = { ...state, miscIncomes: state.miscIncomes.filter(inc => inc.id !== id) };
    updateStateAndDB(newState);
  };

  const addCashExpense = (expense: Omit<CashExpense, 'id'>) => {
    const newExpense: CashExpense = { ...expense, id: Date.now().toString() };
    const newState = { ...state, cashExpenses: [...state.cashExpenses, newExpense] };
    updateStateAndDB(newState);
  };

  const updateCashExpense = (updatedExpense: CashExpense) => {
    const newState = {
      ...state,
      cashExpenses: state.cashExpenses.map(exp => 
        exp.id === updatedExpense.id ? updatedExpense : exp
      ),
    };
    updateStateAndDB(newState);
  };

  const deleteCashExpense = (id: string) => {
    const newState = { ...state, cashExpenses: state.cashExpenses.filter(exp => exp.id !== id) };
    updateStateAndDB(newState);
  };
  
  const addBankTransaction = (transaction: Omit<BankTransaction, 'id'>) => {
      const newTransaction: BankTransaction = {
          ...transaction,
          id: Date.now().toString(),
      };
      const newState = { ...state, transactions: [...state.transactions, newTransaction] };
      updateStateAndDB(newState);

  };

  const updateBankTransaction = (updatedTransaction: BankTransaction) => {
    const newState = {
        ...state,
        transactions: state.transactions.map(tx => 
            tx.id === updatedTransaction.id ? updatedTransaction : tx
        ),
    };
    updateStateAndDB(newState);
  };

  const deleteBankTransaction = (id: string) => {
    const newState = {
        ...state,
        transactions: state.transactions.filter(tx => tx.id !== id),
    };
    updateStateAndDB(newState);
  };

  const ensureSpecialConcepts = (currentState: AppState): { newState: AppState, surplusConceptId: string, shortageConceptId: string } => {
    let surplusConcept = currentState.incomeTypes.find(it => it.name === 'Surplus');
    let shortageConcept = currentState.expenseTypes.find(et => et.name === 'Shortage');
    let newIncomeTypes = [...currentState.incomeTypes];
    let newExpenseTypes = [...currentState.expenseTypes];

    let changed = false;

    if (!surplusConcept) {
        surplusConcept = { id: `special_surplus_${Date.now()}`, name: 'Surplus', isIncome: true };
        newIncomeTypes.push(surplusConcept);
        changed = true;
    }

    if (!shortageConcept) {
        shortageConcept = { id: `special_shortage_${Date.now()}`, name: 'Shortage', isExpense: true };
        newExpenseTypes.push(shortageConcept);
        changed = true;
    }

    const newState = changed ? { ...currentState, incomeTypes: newIncomeTypes, expenseTypes: newExpenseTypes } : currentState;
    
    return { newState, surplusConceptId: surplusConcept.id, shortageConceptId: shortageConcept.id };
  };

  const saveCashClosure = (closure: CashClosure) => {
    const { newState: stateWithConcepts, surplusConceptId, shortageConceptId } = ensureSpecialConcepts(state);

    let newMiscIncomes = [...stateWithConcepts.miscIncomes];
    let newCashExpenses = [...stateWithConcepts.cashExpenses];

    // Remove previous surplus/shortage for this day and currency to avoid duplicates
    newMiscIncomes = newMiscIncomes.filter(inc => !(inc.date === closure.date && inc.currencyCode === closure.currencyCode && inc.conceptId === surplusConceptId));
    newCashExpenses = newCashExpenses.filter(exp => !(exp.date === closure.date && exp.currencyCode === closure.currencyCode && exp.conceptId === shortageConceptId));

    if (closure.difference > 0) {
      const surplusIncome: MiscIncome = {
        id: `surplus_${closure.date}_${closure.currencyCode}`,
        date: closure.date,
        currencyCode: closure.currencyCode,
        conceptId: surplusConceptId,
        detail: 'Cash surplus from daily closure',
        amount: closure.difference,
      };
      newMiscIncomes.push(surplusIncome);
    } else if (closure.difference < 0) {
      const shortageExpense: CashExpense = {
        id: `shortage_${closure.date}_${closure.currencyCode}`,
        date: closure.date,
        currencyCode: closure.currencyCode,
        conceptId: shortageConceptId,
        supplier: 'Internal',
        detail: 'Cash shortage from daily closure',
        invoiceNumber: '',
        amount: Math.abs(closure.difference),
      };
      newCashExpenses.push(shortageExpense);
    }

    const finalState = {
      ...stateWithConcepts,
      cashClosures: [...state.cashClosures.filter(c => c.date !== closure.date || c.currencyCode !== closure.currencyCode), closure],
      miscIncomes: newMiscIncomes,
      cashExpenses: newCashExpenses,
    };

    updateStateAndDB(finalState);
  };
  
  const setIPCRecord = (record: IPCRecord) => {
    const existingIndex = state.ipcRecords.findIndex(r => r.year === record.year);
    let newRecords = [...state.ipcRecords];
    if (existingIndex > -1) {
        newRecords[existingIndex] = record;
    } else {
        newRecords.push(record);
    }
    const newState = { ...state, ipcRecords: newRecords.sort((a,b) => b.year - a.year) };
    updateStateAndDB(newState);
  };

  const setBudgetRecord = (record: BudgetRecord) => {
    const existingIndex = state.budgetRecords.findIndex(b => 
      b.year === record.year && b.month === record.month && b.categoryId === record.categoryId
    );
    let newRecords = [...state.budgetRecords];
    if (existingIndex > -1) {
      newRecords[existingIndex] = record;
    } else {
      newRecords.push(record);
    }
    const newState = { ...state, budgetRecords: newRecords.filter(r => r.amount > 0) };
    updateStateAndDB(newState);
  };
  
  const setYearlyBudgetForCategory = (details: { year: number, categoryId: string, categoryType: 'income' | 'expense', amount: number }) => {
    const { year, categoryId, categoryType, amount } = details;
    let newRecords = state.budgetRecords.filter(b => !(b.year === year && b.categoryId === categoryId));
    
    if (amount > 0) {
      for (let month = 1; month <= 12; month++) {
        newRecords.push({ year, month, categoryId, categoryType, amount });
      }
    }

    const newState = { ...state, budgetRecords: newRecords };
    updateStateAndDB(newState);
  };

  const resetDatabase = async () => {
    if (!db) return;
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => {
            console.log("Database cleared.");
            // Also reset the state to initialData
            setState(initialData);
            // Force a reload to ensure a clean state
            location.reload();
            resolve();
        };
        request.onerror = () => {
            console.error("Error clearing database");
            reject("Error clearing database");
        };
    });
  };

  const contextValue: AppContextType = {
    state,
    isLoading,
    setSharedDate,
    exportData,
    importData,
    resetDatabase,
    setGeminiApiKey,
    addConfigItem,
    updateConfigItem,
    deleteConfigItem,
    addIncomeType,
    updateIncomeType,
    addExpenseType,
    updateExpenseType,
    addTax,
    updateTax,
    deleteTax,
    generateTaxInvoice,
    // Currency
    addCurrency,
    updateCurrency,
    deleteCurrency,
    addDenomination,
    deleteDenomination,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addExchangeRate,
    updateExchangeRate,
    deleteExchangeRate,
    // Debtors
    addDebtor,
    updateDebtor,
    deleteDebtor,
    // Accounts Receivable
    addAccountReceivable,
    updateAccountReceivable,
    receivePaymentForReceivables,
    setIPCRecord,
    setBudgetRecord,
    setYearlyBudgetForCategory,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// --- CUSTOM HOOK ---
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};