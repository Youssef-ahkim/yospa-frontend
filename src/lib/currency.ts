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
 * Formats numeric amounts using standard Moroccan Dirham formatting (e.g. "4,435.70 MAD").
 * Ensures consistency across browsers and avoids any unwanted '$' symbols.
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  currency = DEFAULT_CURRENCY
): string {
  const numericAmount = parsePrice(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
  return `${formatted} ${currency}`;
}


