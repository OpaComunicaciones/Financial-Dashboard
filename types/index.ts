export type ConfigItem = {
  id: string;
  name: string;
};

export type IncomeType = ConfigItem & {
  isIncome: boolean; // True if it's an income for P&L, false otherwise
  isPlannable?: boolean;
};

export type ExpenseType = ConfigItem & {
  isExpense: boolean; // True if it's an expense for P&L, false otherwise
  isPlannable?: boolean;
  isDeductibleFromSales?: boolean; // True if this expense should be deducted from gross sales for net sales calculation
};

export type TaxPaymentFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export type Tax = {
  id: string;
  name: string;
  percentage: number;
  authority: string; // The entity to whom the tax is paid (e.g., government agency)
  paymentFrequency: TaxPaymentFrequency; // e.g., 'monthly', 'bimonthly', 'annual'
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
  linkedMovementId?: string; // ID of the BankTransaction or CashExpense
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
  taxInfo?: { taxId: string; periodLabel: string; originalTaxableAmount: number; };
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
  isPayment?: boolean;
  linkedDebtId?: string; // ID of Invoice or AccountReceivable
  linkedDebtType?: 'invoice' | 'receivable';
};

export type DailySale = {
  id: string;
  date: string;
  currencyCode: string;
  cash: number;
  card: number;
  transfer: number;
  platform: number; // Sales made through platforms/credit
  customers: number;
};

export type MiscIncome = {
  id: string;
  date: string;
  currencyCode: string;
  conceptId: string;
  detail: string;
  amount: number;
  linkedDebtId?: string;
  linkedDebtType?: 'receivable'; // MiscIncome only linked to ARs usually
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
  isPayment?: boolean;
  linkedDebtId?: string;
  linkedDebtType?: 'invoice' | 'receivable';
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


export type DebtorType = 'delivery_platform' | 'customer' | 'employee';

export type Debtor = {
  id: string;
  name: string;
  type: DebtorType;
};

export type ReceivablePayment = {
  id: string;
  paymentDate: string;
  amount: number;
  method: 'cash' | 'bank';
  bankAccountId?: string; // Only if method is 'bank'
  commissionAmount?: number; // Amount of commission deducted by platform
  linkedMovementId?: string; // ID of the BankTransaction or MiscIncome
};

export type AccountReceivableStatus = 'Pending' | 'Paid' | 'Partially Paid';

export type AccountReceivable = {
  id: string;
  debtorId: string;
  date: string; // Date the receivable was generated (e.g., sale date)
  concept: string; // e.g., "Sale from Uber Eats 2025-03-01", "Employee Loan John Doe"
  amount: number; // Original amount of the receivable
  dueDate?: string; // Optional due date
  status: AccountReceivableStatus;
  payments: ReceivablePayment[];
  currencyCode: string; // Currency of the receivable
};


export interface AppState {
  sharedDate: string;
  geminiApiKey?: string;
  theme: 'dark' | 'light';
  incomeTypes: IncomeType[];
  expenseTypes: ExpenseType[];
  taxes: Tax[];
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
  debtors: Debtor[];
  accountsReceivable: AccountReceivable[];
}