<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Restaurant Financial Dashboard

This is a comprehensive, locally-run web application designed to give restaurant owners and managers a complete and detailed overview of their financial operations. It integrates sales, expenses, cash flow, and planning into a single, intuitive interface, enhanced with AI-powered insights.

All data is stored locally in your browser via IndexedDB, ensuring privacy and offline access.

## Features

### 📊 Dashboard & Analytics
- **Dynamic Dashboard**: Visualize key metrics (Revenue, Expenses, Customers) for any date range (Today, Last 7/30/90 Days, or Custom).
- **Sales Performance Chart**: Track weekly sales against projections to monitor growth.
- **AI-Powered Financial Analyst**: Leverage the Gemini API to get an AI-generated summary of your current financial standing and actionable insights.

### ⚙️ Core Configuration
- **Financial Categories**: Fully customize Income and Expense types, Payment Methods, and Bank Accounts.
- **Accounting Logic**: Define which categories are part of your P&L, which are plannable for budgets, and which expenses are directly deductible from sales (e.g., platform commissions).
- **Currency & Denominations**: Full support for multiple currencies, including custom denominations for precise daily cash reconciliation.
- **Data Management**: Securely export your entire database to a JSON file for backup, import data from a backup, or reset the application to its initial state.
- **API Key Management**: Securely store your Gemini API key to enable AI features.

### 💰 Sales & Cash Management
- **Daily Sales Module**: Log daily sales broken down by payment method (Cash, Card, Bank Transfer) and platform/credit sales.
- **Automated Transaction Creation**: Automatically generates bank transactions for card/transfer sales and creates receivables for platform sales, ensuring no revenue is missed.
- **Daily Cash Reconciliation (Arqueo)**: A detailed interface to count physical cash (bills and coins), automatically calculate surplus or shortage, and log daily cash expenses and other miscellaneous incomes.
- **Secure Closures**: Saved cash closures are locked from editing, with an explicit "Edit" mode to ensure data integrity.

### 🧾 Payables & Receivables
- **Accounts Payable**: Track all supplier invoices with statuses (Pending, Paid, Overdue, Partially Paid). Supports partial payments and automatically creates the corresponding `CashExpense` or `BankTransaction` when a payment is made. Features filters by status and supplier, and allows exporting the filtered view to Excel.
- **Accounts Receivable**: A complete module to manage money owed to the restaurant.
  - **Debtor Management**: Categorize debtors as Delivery Platforms, Direct Customers, or Employees.
  - **Automated Receivable Creation**: Credit sales logged in the Daily Sales module automatically create "Pending" receivables.
  - **Advanced Payment Reconciliation**: A powerful modal allows a single incoming payment to be applied across multiple receivables, automatically calculating and recording platform commissions or differences.
  - **Employee Loan Workflow**: A special workflow for employee loans that tracks the disbursement from a specific cash or bank source, creating the corresponding expense transaction.

### 🏦 Banks & Reporting
- **Bank Management**: Manage transactions for all configured bank accounts and view detailed, downloadable bank statements.
- **Financial Planning**: Define monthly budgets for any plannable income/expense category and track performance with a "Budget vs. Actuals" report.
- **Comprehensive Reporting Suite**:
  - **Profit & Loss (P&L) Statement**: Accrual-based report for a true representation of profitability.
  - **Cash Flow Report**: Detailed breakdown of inflows and outflows.
  - **Sales & Expense Analysis**: Analyze sales by day of the week, payment method, and dig into expense details.
- **Exporting**: All major reports can be exported to formatted PDF and Excel files.

### ✨ General
- **Multi-Language Support**: Fully available in English and Spanish.
- **Local-First Data**: Your data stays on your machine, persisted in the browser via IndexedDB.

## Run Locally

**Prerequisites:** [Node.js](https://nodejs.org/en) installed.

1. **Clone the repository**
   ```bash
   git clone https://github.com/OpaComunicaciones/Financial-Dashboard.git
   cd Financial-Dashboard
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up your Environment (Optional)**
   - If you want to use the AI features, you need a Gemini API key.
   - You can get a key from [Google AI Studio](https://ai.google.dev/).
   - Once you have the key, you can either:
     a. Set it as an environment variable named `GEMINI_API_KEY`.
     b. Run the app and set it in the Configuration page.
4. **Run the app:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173` (or another port if 5173 is in use).