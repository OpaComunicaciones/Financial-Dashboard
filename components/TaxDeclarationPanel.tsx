
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n/i18n';
import { formatNumber } from '../utils/formatting';
import { Tax, TaxPaymentFrequency } from '../types';
import { calculateNetSalesForDay } from '../utils/calculations';

// Helper to get the number of months for a frequency
const getMonthsForFrequency = (frequency: TaxPaymentFrequency): number => {
  switch (frequency) {
    case 'monthly': return 1;
    case 'bimonthly': return 2;
    case 'quarterly': return 3;
    case 'semiannual': return 6;
    case 'annual': return 12;
    default: return 1;
  }
};

// Helper to determine the fiscal period for a given date and frequency

const getFiscalPeriod = (date: Date, frequency: TaxPaymentFrequency): { periodLabel: string; periodKey: string } => {

  const year = date.getUTCFullYear();

  const month = date.getUTCMonth(); // 0-11

  const monthsInPeriod = getMonthsForFrequency(frequency);



  if (monthsInPeriod === 12) {

    return { periodLabel: `${year}`, periodKey: `${year}` };

  }



  if (monthsInPeriod === 6) {

    const semester = month < 6 ? 1 : 2;

    const startMonth = new Date(Date.UTC(year, semester === 1 ? 0 : 6, 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });

    const endMonth = new Date(Date.UTC(year, semester === 1 ? 5 : 11, 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });

    return { periodLabel: `${startMonth} - ${endMonth} ${year}`, periodKey: `${year}-S${semester}` };

  }

  

  if (monthsInPeriod === 3) {

      const quarter = Math.floor(month / 3) + 1;

      const startMonth = new Date(Date.UTC(year, (quarter-1)*3, 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });

      const endMonth = new Date(Date.UTC(year, quarter*3 - 1, 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });

      return { periodLabel: `${startMonth} - ${endMonth} ${year}`, periodKey: `${year}-Q${quarter}` };

  }



  if (monthsInPeriod === 2) {

    const bimonthlyPeriod = Math.floor(month / 2) + 1;

    const startMonth = new Date(Date.UTC(year, (bimonthlyPeriod-1)*2, 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });

    const endMonth = new Date(Date.UTC(year, bimonthlyPeriod*2 - 1, 1)).toLocaleString('default', { month: 'short', timeZone: 'UTC' });

    return { periodLabel: `${startMonth} - ${endMonth} ${year}`, periodKey: `${year}-B${bimonthlyPeriod}` };

  }



  // Monthly

  const monthName = date.toLocaleString('default', { month: 'long', timeZone: 'UTC' });

  return { periodLabel: `${monthName} ${year}`, periodKey: `${year}-${String(month + 1).padStart(2, '0')}` };

};





