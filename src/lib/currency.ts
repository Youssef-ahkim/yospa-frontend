export const DEFAULT_CURRENCY = "MAD";

/**
 * Safely parses string or numeric prices into a valid floating number.
 */
export function parsePrice(price: string | number | null | undefined): number {
  if (price === null || price === undefined) return 0;
  const num = typeof price === "number" ? price : parseFloat(String(price));
  return isNaN(num) ? 0 : num;
}

/**
 * Formats numeric amounts using Intl.NumberFormat with the target currency.
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  currency = DEFAULT_CURRENCY
): string {
  const numericAmount = parsePrice(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${numericAmount.toFixed(2)} ${currency}`;
  }
}

