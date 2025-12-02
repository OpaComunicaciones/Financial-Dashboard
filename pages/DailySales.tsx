import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import { DollarSign, CreditCard, Landmark, Users, Edit, Trash2, Plus } from 'lucide-react';
import { useTranslation } from '../i18n/i18n';
import { useAppContext } from '../context/AppContext';
import { DailySale } from '../types';
import EditDailySaleModal from '../components/EditDailySaleModal';
import { formatNumber } from '../utils/formatting';
import { calculateNetSalesForDay } from '../utils/calculations';

const DailySales: React.FC = () => {
    const { t } = useTranslation();
    const { state, setSharedDate, logDailySales, deleteDailySale, updateDailySale } = useAppContext();
    const { sharedDate } = state;
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(todayStr);

    const [editingSale, setEditingSale] = useState<DailySale | null>(null);

    const [transfers, setTransfers] = useState<any[]>([]);
    const [platformSales, setPlatformSales] = useState<any[]>([]); // New state for platform sales

    const handleAddTransfer = (currencyCode: string) => {
        setTransfers([...transfers, { id: Date.now(), currencyCode, accountId: '', amount: '' }]);
    };

    const handleTransferChange = (id: number, field: string, value: string) => {
        setTransfers(transfers.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleRemoveTransfer = (id: number) => {
        setTransfers(transfers.filter(t => t.id !== id));
    };

    const handleAddPlatformSale = (currencyCode: string) => {
        setPlatformSales([...platformSales, { id: Date.now(), debtorId: '', amount: '', currencyCode }]);
    };

    const handlePlatformSaleChange = (id: number, field: string, value: string) => {
        setPlatformSales(platformSales.map(ps => ps.id === id ? { ...ps, [field]: value } : ps));
    };

    const handleRemovePlatformSale = (id: number) => {
        setPlatformSales(platformSales.filter(ps => ps.id !== id));
    };

    const handleLogSales = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const salesData: Omit<DailySale, 'id'>[] = [];
        const cardSales: any[] = [];
        
        state.currencies.forEach(currency => {
            const cash = parseFloat(formData.get(`cash-${currency.code}`) as string) || 0;
            let cardTotal = 0;

            state.bankAccounts.filter(ba => ba.currencyCode === currency.code && ba.hasTerminal).forEach(terminal => {
                const terminalAmount = parseFloat(formData.get(`card-${terminal.id}`) as string) || 0;
                if (terminalAmount > 0) {
                    cardSales.push({ accountId: terminal.id, amount: terminalAmount });
                    cardTotal += terminalAmount;
                }
            });

            const transferTotal = transfers.filter(t => t.currencyCode === currency.code).reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

            if (cash > 0 || cardTotal > 0 || transferTotal > 0) {
                 salesData.push({
                    date: sharedDate,
                    currencyCode: currency.code,
                    cash,
                    card: cardTotal,
                    transfer: transferTotal,
                    customers: 0 // Customer count is now global for the day
                });
            }
        });

        const customers = parseInt(formData.get('customers') as string) || 0;
        if (salesData.length > 0) {
            salesData[0].customers = customers;
        } else if (customers > 0) {
            salesData.push({
                date: sharedDate,
                currencyCode: state.currencies[0]?.code || 'N/A',
                cash: 0, card: 0, transfer: 0,
                customers: customers,
            });
        }
        
        const platformSalesToLog = platformSales
            .filter(ps => ps.debtorId && (parseFloat(ps.amount) || 0) > 0)
            .map(ps => ({
                debtorId: ps.debtorId,
                amount: parseFloat(ps.amount) || 0,
                currencyCode: ps.currencyCode,
            }));

        if (salesData.length > 0 || platformSalesToLog.length > 0) {
            logDailySales(salesData, transfers, cardSales, platformSalesToLog);
            alert(t('daily_sales_log_success'));
            (e.target as HTMLFormElement).reset();
            setTransfers([]);
            setPlatformSales([]); // Clear platform sales after logging
        } else {
            alert(t('daily_sales_no_data_error'));
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('daily_sales_delete_confirm'))) {
            deleteDailySale(id);
        }
    };

    const handleUpdate = (sale: DailySale, transfers: any[], cardSales: any[]) => {
        updateDailySale(sale, transfers, cardSales);
    };

    const filteredSales = useMemo(() => {
        return state.dailySales
            .filter(sale => sale.date >= startDate && sale.date <= endDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [state.dailySales, startDate, endDate]);

    const salesTotalsByCurrency = useMemo(() => {
        const totals: { [key: string]: { cash: number; card: number; transfer: number; total: number } } = {};
        const dailyNetSalesCache = new Map<string, number>();

        // Helper to get or calculate net sales for a day to avoid redundant calculations
        const getOrCalculateNetSales = (date: string) => {
            if (!dailyNetSalesCache.has(date)) {
                dailyNetSalesCache.set(date, calculateNetSalesForDay(date, state));
            }
            return dailyNetSalesCache.get(date) as number;
        };

        const dailyGrossSalesByCurrency = new Map<string, { gross: number, currency: string }>();
        
        filteredSales.forEach(sale => {
            if (!dailyGrossSalesByCurrency.has(sale.date)) {
                dailyGrossSalesByCurrency.set(sale.date, { gross: 0, currency: sale.currencyCode});
            }
            const stat = dailyGrossSalesByCurrency.get(sale.date)!;
            stat.gross += sale.cash + sale.card + sale.transfer;
        })


        filteredSales.forEach(sale => {
            if (!totals[sale.currencyCode]) {
                totals[sale.currencyCode] = { cash: 0, card: 0, transfer: 0, total: 0 };
            }
            totals[sale.currencyCode].cash += sale.cash;
            totals[sale.currencyCode].card += sale.card;
            totals[sale.currencyCode].transfer += sale.transfer;

            const netSalesForDay = getOrCalculateNetSales(sale.date);
            const grossSalesForDayInCurrency = dailyGrossSalesByCurrency.get(sale.date)!.gross;
            const grossSalesForSale = sale.cash + sale.card + sale.transfer;
            
            if (grossSalesForDayInCurrency > 0) {
                 const proportion = grossSalesForSale / grossSalesForDayInCurrency;
                 totals[sale.currencyCode].total += netSalesForDay * proportion;
            }
        });

        return totals;
    }, [filteredSales, state]);

    const getCurrencySymbol = (code: string) => {
        return state.currencies.find(c => c.code === code)?.symbol || '$';
    }

    return (
        <div className="space-y-8">
            <EditDailySaleModal 
                isOpen={!!editingSale}
                onClose={() => setEditingSale(null)}
                onSave={handleUpdate}
                sale={editingSale}
            />

            <PageHeader title={t('daily_sales_title')} subtitle={t('daily_sales_subtitle')} />

            <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
                <form onSubmit={handleLogSales} className="space-y-6">
                    <div className="flex items-center gap-4 border-b border-gray-700 pb-6">
                        <label htmlFor="sales-date" className="text-lg font-medium text-gray-300">{t('daily_sales_date')}</label>
                        <input
                            id="sales-date"
                            type="date"
                            value={sharedDate}
                            onChange={(e) => setSharedDate(e.target.value)}
                            required
                            className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-white">{t('daily_sales_by_payment_method')}</h3>
                        {state.currencies.map(currency => (
                            <div key={currency.id} className="p-4 bg-gray-900/50 rounded-lg">
                                <h4 className="text-lg font-bold text-indigo-400 mb-3">{currency.name} ({currency.code})</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <DollarSign className="text-green-400" size={24}/>
                                        <label htmlFor={`cash-${currency.code}`} className="w-32 text-gray-300">{t('daily_sales_cash')}</label>
                                        <input type="number" id={`cash-${currency.code}`} name={`cash-${currency.code}`} step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0,00" />
                                    </div>
                                    {state.bankAccounts.filter(ba => ba.currencyCode === currency.code && ba.hasTerminal).map(terminal => (
                                        <div key={terminal.id} className="flex items-center gap-3">
                                            <CreditCard className="text-blue-400" size={24}/>
                                            <label htmlFor={`card-${terminal.id}`} className="w-32 text-gray-300">{terminal.name}</label>
                                            <input type="number" id={`card-${terminal.id}`} name={`card-${terminal.id}`} step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0,00" />
                                        </div>
                                    ))}
                                    {/* Dynamic Bank Transfers */}
                                    {transfers.filter(t => t.currencyCode === currency.code).map((transfer, index) => (
                                        <div key={transfer.id} className="flex items-center gap-3">
                                            <Landmark className="text-purple-400" size={24}/>
                                            <select value={transfer.accountId} onChange={e => handleTransferChange(transfer.id, 'accountId', e.target.value)} className="w-32 bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                                                <option value="">{t('daily_sales_select_bank')}</option>
                                                {state.bankAccounts.filter(ba => ba.currencyCode === currency.code).map(ba => (
                                                    <option key={ba.id} value={ba.id}>{ba.name}</option>
                                                ))}
                                            </select>
                                            <input type="number" value={transfer.amount} onChange={e => handleTransferChange(transfer.id, 'amount', e.target.value)} step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0,00" />
                                            <button type="button" onClick={() => handleRemoveTransfer(transfer.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddTransfer(currency.code)} className="text-indigo-400 hover:text-indigo-300 font-semibold py-2 rounded-lg flex items-center gap-2">
                                        <Plus size={18} /> {t('daily_sales_add_transfer_button')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Platform Sales / Credit Sales */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-white">{t('daily_sales_platform_sales_title', 'Ventas a Plataformas / Crédito')}</h3>
                        {state.currencies.map(currency => (
                            <div key={`platform-${currency.id}`} className="p-4 bg-gray-900/50 rounded-lg">
                                <h4 className="text-lg font-bold text-teal-400 mb-3">{currency.name} ({currency.code})</h4>
                                <div className="space-y-3">
                                    {platformSales.filter(ps => ps.currencyCode === currency.code).map((ps, index) => (
                                        <div key={ps.id} className="flex items-center gap-3">
                                            <Landmark className="text-teal-400" size={24}/>
                                            <select value={ps.debtorId} onChange={e => handlePlatformSaleChange(ps.id, 'debtorId', e.target.value)} className="w-32 bg-gray-700 border border-gray-600 rounded-md py-2 px-3">
                                                <option value="">{t('ar_select_debtor', 'Seleccionar Deudor')}</option>
                                                {state.debtors.filter(d => d.type === 'delivery_platform' || d.type === 'customer').map(debtor => (
                                                    <option key={debtor.id} value={debtor.id}>{debtor.name}</option>
                                                ))}
                                            </select>
                                            <input type="number" value={ps.amount} onChange={e => handlePlatformSaleChange(ps.id, 'amount', e.target.value)} step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0,00" />
                                            <button type="button" onClick={() => handleRemovePlatformSale(ps.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => handleAddPlatformSale(currency.code)} className="text-teal-400 hover:text-teal-300 font-semibold py-2 rounded-lg flex items-center gap-2">
                                        <Plus size={18} /> {t('daily_sales_add_platform_sale_button', 'Añadir Venta a Plataforma')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-600">
                        <h3 className="text-xl font-semibold text-white">{t('daily_sales_customer_count')}</h3>
                         <div className="flex items-center gap-3">
                            <Users className="text-gray-400" size={24}/>
                            <label htmlFor="customers" className="w-48 text-gray-300">{t('daily_sales_customers_served')}</label>
                            <input type="number" id="customers" name="customers" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3" placeholder="0" />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-300">
                            {t('daily_sales_log_button')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Sales History Table */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">{t('daily_sales_history_title')}</h3>
                <div className="flex flex-wrap items-end gap-4 mb-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-400 mb-1">{t('reports_start_date')}</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-400 mb-1">{t('reports_end_date')}</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3">{t('daily_sales_date')}</th>
                                <th scope="col" className="px-6 py-3">{t('daily_sales_currency')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('daily_sales_cash')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('daily_sales_card')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('daily_sales_transfer')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('daily_sales_total')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('daily_sales_customers_served')}</th>
                                <th scope="col" className="px-6 py-3 text-center">{t('accounts_payable_col_actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map((sale) => {
                                const netSales = calculateNetSalesForDay(sale.date, state);
                                const symbol = getCurrencySymbol(sale.currencyCode);
                                return (
                                    <tr key={sale.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium text-white">{sale.date}</td>
                                        <td className="px-6 py-4">{sale.currencyCode}</td>
                                        <td className="px-6 py-4 text-right font-mono">{formatNumber(sale.cash, { style: 'currency', currencySymbol: symbol })}</td>
                                        <td className="px-6 py-4 text-right font-mono">{formatNumber(sale.card, { style: 'currency', currencySymbol: symbol })}</td>
                                        <td className="px-6 py-4 text-right font-mono">{formatNumber(sale.transfer, { style: 'currency', currencySymbol: symbol })}</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold">{formatNumber(netSales, { style: 'currency', currencySymbol: symbol })}</td>
                                        <td className="px-6 py-4 text-right font-mono">{formatNumber(sale.customers)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-4">
                                                <button onClick={() => setEditingSale(sale)} className="text-blue-400 hover:text-blue-300"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(sale.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-6 text-gray-500">{t('daily_sales_no_history')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-3">{t('daily_sales_summary_title')}</h4>
                    {Object.keys(salesTotalsByCurrency).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(salesTotalsByCurrency).map(([currencyCode, totals]) => {
                                const symbol = getCurrencySymbol(currencyCode);
                                return (
                                    <div key={currencyCode} className="p-3 bg-gray-800 rounded-md">
                                        <p className="font-bold text-indigo-400 mb-2">{t('daily_sales_currency')}: {currencyCode}</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                            <p>{t('daily_sales_cash')}: <span className="font-mono">{formatNumber(totals.cash, { style: 'currency', currencySymbol: symbol })}</span></p>
                                            <p>{t('daily_sales_card')}: <span className="font-mono">{formatNumber(totals.card, { style: 'currency', currencySymbol: symbol })}</span></p>
                                            <p>{t('daily_sales_transfer')}: <span className="font-mono">{formatNumber(totals.transfer, { style: 'currency', currencySymbol: symbol })}</span></p>
                                            <p className="font-bold">{t('daily_sales_total')}: <span className="font-mono">{formatNumber(totals.total, { style: 'currency', currencySymbol: symbol })}</span></p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500">{t('daily_sales_no_summary')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DailySales;