const TaxDeclarationPanel: React.FC = () => {

  const { t } = useTranslation();

  const { state, generateTaxInvoice } = useAppContext();

  const { taxes, dailySales, currencies, invoices } = state;



  const getCurrencySymbol = (code: string) => {

    // This is a simplification. Assumes all tax is handled in the primary currency.

    return currencies[0]?.symbol || '$';
    }
  
    // ... (rest of the component)
  
    const taxData = React.useMemo(() => {    if (!dailySales || dailySales.length === 0) return [];

    return taxes.map(tax => {
      const periods: Record<string, { totalSale: number; taxAmount: number; periodLabel: string }> = {};

      // Create a set of unique dates from dailySales to avoid redundant calculations
      const uniqueDates = [...new Set(dailySales.map(s => s.date))];

      uniqueDates.forEach(date => {
        const [year, month, day] = date.split('-').map(Number);
        const saleDate = new Date(Date.UTC(year, month - 1, day));
        
        const { periodKey, periodLabel } = getFiscalPeriod(saleDate, tax.paymentFrequency);
        
        if (!periods[periodKey]) {
          periods[periodKey] = { totalSale: 0, taxAmount: 0, periodLabel };
        }
        
        // Calculate net sales for the day using the utility function
        const netSalesForDay = calculateNetSalesForDay(date, state);
        
        // The base for the tax is the net sales *before* the tax was removed.
        // Our function returns sales *after* tax. We need to reverse it.
        const taxRate = tax.percentage / 100;
        const taxableBase = netSalesForDay * (1 + taxRate);

        periods[periodKey].totalSale += taxableBase;
      });

      // Now, calculate the final tax amount for each period
      Object.keys(periods).forEach(periodKey => {
        periods[periodKey].taxAmount = periods[periodKey].totalSale * (tax.percentage / 100);
      });
      
      const adjustments: any[] = [];

      const processedPeriods = Object.entries(periods).map(([periodKey, data]) => {
        const originalInvoice = invoices.find(inv => inv.taxInfo?.taxId === tax.id && inv.taxInfo?.periodLabel === data.periodLabel);
        
        const periodEndDate = new Date(); // Placeholder
        const isClosed = true; // For now, assume all historical periods are closed.

        if (originalInvoice && originalInvoice.taxInfo) {
          const difference = data.totalSale - originalInvoice.taxInfo.originalTaxableAmount;
          if (Math.abs(difference) > 0.01) { // Tolerance for float issues
            const taxOnDifference = difference * (tax.percentage / 100);
            adjustments.push({
              periodLabel: `Ajuste ${data.periodLabel}`,
              periodKey: `${periodKey}-adj`,
              taxAmount: taxOnDifference,
              totalSale: difference,
            });
          }
        }

        return {
          ...data,
          periodKey,
          isClosed,
          isInvoiced: !!originalInvoice,
        };
      }).sort((a, b) => b.periodKey.localeCompare(a.periodKey)); // Sort descending

      return {
        ...tax,
        periods: [...processedPeriods, ...adjustments],
      };
    });
  }, [state]);


  if (taxes.length === 0) {
    return null;
  }

    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">{t('tax_declaration_panel_title', 'Panel de Declaración de Impuestos')}</h3>
        <div className="space-y-4">
          {taxData.map(tax => (
            <div key={tax.id} className="bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-bold text-indigo-400 text-lg">{tax.name} ({tax.percentage}%)</h4>
              <p className="text-xs text-gray-400 mb-3">{t('tax_declaration_panel_pay_to', 'Pagar a:')} {tax.authority} - {t('tax_declaration_panel_frequency', 'Frecuencia:')} {t(`tax_frequency_${tax.paymentFrequency}`)}</p>
              
              <div className="space-y-2">
                {tax.periods.map(period => (
                  <div key={period.periodKey} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
                    <div>
                      <p className="font-semibold text-white">{period.periodLabel}</p>
                      <p className="text-xs text-gray-400">
                        {t('tax_declaration_panel_total_sale', 'Venta Total:')} {formatNumber(period.totalSale, { style: 'currency', currencySymbol: getCurrencySymbol('') })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-mono text-indigo-300">
                        {formatNumber(period.taxAmount, { style: 'currency', currencySymbol: getCurrencySymbol('') })}
                      </span>
                      {period.isInvoiced ? (
                         <span className="text-xs font-semibold text-green-400 bg-green-500/20 px-3 py-1 rounded-full">{t('tax_declaration_panel_invoiced', 'Facturado')}</span>
                      ) : period.periodKey.includes('-adj') ? (
                        <button 
                          onClick={() => generateTaxInvoice({ taxId: tax.id, periodLabel: period.periodLabel, amount: period.taxAmount, originalTaxableAmount: period.totalSale })}
                          disabled={Math.abs(period.taxAmount) <= 0}
                          className="bg-yellow-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
                        >
                          {t('tax_declaration_panel_generate_adjustment_invoice', 'Generar Factura de Ajuste')}
                        </button>
                      ) : (
                        <button 
                          onClick={() => generateTaxInvoice({ taxId: tax.id, periodLabel: period.periodLabel, amount: period.taxAmount, originalTaxableAmount: period.totalSale })}
                          disabled={period.taxAmount <= 0 || !period.isClosed}
                          className="bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm"
                        >
                          {t('tax_declaration_panel_generate_invoice', 'Generar Factura')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {tax.periods.length === 0 && <p className="text-sm text-gray-500">{t('tax_declaration_panel_no_data', 'No hay datos de ventas para este impuesto.')}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>  );
};

export default TaxDeclarationPanel;
