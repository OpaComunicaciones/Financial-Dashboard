export type ConfigItem = {
  id: string;
  name: string;
};

export type IncomeType = ConfigItem & {
  isIncome: boolean; // True if it's an income for P&L, false otherwise
};

export type ExpenseType = ConfigItem & {
  isExpense: boolean; // True if it's an expense for P&L, false otherwise
};

export type Currency = {
  id: string;
  name: string;
  code: string; // e.g., USD, ANG
  symbol: string; // e.g., $, ƒ
};

export type Denomination = {
  id: string;
  currencyId: string;
  value: number;
  type: 'bill' | 'coin';
};

export type InvoiceStatus = 'Pending' | 'Paid' | 'Overdue' | 'Partially Paid';

export type InvoicePayment = {
  id: string;
  method: 'cash' | 'bank';
  accountId?: string; // Only if method is 'bank'
  paymentDate: string;
  amount: number; // The amount of this specific payment
};

export type Invoice = {
  id: string;
  date: string;
  supplier: string;
  invoiceNumber: string;
  conceptId: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  payments: InvoicePayment[];
  currencyCode: string;
};

export type TransactionType = 'deposit' | 'withdrawal';

export type BankAccount = {
  id: string;
  name: string;
  currencyCode: string;
  hasTerminal?: boolean;
};

export type BankTransaction = {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  amount: number; // Positive for deposit, negative for withdrawal. New transactions should use positive values and rely on the 'type' field.
  type?: 'income' | 'expense';
  conceptId?: string;
  isNonDeductible?: boolean;
};

export type DailySale = {
  id: string;
  date: string;
  currencyCode: string;
  cash: number;
  card: number;
  transfer: number;
  customers: number;
};

export type MiscIncome = {
  id: string;
  date: string;
  currencyCode: string;
  conceptId: string;
  detail: string;
  amount: number;
};

export type CashExpense = {
  id: string;
  date: string;
  currencyCode: string;
  supplier: string;
  detail: string;
  conceptId: string;
  invoiceNumber?: string;
  amount: number;
  isNonDeductible?: boolean;
};

export type CashClosure = {
  date: string;
  currencyCode: string; // e.g. 'USD'
  initialBalance: number;
  totalIncome: number;
  totalExpenses: number;
  expectedBalance: number;
  finalBalance: number; // This is the physicalCashTotal
  difference: number;
  counts: Record<string, number>;
};

export type IPCRecord = {
  year: number;
  percentage: number;
};

export type ExchangeRate = {
  id: string;
  date: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rate: number;
};

export type BudgetRecord = {
  year: number;
  month: number; // 1-12
  categoryId: string;
  categoryType: 'income' | 'expense';
  amount: number;
};


export interface AppState {
  sharedDate: string;
  incomeTypes: IncomeType[];
  expenseTypes: ExpenseType[];
  paymentMethods: ConfigItem[];
  currencies: Currency[];
  denominations: Denomination[];
  bankAccounts: BankAccount[];
  invoices: Invoice[];
  transactions: BankTransaction[];
  dailySales: DailySale[];
  miscIncomes: MiscIncome[];
  cashClosures: CashClosure[];
  cashExpenses: CashExpense[];
  ipcRecords: IPCRecord[];
  exchangeRates: ExchangeRate[];
  budgetRecords: BudgetRecord[];
}