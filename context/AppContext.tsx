import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  AppState, ConfigItem, Invoice, InvoiceStatus, BankTransaction, DailySale,
  CashExpense, CashClosure, Currency, Denomination, MiscIncome, BankAccount,
  IPCRecord, ExchangeRate, BudgetRecord, ExpenseType, IncomeType, InvoicePayment,
  Debtor, AccountReceivable, ReceivablePayment, Tax, AccountReceivableStatus
} from '../types';
import { db } from '@/firebase';
import {
  collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc,
  writeBatch, query, orderBy, limit
} from 'firebase/firestore';

// --- INITIAL DATA ---
const initialData: AppState = {
  sharedDate: new Date().toISOString().split('T')[0],
  geminiApiKey: '',
  theme: 'dark',
  incomeTypes: [],
  expenseTypes: [],
  taxes: [],
  paymentMethods: [],
  currencies: [],
  denominations: [],
  bankAccounts: [],
  invoices: [],
  transactions: [],
  dailySales: [],
  miscIncomes: [],
  cashClosures: [],
  cashExpenses: [],
  ipcRecords: [],
  exchangeRates: [],
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
  toggleTheme: () => void;
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
  addAccountReceivable: (ar: Omit<AccountReceivable, 'id' | 'status' | 'payments'>, loanDetails?: { source: 'cash' | 'bank'; bankAccountId?: string; }) => Promise<void>;
  updateAccountReceivable: (ar: AccountReceivable) => Promise<void>;
  deleteAccountReceivable: (id: string) => Promise<void>;
  receivePaymentForReceivables: (paymentDetails: {
    debtorId: string;
    amountReceived: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'bank';
    bankAccountId?: string;
    commissionAmount?: number;
    receivablesToApply: { id: string; amountApplied: number }[];
  }) => Promise<void>;
  // Financials
  addInvoice: (invoice: Omit<Invoice, 'id' | 'status' | 'payments'>) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => Promise<void>;
  payInvoice: (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => Promise<void>;
  logDailySales: (sales: Omit<DailySale, 'id'>[], transfers: any[], cardSales: any[], platformSales: { debtorId: string; amount: number; currencyCode: string; }[]) => Promise<void>;
  updateDailySale: (sale: DailySale, transfers: any[], cardSales: any[]) => Promise<void>;
  deleteDailySale: (id: string) => void;
  addMiscIncome: (income: Omit<MiscIncome, 'id'>) => void;
  updateMiscIncome: (income: MiscIncome) => Promise<void>;
  deleteMiscIncome: (id: string) => Promise<void>;
  addCashExpense: (expense: Omit<CashExpense, 'id'>) => void;
  updateCashExpense: (expense: CashExpense) => Promise<void>;
  deleteCashExpense: (id: string) => Promise<void>;
  addBankTransaction: (transaction: Omit<BankTransaction, 'id'>) => void;
  updateBankTransaction: (transaction: BankTransaction) => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
  saveCashClosure: (closure: CashClosure) => Promise<void>;
  deleteInvoicePayment: (invoiceId: string, paymentId: string) => Promise<void>;
  deleteReceivablePayment: (receivableId: string, paymentId: string) => Promise<void>;
  // Planning
  setIPCRecord: (record: IPCRecord) => void;
  setBudgetRecord: (record: BudgetRecord) => void;
  setYearlyBudgetForCategory: (details: { year: number, categoryId: string, categoryType: 'income' | 'expense', amount: number }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialData);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with Firestore
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const syncCollection = (collectionName: keyof AppState, sortFn?: (a: any, b: any) => number) => {
      const q = collection(db, collectionName);
      const unsub = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];
        if (sortFn) (items as any[]).sort(sortFn);

        setState(prev => ({
          ...prev,
          [collectionName]: items
        } as AppState));
      });
      unsubscribes.push(unsub);
    };

    // Metadata sync (sharedDate, geminiApiKey)
    const settingsUnsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setState(prev => ({
          ...prev,
          sharedDate: data.sharedDate || prev.sharedDate,
          geminiApiKey: data.geminiApiKey || prev.geminiApiKey,
          theme: data.theme || prev.theme
        }));
      } else {
        // Init settings if they don't exist
        setDoc(doc(db, 'settings', 'global'), {
          sharedDate: new Date().toISOString().split('T')[0],
          geminiApiKey: '',
          theme: 'dark'
        });
      }
    });
    unsubscribes.push(settingsUnsub);

    // Sync all collections
    const collectionsToSync: { name: keyof AppState, sort?: (a: any, b: any) => number }[] = [
      { name: 'incomeTypes', sort: (a, b) => a.name.localeCompare(b.name) },
      { name: 'expenseTypes', sort: (a, b) => a.name.localeCompare(b.name) },
      { name: 'taxes' },
      { name: 'paymentMethods' },
      { name: 'currencies' },
      { name: 'denominations' },
      { name: 'bankAccounts' },
      { name: 'invoices', sort: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() },
      { name: 'transactions', sort: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() },
      { name: 'dailySales', sort: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() },
      { name: 'miscIncomes' },
      { name: 'cashClosures' },
      { name: 'cashExpenses' },
      { name: 'ipcRecords', sort: (a, b) => b.year - a.year },
      { name: 'exchangeRates', sort: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() },
      { name: 'budgetRecords' },
      { name: 'debtors' },
      { name: 'accountsReceivable' },
    ];

    collectionsToSync.forEach(c => syncCollection(c.name, c.sort));

    // Simple delay to say we are "loaded" after first batch of snapshots
    // In a real app, you'd track each unsub's first hit.
    const timer = setTimeout(() => setIsLoading(false), 2000);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  // Update document class when theme changes
  useEffect(() => {
    if (state.theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [state.theme]);

  const setSharedDate = (date: string) => {
    updateDoc(doc(db, 'settings', 'global'), { sharedDate: date });
  };

  const setGeminiApiKey = (key: string) => {
    updateDoc(doc(db, 'settings', 'global'), { geminiApiKey: key });
  };

  const toggleTheme = () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    updateDoc(doc(db, 'settings', 'global'), { theme: newTheme });
  };

  const exportData = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(state, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().split('T')[0];
    link.download = `restofin_backup_firebase_${date}.json`;
    link.click();
  };

  // Import logic: Similar to Migrator, but within context
  const importData = async (json: string) => {
    try {
      const data = JSON.parse(json);
      const batch = writeBatch(db);

      // For each collection in AppState that is an array
      const keys = Object.keys(data).filter(k => Array.isArray(data[k]));

      for (const key of keys) {
        data[key].forEach((item: any) => {
          const id = item.id ? String(item.id) : doc(collection(db, key)).id;
          batch.set(doc(db, key, id), item);
        });
      }

      await batch.commit();
      alert('Data imported and synced to Firebase!');
    } catch (e) {
      console.error(e);
      alert('Failed to import data.');
    }
  };

  const resetDatabase = async () => {
    if (!window.confirm("Esto limpiará TODAS las colecciones en Firebase. Esta operación no se puede deshacer fácilmente.")) return;
    // Clearing Firestore collections is complex from client side (it requires deleting docs one by one or cloud function)
    // For now, we'll just alert that this should be done in Firebase Console or implement a loop.
    alert("Por seguridad, borra los datos directamente en la consola de Firebase.");
  };

  // Helper for Firestore mutations
  const addItem = (coll: string, item: any) => {
    const id = item.id || doc(collection(db, coll)).id;
    setDoc(doc(db, coll, id), { ...item, id });
  };

  const updateItem = (coll: string, id: string, data: any) => {
    updateDoc(doc(db, coll, id), data);
  };

  const deleteItem = (coll: string, id: string) => {
    deleteDoc(doc(db, coll, id));
  };

  const addConfigItem = (category: ConfigCategory, name: string) => {
    addItem(category, { name });
  };

  const updateConfigItem = (category: ConfigCategory, id: string, name: string) => {
    updateItem(category, id, { name });
  };

  const deleteConfigItem = (category: string, id: string) => {
    deleteItem(category, id);
  };

  const addIncomeType = (name: string, isIncome: boolean, isPlannable: boolean) => {
    addItem('incomeTypes', { name, isIncome, isPlannable });
  };

  const updateIncomeType = (id: string, name: string, isIncome: boolean, isPlannable: boolean) => {
    updateItem('incomeTypes', id, { name, isIncome, isPlannable });
  };

  const addExpenseType = (name: string, isExpense: boolean, isPlannable: boolean, isDeductibleFromSales?: boolean) => {
    addItem('expenseTypes', { name, isExpense, isPlannable, isDeductibleFromSales: !!isDeductibleFromSales });
  };

  const updateExpenseType = (id: string, name: string, isExpense: boolean, isPlannable: boolean, isDeductibleFromSales?: boolean) => {
    updateItem('expenseTypes', id, { name, isExpense, isPlannable, isDeductibleFromSales: !!isDeductibleFromSales });
  };

  const addTax = (tax: Omit<Tax, 'id'>) => {
    addItem('taxes', tax);
  };

  const updateTax = (tax: Tax) => {
    updateItem('taxes', tax.id, tax);
  };

  const deleteTax = (id: string) => {
    deleteItem('taxes', id);
  };

  const addCurrency = (currency: Omit<Currency, 'id'>) => {
    addItem('currencies', currency);
  };

  const updateCurrency = (currency: Currency) => {
    updateItem('currencies', currency.id, currency);
  };

  const deleteCurrency = (id: string) => {
    deleteItem('currencies', id);
    // Note: denominations linked to this currency should also be deleted
    state.denominations.filter(d => d.currencyId === id).forEach(d => deleteItem('denominations', d.id));
  };

  const addDenomination = (denomination: Omit<Denomination, 'id'>) => {
    addItem('denominations', denomination);
  };

  const deleteDenomination = (id: string) => {
    deleteItem('denominations', id);
  };

  const addBankAccount = (account: Omit<BankAccount, 'id'>) => {
    addItem('bankAccounts', account);
  };

  const updateBankAccount = (account: BankAccount) => {
    updateItem('bankAccounts', account.id, account);
  };

  const deleteBankAccount = (id: string) => {
    deleteItem('bankAccounts', id);
  };

  const addExchangeRate = (rate: Omit<ExchangeRate, 'id'>) => {
    addItem('exchangeRates', rate);
  };

  const updateExchangeRate = (rate: ExchangeRate) => {
    updateItem('exchangeRates', rate.id, rate);
  };

  const deleteExchangeRate = (id: string) => {
    deleteItem('exchangeRates', id);
  };

  const addDebtor = (debtor: Omit<Debtor, 'id'>) => {
    addItem('debtors', debtor);
  };

  const updateDebtor = (debtor: Debtor) => {
    updateItem('debtors', debtor.id, debtor);
  };

  const deleteDebtor = (id: string) => {
    deleteItem('debtors', id);
  };

  const addAccountReceivable = async (ar: Omit<AccountReceivable, 'id' | 'status' | 'payments'>, loanDetails?: { source: 'cash' | 'bank'; bankAccountId?: string; }) => {
    const batch = writeBatch(db);
    const arId = doc(collection(db, 'accountsReceivable')).id;

    const newAR: AccountReceivable = {
      ...ar,
      id: arId,
      status: 'Pending',
      payments: [],
    };

    batch.set(doc(db, 'accountsReceivable', arId), newAR);

    if (loanDetails) {
      let loanType = state.expenseTypes.find(et => et.name === 'Préstamo a Empleado');
      if (!loanType) {
        const typeId = doc(collection(db, 'expenseTypes')).id;
        loanType = { id: typeId, name: 'Préstamo a Empleado', isExpense: false, isPlannable: false };
        batch.set(doc(db, 'expenseTypes', typeId), loanType);
      }

      const debtorName = state.debtors.find(d => d.id === ar.debtorId)?.name || 'Desconocido';

      if (loanDetails.source === 'cash') {
        const expId = `loan_${arId}`;
        batch.set(doc(db, 'cashExpenses', expId), {
          id: expId,
          date: ar.date,
          currencyCode: ar.currencyCode,
          supplier: debtorName,
          detail: `Préstamo a empleado: ${ar.concept}`,
          conceptId: loanType.id,
          amount: ar.amount,
          linkedDebtId: arId,
          linkedDebtType: 'receivable'
        });
      } else if (loanDetails.source === 'bank' && loanDetails.bankAccountId) {
        const txId = `loan_${arId}`;
        batch.set(doc(db, 'transactions', txId), {
          id: txId,
          bankAccountId: loanDetails.bankAccountId,
          date: ar.date,
          description: `Préstamo a empleado: ${debtorName} - ${ar.concept}`,
          amount: -Math.abs(ar.amount),
          type: 'expense',
          conceptId: loanType.id,
          linkedDebtId: arId,
          linkedDebtType: 'receivable'
        });
      }
    }

    await batch.commit();
  };

  const updateAccountReceivable = async (ar: AccountReceivable) => {
    // Recalculate status in case amount was changed
    const payments = ar.payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const status: AccountReceivableStatus = totalPaid >= ar.amount - 0.001
      ? 'Paid'
      : (totalPaid > 0 ? 'Partially Paid' : 'Pending');

    // Extract ID and avoid sending undefined fields if any (Firestore doesn't like undefined)
    const { id, ...dataToUpdate } = ar;

    // Ensure all values are defined (omit undefined ones)
    const cleanData = JSON.parse(JSON.stringify({ ...dataToUpdate, status, payments }));

    await setDoc(doc(db, 'accountsReceivable', id), cleanData, { merge: true });
  };

  const deleteAccountReceivable = async (id: string) => {
    const ar = state.accountsReceivable.find(item => item.id === id);
    if (!ar) return;

    const batch = writeBatch(db);
    batch.delete(doc(db, 'accountsReceivable', id));

    // Delete loan movement if it exists
    batch.delete(doc(db, 'cashExpenses', `loan_${id}`));
    batch.delete(doc(db, 'transactions', `loan_${id}`));

    // Delete all linked payment movements
    ar.payments?.forEach(p => {
      if (p.linkedMovementId) {
        batch.delete(doc(db, 'transactions', p.linkedMovementId));
        batch.delete(doc(db, 'miscIncomes', p.linkedMovementId));
      }
    });

    await batch.commit();
  };

  const receivePaymentForReceivables = async (paymentDetails: {
    debtorId: string;
    amountReceived: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'bank';
    bankAccountId?: string;
    commissionAmount?: number;
    receivablesToApply: { id: string; amountApplied: number }[];
  }) => {
    const { debtorId, amountReceived, paymentDate, paymentMethod, bankAccountId, commissionAmount, receivablesToApply } = paymentDetails;
    const batch = writeBatch(db);

    try {
      const debtorName = state.debtors.find(d => d.id === debtorId)?.name || 'Unknown';
      let movementId = '';

      // Get the currency from the first AR being applied, or default to system currency
      const firstArId = receivablesToApply[0]?.id;
      const firstAr = state.accountsReceivable.find(ar => ar.id === firstArId);
      const currencyCode = firstAr?.currencyCode || state.currencies[0]?.code || 'USD';

      // 1. Create the Movement (Bank or Cash)
      if (amountReceived > 0) {
        let arConcept = state.incomeTypes.find(it => it.name === 'Cuentas por Cobrar') || state.incomeTypes.find(it => it.name === 'Accounts Receivable');

        if (!arConcept) {
          const cid = doc(collection(db, 'incomeTypes')).id;
          arConcept = { id: cid, name: 'Cuentas por Cobrar', isIncome: true, isPlannable: false };
          batch.set(doc(db, 'incomeTypes', cid), arConcept);
        }

        if (paymentMethod === 'bank' && bankAccountId) {
          movementId = doc(collection(db, 'transactions')).id;
          const transDoc: any = {
            id: movementId,
            bankAccountId,
            date: paymentDate,
            amount: amountReceived,
            type: 'income',
            conceptId: arConcept.id,
            description: `Pago de deudor (${debtorName})`,
            isPayment: true,
            linkedDebtType: 'receivable',
          };
          if (firstArId) transDoc.linkedDebtId = firstArId;
          batch.set(doc(db, 'transactions', movementId), transDoc);
        } else {
          movementId = doc(collection(db, 'miscIncomes')).id;
          const miscDoc: any = {
            id: movementId,
            date: paymentDate,
            amount: amountReceived,
            conceptId: arConcept.id,
            detail: `Pago de deudor (${debtorName}) en efectivo`,
            currencyCode,
            linkedDebtType: 'receivable'
          };
          if (firstArId) miscDoc.linkedDebtId = firstArId;
          batch.set(doc(db, 'miscIncomes', movementId), miscDoc);
        }
      }

      // 2. Update the Receivables
      receivablesToApply.forEach(r => {
        const ar = state.accountsReceivable.find(item => item.id === r.id);
        if (ar) {
          const newPayment: ReceivablePayment = {
            id: `${Date.now()}_${r.id}_${Math.random().toString(36).substr(2, 5)}`,
            paymentDate,
            amount: r.amountApplied,
            method: paymentMethod,
          };

          if (paymentMethod === 'bank' && bankAccountId) {
            newPayment.bankAccountId = bankAccountId;
          }
          if (movementId) {
            newPayment.linkedMovementId = movementId;
          }

          const payments = ar.payments || [];
          const updatedPayments = [...payments, newPayment];
          const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

          let status: AccountReceivableStatus = 'Pending';
          if (totalPaid >= ar.amount - 0.001) status = 'Paid';
          else if (totalPaid > 0) status = 'Partially Paid';

          batch.update(doc(db, 'accountsReceivable', ar.id), { payments: updatedPayments, status });
        }
      });

      // 3. Handle Commissions
      if (commissionAmount && commissionAmount > 0) {
        let commConcept = state.expenseTypes.find(et => et.name === 'Comisiones Plataformas') || state.expenseTypes.find(et => et.name === 'Platform Commissions');

        if (!commConcept) {
          const cid = doc(collection(db, 'expenseTypes')).id;
          commConcept = { id: cid, name: 'Comisiones Plataformas', isExpense: true, isPlannable: false };
          batch.set(doc(db, 'expenseTypes', cid), commConcept);
        }

        const expId = doc(collection(db, 'cashExpenses')).id;
        const commDoc: any = {
          id: expId,
          date: paymentDate,
          amount: commissionAmount,
          conceptId: commConcept.id,
          supplier: debtorName,
          detail: `Comisión por pago de ${debtorName}`,
          currencyCode,
          isPayment: true,
          linkedDebtType: 'receivable'
        };
        if (firstArId) commDoc.linkedDebtId = firstArId;

        batch.set(doc(db, 'cashExpenses', expId), commDoc);
      }

      await batch.commit();
    } catch (error) {
      console.error("Error committing payment batch:", error);
      throw error;
    }
  };

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'status' | 'payments'>) => {
    const id = doc(collection(db, 'invoices')).id;
    const status = new Date(invoice.dueDate) < new Date() ? 'Overdue' : 'Pending';
    addItem('invoices', { ...invoice, id, status, payments: [] });
  };

  const updateInvoice = (invoice: Invoice) => {
    updateItem('invoices', invoice.id, invoice);
  };

  const deleteInvoice = async (id: string) => {
    const inv = state.invoices.find(item => item.id === id);
    if (!inv) return;

    const batch = writeBatch(db);
    batch.delete(doc(db, 'invoices', id));

    // Delete all linked payment movements
    inv.payments?.forEach(p => {
      if (p.linkedMovementId) {
        batch.delete(doc(db, 'transactions', p.linkedMovementId));
        batch.delete(doc(db, 'cashExpenses', p.linkedMovementId));
      }
    });

    await batch.commit();
  };

  const payInvoice = async (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => {
    const invoice = state.invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const batch = writeBatch(db);
    const payId = doc(collection(db, 'invoicePayments')).id;
    let movementId = '';

    if (payment.method === 'cash') {
      movementId = doc(collection(db, 'cashExpenses')).id;
      batch.set(doc(db, 'cashExpenses', movementId), {
        id: movementId, date: payment.paymentDate, amount: payment.amount, conceptId: invoice.conceptId,
        supplier: invoice.supplier, detail: `Payment for invoice #${invoice.invoiceNumber}`,
        currencyCode: invoice.currencyCode, invoiceNumber: invoice.invoiceNumber,
        isPayment: true, linkedDebtId: invoice.id, linkedDebtType: 'invoice'
      });
    } else if (payment.accountId) {
      movementId = doc(collection(db, 'transactions')).id;
      batch.set(doc(db, 'transactions', movementId), {
        id: movementId, bankAccountId: payment.accountId, date: payment.paymentDate,
        amount: -Math.abs(payment.amount), type: 'expense', conceptId: invoice.conceptId,
        description: `Payment for invoice #${invoice.invoiceNumber} from ${invoice.supplier}`,
        isPayment: true, linkedDebtId: invoice.id, linkedDebtType: 'invoice'
      });
    }

    const newPayments = [...(invoice.payments || []), { ...payment, id: payId, linkedMovementId: movementId || undefined }];
    const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
    const status = totalPaid >= invoice.amount - 0.001 ? 'Paid' : 'Partially Paid';

    batch.update(doc(db, 'invoices', invoiceId), { payments: newPayments, status });

    await batch.commit();
  };

  const logDailySales = async (sales: Omit<DailySale, 'id'>[], transfers: any[], cardSales: any[], platformSales: any[]) => {
    const batch = writeBatch(db);
    const { sharedDate } = state;

    sales.forEach(s => {
      const id = `${s.date}_${s.currencyCode}_${Date.now()}`;
      batch.set(doc(db, 'dailySales', id), { ...s, id });
    });

    let ventasDirectas = state.incomeTypes.find(it => it.name === 'Ventas Directas');
    if (!ventasDirectas) {
      const id = doc(collection(db, 'incomeTypes')).id;
      ventasDirectas = { id, name: 'Ventas Directas', isIncome: true, isPlannable: false };
      batch.set(doc(db, 'incomeTypes', id), ventasDirectas);
    }

    cardSales.forEach(cs => {
      if (parseFloat(cs.amount) > 0) {
        const id = doc(collection(db, 'transactions')).id;
        batch.set(doc(db, 'transactions', id), {
          id, bankAccountId: cs.accountId, date: sharedDate, amount: parseFloat(cs.amount),
          type: 'income', conceptId: ventasDirectas?.id, description: `Credit Card Sales for ${sharedDate}`
        });
      }
    });

    transfers.forEach(t => {
      if (parseFloat(t.amount) > 0) {
        const id = doc(collection(db, 'transactions')).id;
        batch.set(doc(db, 'transactions', id), {
          id, bankAccountId: t.accountId, date: sharedDate, amount: parseFloat(t.amount),
          type: 'income', conceptId: ventasDirectas?.id, description: `Bank Transfer Sales for ${sharedDate}`
        });
      }
    });

    platformSales.forEach(ps => {
      if (parseFloat(ps.amount) > 0) {
        const id = doc(collection(db, 'accountsReceivable')).id;
        batch.set(doc(db, 'accountsReceivable', id), {
          id, debtorId: ps.debtorId, date: sharedDate, amount: parseFloat(ps.amount),
          currencyCode: ps.currencyCode, status: 'Pending', payments: [],
          concept: `Venta a ${state.debtors.find(d => d.id === ps.debtorId)?.name} (${sharedDate})`
        });
      }
    });

    await batch.commit();
  };

  const updateDailySale = async (sale: DailySale, transfers: any[], cardSales: any[]) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'dailySales', sale.id), sale);
    // Note: Reconciling transactions on update in Firebase is harder because we need to delete old ones.
    // For now, this just updates the sale record. Complete reconciliation logic should be added if needed.
    await batch.commit();
  };

  const deleteBankTransaction = async (id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'transactions', id));

    // Cascade: find any invoice or AR that has a payment linked to this transaction
    state.invoices.forEach(inv => {
      if (inv.payments?.some(p => p.linkedMovementId === id)) {
        const newPayments = inv.payments.filter(p => p.linkedMovementId !== id);
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= inv.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'invoices', inv.id), { payments: newPayments, status });
      }
    });

    state.accountsReceivable.forEach(ar => {
      if (ar.payments?.some(p => p.linkedMovementId === id)) {
        const newPayments = ar.payments.filter(p => p.linkedMovementId !== id);
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= ar.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'accountsReceivable', ar.id), { payments: newPayments, status });
      }
    });

    await batch.commit();
  };

  const deleteMiscIncome = async (id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'miscIncomes', id));

    state.accountsReceivable.forEach(ar => {
      if (ar.payments?.some(p => p.linkedMovementId === id)) {
        const newPayments = ar.payments.filter(p => p.linkedMovementId !== id);
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= ar.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'accountsReceivable', ar.id), { payments: newPayments, status });
      }
    });

    await batch.commit();
  };

  const deleteCashExpense = async (id: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'cashExpenses', id));

    state.invoices.forEach(inv => {
      if (inv.payments?.some(p => p.linkedMovementId === id)) {
        const newPayments = inv.payments.filter(p => p.linkedMovementId !== id);
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= inv.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'invoices', inv.id), { payments: newPayments, status });
      }
    });

    await batch.commit();
  };

  const deleteDailySale = (id: string) => deleteItem('dailySales', id);

  const addMiscIncome = (income: Omit<MiscIncome, 'id'>) => {
    const id = doc(collection(db, 'miscIncomes')).id;
    addItem('miscIncomes', { ...income, id });
  };

  const updateMiscIncome = async (income: MiscIncome) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'miscIncomes', income.id), income);

    // Cascade update to ARs
    state.accountsReceivable.forEach(ar => {
      const payIdx = ar.payments?.findIndex(p => p.linkedMovementId === income.id);
      if (payIdx !== undefined && payIdx !== -1) {
        const newPayments = [...ar.payments];
        newPayments[payIdx] = { ...newPayments[payIdx], amount: income.amount, paymentDate: income.date };
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= ar.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'accountsReceivable', ar.id), { payments: newPayments, status });
      }
    });

    await batch.commit();
  };

  const addCashExpense = (expense: Omit<CashExpense, 'id'>) => {
    const id = doc(collection(db, 'cashExpenses')).id;
    addItem('cashExpenses', { ...expense, id });
  };

  const updateCashExpense = async (expense: CashExpense) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'cashExpenses', expense.id), expense);

    // Cascade update to Invoices
    state.invoices.forEach(inv => {
      const payIdx = inv.payments?.findIndex(p => p.linkedMovementId === expense.id);
      if (payIdx !== undefined && payIdx !== -1) {
        const newPayments = [...inv.payments];
        newPayments[payIdx] = { ...newPayments[payIdx], amount: expense.amount, paymentDate: expense.date };
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= inv.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'invoices', inv.id), { payments: newPayments, status });
      }
    });

    await batch.commit();
  };

  const addBankTransaction = (tx: Omit<BankTransaction, 'id'>) => {
    const id = doc(collection(db, 'transactions')).id;
    addItem('transactions', { ...tx, id });
  };

  const updateBankTransaction = async (tx: BankTransaction) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'transactions', tx.id), tx);

    const absAmount = Math.abs(tx.amount);

    // Cascade update to Invoices
    state.invoices.forEach(inv => {
      const payIdx = inv.payments?.findIndex(p => p.linkedMovementId === tx.id);
      if (payIdx !== undefined && payIdx !== -1) {
        const newPayments = [...inv.payments];
        newPayments[payIdx] = { ...newPayments[payIdx], amount: absAmount, paymentDate: tx.date };
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= inv.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'invoices', inv.id), { payments: newPayments, status });
      }
    });

    // Cascade update to ARs
    state.accountsReceivable.forEach(ar => {
      const payIdx = ar.payments?.findIndex(p => p.linkedMovementId === tx.id);
      if (payIdx !== undefined && payIdx !== -1) {
        const newPayments = [...ar.payments];
        newPayments[payIdx] = { ...newPayments[payIdx], amount: absAmount, paymentDate: tx.date };
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        const status = totalPaid >= ar.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
        batch.update(doc(db, 'accountsReceivable', ar.id), { payments: newPayments, status });
      }
    });

    await batch.commit();
  };
  const saveCashClosure = async (closure: CashClosure) => {
    const batch = writeBatch(db);

    let surplus = state.incomeTypes.find(it => it.name === 'Surplus');
    if (!surplus) {
      const id = doc(collection(db, 'incomeTypes')).id;
      surplus = { id, name: 'Surplus', isIncome: true, isPlannable: false };
      batch.set(doc(db, 'incomeTypes', id), surplus);
    }
    let shortage = state.expenseTypes.find(et => et.name === 'Shortage');
    if (!shortage) {
      const id = doc(collection(db, 'expenseTypes')).id;
      shortage = { id, name: 'Shortage', isExpense: true, isPlannable: false };
      batch.set(doc(db, 'expenseTypes', id), shortage);
    }

    const closureId = `${closure.date}_${closure.currencyCode}`;
    batch.set(doc(db, 'cashClosures', closureId), closure);

    if (closure.difference > 0) {
      const id = `surplus_${closureId}`;
      batch.set(doc(db, 'miscIncomes', id), {
        id, date: closure.date, currencyCode: closure.currencyCode, conceptId: surplus.id,
        detail: 'Cash surplus from daily closure', amount: closure.difference
      });
    } else if (closure.difference < 0) {
      const id = `shortage_${closureId}`;
      batch.set(doc(db, 'cashExpenses', id), {
        id, date: closure.date, currencyCode: closure.currencyCode, conceptId: shortage.id,
        supplier: 'Internal', detail: 'Cash shortage from daily closure', amount: Math.abs(closure.difference)
      });
    }

    await batch.commit();
  };

  const setIPCRecord = (record: IPCRecord) => {
    setDoc(doc(db, 'ipcRecords', String(record.year)), record);
  };

  const setBudgetRecord = (record: BudgetRecord) => {
    const id = `${record.year}_${record.month}_${record.categoryId}`;
    if (record.amount > 0) {
      setDoc(doc(db, 'budgetRecords', id), record);
    } else {
      deleteDoc(doc(db, 'budgetRecords', id));
    }
  };

  const setYearlyBudgetForCategory = async (details: { year: number, categoryId: string, categoryType: 'income' | 'expense', amount: number }) => {
    const batch = writeBatch(db);
    for (let month = 1; month <= 12; month++) {
      const id = `${details.year}_${month}_${details.categoryId}`;
      if (details.amount > 0) {
        batch.set(doc(db, 'budgetRecords', id), { ...details, month });
      } else {
        batch.delete(doc(db, 'budgetRecords', id));
      }
    }
    await batch.commit();
  };

  const generateTaxInvoice = async (details: { taxId: string; periodLabel: string; amount: number; originalTaxableAmount: number; }) => {
    const tax = state.taxes.find(t => t.id === details.taxId);
    if (!tax) return;

    let taxConcept = state.expenseTypes.find(et => et.name === 'Pago de Impuestos');
    const batch = writeBatch(db);

    if (!taxConcept) {
      const tid = doc(collection(db, 'expenseTypes')).id;
      taxConcept = { id: tid, name: 'Pago de Impuestos', isExpense: true, isPlannable: false };
      batch.set(doc(db, 'expenseTypes', tid), taxConcept);
    }

    const invId = doc(collection(db, 'invoices')).id;
    batch.set(doc(db, 'invoices', invId), {
      id: invId,
      date: new Date().toISOString().split('T')[0],
      supplier: tax.authority,
      invoiceNumber: `TAX-${tax.name.toUpperCase()}-${details.periodLabel}`,
      conceptId: taxConcept.id,
      amount: details.amount,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      payments: [],
      currencyCode: state.currencies[0]?.code || 'USD',
      taxInfo: { taxId: details.taxId, periodLabel: details.periodLabel, originalTaxableAmount: details.originalTaxableAmount }
    });

    await batch.commit();
  };

  const deleteInvoicePayment = async (invoiceId: string, paymentId: string) => {
    const inv = state.invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const payment = inv.payments?.find(p => p.id === paymentId);
    if (!payment) return;

    const batch = writeBatch(db);

    // Update invoice: remove payment and recalculate status
    const newPayments = inv.payments.filter(p => p.id !== paymentId);
    const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
    const status = totalPaid >= inv.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
    batch.update(doc(db, 'invoices', invoiceId), { payments: newPayments, status });

    // Cascade delete the associated movement
    if (payment.linkedMovementId) {
      batch.delete(doc(db, 'transactions', payment.linkedMovementId));
      batch.delete(doc(db, 'cashExpenses', payment.linkedMovementId));
    }

    await batch.commit();
  };

  const deleteReceivablePayment = async (receivableId: string, paymentId: string) => {
    const ar = state.accountsReceivable.find(a => a.id === receivableId);
    if (!ar) return;

    const payment = ar.payments?.find(p => p.id === paymentId);
    if (!payment) return;

    const batch = writeBatch(db);

    // Update AR: remove payment and recalculate status
    const newPayments = ar.payments.filter(p => p.id !== paymentId);
    const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
    const status = totalPaid >= ar.amount - 0.001 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Pending');
    batch.update(doc(db, 'accountsReceivable', receivableId), { payments: newPayments, status });

    // Cascade delete the associated movement
    if (payment.linkedMovementId) {
      batch.delete(doc(db, 'transactions', payment.linkedMovementId));
      batch.delete(doc(db, 'miscIncomes', payment.linkedMovementId));
    }

    await batch.commit();
  };

  const contextValue: AppContextType = {
    state, isLoading, setSharedDate, exportData, importData, resetDatabase, setGeminiApiKey, toggleTheme,
    addConfigItem, updateConfigItem, deleteConfigItem, addIncomeType, updateIncomeType,
    addExpenseType, updateExpenseType, addTax, updateTax, deleteTax, generateTaxInvoice,
    addCurrency, updateCurrency, deleteCurrency, addDenomination, deleteDenomination,
    addBankAccount, updateBankAccount, deleteBankAccount, addExchangeRate,
    updateExchangeRate, deleteExchangeRate, addDebtor, updateDebtor, deleteDebtor,
    addAccountReceivable, updateAccountReceivable, deleteAccountReceivable, receivePaymentForReceivables,
    addInvoice, updateInvoice, deleteInvoice, payInvoice, logDailySales,
    updateDailySale, deleteDailySale, addMiscIncome, updateMiscIncome, deleteMiscIncome,
    addCashExpense, updateCashExpense, deleteCashExpense, addBankTransaction,
    updateBankTransaction, deleteBankTransaction, saveCashClosure,
    deleteInvoicePayment, deleteReceivablePayment,
    setIPCRecord, setBudgetRecord, setYearlyBudgetForCategory
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};