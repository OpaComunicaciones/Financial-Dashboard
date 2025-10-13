
/**
 * Formats a number according to the specified rules (dot for thousands, comma for decimals).
 * Uses 'de-DE' locale which naturally provides this format.
 *
 * @param value The number to format.
 * @param options Formatting options.
 * @param options.style 'decimal' or 'currency'.
 * @param options.currencySymbol The currency symbol to use (e.g., '$').
 * @param options.forceDecimals If true, always shows two decimal places, even for integers.
 * @returns A formatted string.
 */
export const formatNumber = (
  value: number | null | undefined,
  options: { style?: 'currency'; currencySymbol?: string; forceDecimals?: boolean } = {}
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  const { style, currencySymbol, forceDecimals } = options;

  const isInteger = value % 1 === 0;

  const numberFormatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: forceDecimals || !isInteger ? 2 : 0,
    maximumFractionDigits: 2,
  };

  if (style === 'currency' && currencySymbol) {
    // Formatting as currency is complex with custom symbols and spacing.
    // We format the number and manually prepend the symbol.
    const formattedNumber = new Intl.NumberFormat('de-DE', numberFormatOptions).format(value);
    return `${currencySymbol} ${formattedNumber}`;
  }

  return new Intl.NumberFormat('de-DE', numberFormatOptions).format(value);
};
